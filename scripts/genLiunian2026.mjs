// Generate 2026丙午年 × 十二生肖流年運勢 articles for content/seo/liunian-2026/
// Usage:
//   npx tsx --env-file=.env.local scripts/genLiunian2026.mjs
//   npx tsx --env-file=.env.local scripts/genLiunian2026.mjs --slug ma
//   npx tsx --env-file=.env.local scripts/genLiunian2026.mjs --force

import fs from "fs";
import path from "path";
import { LIUNIAN_2026 } from "../lib/liunian2026Data.ts";
import { getLiunian2026Content } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const outDir = path.join(process.cwd(), "content", "seo", "liunian-2026");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let entries = [...LIUNIAN_2026];
if (slugFilter) entries = entries.filter(e => e.urlSlug === slugFilter);

if (entries.length === 0) {
  console.error(`No entries found matching filters (slug="${slugFilter}")`);
  process.exit(1);
}

console.log(`\n🐎 2026丙午年生肖運勢 — generating ${entries.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

let generated = 0, skipped = 0, failed = 0;
const tooShort = [];

for (const entry of entries) {
  const outFile = path.join(outDir, `${entry.urlSlug}.json`);

  if (!force && fs.existsSync(outFile)) {
    const existing = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    console.log(`  SKIP  ${entry.urlSlug} (${existing.chars ?? "?"}c already exists)`);
    skipped++;
    continue;
  }
  if (dryRun) { console.log(`  DRY   ${entry.urlSlug}`); continue; }

  const t = Date.now();
  process.stdout.write(`  GEN   ${entry.name} (${entry.urlSlug}) … `);

  try {
    const { markdown, refs } = await getLiunian2026Content(entry, undefined);
    const elapsed = Math.round((Date.now() - t) / 1000);
    const chars = markdown.length;

    const data = {
      label: entry.title,
      markdown,
      refs,
      chars,
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));

    const flag = chars < 800 ? " ⚠ SHORT" : "";
    console.log(`${chars}c in ${elapsed}s${flag}`);
    if (chars < 800) tooShort.push(entry.urlSlug);
    generated++;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    failed++;
  }
}

console.log(`\n🐎 Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);
if (tooShort.length) console.log(`⚠ Short articles (< 800c): ${tooShort.join(", ")}`);
