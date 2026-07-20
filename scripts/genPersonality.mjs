// Generate 紫微×MBTI personality crossover articles.
// Usage:
//   npx tsx --env-file=.env.local scripts/genPersonality.mjs           # all 30 articles
//   npx tsx --env-file=.env.local scripts/genPersonality.mjs star       # 14 star→MBTI only
//   npx tsx --env-file=.env.local scripts/genPersonality.mjs mbti       # 16 MBTI→ziwei only
//   npx tsx --env-file=.env.local scripts/genPersonality.mjs --force    # regenerate all
import fs from "fs";
import path from "path";
import { STAR_MBTI_LIST, MBTI_ZIWEI_LIST } from "../lib/personalityData.ts";
import { getStarMbtiContent, getMbtiZiweiContent } from "../lib/seoContent.ts";

const arg = process.argv[2] ?? "all";
const FORCE = process.argv.includes("--force");
const conc = Number((process.argv.find((a) => a.startsWith("--concurrency=")) ?? "=3").split("=")[1]) || 3;
const ROOT = path.join(process.cwd(), "content", "seo", "personality");
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
  for (const entry of STAR_MBTI_LIST)
    jobs.push({ key: entry.slug, label: `${entry.starName}×${entry.primaryMbti}`, run: () => getStarMbtiContent(entry) });
}
if (arg === "mbti" || arg === "all") {
  for (const entry of MBTI_ZIWEI_LIST)
    jobs.push({ key: entry.slug, label: `${entry.mbtiCode}×紫微`, run: () => getMbtiZiweiContent(entry) });
}

const todo = jobs.filter((j) => FORCE || !exists(j.key));
if (FORCE) todo.forEach((j) => { try { fs.unlinkSync(outPath(j.key)); } catch {} });
console.log(`Personality | total ${jobs.length}, already done ${jobs.length - todo.length}, to generate ${todo.length}, concurrency ${conc}`);

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
