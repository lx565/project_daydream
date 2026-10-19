// One-off/idempotent: convert 醜 -> 丑 where it is the earthly branch.
// Usage: node scripts/fixChou.mjs <file.json|file.ts> [--write]
// For .json arrays of {text} chunks only the text field is rewritten.
import fs from "fs";
import { conv } from "./chouRules.mjs";

const dump = (v) =>
  Array.isArray(v) ? "[" + v.map(dump).join(", ") + "]"
  : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + dump(x)).join(", ") + "}"
  : JSON.stringify(v);

const [file, flag] = process.argv.slice(2);
const raw = fs.readFileSync(file, "utf8");
let out;
if (file.endsWith(".json")) {
  const d = JSON.parse(raw);
  for (const c of d) c.text = conv(c.text);
  out = dump(d);
} else out = conv(raw);
console.log(`${file}: ${(raw.match(/醜/g) || []).length} -> ${(out.match(/醜/g) || []).length} 醜`);
if (flag === "--write") fs.writeFileSync(file, out);
