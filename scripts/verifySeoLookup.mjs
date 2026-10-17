// Proof that page-generation lookups (lib/seoContent.ts readPregenerated) hit the saved files.
import fs from "fs";
import path from "path";
import { Converter } from "opencc-js";

const root = process.cwd();
const norm = Converter({ from: "t", to: "cn" });
const names = (file, re) => [...fs.readFileSync(path.join(root, "lib", file), "utf-8").matchAll(re)].map((m) => m[1]);
const stars = names("starData.ts", /^\s*\{ name: "([^"]+)", urlSlug/gm).slice(0, 14);
const palSrc = fs.readFileSync(path.join(root, "lib/starData.ts"), "utf-8");
const palaces = [...palSrc.slice(palSrc.indexOf("export const PALACES")).matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
const astars = names("assistantStarData.ts", /^\s{4}name: "([^"]+)"/gm);
const mingge = names("minggeData.ts", /^\s{4}slug: "([^"]+)"/gm);

const lookups = {
  star: stars.flatMap((s) => palaces.map((p) => `${s}__${p}`)),
  assistantstar: astars.flatMap((s) => palaces.map((p) => `${s}__${p}`)),
  palace: palaces,
  mingge,
};
for (const [kind, keys] of Object.entries(lookups)) {
  const dir = path.join(root, "content/seo", kind);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  const idx = new Map(files.map((f) => [norm(f), f]));
  const set = new Set(files);
  const oldHit = keys.filter((k) => set.has(k)).length;
  const newHit = keys.filter((k) => set.has(k) || idx.has(norm(k))).length;
  const keyNorms = new Set(keys.map(norm));
  const orphanFiles = files.filter((f) => !keyNorms.has(norm(f)));
  console.log(`${kind}: lookups=${keys.length} files=${files.length} | before hit=${oldHit} miss=${keys.length - oldHit} | after hit=${newHit} miss=${keys.length - newHit} | files unreachable=${orphanFiles.length}${orphanFiles.length ? " " + orphanFiles.slice(0, 4).join(",") : ""}`);
}
