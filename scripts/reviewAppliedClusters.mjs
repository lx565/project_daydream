// Quality review pipeline for four "applied palace" SEO clusters:
//   hunyin (夫妻宫), shiye (官禄宫), caiyun (财帛宫), jibing (疾厄宫)
// Modeled on scripts/reviewNewClusters.mjs.
//
// Step 1: Gemini 2.5 Flash reviews each article for factual errors (grounding = ground truth).
// Step 2: DeepSeek (deepseek-reasoner) adjudicates each Gemini REVISE flag.
// Step 3: Regenerates confirmed errors via the cluster's gen script (--slug X --force).
// Step 4: Writes summary + flag/error JSON to /tmp.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/reviewAppliedClusters.mjs
//   npx tsx --env-file=.env.local scripts/reviewAppliedClusters.mjs --cluster jibing
//   npx tsx --env-file=.env.local scripts/reviewAppliedClusters.mjs --cluster hunyin --slugs ziwei,qisha
//   npx tsx --env-file=.env.local scripts/reviewAppliedClusters.mjs --skip-regen

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { HUNYIN } from "../lib/hunyinData.ts";
import { SHIYE } from "../lib/shiyeData.ts";
import { CAIYUN } from "../lib/caiyunData.ts";
import { JIBING } from "../lib/jibingData.ts";
import { SIHUA_TABLE } from "../lib/sihuaData.ts";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const clusterArg = args.includes("--cluster") ? args[args.indexOf("--cluster") + 1] : null;
const slugsArg = args.includes("--slugs") ? args[args.indexOf("--slugs") + 1].split(",").map(s => s.trim()) : null;
const skipRegen = args.includes("--skip-regen");

const VALID_CLUSTERS = ["hunyin", "shiye", "caiyun", "jibing"];
const clusters = clusterArg ? [clusterArg] : VALID_CLUSTERS;
if (clusterArg && !VALID_CLUSTERS.includes(clusterArg)) {
  console.error(`Unknown cluster "${clusterArg}". Valid: ${VALID_CLUSTERS.join(", ")}`);
  process.exit(1);
}

const DATA = { hunyin: HUNYIN, shiye: SHIYE, caiyun: CAIYUN, jibing: JIBING };
const GEN_SCRIPT = {
  hunyin: "scripts/genHunyin.mjs",
  shiye: "scripts/genShiye.mjs",
  caiyun: "scripts/genCaiyun.mjs",
  jibing: "scripts/genJibing.mjs",
};
const PALACE_LABEL = {
  hunyin: "夫妻宫（婚姻/配偶）",
  shiye: "官禄宫（事业/职业）",
  caiyun: "财帛宫（财运/理财）",
  jibing: "疾厄宫（健康/体质）",
};

// Authoritative 十干四化 table for cross-reference (so the reviewer catches
// wrong 化禄/化权/化科/化忌 year-stems regardless of what grounding text claims).
const SIHUA_REF = Object.entries(SIHUA_TABLE)
  .map(([stem, row]) => `${stem}年：化禄=${row.lu} 化权=${row.quan} 化科=${row.ke} 化忌=${row.ji}`)
  .join("\n");

// ── API clients ───────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function readArticle(cluster, slug) {
  const filePath = path.join(process.cwd(), "content", "seo", cluster, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getEntry(cluster, slug) {
  return (DATA[cluster] || []).find(e => e.urlSlug === slug) || null;
}

function buildGeminiPrompt(cluster, slug, grounding, content) {
  const toneRule =
    cluster === "jibing"
      ? `5. 【健康文章语气】疾厄宫文章绝不可制造恐慌：必须把风险重构为"可预防/可管理"的主动健康课题，结尾要有可操作的养生建议，不可堆砌灾难性词汇（如反复强调"凶兆/绝症/必然"）。若通篇读来阴森、恐吓、宿命论，标记为 REVISE，问题写 "tone: reframe to supportive/actionable, no fear-mongering"。`
      : "";

  return `你是紫微斗数命理权威审核员。审核以下「${PALACE_LABEL[cluster]}」科普文章是否有事实错误。

检查重点：
1. 星曜本性/五行是否正确（与下方定盘资料一致）
2. 四化对应关系：化禄/化权/化科/化忌对应的"年干"必须与下方权威四化表一致（如 廉贞化忌=丙年、廉贞化禄=甲年、贪狼化忌=癸年、太阴化忌=乙年、巨门化忌=丁年）。注意：七杀、天府、天相 本身不参与四化（无化禄化权化科化忌），若文章说"七杀化禄/天府化禄"等需标记。
3. 是否有与定盘资料矛盾的论断
4. 内部矛盾或自相矛盾
${toneRule}

【本文权威定盘资料（视为绝对正确的基准）】
${grounding}

【十干四化权威表（供交叉核对，绝对正确）】
${SIHUA_REF}

【文章内容】
${content.slice(0, 2000)}

只输出一行：PASS ${slug}  或  REVISE ${cluster}/${slug} — {具体问题}
宁可误报，不可漏报。`;
}

// ── Gemini review ─────────────────────────────────────────────────────────────
async function geminiReview(cluster, slug, attempt = 1) {
  const article = readArticle(cluster, slug);
  if (!article) return { verdict: "SKIP", reason: "file missing" };
  const entry = getEntry(cluster, slug);
  if (!entry) return { verdict: "SKIP", reason: "no data entry" };

  const content = article.markdown || "";
  const prompt = buildGeminiPrompt(cluster, slug, entry.grounding, content);

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
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return geminiReview(cluster, slug, attempt + 1);
    }
    return { verdict: "ERROR", reason: msg.slice(0, 120) };
  }
}

