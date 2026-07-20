// Generate SEO articles to ./content/seo/** as reviewable JSON files.
// Usage: npx tsx --env-file=.env.local scripts/genContent.mjs <palace|guide|star|mingge|assistantstar|all> [--force] [--concurrency=3]
import fs from "fs";
import path from "path";
import { MAJOR_STARS, PALACES } from "../lib/starData.ts";
import { GUIDE_TOPICS } from "../lib/guideTopics.ts";
import { MINGGE_LIST } from "../lib/minggeData.ts";
import { ASSISTANT_STARS } from "../lib/assistantStarData.ts";
import { getStarPalaceContent, getPalaceHubContent, getGuideContent, getMinggeContent, getAssistantStarPalaceContent } from "../lib/seoContent.ts";

const arg = process.argv[2] ?? "all";
const FORCE = process.argv.includes("--force");
const conc = Number((process.argv.find((a) => a.startsWith("--concurrency=")) ?? "=3").split("=")[1]) || 3;
const ROOT = path.join(process.cwd(), "content", "seo");

function outPath(kind, key) { return path.join(ROOT, kind, `${key}.json`); }
function exists(kind, key) {
  const f = outPath(kind, key);
  if (!fs.existsSync(f)) return false;
  try { return !!JSON.parse(fs.readFileSync(f, "utf-8")).markdown?.trim(); } catch { return false; }
}
function save(kind, key, label, markdown, refs) {
  const f = outPath(kind, key);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ label, markdown, refs, chars: markdown.length, generatedAt: new Date().toISOString() }, null, 2));
}

// Build the work list: { kind, key, label, run() }
const jobs = [];
if (arg === "palace" || arg === "all") {
  for (const p of PALACES) jobs.push({ kind: "palace", key: p.name, label: p.name, run: () => getPalaceHubContent(p) });
}
if (arg === "guide" || arg === "all") {
  for (const g of GUIDE_TOPICS) jobs.push({ kind: "guide", key: g.slug, label: g.title, run: () => getGuideContent(g) });
}
if (arg === "star" || arg === "all") {
  for (const s of MAJOR_STARS) for (const p of PALACES)
    jobs.push({ kind: "star", key: `${s.name}__${p.name}`, label: `${s.name}在${p.name}`, run: () => getStarPalaceContent(s, p) });
}
if (arg === "mingge" || arg === "all") {
  for (const m of MINGGE_LIST)
    jobs.push({ kind: "mingge", key: m.slug, label: m.name, run: () => getMinggeContent(m) });
}
if (arg === "assistantstar") {
  for (const s of ASSISTANT_STARS) for (const p of PALACES)
    jobs.push({ kind: "assistantstar", key: `${s.name}__${p.name}`, label: `${s.name}在${p.name}`, run: () => getAssistantStarPalaceContent(s, p) });
}

const todo = jobs.filter((j) => FORCE || !exists(j.kind, j.key));
console.log(`Type: ${arg} | total ${jobs.length}, already done ${jobs.length - todo.length}, to generate ${todo.length}, concurrency ${conc}`);

let done = 0, failed = [];
const t0 = Date.now();
async function worker(queue) {
  for (;;) {
    const job = queue.shift();
    if (!job) return;
    // On --force, remove the existing file so the content fn regenerates instead of
    // returning the pre-generated copy.
    if (FORCE) { try { fs.unlinkSync(outPath(job.kind, job.key)); } catch {} }
    try {
      const { markdown, refs } = await job.run();
      if (!markdown || !markdown.trim()) { failed.push(job.label + " (empty)"); }
      else { save(job.kind, job.key, job.label, markdown, refs); }
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
