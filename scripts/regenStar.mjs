// Regenerate specific star×palace articles with corrections injected.
import fs from "fs";
import path from "path";
import { MAJOR_STARS, PALACES } from "../lib/starData.ts";
import { getStarPalaceContent } from "../lib/seoContent.ts";

// [star, palace, revisionNote]
const fixes = [
  ["太阳", "子女宫",
   "太阳本身不参与化科——太阳只可化禄、化权、化忌。全文严禁出现「太阳化科」，包括「若太阳化科」这类假设性写法。如要讲化科对子女宫的影响，只能说其他星曜（如天梁化科、文曲化科、武曲化科等）飞入或会照本宫，绝不可把化科安在太阳头上。"],
];

for (const [sName, pName, note] of fixes) {
  const s = MAJOR_STARS.find((x) => x.name === sName);
  const p = PALACES.find((x) => x.name === pName);
  const t = Date.now();
  const { markdown, refs } = await getStarPalaceContent(s, p, note);
  const f = path.join("content/seo/star", `${sName}__${pName}.json`);
  fs.writeFileSync(f, JSON.stringify({ label: `${sName}在${pName}`, markdown, refs, chars: markdown.length, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`regenerated ${sName}在${pName}: ${markdown.length} chars in ${Math.round((Date.now() - t) / 1000)}s | 太阳化科 present: ${markdown.includes("太阳化科")}`);
}
