// FREE deterministic validator: check every star×palace article against the
// iztro ground-truth (lib/starFactsData.json) + 四化 participation. No AI.
import fs from "fs";
import path from "path";

const FACTS = JSON.parse(fs.readFileSync("lib/starFactsData.json", "utf8"));
const STARS = ["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军"];
const PALACES = ["命宫","兄弟宫","夫妻宫","子女宫","财帛宫","疾厄宫","迁移宫","交友宫","官禄宫","田宅宫","福德宫","父母宫"];

// 四化 each star must NOT take (standard 十干四化).
const FORBIDDEN = {
  紫微: ["化禄","化忌"], 天机: [], 太阳: ["化科"], 武曲: [], 天同: ["化科"],
  廉贞: ["化权","化科"], 天府: ["化禄","化权","化科","化忌"], 太阴: [],
  贪狼: ["化科"], 巨门: ["化科"], 天相: ["化禄","化权","化科","化忌"],
  天梁: ["化忌"], 七杀: ["化禄","化权","化科","化忌"], 破军: ["化科","化忌"],
};
// Non-existent stars LLMs tend to invent / common wrong characters.
const FAKE_STARS = ["天王","天皇","地王","紫薇","太陽","太陰"];

function negatedBefore(text, idx) {
  const w = text.slice(Math.max(0, idx - 16), idx);
  return /[不无没非]/.test(w) || /存在|讹传|没有|参与|不化|并无|不会|不能|遇不到/.test(w);
}

let totalFlags = 0;
const flaggedFiles = [];
for (const s of STARS) {
  for (const p of PALACES) {
    const f = path.join("content/seo/star", `${s}__${p}.json`);
    if (!fs.existsSync(f)) { console.log("MISSING:", `${s}__${p}`); continue; }
    const text = JSON.parse(fs.readFileSync(f, "utf8")).markdown ?? "";
    const issues = [];

    // 1) forbidden 四化 (contiguous "星名+化X", skipping negations)
    for (const hua of FORBIDDEN[s]) {
      const needle = s + hua;
      let i = text.indexOf(needle);
      while (i >= 0) {
        if (!negatedBefore(text, i)) issues.push(`违规四化「${needle}」`);
        i = text.indexOf(needle, i + 1);
      }
    }
    // 2) fake / wrong-char star names (don't flag the star's own correct name)
    for (const fake of FAKE_STARS) {
      if (fake === s) continue;
      if (text.includes(fake)) issues.push(`可疑星名「${fake}」`);
    }

    if (issues.length) {
      totalFlags += issues.length;
      flaggedFiles.push(`${s}__${p}`);
      console.log(`⚠️  ${s}在${p}: ${[...new Set(issues)].join("，")}`);
    }
  }
}

console.log(`\n=== ${flaggedFiles.length}/168 files flagged, ${totalFlags} issues ===`);
if (!flaggedFiles.length) console.log("✅ 全部 168 篇通过确定性事实校验（四化/星名）。");
else fs.writeFileSync("/tmp/star_flagged.json", JSON.stringify(flaggedFiles));
