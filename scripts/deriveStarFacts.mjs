// Derive the canonical 安星 (co-location) + 庙旺 (brightness) table for the 14 主星
// directly from iztro (ground truth), so generation can be grounded in correct facts.
import { astro } from "iztro";

const MAJORS = ["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// star -> branch -> { comp:Set(companion majors), bright:Set(brightness) }
const data = {};
for (const s of MAJORS) { data[s] = {}; for (const b of BRANCHES) data[s][b] = { comp: new Set(), bright: new Set() }; }

function sample(y, m, d, t) {
  try {
    const a = astro.bySolar(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, t, "男", true);
    for (const p of a.palaces) {
      const branch = p.earthlyBranch;
      const majors = (p.majorStars ?? []).filter((st) => MAJORS.includes(st.name));
      for (const st of majors) {
        const others = majors.filter((o) => o.name !== st.name).map((o) => o.name);
        others.forEach((o) => data[st.name][branch].comp.add(o));
        if (st.brightness) data[st.name][branch].bright.add(st.brightness);
      }
    }
  } catch {}
}

// Wide sample to cover all chart layouts.
for (let y = 1940; y < 2012; y += 1)
  for (const m of [1, 3, 5, 7, 9, 11])
    for (const d of [3, 13, 23])
      for (const t of [1, 5, 9])
        sample(y, m, d, t);

// Emit a compact per-star table.
const out = {};
for (const s of MAJORS) {
  out[s] = {};
  for (const b of BRANCHES) {
    const comp = [...data[s][b].comp];
    const bright = [...data[s][b].bright];
    out[s][b] = { with: comp, bright };
  }
}

import fs from "fs";
import path from "path";
fs.writeFileSync(path.join(process.cwd(), "lib", "starFactsData.json"), JSON.stringify(out, null, 2));
console.log("wrote lib/starFactsData.json");
// sanity: each star should have exactly the expected companions
for (const s of MAJORS) {
  const indep = BRANCHES.filter((b) => out[s][b].with.length === 0);
  console.log(`${s}: 独坐 at ${indep.join("") || "(none)"}`);
}
