// Generate 八字 applied-life-domain cluster articles into content/seo/<kind>/
// Clusters: baziHunyin | baziShiye | baziCaiyun | baziJibing
// Usage:
//   npx tsx --env-file=.env.local scripts/genBaziApplied.mjs baziHunyin
//   npx tsx --env-file=.env.local scripts/genBaziApplied.mjs baziShiye --force
//   npx tsx --env-file=.env.local scripts/genBaziApplied.mjs baziCaiyun --slug caige
//   npx tsx --env-file=.env.local scripts/genBaziApplied.mjs all

import fs from "fs";
import path from "path";
import { BAZI_HUNYIN } from "../lib/baziHunyinData.ts";
import { BAZI_SHIYE } from "../lib/baziShiyeData.ts";
import { BAZI_CAIYUN } from "../lib/baziCaiyunData.ts";
import { BAZI_JIBING } from "../lib/baziJibingData.ts";
import {
  getBaziHunyinContent,
  getBaziShiyeContent,
  getBaziCaiyunContent,
  getBaziJibingContent,
} from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const cluster = args[0];
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const CLUSTERS = {
  baziHunyin: { list: BAZI_HUNYIN, gen: getBaziHunyinContent, kind: "bazi-hunyin", emoji: "💞", labelOf: e => e.name },
  baziShiye:  { list: BAZI_SHIYE,  gen: getBaziShiyeContent,  kind: "bazi-shiye",  emoji: "💼", labelOf: e => e.name },
  baziCaiyun: { list: BAZI_CAIYUN, gen: getBaziCaiyunContent, kind: "bazi-caiyun", emoji: "💰", labelOf: e => e.name },
  baziJibing: { list: BAZI_JIBING, gen: getBaziJibingContent, kind: "bazi-jibing", emoji: "🌿", labelOf: e => e.name },
};

const targets = cluster === "all" ? Object.keys(CLUSTERS) : [cluster];
if (!cluster || (cluster !== "all" && !CLUSTERS[cluster])) {
  console.error(`Usage: genBaziApplied.mjs <baziHunyin|baziShiye|baziCaiyun|baziJibing|all> [--slug x] [--force]`);
  process.exit(1);
}

let totalGen = 0, totalSkip = 0, totalFail = 0;
const allShort = [];

for (const key of targets) {
  const cfg = CLUSTERS[key];
  const outDir = path.join(process.cwd(), "content", "seo", cfg.kind);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const entries = slugFilter ? cfg.list.filter(e => e.urlSlug === slugFilter) : [...cfg.list];
  if (entries.length === 0) { console.error(`No entry matching --slug "${slugFilter}" in ${key}`); continue; }

  console.log(`\n${cfg.emoji} ${key} — generating ${entries.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

  for (const entry of entries) {
    const outFile = path.join(outDir, `${entry.urlSlug}.json`);
    if (!force && fs.existsSync(outFile)) {
      const existing = JSON.parse(fs.readFileSync(outFile, "utf-8"));
      console.log(`  SKIP  ${entry.urlSlug} (${existing.chars ?? "?"}c already exists)`);
      totalSkip++;
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
      const flag = chars < 800 ? " ⚠ SHORT" : "";
      console.log(`${chars}c in ${elapsed}s${flag}`);
      if (chars < 800) allShort.push(`${key}/${entry.urlSlug}(${chars}c)`);
      totalGen++;
    } catch (err) {
      console.error(`FAILED\n    Error: ${err.message}`);
      totalFail++;
    }
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`  Generated: ${totalGen}  Skipped: ${totalSkip}  Failed: ${totalFail}`);
if (allShort.length > 0) console.log(`  Too short (<800c): ${allShort.join(", ")}`);
console.log(`──────────────────────────────────────────\n`);