// ── DeepSeek adjudication ──────────────────────────────────────────────────────
async function deepseekAdjudicate(cluster, slug, geminiReason, attempt = 1) {
  const article = readArticle(cluster, slug);
  const content = article ? (article.markdown || "") : "";
  const entry = getEntry(cluster, slug);
  const grounding = entry ? entry.grounding : "";

  const prompt = `你是紫微斗数命理高精度审核员。判断 Gemini 标记的"错误"是否真实存在（避免误报）。

文章：${cluster}/${slug}（${PALACE_LABEL[cluster]}）
Gemini 标记：${geminiReason}

【权威定盘资料】
${grounding}

【十干四化权威表】
${SIHUA_REF}

【完整文章】
${content.slice(0, 2500)}

请判断：若确为事实错误/恐吓语气，输出 "REVISE ${slug} — {精确问题与应改为何}"；若是 Gemini 误报，输出 "PASS ${slug} — {为何不是错误}"。只输出一行。`;

  try {
    const resp = await deepseek.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0,
    });
    const text = (resp.choices[0]?.message?.content || "").trim();
    const confirmed =
      /^REVISE/i.test(text) ||
      /^\*\*?\s*判断[：:]\s*REVISE/i.test(text) ||
      /^\*\*REVISE/i.test(text);
    return { confirmed, raw: text };
  } catch (e) {
    const msg = e?.message ?? "";
    if (attempt < 3 && /429|503|500|timeout|fetch/i.test(msg)) {
      await new Promise(r => setTimeout(r, 2000 * attempt));
      return deepseekAdjudicate(cluster, slug, geminiReason, attempt + 1);
    }
    return { confirmed: false, raw: `ERROR: ${msg.slice(0, 100)}` };
  }
}

// ── Regen ───────────────────────────────────────────────────────────────────────
function regenArticle(cluster, slug) {
  const script = GEN_SCRIPT[cluster];
  const cmd = `npx tsx --env-file=.env.local ${script} --slug ${slug} --force`;
  console.log(`  Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    return true;
  } catch (e) {
    console.error(`  Regen failed for ${cluster}/${slug}: ${e.message}`);
    return false;
  }
}

function getSlugList(cluster) {
  return (DATA[cluster] || []).map(e => e.urlSlug);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CONC = 3;
const allResults = {};
const allFlags = [];
const confirmedErrors = [];
const regenerated = [];

for (const cluster of clusters) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Cluster: ${cluster}  (${PALACE_LABEL[cluster]})`);
  console.log("=".repeat(60));

  let slugList = getSlugList(cluster);
  if (slugsArg && clusterArg === cluster) {
    slugList = slugList.filter(s => slugsArg.includes(s));
  }

  console.log(`  Reviewing ${slugList.length} articles with Gemini…`);
  allResults[cluster] = [];

  const queue = [...slugList];
  let done = 0;

  async function workerGemini() {
    for (;;) {
      const slug = queue.shift();
      if (!slug) return;
      const result = await geminiReview(cluster, slug);
      done++;
      allResults[cluster].push({ slug, ...result });
      if (result.verdict === "REVISE") {
        console.log(`  REVISE ${cluster}/${slug} — ${result.raw}`);
        allFlags.push({ cluster, slug, geminiRaw: result.raw });
      } else if (result.verdict === "ERROR") {
        console.log(`  ERROR  ${cluster}/${slug} — ${result.reason}`);
      } else if (result.verdict === "SKIP") {
        console.log(`  SKIP   ${cluster}/${slug} — ${result.reason}`);
      }
      if (done % 5 === 0) console.log(`    …${done}/${slugList.length} done`);
    }
  }

  await Promise.all(Array.from({ length: CONC }, () => workerGemini()));

  const p = allResults[cluster].filter(r => r.verdict === "PASS").length;
  const rv = allResults[cluster].filter(r => r.verdict === "REVISE").length;
  const sk = allResults[cluster].filter(r => r.verdict === "SKIP").length;
  const er = allResults[cluster].filter(r => r.verdict === "ERROR").length;
  console.log(`  Gemini: ${p} PASS, ${rv} REVISE, ${sk} SKIP, ${er} ERROR`);

  fs.writeFileSync(`/tmp/applied_review_${cluster}.json`, JSON.stringify(allResults[cluster], null, 2));
}

