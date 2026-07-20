// Qualitative review of all 168 assistant star articles using Gemini (cross-model vs
// the DeepSeek author). Each article is checked against its authoritative grounding block.
// Usage: npx tsx --env-file=.env.local scripts/reviewAssistantStars.mjs
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ASSISTANT_STARS } from "../lib/assistantStarData.ts";
import { assistantStarGroundingBlock } from "../lib/assistantStarData.ts";
import { PALACES } from "../lib/starData.ts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const CONC = 3;

const jobs = [];
for (const s of ASSISTANT_STARS) for (const p of PALACES) jobs.push({ s, p: p.name });

const SYS = (s, p) => `你是严格的紫微斗数内容审校老师。判断这篇面向大众的科普文章「${s.name}在${p}」是否合格。

注意：${s.name}是辅星（${s.group}），位置由出生时辰决定，没有固定的庙旺亮度表——不要以缺少庙旺表为由判REVISE。

判定标准：
1. 全面——覆盖星性概要、落宫含义、与主星互动、四化影响、大限流年、实用提醒。
2. 不废话——具体有信息量，不堆砌空话套话。
3. 事实正确——四化规则、与其他星曜的互动规则必须与下方权威定性资料一致；无虚构星性规则。
4. 条理——结构清晰、分段合理、可读。

【该辅星权威定性资料（事实基准）】
${assistantStarGroundingBlock(s)}

只有存在真实错误时才判REVISE，措辞鸡毛蒜皮不要挑。必须严格只输出一行：
PASS
或
REVISE: <最多两条最关键问题，简短>`;

async function review(job, attempt = 1) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYS(job.s, job.p),
      generationConfig: { maxOutputTokens: 400, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
    });
    const filePath = path.join("content/seo/assistantstar", `${job.s.name}__${job.p}.json`);
    if (!fs.existsSync(filePath)) return "SKIP: missing";
    const md = JSON.parse(fs.readFileSync(filePath, "utf8")).markdown;
    const r = await model.generateContent({ contents: [{ role: "user", parts: [{ text: md }] }] });
    return (r.response.text() || "").trim();
  } catch (e) {
    const msg = e?.message ?? "";
    if (attempt < 4 && /429|503|500|overload|rate|quota|timeout|fetch/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return review(job, attempt + 1);
    }
    return `ERROR: ${msg.slice(0, 80)}`;
  }
}

let done = 0;
const revise = [];
const errors = [];
const skipped = [];
async function worker(q) {
  for (;;) {
    const job = q.shift();
    if (!job) return;
    const verdict = await review(job);
    done++;
    if (verdict.startsWith("REVISE")) { revise.push({ s: job.s.name, p: job.p, verdict }); console.log(`REVISE ${job.s.name}在${job.p} — ${verdict.replace(/^REVISE:?\s*/, "")}`); }
    else if (verdict.startsWith("ERROR")) errors.push({ s: job.s.name, p: job.p, verdict });
    else if (verdict.startsWith("SKIP")) skipped.push({ s: job.s.name, p: job.p });
    if (done % 30 === 0) console.log(`  …${done}/168`);
  }
}
const q = [...jobs];
await Promise.all(Array.from({ length: CONC }, () => worker(q)));

const total = jobs.length - skipped.length;
console.log(`\n=== Gemini review: ${total - revise.length - errors.length}/${total} PASS, ${revise.length} REVISE, ${errors.length} ERROR, ${skipped.length} SKIP ===`);
fs.writeFileSync("/tmp/assistantstar_review.json", JSON.stringify({ revise, errors, skipped }, null, 2));
if (errors.length) console.log("errors:", errors.map((e) => `${e.s}__${e.p}`).join(", "));
