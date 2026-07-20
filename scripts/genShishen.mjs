// Generate all 10 八字 十神 articles for content/seo/shishen/
// Usage:
//   npx tsx --env-file=.env.local scripts/genShishen.mjs
//   npx tsx --env-file=.env.local scripts/genShishen.mjs --slug zhengguan
//   npx tsx --env-file=.env.local scripts/genShishen.mjs --force

import fs from "fs";
import path from "path";
import { SHISHEN } from "../lib/baziShishen.ts";
import { getShishenContent } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const outDir = path.join(process.cwd(), "content", "seo", "shishen");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const entries = slugFilter
  ? SHISHEN.filter(s => s.urlSlug === slugFilter)
  : [...SHISHEN];

if (entries.length === 0) {
  console.error(`No 十神 found matching --slug "${slugFilter}"`);
  process.exit(1);
}

console.log(`\n🀄 八字十神 — generating ${entries.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

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
    const { markdown, refs } = await getShishenContent(entry, undefined);
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
    console.log(`${chars}c in ${elapsed}s`);
    generated++;

    if (chars < 400) {
      tooShort.push({ slug: entry.urlSlug, chars });
      console.warn(`  ⚠️  SHORT: ${entry.urlSlug} only ${chars} chars — may need review`);
    }
  } catch (err) {
    console.error(`FAILED`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`  Generated: ${generated}`);
console.log(`  Skipped:   ${skipped}`);
console.log(`  Failed:    ${failed}`);
if (tooShort.length > 0) {
  console.log(`  Too short: ${tooShort.map(x => `${x.slug}(${x.chars}c)`).join(", ")}`);
}
console.log(`──────────────────────────────────────────\n`);
