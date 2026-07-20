// Quality review pipeline for 四化详解 SEO articles (content/seo/sihua/).
// Step 1: Gemini 2.5 Flash reviews each article for factual errors.
// Step 2: DeepSeek (deepseek-reasoner) adjudicates each REVISE flag.
// Step 3: Auto-regens confirmed errors via genSihua.mjs --slug X --force.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/reviewSihua.mjs
//   npx tsx --env-file=.env.local scripts/reviewSihua.mjs --kind hualu
//   npx tsx --env-file=.env.local scripts/reviewSihua.mjs --kind huaquan,huake
//   npx tsx --env-file=.env.local scripts/reviewSihua.mjs --slug lianzheng-hualu
//   npx tsx --env-file=.env.local scripts/reviewSihua.mjs --skip-regen

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { SIHUA, SIHUA_TABLE } from "../lib/sihuaData.ts";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const kindArg   = args.includes("--kind")  ? args[args.indexOf("--kind")  + 1] : null;
const slugArg   = args.includes("--slug")  ? args[args.indexOf("--slug")  + 1] : null;
const skipRegen = args.includes("--skip-regen");

const kindFilter = kindArg ? kindArg.split(",").map(s => s.trim()) : null;

// ── API clients ───────────────────────────────────────────────────────────────
const genAI    = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const deepseek = new OpenAI({
  apiKey:  process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ── Authoritative 四化 reference (for Gemini cross-check) ─────────────────────
const SIHUA_REF = Object.entries(SIHUA_TABLE)
  .map(([stem, row]) => `${stem}年：化禄=${row.lu} 化权=${row.quan} 化科=${row.ke} 化忌=${row.ji}`)
  .join("\n");

const FORBIDDEN_RULE = `
【绝对禁止】七杀、天府、天相 本身不参与任何四化（无化禄/化权/化科/化忌）。
紫微：仅 壬年化权、乙年化科，其他年份不化任何（无化禄、无化忌）。
若文章声称上述星曜有四化变化，必须标记为 REVISE。`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function readArticle(slug) {
  const fp = path.join(process.cwd(), "content", "seo", "sihua", `${slug}.json`);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return null; }
}

function buildGeminiPrompt(entry, content) {
  const huaLabel = entry.sihua ? `化${entry.sihua}` : "(pillar)";
  const kindDesc = {
    huaji: "化忌详解（阻滞、执着、课题）",
    hualu: "化禄详解（财禄、机遇、人缘）",
    huaquan: "化权详解（权力、掌控、能力放大）",
    huake: "化科详解（名声、贵人、文书加持）",
    pillar: "四化概念总论",
  }[entry.kind] ?? entry.kind;

  // Kind-specific contamination check
  const contamCheck = entry.kind !== "pillar" && entry.sihua
    ? `5. 【化类一致性】本文是「${huaLabel}」文章，核心论述必须围绕 ${huaLabel} 展开。若文章把 ${huaLabel} 写成其他四化（例如在非比较语境中说"这颗星化忌"但本文明明是化禄），标记 REVISE，问题写 "contamination: wrong hua-type in body"。`
    : "";

  return `你是紫微斗数命理权威审核员。审核以下「${kindDesc}」科普文章是否有事实错误。

检查重点：
1. 星曜本性/五行是否正确（与下方定盘资料一致）
2. 生年干（stems）是否准确：本文涉及的年干必须与下方权威四化表一致
3. 四化对应关系：化禄/化权/化科/化忌对应的年干必须与四化表完全吻合
4. 内部矛盾或自相矛盾
${contamCheck}

【本文权威定盘资料（视为绝对正确的基准）】
${entry.grounding}

【十干四化权威表（绝对正确）】
${SIHUA_REF}
${FORBIDDEN_RULE}

【文章内容（前2000字）】
${content.slice(0, 2000)}

只输出一行：
  PASS ${entry.urlSlug}
  或
  REVISE sihua/${entry.urlSlug} — {具体问题}
宁可误报，不可漏报。`;
}

function buildDeepseekPrompt(entry, geminiReason, content) {
  return `你是紫微斗数命理高精度审核员。判断 Gemini 标记的"错误"是否真实存在（避免误报）。

文章：sihua/${entry.urlSlug}（${entry.title}）
Gemini 标记：${geminiReason}

【权威定盘资料】
${entry.grounding}

【十干四化权威表】
${SIHUA_REF}
${FORBIDDEN_RULE}

【完整文章】
${content.slice(0, 2500)}

请判断：
- 若确为事实错误，输出 "REVISE ${entry.urlSlug} — {精确问题与应改为何}"
- 若是 Gemini 误报，输出 "PASS ${entry.urlSlug} — {为何不是错误}"
只输出一行。`;
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
      model: "deepseek-reasoner",
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
  const cmd = `npx tsx --env-file=.env.local scripts/genSihua.mjs --slug ${slug} --force`;
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
let entries = [...SIHUA];
if (kindFilter)  entries = entries.filter(e => kindFilter.includes(e.kind));
if (slugArg)     entries = entries.filter(e => e.urlSlug === slugArg);

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
console.log(`四化详解 Review — ${entries.length} articles`);
if (kindFilter) console.log(`  kind filter: ${kindFilter.join(", ")}`);
if (slugArg)    console.log(`  slug filter: ${slugArg}`);
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
    allResults.push({ slug: entry.urlSlug, kind: entry.kind, ...result });

    if (result.verdict === "REVISE") {
      console.log(`  REVISE sihua/${entry.urlSlug} — ${result.raw}`);
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

fs.writeFileSync("/tmp/sihua_review.json", JSON.stringify({ results: allResults, flags: allFlags.map(f => ({ slug: f.entry.urlSlug, raw: f.geminiRaw })) }, null, 2));

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

fs.writeFileSync("/tmp/sihua_errors.json", JSON.stringify(confirmedErrors.map(e => ({ slug: e.entry.urlSlug, deepseekRaw: e.deepseekRaw })), null, 2));
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
  "# 命里 四化详解 SEO Review Report",
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
fs.writeFileSync("/tmp/sihua_review_report.md", report);
console.log("\n" + report);
console.log("\nReport: /tmp/sihua_review_report.md | raw: /tmp/sihua_review.json | errors: /tmp/sihua_errors.json");
