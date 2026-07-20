// Qualitative review of all 168 star articles using Gemini (cross-model vs the
// DeepSeek author). Each article is checked WITH its ground-truth facts.
// Usage: npx tsx --env-file=.env.local scripts/reviewStars.mjs
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MAJOR_STARS, PALACES } from "../lib/starData.ts";
import { starGroundingBlock } from "../lib/starFacts.ts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const CONC = 3;

const jobs = [];
for (const s of MAJOR_STARS) for (const p of PALACES) jobs.push({ s: s.name, p: p.name });

const SYS = (s, p) => `你是严格的紫微斗数内容审校老师。判断这篇面向大众的科普文章「${s}在${p}」是否合格。
判定标准：
1. 全面——覆盖星性与宫义、星曜组合与庙旺、性格表现、四化影响、同宫会照、大限流年、现实提醒。
2. 不废话——具体有信息量，不堆砌空话套话、不自我重复。
3. 逻辑与事实——内部自洽；文中的同宫主星、庙旺亮度、可化四化必须与下方权威定盘资料一致；无虚构星名/格名。
4. 条理——结构清晰、分段合理、可读。

【该星权威定盘资料（事实基准）】
${starGroundingBlock(s)}

只有存在真实问题时才判 REVISE，措辞鸡毛蒜皮不要挑。必须严格只输出一行：
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
    const md = JSON.parse(fs.readFileSync(path.join("content/seo/star", `${job.s}__${job.p}.json`), "utf8")).markdown;
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
async function worker(q) {
  for (;;) {
    const job = q.shift();
    if (!job) return;
    const verdict = await review(job);
    done++;
    if (verdict.startsWith("REVISE")) { revise.push({ ...job, verdict }); console.log(`REVISE ${job.s}在${job.p} — ${verdict.replace(/^REVISE:?\s*/, "")}`); }
    else if (verdict.startsWith("ERROR")) errors.push({ ...job, verdict });
    if (done % 30 === 0) console.log(`  …${done}/168`);
  }
}
const q = [...jobs];
await Promise.all(Array.from({ length: CONC }, () => worker(q)));

console.log(`\n=== Gemini review: ${168 - revise.length - errors.length}/168 PASS, ${revise.length} REVISE, ${errors.length} ERROR ===`);
fs.writeFileSync("/tmp/star_review.json", JSON.stringify({ revise, errors }, null, 2));
if (errors.length) console.log("errors:", errors.map((e) => `${e.s}__${e.p}`).join(", "));
