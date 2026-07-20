// Generate 紫微×星座 性格原型对照 articles.
// Usage:
//   npx tsx --env-file=.env.local scripts/genZodiac.mjs                    # all 26 articles
//   npx tsx --env-file=.env.local scripts/genZodiac.mjs star               # 14 主星→星座 only
//   npx tsx --env-file=.env.local scripts/genZodiac.mjs zodiac             # 12 星座→紫微 only
//   npx tsx --env-file=.env.local scripts/genZodiac.mjs zodiac --slug baiyang   # single article
//   npx tsx --env-file=.env.local scripts/genZodiac.mjs --force            # regenerate all
import fs from "fs";
import path from "path";
import { STAR_ZODIAC_LIST, ZODIAC_ZIWEI_LIST } from "../lib/personalityData.ts";
import { getStarZodiacContent, getZodiacZiweiContent } from "../lib/seoContent.ts";

const arg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "all";
const FORCE = process.argv.includes("--force");
const slugIdx = process.argv.indexOf("--slug");
const ONLY_SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1] : null;
const conc = Number((process.argv.find((a) => a.startsWith("--concurrency=")) ?? "=3").split("=")[1]) || 3;
const ROOT = path.join(process.cwd(), "content", "seo", "zodiac");
fs.mkdirSync(ROOT, { recursive: true });

function outPath(key) { return path.join(ROOT, `${key}.json`); }
function exists(key) {
  const f = outPath(key);
  if (!fs.existsSync(f)) return false;
  try { return !!JSON.parse(fs.readFileSync(f, "utf-8")).markdown?.trim(); } catch { return false; }
}
function save(key, label, markdown) {
  fs.writeFileSync(outPath(key), JSON.stringify({
    label, markdown, refs: [], chars: markdown.length,
    generatedAt: new Date().toISOString(),
  }, null, 2));
}

const jobs = [];
if (arg === "star" || arg === "all") {
  for (const entry of STAR_ZODIAC_LIST)
    jobs.push({ key: entry.slug, label: `${entry.starName}×${entry.primaryZodiac}`, run: () => getStarZodiacContent(entry) });
}
if (arg === "zodiac" || arg === "all") {
  for (const entry of ZODIAC_ZIWEI_LIST)
    jobs.push({ key: entry.slug, label: `${entry.zodiacName}×紫微`, run: () => getZodiacZiweiContent(entry) });
}

let pool = jobs;
if (ONLY_SLUG) pool = pool.filter((j) => j.key === ONLY_SLUG);

const todo = pool.filter((j) => FORCE || !exists(j.key));
if (FORCE) todo.forEach((j) => { try { fs.unlinkSync(outPath(j.key)); } catch {} });
console.log(`Zodiac | total ${pool.length}, already done ${pool.length - todo.length}, to generate ${todo.length}, concurrency ${conc}`);

let done = 0; const failed = [];
const t0 = Date.now();
async function worker(queue) {
  for (;;) {
    const job = queue.shift();
    if (!job) return;
    try {
      const { markdown } = await job.run();
      if (!markdown?.trim()) failed.push(job.label + " (empty)");
      else save(job.key, job.label, markdown);
    } catch (e) { failed.push(job.label + " (" + (e?.message ?? e) + ")"); }
    done++;
    if (done % 5 === 0 || done === todo.length)
      console.log(`  ${done}/${todo.length} (${Math.round((Date.now() - t0) / 1000)}s) last: ${job.label}`);
  }
}
const queue = [...todo];
await Promise.all(Array.from({ length: conc }, () => worker(queue)));
console.log(`\nDONE in ${Math.round((Date.now() - t0) / 1000)}s. Generated ${todo.length - failed.length}, failed ${failed.length}.`);
if (failed.length) { console.log("FAILED:"); failed.forEach((f) => console.log("  -", f)); }
