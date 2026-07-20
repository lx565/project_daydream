// Generate 八字 hub cluster articles (tiangan | geju) into content/seo/<kind>/
// Usage:
//   npx tsx --env-file=.env.local scripts/genBaziCluster.mjs tiangan
//   npx tsx --env-file=.env.local scripts/genBaziCluster.mjs geju --force
//   npx tsx --env-file=.env.local scripts/genBaziCluster.mjs tiangan --slug jiamu

import fs from "fs";
import path from "path";
import { TIANGAN } from "../lib/baziTiangan.ts";
import { GEJU } from "../lib/baziGeju.ts";
import { BAZI_GUIDE } from "../lib/baziGuide.ts";
import { getTianganContent, getGejuContent, getBaziGuideContent } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const cluster = args[0];
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const CLUSTERS = {
  tiangan:   { list: TIANGAN,    gen: getTianganContent,   kind: "tiangan",   emoji: "🌳", labelOf: e => `${e.gan}${e.element}日主` },
  geju:      { list: GEJU,       gen: getGejuContent,      kind: "geju",      emoji: "🀄", labelOf: e => e.name },
  baziguide: { list: BAZI_GUIDE, gen: getBaziGuideContent, kind: "baziguide", emoji: "📘", labelOf: e => e.name },
};

const cfg = CLUSTERS[cluster];
if (!cfg) {
  console.error(`Usage: genBaziCluster.mjs <tiangan|geju|baziguide> [--slug x] [--force]`);
  process.exit(1);
}

const outDir = path.join(process.cwd(), "content", "seo", cfg.kind);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const entries = slugFilter ? cfg.list.filter(e => e.urlSlug === slugFilter) : [...cfg.list];
if (entries.length === 0) { console.error(`No entry matching --slug "${slugFilter}"`); process.exit(1); }

console.log(`\n${cfg.emoji} 八字${cluster} — generating ${entries.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

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
  process.stdout.write(`  GEN   ${cfg.labelOf(entry)} (${entry.urlSlug}) … `);
  try {
    const { markdown, refs } = await cfg.gen(entry, undefined);
    const elapsed = Math.round((Date.now() - t) / 1000);
    const chars = markdown.length;
    fs.writeFileSync(outFile, JSON.stringify({
      label: entry.title, markdown, refs, chars, generatedAt: new Date().toISOString(),
    }, null, 2));
    console.log(`${chars}c in ${elapsed}s`);
    generated++;
    if (chars < 400) { tooShort.push({ slug: entry.urlSlug, chars }); console.warn(`  ⚠️  SHORT: ${entry.urlSlug} only ${chars}c`); }
  } catch (err) {
    console.error(`FAILED\n    Error: ${err.message}`);
    failed++;
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`  Generated: ${generated}  Skipped: ${skipped}  Failed: ${failed}`);
if (tooShort.length > 0) console.log(`  Too short: ${tooShort.map(x => `${x.slug}(${x.chars}c)`).join(", ")}`);
console.log(`──────────────────────────────────────────\n`);
