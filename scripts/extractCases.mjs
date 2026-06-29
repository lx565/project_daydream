// Extract 八字 命造 cases from case-study books.
// Usage:
//   npx tsx --env-file=.env.local scripts/extractCases.mjs
//   npx tsx --env-file=.env.local scripts/extractCases.mjs --book "韦千里-千里命稿"
//   npx tsx --env-file=.env.local scripts/extractCases.mjs --limit 10 --dry-run
//   npx tsx --env-file=.env.local scripts/extractCases.mjs --force

import fs from "fs";
import path from "path";
import { callAI } from "../lib/callAI.ts";

const args = process.argv.slice(2);
const bookFilter = args.includes("--book") ? args[args.indexOf("--book") + 1] : null;
const limitArg   = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : Infinity;
const dryRun     = args.includes("--dry-run");
const force      = args.includes("--force");

const CASES_DIR = path.join(process.cwd(), "content", "cases");
if (!dryRun) fs.mkdirSync(CASES_DIR, { recursive: true });

const CASE_STUDY_BOOKS = new Set([
  "韦千里-千里命稿",
  "人鉴命理存验五十例",
  "人鑒命理存驗",
  "四柱详批命例精解",
  "八字实例详解",
  "潘东光-八字批论选集",
  "李洪成-古今四柱6000例简析-丙丁年生命造1000例",
]);

const BOOK_SLUG = {
  "韦千里-千里命稿":     "qianli",
  "人鉴命理存验五十例":  "renjian",
  "人鑒命理存驗":        "renjian-t",
  "四柱详批命例精解":    "sizhu",
  "八字实例详解":        "bazi-sl",
  "潘东光-八字批论选集": "pandong",
  "李洪成-古今四柱6000例简析-丙丁年生命造1000例": "lihong",
};

const BOOK_LABEL = {
  "韦千里-千里命稿":     "韦千里《千里命稿》",
  "人鉴命理存验五十例":  "《人鉴命理存验五十例》",
  "人鑒命理存驗":        "《人鉴命理存验》",
  "四柱详批命例精解":    "《四柱详批命例精解》",
  "八字实例详解":        "《八字实例详解》",
  "潘东光-八字批论选集": "潘东光《八字批论选集》",
  "李洪成-古今四柱6000例简析-丙丁年生命造1000例": "李洪成《古今四柱6000例简析》",
};

const SYSTEM = `你是八字命理案例提取专家。分析给定文本，提取其中的八字命造案例。

每个案例必须同时具备：（1）八字四柱信息 或 日主信息；（2）命理师的批断分析（不少于30字）。

只输出合法JSON（无代码块、无多余文字）：
{
  "cases": [
    {
      "bazi_text": "甲子 乙丑 甲午 庚申",
      "rizi": "甲木",
      "geju": "食神格",
      "yongshen": "丙火",
      "gender": "male",
      "era": "民国",
      "analysis": "（命理师批断原文，完整）",
      "prediction": "（从批断中提取的预测部分）",
      "outcome": "（结局验证，若无则留空字符串）"
    }
  ]
}

字段规则：
- bazi_text: 四柱天干地支，空格分隔四柱；若仅有日主无完整四柱则留空
- rizi: 日主天干+五行，如"甲木"（必填，若无法判断则整个案例不提取）
- geju: 格局名称，如"食神格"；不确定则留空
- yongshen: 用神，如"丙火"；不确定则留空
- era: 民国/近代/古代/当代/""
- 若文本不含任何命造案例（纯理论/目录/序言/注释），返回 {"cases":[]}`;

const chunks = JSON.parse(fs.readFileSync(path.join(process.cwd(), "knowledge", "chunks.json"), "utf-8"));

// Filter to case books only
const filtered = chunks.filter(c =>
  CASE_STUDY_BOOKS.has(c.book) &&
  (!bookFilter || c.book === bookFilter)
);

