// Quality review pipeline for three new SEO clusters: sihua, qinggan, xiong.
// Step 1: Gemini 2.5 Flash reviews each article for factual errors.
// Step 2: DeepSeek adjudicates each Gemini REVISE flag.
// Step 3: Regenerates confirmed errors via the cluster's gen script.
// Step 4: Writes a summary report.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/reviewNewClusters.mjs
//   npx tsx --env-file=.env.local scripts/reviewNewClusters.mjs --cluster sihua
//   npx tsx --env-file=.env.local scripts/reviewNewClusters.mjs --cluster qinggan --slugs hong-luan-tianxi,tianyao-xing
//   npx tsx --env-file=.env.local scripts/reviewNewClusters.mjs --cluster xiong
//   npx tsx --env-file=.env.local scripts/reviewNewClusters.mjs --skip-regen   (review only, no regen)

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { SIHUA } from "../lib/sihuaData.ts";
import { SIHUA_TABLE } from "../lib/sihuaData.ts";
import { XIONG } from "../lib/xiongData.ts";

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const clusterArg = args.includes("--cluster") ? args[args.indexOf("--cluster") + 1] : null;
const slugsArg = args.includes("--slugs") ? args[args.indexOf("--slugs") + 1].split(",").map(s => s.trim()) : null;
const skipRegen = args.includes("--skip-regen");

const VALID_CLUSTERS = ["sihua", "qinggan", "xiong"];
const clusters = clusterArg ? [clusterArg] : VALID_CLUSTERS;
if (clusterArg && !VALID_CLUSTERS.includes(clusterArg)) {
  console.error(`Unknown cluster "${clusterArg}". Valid: ${VALID_CLUSTERS.join(", ")}`);
  process.exit(1);
}

// ── Phase 2 qinggan slugs (the ones we need to review) ──────────────────────
const QINGGAN_PHASE2_SLUGS = [
  "hong-luan-tianxi",
  "tianyao-xing",
  "xianchi",
  "liunian-fuqi-gong",
  "shangguan-qinggan",
  "gunlang-taohua",
  "bazi-hunyin",
  "hunyin-shijian",
  "nannv-yuanfen",
  "huagai-qinggan",
];

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

function getGrounding(cluster, slug) {
  if (cluster === "sihua") {
    const entry = SIHUA.find(e => e.urlSlug === slug);
    if (!entry) return null;
    // Append the full SIHUA_TABLE for cross-reference
    const tableStr = Object.entries(SIHUA_TABLE)
      .map(([stem, row]) => `${stem}年：化禄=${row.lu} 化权=${row.quan} 化科=${row.ke} 化忌=${row.ji}`)
      .join("\n");
    return `${entry.grounding}\n\n【十干四化权威表（供交叉核对）】\n${tableStr}`;
  }
  if (cluster === "xiong") {
    const entry = XIONG.find(e => e.urlSlug === slug);
    return entry ? entry.grounding : null;
  }
  // qinggan: no grounding
  return "（无固定权威定盘资料，请检查通用紫微/八字事实正确性）";
}

function buildGeminiPrompt(cluster, slug, grounding, content) {
  return `你是紫微斗数/八字命理权威审核员。审核以下命理科普文章是否有事实错误。

检查重点：
1. 星曜/十神名称与特性是否正确（如"擎羊只在特定宫位"等硬性规则）
2. 四化表对应关系（如"甲年太阳化忌"等），参考下方权威资料
3. 古籍引用或经典表述是否准确
4. 是否有内部矛盾

【权威定盘资料（本文章的）】
${grounding}

【文章内容（前800字）】
${content.slice(0, 800)}

只输出一行：PASS 或 REVISE ${slug} — {具体问题}
宁可误报，不可漏报。`;
}