// Save combined flags
fs.writeFileSync("/tmp/applied_review.json", JSON.stringify({ results: allResults, flags: allFlags }, null, 2));

// ── DeepSeek adjudication ──────────────────────────────────────────────────────
if (allFlags.length === 0) {
  console.log("\nNo REVISE flags from Gemini — all articles PASS.");
} else {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`DeepSeek adjudication: ${allFlags.length} flags`);
  console.log("=".repeat(60));

  for (const flag of allFlags) {
    console.log(`  Adjudicating: ${flag.cluster}/${flag.slug}…`);
    const result = await deepseekAdjudicate(flag.cluster, flag.slug, flag.geminiRaw);
    const entry = { ...flag, deepseekRaw: result.raw, confirmed: result.confirmed };
    if (result.confirmed) {
      console.log(`  CONFIRMED: ${flag.cluster}/${flag.slug} — ${result.raw}`);
      confirmedErrors.push(entry);
    } else {
      console.log(`  DISMISSED: ${flag.cluster}/${flag.slug} — ${result.raw}`);
    }
  }
}

fs.writeFileSync("/tmp/applied_errors.json", JSON.stringify(confirmedErrors, null, 2));
console.log(`\nConfirmed errors: ${confirmedErrors.length}`);

// ── Regenerate confirmed errors ─────────────────────────────────────────────────
if (confirmedErrors.length > 0 && !skipRegen) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Regenerating confirmed errors…");
  console.log("=".repeat(60));
  for (const err of confirmedErrors) {
    console.log(`\nRegenerating ${err.cluster}/${err.slug}…`);
    const ok = regenArticle(err.cluster, err.slug);
    regenerated.push({ ...err, regenOk: ok });
  }
} else if (confirmedErrors.length > 0 && skipRegen) {
  console.log("\n--skip-regen set: skipping regeneration.");
}

// ── Report ──────────────────────────────────────────────────────────────────────
const totalReviewed = Object.values(allResults).flat().filter(r => r.verdict !== "SKIP").length;
const totalPass = Object.values(allResults).flat().filter(r => r.verdict === "PASS").length;

const lines = [
  "# 命里 Applied-Clusters SEO Review Report",
  `Date: ${new Date().toISOString().slice(0, 10)}`,
  "",
  "## Summary",
  `- Total articles reviewed: ${totalReviewed}`,
  `- PASS: ${totalPass}`,
  `- Gemini REVISE flags: ${allFlags.length}`,
  `- Confirmed errors (DeepSeek): ${confirmedErrors.length}`,
  `- Articles regenerated: ${regenerated.length}`,
  "",
  "## Clusters",
];
for (const cluster of clusters) {
  const rows = allResults[cluster] || [];
  const p = rows.filter(r => r.verdict === "PASS").length;
  const rv = rows.filter(r => r.verdict === "REVISE").length;
  const sk = rows.filter(r => r.verdict === "SKIP").length;
  const er = rows.filter(r => r.verdict === "ERROR").length;
  lines.push(`### ${cluster}`, `- Reviewed: ${rows.length - sk} (${sk} skipped) | PASS: ${p} | REVISE: ${rv} | ERROR: ${er}`, "");
}
if (allFlags.length > 0) {
  lines.push("## Gemini Flags");
  for (const f of allFlags) lines.push(`- **${f.cluster}/${f.slug}**: ${f.geminiRaw}`);
  lines.push("");
}
if (confirmedErrors.length > 0) {
  lines.push("## Confirmed Errors");
  for (const e of confirmedErrors) lines.push(`- **${e.cluster}/${e.slug}**: ${e.deepseekRaw}`);
  lines.push("");
}
if (regenerated.length > 0) {
  lines.push("## Regenerated");
  for (const r of regenerated) lines.push(`- ${r.cluster}/${r.slug}: ${r.regenOk ? "SUCCESS" : "FAILED"}`);
}

const report = lines.join("\n");
fs.writeFileSync("/tmp/applied_review_report.md", report);
console.log("\n" + report);
console.log("\nReport: /tmp/applied_review_report.md | flags: /tmp/applied_review.json | errors: /tmp/applied_errors.json");
