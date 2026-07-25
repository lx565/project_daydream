// Quality review pipeline for 化×十二宮 SEO articles (content/seo/sihua-palace/).
// Step 1: Gemini 2.5 Flash reviews each article for factual errors.
// Step 2: DeepSeek (deepseek-reasoner) adjudicates each REVISE flag.
// Step 3: Auto-regens confirmed errors via genSihuaPalace.mjs --slug X --force.
// (Mirrors scripts/reviewSihua.mjs.)
//
// Usage:
//   npx tsx --env-file=.env.local scripts/reviewSihuaPalace.mjs
//   npx tsx --env-file=.env.local scripts/reviewSihuaPalace.mjs --slug huaji-fuqi-gong
//   npx tsx --env-file=.env.local scripts/reviewSihuaPalace.mjs --skip-regen

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { SIHUA_PALACE } from "../lib/sihuaPalaceData.ts";
import { JI_STEMS } from "../lib/sihuaData.ts";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const slugArg   = args.includes("--slug")  ? args[args.indexOf("--slug")  + 1] : null;
const skipRegen = args.includes("--skip-regen");

// ── API clients ───────────────────────────────────────────────────────────────
const genAI    = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const deepseek = new OpenAI({
  apiKey:  process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ── Authoritative reference (for Gemini/DeepSeek cross-check) ─────────────────
const JI_REF = Object.entries(JI_STEMS)
  .map(([star, stems]) => `${stems.join("、")}年 → ${star}化忌`)
  .join("\n");

const SCOPE_RULE = `
【絕對禁止】本文只能討論「權威定盤資料」中明確列出的星曜與其化忌落宮說明。若文章對未列出的星曜編造具體的落此宮論斷（而非泛泛帶過），必須標記為 REVISE。
【重要】本文不得聲稱「某年生人的化忌必然落在此宮」——化忌是哪顆星由生年天干決定，但那顆星落在命盤哪個宮位取決於完整排盤，並非天干直接對應宮位。若文章出現此類決定論表述，標記為 REVISE。`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function readArticle(slug) {
  const fp = path.join(process.cwd(), "content", "seo", "sihua-palace", `${slug}.json`);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return null; }
}

function buildGeminiPrompt(entry, content) {
  return `你是紫微斗數命理權威審核員。審核以下「化忌入${entry.palace}」科普文章是否有事實錯誤或語言問題。

檢查重點：
1. 全文必須是繁體中文（台灣用語習慣）——若出現簡體字、英文或亂碼，標記 REVISE
2. 文中提及的星曜與其化忌落宮特質，是否與下方權威資料一致（不得矛盾、不得誤植到錯誤宮位）
3. 是否為未列出的星曜編造了具體的${entry.palace}落宮論斷
4. 是否出現「某年生人的化忌必然落在此宮」之類的決定論錯誤表述（見下方規則）
5. 內部是否自相矛盾

【本文權威定盤資料（視為絕對正確的基準）】
${entry.grounding}

【十干化忌權威表（絕對正確）】
${JI_REF}
${SCOPE_RULE}

【文章內容（前2000字）】
${content.slice(0, 2000)}

只輸出一行：
  PASS ${entry.urlSlug}
  或
  REVISE sihua-palace/${entry.urlSlug} — {具體問題}
寧可誤報，不可漏報。`;
}

function buildDeepseekPrompt(entry, geminiReason, content) {
  return `你是紫微斗數命理高精度審核員。判斷 Gemini 標記的「錯誤」是否真實存在（避免誤報）。

文章：sihua-palace/${entry.urlSlug}（${entry.title}）
Gemini 標記：${geminiReason}

【權威定盤資料】
${entry.grounding}

【十干化忌權威表】
${JI_REF}
${SCOPE_RULE}

【完整文章】
${content.slice(0, 2500)}

請判斷：
- 若確為事實錯誤或語言問題，輸出 "REVISE ${entry.urlSlug} — {精確問題與應改為何}"
- 若是 Gemini 誤報，輸出 "PASS ${entry.urlSlug} — {為何不是錯誤}"
只輸出一行。`;
}

// ── Gemini review ─────────────────────────────────────────────────────────────
async function geminiReview(entry, attempt = 1) {
  const article = readArticle(entry.urlSlug);
  if (!article) return { verdict: "SKIP", reason: "file missing" };

  const content = article.markdown || "";
  const prompt  = buildGeminiPrompt(entry, content);

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const text = (result.response.text() || "").trim();
    return { verdict: text.startsWith("REVISE") ? "REVISE" : "PASS", raw: text };
  } catch (e) {
    const msg = e?.message ?? "";
    if (attempt < 4 && /429|503|500|overload|rate|quota|timeout|fetch/i.test(msg)) {
      await new Promise(r => setTimeout(r, 2500 * attempt));
      return geminiReview(entry, attempt + 1);
    }
    return { verdict: "ERROR", reason: msg.slice(0, 120) };
  }
}

