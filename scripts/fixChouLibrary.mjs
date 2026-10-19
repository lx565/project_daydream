// Fix 醜 -> 丑 (earthly branch) in content/seo/**/*.json library articles.
// Usage: node scripts/fixChouLibrary.mjs [--write] [--report reports/library-chou.md]
import fs from "fs";
import path from "path";
import { conv } from "./chouRules.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const ri = args.indexOf("--report");
const reportPath = ri >= 0 ? args[ri + 1] : null;

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".json")) files.push(p);
  }
};
walk(path.join(root, "content", "seo"));
files.sort();

const ctx = (s, i, ch) => s.slice(Math.max(0, i - 8), i) + ch + s.slice(i + 1, i + 9);
const changes = [], kept = [];
let nFiles = 0;

for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  const nl = raw.endsWith("\n") ? "\n" : "";
  const d = JSON.parse(raw);
  if (JSON.stringify(d, null, 2) + nl !== raw) throw new Error("roundtrip mismatch: " + f);
  if (!raw.includes("醜")) continue;
  const rel = path.relative(root, f);
  const folder = path.relative(path.join(root, "content", "seo"), path.dirname(f)) || ".";
  let touched = false;
  for (const [k, v] of Object.entries(d)) {
    if (typeof v !== "string" || !v.includes("醜")) continue;
    const nv = conv(v);
    if (nv.length !== v.length) throw new Error("length changed " + f);
    for (let i = 0; i < v.length; i++) {
      if (v[i] === "醜" && nv[i] === "丑") changes.push({ folder, rel, k, b: ctx(v, i, "醜"), a: ctx(nv, i, "丑") });
      else if (v[i] === "醜") kept.push({ folder, rel, k, b: ctx(v, i, "醜") });
    }
    if (nv !== v) { d[k] = nv; touched = true; }
  }
  if (touched) {
    nFiles++;
    if (write) fs.writeFileSync(f, JSON.stringify(d, null, 2) + nl);
  }
}

const group = (arr, fn) => {
  const m = new Map();
  for (const x of arr) (m.get(x.folder) ?? m.set(x.folder, []).get(x.folder)).push(x);
  return [...m].map(([fo, xs]) => `### ${fo} (${xs.length})\n` + xs.map(fn).join("\n")).join("\n\n");
};
const esc = (s) => s.replace(/\n/g, "⏎");
console.log(`changed: ${changes.length} chars in ${nFiles} files; unchanged 醜 left: ${kept.length}${write ? " (written)" : " (dry run)"}`);
if (reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath,
    `# Library 醜→丑 report\n\nChanged: ${changes.length} chars in ${nFiles} files. Left unchanged: ${kept.length}.\n\n## Changes\n\n` +
    group(changes, (c) => `- ${c.rel} [${c.k}]: \`${esc(c.b)}\` → \`${esc(c.a)}\``) +
    `\n\n## Unchanged 醜 (review for false negatives)\n\n` +
    group(kept, (c) => `- ${c.rel} [${c.k}]: \`${esc(c.b)}\``) + "\n");
}
