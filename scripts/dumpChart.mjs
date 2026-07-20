import { calculateZiwei } from "../lib/ziwei.ts";
import { detectMingge } from "../lib/detectMingge.ts";

const charts = [
  { name: "李小龙", year: 1940, month: 11, day: 27, hour: 7, gender: "male" },
  { name: "莫扎特", year: 1756, month: 1, day: 27, hour: 20, gender: "male" },
  { name: "爱因斯坦", year: 1879, month: 3, day: 14, hour: 11, gender: "male" },
];

for (const c of charts) {
  const z = await calculateZiwei(c.year, c.month, c.day, c.hour, c.gender);
  const formations = detectMingge(z.palaces);
  console.log(`\n=== ${c.name} | ${z.fiveElementsClass} | 命:${z.soulPalace} 身:${z.bodyPalace} ===`);
  console.log(`格局: ${formations.map(f=>f.name).join("、")}`);
  z.palaces.forEach(p => {
    const major = p.stars.filter(s=>s.type==="major").map(s=>`${s.name}(${s.brightness??""})`) .join("·") || "空宫";
    const flags = [p.isSoulPalace?"【命】":"", p.isBodyPalace?"【身】":""].filter(Boolean).join("");
    console.log(`  ${p.name}(${p.earthlyBranch})${flags}: ${major}`);
  });
}
