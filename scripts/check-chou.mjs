// Regression guard: fails if 醜 sits next to a heavenly stem / earthly branch
// (i.e. it is almost certainly the branch 丑 mis-converted by opencc).
// Run: node scripts/check-chou.mjs   (knowledge/chunks.json is skipped if absent)
import fs from "fs";
import path from "path";

const BR = "子寅卯辰巳午未申酉戌亥已戍", ST = "甲乙丙丁戊己庚辛壬癸";
const B = `[${ST}${BR}]`, SEP = "[ \\t|\\n　、]?";
const BAD = new RegExp(
  `(?<=${B}${SEP})醜|醜(?=${SEP}${B})|醜(?=[宮時月年日土位運限刑衝害])|→醜|醜→`,
  "g"
);

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let bad = 0;
const report = (where, s) => {
  for (const m of s.matchAll(BAD)) {
    if (bad++ < 40) console.error(`${where}: …${s.slice(Math.max(0, m.index - 8), m.index + 9).replace(/\n/g, "⏎")}…`);
  }
};

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) report(path.relative(root, p), fs.readFileSync(p, "utf8"));
  }
};
walk(path.join(root, "lib"));

const chunks = path.join(root, "knowledge", "chunks.json");
if (fs.existsSync(chunks)) {
  for (const c of JSON.parse(fs.readFileSync(chunks, "utf8"))) report(c.id, c.text);
}

if (bad) {
  console.error(`\n${bad} suspicious 醜 (branch 丑 mis-converted). Fix with scripts/fixChou.mjs <file> --write`);
  process.exit(1);
}
console.log("check-chou: OK");
