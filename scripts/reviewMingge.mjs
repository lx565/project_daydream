// Qualitative QA for all 31 命格 articles.
// Pass 1: Gemini 2.5 Flash (independent cross-model review)
// Pass 2: DeepSeek R1 adjudicates any REVISE flags from Gemini
// Neither pass uses Claude — pure cross-model validation.
// Usage: npx tsx --env-file=.env.local scripts/reviewMingge.mjs

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MINGGE_LIST } from "../lib/minggeData.ts";
import { minggeGroundingBlock } from "../lib/minggeData.ts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });
const CONC = 3;
const CONTENT_DIR = path.join(process.cwd(), "content", "seo", "mingge");

// ── Gemini pass ────────────────────────────────────────────────────────────

const GEMINI_SYS = (entry) => `你是严格的紫微斗数内容审校老师。判断这篇面向大众的科普文章「${entry.name}」是否合格。

判定标准：
1. 全面——覆盖格局定义与入格条件、命运特质、格局强弱影响、四化变化、古籍论述
2. 不废话——具体有信息量，不堆砌空话套话
3. 逻辑与事实——内部自洽；文中入格条件、涉及星曜必须与下方权威资料一致；无虚构星名/格名
4. 条理——结构清晰、分段合理

【格局权威资料（事实基准）】
${minggeGroundingBlock(entry)}

只有存在真实问题时才判 REVISE，措辞细节不要挑。严格只输出一行：
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
      generationConfig: { maxOutputTokens: 400, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
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

// ── DeepSeek adjudication pass ─────────────────────────────────────────────

const DS_SYS = (entry, geminiNote) => `你是紫微斗数事实核查员，负责对一篇科普文章「${entry.name}」做独立事实复核。

【格局权威定盘资料（唯一事实基准）】
${minggeGroundingBlock(entry)}

核查规则：
1. 只核查格局入格条件、涉及星曜、四化等硬性事实，与权威资料逐字比对。
2. 行文风格、措辞优劣一律不审。
3. 你是独立第三方，不要默认 Gemini 旧意见正确——它可能是误报。自己核对权威资料后再下结论。

Gemini 旧意见（仅供参考，可能误报）：「${geminiNote || "（无）"}」

只输出一行：
PASS
或
REVISE: <最多两条经你核实属实的硬伤，注明正确值，简短>`;

async function deepseekAdjudicate(entry, geminiNote, attempt = 1) {
  try {
    const file = path.join(CONTENT_DIR, `${entry.slug}.json`);
    const md = JSON.parse(fs.readFileSync(file, "utf-8")).markdown ?? "";
    const r = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      max_tokens: 512,
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

// ── Run Gemini pass ────────────────────────────────────────────────────────
console.log("=== Pass 1: Gemini 2.5 Flash 初审 ===");
const geminiRevise = [];
const geminiPass = [];

let done = 0;
async function geminiWorker(q) {
  for (;;) {
    const entry = q.shift(); if (!entry) return;
    const verdict = await geminiReview(entry);
    done++;
    if (verdict.startsWith("REVISE")) {
      geminiRevise.push({ entry, verdict });
      console.log(`REVISE ${entry.name} — ${verdict.replace(/^REVISE:?\s*/,"")}`);
    } else if (verdict.startsWith("ERROR")) {
      console.log(`ERROR  ${entry.name} — ${verdict}`);
    } else {
      geminiPass.push(entry);
    }
    if (done % 10 === 0) console.log(`  …${done}/${MINGGE_LIST.length}`);
  }
}
const q1 = [...MINGGE_LIST];
await Promise.all(Array.from({length: CONC}, () => geminiWorker(q1)));
console.log(`\nGemini: ${geminiPass.length} PASS, ${geminiRevise.length} REVISE\n`);

// ── Run DeepSeek adjudication on flagged items ─────────────────────────────
if (geminiRevise.length === 0) {
  console.log("=== 无需 DeepSeek 复核，全部通过 ===");
} else {
  console.log(`=== Pass 2: DeepSeek R1 复核 ${geminiRevise.length} 篇 ===`);
}

const dsRevise = [];
const dsPass = [];

async function dsWorker(q) {
  for (;;) {
    const item = q.shift(); if (!item) return;
    const { entry, verdict } = item;
    const geminiNote = verdict.replace(/^REVISE:?\s*/,"");
    const dsVerdict = await deepseekAdjudicate(entry, geminiNote);
    if (dsVerdict.startsWith("REVISE")) {
      dsRevise.push({ slug: entry.slug, name: entry.name, deepseek: dsVerdict, gemini: verdict });
      console.log(`REVISE ${entry.name} — ${dsVerdict.replace(/^REVISE:?\s*/,"")}`);
    } else {
      dsPass.push({ slug: entry.slug, name: entry.name });
      console.log(`PASS   ${entry.name}（Gemini 误报）`);
    }
  }
}
const q2 = [...geminiRevise];
await Promise.all(Array.from({length: CONC}, () => dsWorker(q2)));

console.log(`\n=== 复核完成 ===`);
console.log(`Gemini PASS: ${geminiPass.length} | DeepSeek 确认 REVISE: ${dsRevise.length} | DeepSeek 判误报: ${dsPass.length}`);

const result = { revise: dsRevise, pass: [...geminiPass.map(e=>({slug:e.slug,name:e.name})), ...dsPass] };
fs.writeFileSync("/tmp/mingge_review.json", JSON.stringify(result, null, 2));
console.log(`\n结果已写入 /tmp/mingge_review.json`);
if (dsRevise.length) {
  console.log("\n需修正的格局:");
  dsRevise.forEach(r => console.log(`  ✗ ${r.name}: ${r.deepseek.replace(/^REVISE:?\s*/,"")}`));
}