// ── DeepSeek adjudication ─────────────────────────────────────────────────────
async function deepseekAdjudicate(entry, geminiReason, attempt = 1) {
  const article = readArticle(entry.urlSlug);
  const content = article ? (article.markdown || "") : "";
  const prompt  = buildDeepseekPrompt(entry, geminiReason, content);

  try {
    const resp = await deepseek.chat.completions.create({
      model: process.env.SEO_AI_MODEL ?? "deepseek-reasoner",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0,
    });
    const text      = (resp.choices[0]?.message?.content || "").trim();
    const confirmed =
      /^REVISE/i.test(text) ||
      /^\*\*?\s*判断[：:]\s*REVISE/i.test(text) ||
      /^\*\*REVISE/i.test(text);
    return { confirmed, raw: text };
  } catch (e) {
    const msg = e?.message ?? "";
    if (attempt < 3 && /429|503|500|timeout|fetch/i.test(msg)) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return deepseekAdjudicate(entry, geminiReason, attempt + 1);
    }
    return { confirmed: false, raw: `ERROR: ${msg.slice(0, 100)}` };
  }
}

// ── Regen ─────────────────────────────────────────────────────────────────────
function regenArticle(slug) {
  const cmd = `npx tsx --env-file=.env.local scripts/genSihuaPalace.mjs --slug ${slug} --force`;
  console.log(`  Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    return true;
  } catch (e) {
    console.error(`  Regen failed for ${slug}: ${e.message}`);
    return false;
  }
}

// ── Build entry list ──────────────────────────────────────────────────────────
let entries = [...SIHUA_PALACE];
if (slugArg) entries = entries.filter(e => e.urlSlug === slugArg);

if (entries.length === 0) {
  console.error("No entries matched filters.");
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CONC = 3;
const allResults      = [];
const allFlags        = [];
const confirmedErrors = [];
const regenerated     = [];

console.log(`\n${"=".repeat(60)}`);
console.log(`四化×十二宮 Review — ${entries.length} articles`);
if (slugArg) console.log(`  slug filter: ${slugArg}`);
console.log("=".repeat(60));

console.log(`\nStep 1 — Gemini review (${entries.length} articles)…\n`);

const queue = [...entries];
let done = 0;

async function workerGemini() {
  for (;;) {
    const entry = queue.shift();
    if (!entry) return;
    const result = await geminiReview(entry);
    done++;
    allResults.push({ slug: entry.urlSlug, ...result });

    if (result.verdict === "REVISE") {
      console.log(`  REVISE sihua-palace/${entry.urlSlug} — ${result.raw}`);
      allFlags.push({ entry, geminiRaw: result.raw });
    } else if (result.verdict === "ERROR") {
      console.log(`  ERROR  ${entry.urlSlug} — ${result.reason}`);
    } else if (result.verdict === "SKIP") {
      console.log(`  SKIP   ${entry.urlSlug} — ${result.reason}`);
    } else {
      console.log(`  PASS   ${entry.urlSlug}`);
    }

    if (done % 5 === 0 && done < entries.length) console.log(`    …${done}/${entries.length} done`);
  }
}

await Promise.all(Array.from({ length: CONC }, () => workerGemini()));

const p  = allResults.filter(r => r.verdict === "PASS").length;
const rv = allResults.filter(r => r.verdict === "REVISE").length;
const sk = allResults.filter(r => r.verdict === "SKIP").length;
const er = allResults.filter(r => r.verdict === "ERROR").length;
console.log(`\nGemini: ${p} PASS, ${rv} REVISE, ${sk} SKIP, ${er} ERROR`);

fs.writeFileSync("/tmp/sihua_palace_review.json", JSON.stringify({ results: allResults, flags: allFlags.map(f => ({ slug: f.entry.urlSlug, raw: f.geminiRaw })) }, null, 2));

// ── DeepSeek adjudication ─────────────────────────────────────────────────────
if (allFlags.length === 0) {
  console.log("\nNo REVISE flags — all articles PASS.");
} else {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Step 2 — DeepSeek adjudication (${allFlags.length} flags)`);
  console.log("=".repeat(60));

  for (const flag of allFlags) {
    process.stdout.write(`  Adjudicating ${flag.entry.urlSlug}… `);
    const result = await deepseekAdjudicate(flag.entry, flag.geminiRaw);
    if (result.confirmed) {
      console.log(`CONFIRMED — ${result.raw}`);
      confirmedErrors.push({ entry: flag.entry, geminiRaw: flag.geminiRaw, deepseekRaw: result.raw });
    } else {
      console.log(`dismissed — ${result.raw}`);
    }
  }
}