// ── Gemini review ─────────────────────────────────────────────────────────────
async function geminiReview(cluster, slug, attempt = 1) {
  const article = readArticle(cluster, slug);
  if (!article) return { verdict: "SKIP", reason: "file missing" };

  const grounding = getGrounding(cluster, slug);
  if (!grounding) return { verdict: "SKIP", reason: "no grounding entry in data" };

  const content = article.markdown || "";
  const prompt = buildGeminiPrompt(cluster, slug, grounding, content);

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 200,
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

// ── DeepSeek adjudication ─────────────────────────────────────────────────────
async function deepseekAdjudicate(cluster, slug, geminiReason, attempt = 1) {
  const article = readArticle(cluster, slug);
  const content = article ? (article.markdown || "") : "";

  // Extract a ~300-char excerpt around the first mention of the key term in the reason
  const words = geminiReason.replace(/REVISE [^ ]+ — /, "").split(/\s+/).slice(0, 3);
  let excerpt = content.slice(0, 400);
  for (const word of words) {
    const idx = content.indexOf(word);
    if (idx > 0) { excerpt = content.slice(Math.max(0, idx - 50), idx + 250); break; }
  }

  const prompt = `紫微斗数/八字审核 — 判断Gemini的错误报告是否属实：

文章：${slug}
Gemini标记：${geminiReason}
相关段落：${excerpt}

判断：REVISE ${slug} — {精确问题} 或 PASS ${slug} — {解释}`;

  try {
    const resp = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0,
    });
    const text = (resp.choices[0]?.message?.content || "").trim();
    // DeepSeek sometimes prefixes with markdown bold: **判断：REVISE or **REVISE
    const confirmed = text.startsWith("REVISE") || /^\*\*判断[：:]\s*REVISE/i.test(text) || /^\*\*REVISE/i.test(text);
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

// ── Regen ─────────────────────────────────────────────────────────────────────
function regenArticle(cluster, slug) {
  const scriptMap = {
    sihua: "scripts/genSihua.mjs",
    qinggan: "scripts/genQinggan.mjs",
    xiong: "scripts/genXiong.mjs",
  };
  const script = scriptMap[cluster];
  const jsonPath = path.join(process.cwd(), "content", "seo", cluster, `${slug}.json`);

  // Delete existing file to ensure clean regen
  if (fs.existsSync(jsonPath)) {
    fs.unlinkSync(jsonPath);
    console.log(`  Deleted ${cluster}/${slug}.json`);
  }

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

// ── Build job list per cluster ─────────────────────────────────────────────────
function getSlugList(cluster) {
  if (cluster === "sihua") {
    return SIHUA.map(e => e.urlSlug);
  }
  if (cluster === "qinggan") {
    return QINGGAN_PHASE2_SLUGS;
  }
  if (cluster === "xiong") {
    return XIONG.map(e => e.urlSlug);
  }
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────
const CONC = 3; // concurrent Gemini calls

const allResults = {};       // cluster → { slug, geminiVerdict, ... }
const allFlags = [];         // all REVISE flags across clusters
const confirmedErrors = [];  // confirmed by DeepSeek
const regenerated = [];

for (const cluster of clusters) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Cluster: ${cluster}`);
  console.log("=".repeat(60));

  let slugList = getSlugList(cluster);
  if (slugsArg && clusterArg === cluster) {
    slugList = slugList.filter(s => slugsArg.includes(s));
  }

  console.log(`  Reviewing ${slugList.length} articles with Gemini…`);
  allResults[cluster] = [];

  // Concurrent Gemini reviews
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
      }
      if (done % 5 === 0) console.log(`    …${done}/${slugList.length} done`);
    }
  }

  await Promise.all(Array.from({ length: CONC }, () => workerGemini()));

  const passCount = allResults[cluster].filter(r => r.verdict === "PASS").length;
  const reviseCount = allResults[cluster].filter(r => r.verdict === "REVISE").length;
  const skipCount = allResults[cluster].filter(r => r.verdict === "SKIP").length;
  const errCount = allResults[cluster].filter(r => r.verdict === "ERROR").length;
  console.log(`  Gemini: ${passCount} PASS, ${reviseCount} REVISE, ${skipCount} SKIP, ${errCount} ERROR`);

  // Save per-cluster Gemini results
  fs.writeFileSync(
    `/tmp/mingli_review_${cluster}.json`,
    JSON.stringify(allResults[cluster], null, 2)
  );
}

// ── DeepSeek adjudication ─────────────────────────────────────────────────────
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

fs.writeFileSync(
  "/tmp/mingli_confirmed_errors.json",
  JSON.stringify(confirmedErrors, null, 2)
);
console.log(`\nConfirmed errors: ${confirmedErrors.length}`);

// ── Regenerate confirmed errors ───────────────────────────────────────────────
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

// ── Report ────────────────────────────────────────────────────────────────────
const totalReviewed = Object.values(allResults).flat().filter(r => r.verdict !== "SKIP").length;
const totalPass = Object.values(allResults).flat().filter(r => r.verdict === "PASS").length;

const reportLines = [
  "# 命里 SEO Review Report",
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
  reportLines.push(`### ${cluster}`);
  reportLines.push(`- Reviewed: ${rows.length - sk} (${sk} skipped)`);
  reportLines.push(`- PASS: ${p} | REVISE flags: ${rv} | ERROR: ${er}`);
  reportLines.push("");
}

if (allFlags.length > 0) {
  reportLines.push("## Gemini Flags");
  for (const f of allFlags) {
    reportLines.push(`- **${f.cluster}/${f.slug}**: ${f.geminiRaw}`);
  }
  reportLines.push("");
}

if (confirmedErrors.length > 0) {
  reportLines.push("## Confirmed Errors");
  for (const e of confirmedErrors) {
    reportLines.push(`- **${e.cluster}/${e.slug}**: ${e.deepseekRaw}`);
  }
  reportLines.push("");
}

if (regenerated.length > 0) {
  reportLines.push("## Regenerated Articles");
  for (const r of regenerated) {
    reportLines.push(`- ${r.cluster}/${r.slug}: ${r.regenOk ? "SUCCESS" : "FAILED"}`);
  }
  reportLines.push("");
}

const report = reportLines.join("\n");
fs.writeFileSync("/tmp/mingli_review_report.md", report);
console.log("\n" + report);
console.log("\nReport saved to /tmp/mingli_review_report.md");
console.log("Gemini results per cluster: /tmp/mingli_review_{cluster}.json");
console.log("Confirmed errors: /tmp/mingli_confirmed_errors.json");
