// QA for all 30 紫微×MBTI personality articles.
// Pass 1: Gemini 2.5 Flash (broad review)
// Pass 2: DeepSeek R1 adjudicates any REVISE flags
// Usage: npx tsx --env-file=.env.local scripts/reviewPersonality.mjs
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { STAR_MBTI_LIST, MBTI_ZIWEI_LIST, starMbtiGroundingBlock, mbtiZiweiGroundingBlock } from "../lib/personalityData.ts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });
const CONC = 4;
const CONTENT_DIR = path.join(process.cwd(), "content", "seo", "personality");

// Build combined entry list with grounding blocks
const ALL_ENTRIES = [
  ...STAR_MBTI_LIST.map(e => ({ slug: e.slug, label: `${e.starName}×${e.primaryMbti}`, grounding: starMbtiGroundingBlock(e) })),
  ...MBTI_ZIWEI_LIST.map(e => ({ slug: e.slug, label: `${e.mbtiCode}×紫微`, grounding: mbtiZiweiGroundingBlock(e) })),
];

// ── Gemini pass ─────────────────────────────────────────────────────────────

const GEMINI_SYS = (entry) => `你是跨文化人格分析内容审校员，负责审核一篇关于紫微斗数与MBTI对照的科普文章。

审核标准：
1. MBTI描述准确——MBTI类型的核心特征描述是否与权威定义吻合，没有明显张冠李戴
2. 紫微星性准确——涉及的紫微星曜性格特征是否符合传统命理知识，没有明显错误
3. 对照逻辑合理——两套系统的对照是否有理有据，不牵强不空洞
4. 文章结构完整——关键章节（星性/MBTI类型、对照分析、职业感情、提醒）均有实质内容
5. 文风合适——平实现代，不像算命，不恐吓，重在自我认知

【文章对照基准资料】
${entry.grounding}

只有存在真实问题时才判 REVISE，措辞风格不要挑。严格只输出一行：
PASS
或
REVISE: <最多两条最关键问题，简短>`;

async function geminiReview(entry, attempt = 1) {
  try {
    const file = path.join(CONTENT_DIR, `${entry.slug}.json`);
    if (!fs.existsSync(file)) return `ERROR: 文件不存在`;
    const md = JSON.parse(fs.readFileSync(file, "utf-8")).markdown ?? "";
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: GEMINI_SYS(entry),
      generationConfig: { maxOutputTokens: 300, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
    });
    const r = await model.generateContent({ contents: [{ role: "user", parts: [{ text: md }] }] });
    return (r.response.text() || "").trim();
  } catch (e) {
    const msg = e?.message ?? "";
    if (attempt < 4 && /429|503|500|overload|rate|quota|timeout|fetch/i.test(msg)) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return geminiReview(entry, attempt + 1);
    }
    return `ERROR: ${msg.slice(0, 80)}`;
  }
}

// ── DeepSeek adjudication ───────────────────────────────────────────────────

const DS_SYS = (entry, geminiNote) => `你是跨文化人格分析内容核查员，对一篇「${entry.label}」文章做独立事实复核。

【文章对照基准资料（唯一事实基准）】
${entry.grounding}

核查规则：
1. 只核查MBTI类型描述的准确性和紫微星性的准确性
2. 文风、措辞、写作风格一律不审
3. 你是独立第三方，不默认 Gemini 意见正确——自己判断后再下结论

Gemini 旧意见（仅供参考，可能误报）：「${geminiNote || "（无）"}」

只输出一行：
PASS
或
REVISE: <最多两条经你核实属实的硬伤，简短>`;

async function deepseekAdjudicate(entry, geminiNote, attempt = 1) {
  try {
    const file = path.join(CONTENT_DIR, `${entry.slug}.json`);
    const md = JSON.parse(fs.readFileSync(file, "utf-8")).markdown ?? "";
    const r = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      max_tokens: 400,
      messages: [
        { role: "system", content: DS_SYS(entry, geminiNote) },
        { role: "user", content: md },
      ],
    });
    return (r.choices[0]?.message?.content ?? "").trim();
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (attempt < 4 && /429|503|500|overload|rate|timeout|fetch|ECONN/i.test(msg)) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return deepseekAdjudicate(entry, geminiNote, attempt + 1);
    }
    return `ERROR: ${msg.slice(0, 100)}`;
  }
}

// ── Run Gemini pass ─────────────────────────────────────────────────────────
console.log(`=== Pass 1: Gemini 2.5 Flash 初审 (${ALL_ENTRIES.length} 篇) ===`);
const geminiRevise = [], geminiPass = [];
let done = 0;

async function geminiWorker(q) {
  for (;;) {
    const entry = q.shift(); if (!entry) return;
    const verdict = await geminiReview(entry);
    done++;
    if (verdict.startsWith("REVISE")) {
      geminiRevise.push({ entry, verdict });
      console.log(`REVISE ${entry.label} — ${verdict.replace(/^REVISE:?\s*/,"")}`);
    } else if (verdict.startsWith("ERROR")) {
      console.log(`ERROR  ${entry.label} — ${verdict}`);
    } else {
      geminiPass.push(entry);
    }
    if (done % 10 === 0 || done === ALL_ENTRIES.length) console.log(`  …${done}/${ALL_ENTRIES.length}`);
  }
}
const q1 = [...ALL_ENTRIES];
await Promise.all(Array.from({length: CONC}, () => geminiWorker(q1)));
console.log(`\nGemini: ${geminiPass.length} PASS, ${geminiRevise.length} REVISE\n`);

// ── Run DeepSeek adjudication ───────────────────────────────────────────────
if (geminiRevise.length === 0) {
  console.log("=== 无需 DeepSeek 复核，全部通过 ===");
} else {
  console.log(`=== Pass 2: DeepSeek R1 复核 ${geminiRevise.length} 篇 ===`);
  const dsRevise = [], dsPass = [];

  async function dsWorker(q) {
    for (;;) {
      const item = q.shift(); if (!item) return;
      const { entry, verdict } = item;
      const geminiNote = verdict.replace(/^REVISE:?\s*/,"");
      const dsVerdict = await deepseekAdjudicate(entry, geminiNote);
      if (dsVerdict.startsWith("REVISE")) {
        dsRevise.push({ slug: entry.slug, label: entry.label, deepseek: dsVerdict, gemini: verdict });
        console.log(`REVISE ${entry.label} — ${dsVerdict.replace(/^REVISE:?\s*/,"")}`);
      } else {
        dsPass.push(entry);
        console.log(`PASS   ${entry.label}（Gemini 误报）`);
      }
    }
  }
  const q2 = [...geminiRevise];
  await Promise.all(Array.from({length: CONC}, () => dsWorker(q2)));

  console.log(`\n=== 复核完成 ===`);
  console.log(`Gemini PASS: ${geminiPass.length} | DeepSeek 确认 REVISE: ${dsRevise.length} | DeepSeek 判误报: ${dsPass.length}`);

  const result = { revise: dsRevise, pass: [...geminiPass.map(e=>({slug:e.slug,label:e.label})), ...dsPass] };
  fs.writeFileSync("/tmp/personality_review.json", JSON.stringify(result, null, 2));
  console.log(`\n结果已写入 /tmp/personality_review.json`);
  if (dsRevise.length) {
    console.log("\n需修正的文章:");
    dsRevise.forEach(r => console.log(`  ✗ ${r.label}: ${r.deepseek.replace(/^REVISE:?\s*/,"")}`));
  }
}