fs.writeFileSync("/tmp/sihua_palace_errors.json", JSON.stringify(confirmedErrors.map(e => ({ slug: e.entry.urlSlug, deepseekRaw: e.deepseekRaw })), null, 2));
console.log(`\nConfirmed errors: ${confirmedErrors.length}`);

// ── Regen ─────────────────────────────────────────────────────────────────────
if (confirmedErrors.length > 0 && !skipRegen) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Step 3 — Regenerating confirmed errors");
  console.log("=".repeat(60));
  for (const err of confirmedErrors) {
    console.log(`\nRegenerating ${err.entry.urlSlug}…`);
    const ok = regenArticle(err.entry.urlSlug);
    regenerated.push({ slug: err.entry.urlSlug, ok });
  }
} else if (confirmedErrors.length > 0 && skipRegen) {
  console.log("\n--skip-regen set: skipping regeneration.");
}

// ── Report ────────────────────────────────────────────────────────────────────
const lines = [
  "# 命裡 四化×十二宮 SEO Review Report",
  `Date: ${new Date().toISOString().slice(0, 10)}`,
  "",
  "## Summary",
  `- Articles reviewed: ${entries.length} (${sk} skipped)`,
  `- PASS: ${p}`,
  `- Gemini REVISE flags: ${allFlags.length}`,
  `- Confirmed errors (DeepSeek): ${confirmedErrors.length}`,
  `- Articles regenerated: ${regenerated.length}`,
  "",
];

if (allFlags.length > 0) {
  lines.push("## Gemini Flags");
  for (const f of allFlags) lines.push(`- **${f.entry.urlSlug}**: ${f.geminiRaw}`);
  lines.push("");
}
if (confirmedErrors.length > 0) {
  lines.push("## Confirmed Errors");
  for (const e of confirmedErrors) lines.push(`- **${e.entry.urlSlug}**: ${e.deepseekRaw}`);
  lines.push("");
}
if (regenerated.length > 0) {
  lines.push("## Regenerated");
  for (const r of regenerated) lines.push(`- ${r.slug}: ${r.ok ? "SUCCESS" : "FAILED"}`);
}

const report = lines.join("\n");
fs.writeFileSync("/tmp/sihua_palace_review_report.md", report);
console.log("\n" + report);
console.log("\nReport: /tmp/sihua_palace_review_report.md | raw: /tmp/sihua_palace_review.json | errors: /tmp/sihua_palace_errors.json");
