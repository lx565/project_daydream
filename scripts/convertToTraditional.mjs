// Convert all user-facing content from Simplified Chinese to Traditional Chinese (Taiwan Standard).
// Uses opencc-js with s2twp profile (simplified → traditional + Taiwan phrase replacements).
//
// Converts:
//   content/seo/**/*.json     — SEO article content (markdown + labels)
//   content/cases/**/*.json   — Historical case pages
//   content/cases-domains/**/*.json — Domain case cards
//   lib/**/*.ts               — Data files (titles, subtitles, grounding strings)
//   app/**/*.tsx / app/**/*.ts — Page components and UI
//   components/**/*.tsx        — Shared components
//
// Skips:
//   knowledge/                 — RAG corpus (source texts, cross-script retrieval works fine)
//   node_modules/              — Never
//   scripts/                   — Dev-only scripts
//
// Usage:
//   npx tsx scripts/convertToTraditional.mjs             # dry run (shows counts)
//   npx tsx scripts/convertToTraditional.mjs --apply     # apply conversion
//   npx tsx scripts/convertToTraditional.mjs --apply --only-content  # JSON files only
//   npx tsx scripts/convertToTraditional.mjs --apply --only-code     # TS/TSX files only

import fs from "fs";
import path from "path";
import { Converter } from "opencc-js";

const args        = process.argv.slice(2);
const apply       = args.includes("--apply");
const onlyContent = args.includes("--only-content");
const onlyCode    = args.includes("--only-code");

const ROOT = process.cwd();
const convert = Converter({ from: "cn", to: "twp" });

// ── Stats ────────────────────────────────────────────────────────────────────
let totalFiles = 0, changedFiles = 0, skippedFiles = 0;

// ── JSON conversion: recursively converts all string values (not keys) ───────
function convertJsonValue(val) {
  if (typeof val === "string") return convert(val);
  if (Array.isArray(val))      return val.map(convertJsonValue);
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = convertJsonValue(v);
    return out;
  }
  return val;
}

function processJsonFile(filePath) {
  totalFiles++;
  const raw = fs.readFileSync(filePath, "utf8");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { skippedFiles++; return; }

  const converted    = convertJsonValue(parsed);
  const convertedStr = JSON.stringify(converted, null, 2);

  if (convertedStr === JSON.stringify(parsed, null, 2)) { skippedFiles++; return; }

  changedFiles++;
  if (apply) {
    fs.writeFileSync(filePath, convertedStr, "utf8");
  } else {
    console.log(`  [DRY] would convert: ${path.relative(ROOT, filePath)}`);
  }
}

// ── Text/code conversion: runs whole file through opencc (safe for TS/TSX) ──
function processTextFile(filePath) {
  totalFiles++;
  const raw = fs.readFileSync(filePath, "utf8");

  // Quick check: does this file contain any CJK?
  if (!/[一-鿿㐀-䶿豈-﫿]/.test(raw)) {
    skippedFiles++;
    return;
  }

  const converted = convert(raw);
  if (converted === raw) { skippedFiles++; return; }

  changedFiles++;
  if (apply) {
    fs.writeFileSync(filePath, converted, "utf8");
  } else {
    const lineCount = (raw.match(/[一-鿿]/g) || []).length;
    console.log(`  [DRY] would convert: ${path.relative(ROOT, filePath)} (${lineCount} CJK chars)`);
  }
}

// ── File walker ───────────────────────────────────────────────────────────────
function walk(dir, ext, handler, skipDirs = []) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (skipDirs.includes(name) || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, ext, handler, skipDirs);
    } else if (ext.some(e => name.endsWith(e))) {
      handler(full);
    }
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log(`\n四化详解 → 繁體字 Conversion ${apply ? "(APPLYING)" : "(DRY RUN — pass --apply to write)"}\n`);

if (!onlyCode) {
  console.log("── content/seo /**/*.json");
  walk(path.join(ROOT, "content", "seo"),          [".json"], processJsonFile);

  console.log("── content/cases/**/*.json");
  walk(path.join(ROOT, "content", "cases"),         [".json"], processJsonFile);

  console.log("── content/cases-domains/**/*.json");
  walk(path.join(ROOT, "content", "cases-domains"), [".json"], processJsonFile);
}

if (!onlyContent) {
  console.log("── lib/**/*.ts");
  walk(path.join(ROOT, "lib"), [".ts"], processTextFile, ["__tests__"]);

  console.log("── app/**/*.tsx  app/**/*.ts");
  walk(path.join(ROOT, "app"), [".tsx", ".ts"], processTextFile, ["node_modules"]);

  console.log("── components/**/*.tsx");
  walk(path.join(ROOT, "components"), [".tsx", ".ts"], processTextFile, ["node_modules"]);
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total files scanned : ${totalFiles}`);
console.log(`Files with changes  : ${changedFiles}`);
console.log(`Files unchanged     : ${skippedFiles}`);
if (!apply && changedFiles > 0) {
  console.log(`\n→ Run with --apply to write changes.`);
}
if (apply) {
  console.log(`\n✓ Done. ${changedFiles} files converted to Traditional Chinese.`);
  console.log(`  Next: run "npx tsc --noEmit" to verify TypeScript still passes.`);
  console.log(`  Then: npx vercel --prod --yes`);
}