console.log(`Processing ${Math.min(filtered.length, limitArg)} chunks from ${bookFilter ?? "all case books"}...`);

// Track per-book counters for sequential IDs
const bookCounters = {};

// Load existing index to skip already-extracted IDs
const indexPath = path.join(CASES_DIR, "index.json");
let existingIndex = [];
try { existingIndex = JSON.parse(fs.readFileSync(indexPath, "utf-8")); } catch { /* empty */ }
const existingIds = new Set(existingIndex.map(e => e.id));

const newCases = [];
let processed = 0, extracted = 0, skipped = 0, errors = 0;

for (const chunk of filtered) {
  if (processed >= limitArg) break;
  processed++;

  if (processed % 50 === 0) {
    console.log(`  …${processed}/${Math.min(filtered.length, limitArg)} (extracted: ${extracted})`);
  }

  let raw;
  try {
    raw = await callAI({
      system: SYSTEM,
      userMessage: chunk.text,
      maxTokens: 1500,
      temperature: 0.1,
      jsonMode: true,
    });
  } catch (e) {
    console.error(`  ERROR on chunk from ${chunk.book}:`, e.message);
    errors++;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    errors++;
    continue;
  }

  const cases = parsed?.cases ?? [];
  if (!Array.isArray(cases) || cases.length === 0) continue;

  const bookSlug = BOOK_SLUG[chunk.book] ?? "unknown";
  bookCounters[bookSlug] = bookCounters[bookSlug] ?? 0;

  for (const c of cases) {
    if (!c.rizi || typeof c.rizi !== "string") continue;
    if (!c.analysis || c.analysis.length < 30) continue;

    bookCounters[bookSlug]++;
    const id = `${bookSlug}-${String(bookCounters[bookSlug]).padStart(3, "0")}`;

    if (!force && existingIds.has(id)) {
      skipped++;
      continue;
    }

    const record = {
      id,
      slug: id,
      source: chunk.book,
      sourceLabel: BOOK_LABEL[chunk.book] ?? chunk.book,
      rizi: c.rizi.trim(),
      geju: (c.geju ?? "").trim(),
      yongshen: (c.yongshen ?? "").trim(),
      bazi_text: (c.bazi_text ?? "").trim(),
      gender: ["male","female","unknown"].includes(c.gender) ? c.gender : "unknown",
      era: (c.era ?? "").trim(),
      analysis: (c.analysis ?? "").trim(),
      prediction: (c.prediction ?? "").trim(),
      outcome: (c.outcome ?? "").trim(),
    };

    if (!dryRun) {
      fs.writeFileSync(
        path.join(CASES_DIR, `${id}.json`),
        JSON.stringify(record, null, 2),
        "utf-8"
      );
    }

    newCases.push({
      id: record.id,
      slug: record.slug,
      source: record.source,
      rizi: record.rizi,
      geju: record.geju,
      hasOutcome: record.outcome.length > 0,
    });
    extracted++;
  }
}

// Rebuild full index by scanning all *.json files in content/cases/ (except index.json)
if (!dryRun) {
  const allFiles = fs.readdirSync(CASES_DIR)
    .filter(f => f.endsWith(".json") && f !== "index.json")
    .sort();

  const fullIndex = allFiles.map(f => {
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), "utf-8"));
      return {
        id: rec.id,
        slug: rec.slug,
        source: rec.source,
        rizi: rec.rizi,
        geju: rec.geju,
        hasOutcome: (rec.outcome ?? "").length > 0,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  fs.writeFileSync(indexPath, JSON.stringify(fullIndex, null, 2), "utf-8");
  console.log(`\nIndex rebuilt: ${fullIndex.length} total cases`);
}

console.log(`\nDone. Chunks: ${processed} | Extracted: ${extracted} | Skipped: ${skipped} | Errors: ${errors}`);
if (dryRun) console.log("(dry-run — nothing written)");
