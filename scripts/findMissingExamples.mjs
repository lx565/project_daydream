// Find iztro examples for the 8 命格 that were missed in the initial sweep.
// Uses dense day sampling (every day) and both genders, wider year range.
// Usage: npx tsx --env-file=.env.local scripts/findMissingExamples.mjs

import fs from "fs";
import path from "path";

const { astro } = await import("iztro");

// ── Load existing examples ────────────────────────────────────────────────────
const existingPath = path.join(process.cwd(), "lib", "minggeExamples.json");
const existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
const alreadyFound = new Set(existing.map(e => e.slug));
console.log(`Already found: ${alreadyFound.size}/31`);

const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const SHICHEN = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
function hourToShichen(h) { return h === 23 || h === 0 ? 0 : Math.ceil(h / 2); }
function shichenLabel(h) { return SHICHEN[hourToShichen(h)] + "时"; }

function buildPalaces(al) {
  return al.palaces.map(p => ({
    name: p.name, earthlyBranch: p.earthlyBranch, index: p.index,
    stars: [
      ...(p.majorStars    || []).map(s => ({ name: s.name, brightness: s.brightness ?? "", type: "major",     mutagen: s.mutagen ?? "" })),
      ...(p.minorStars    || []).map(s => ({ name: s.name, brightness: s.brightness ?? "", type: "minor",     mutagen: s.mutagen ?? "" })),
      ...(p.adjectiveStars|| []).map(s => ({ name: s.name, brightness: s.brightness ?? "", type: "adjective", mutagen: s.mutagen ?? "" })),
    ],
  }));
}

const soul    = p => p.find(x => x.name === "命宫");
const byName  = (p, n) => p.find(x => x.name === n);
const tfz     = p => ["命宫","财帛宫","官禄宫","迁移宫"].map(n => byName(p,n)).filter(Boolean);
const hasMajor= (pal, s) => pal?.stars.some(x => x.name === s && x.type === "major") ?? false;
const hasStar = (pal, s) => pal?.stars.some(x => x.name === s) ?? false;
const hasAny  = (list, s) => list.some(p => hasStar(p, s));
const hasMutagen=(list,m) => list.some(p => p.stars.some(s => s.mutagen === m));
const sides   = (p, pal) => {
  const idx = pal.index;
  return [p.find(x => x.index === (idx-1+12)%12), p.find(x => x.index === (idx+1)%12)].filter(Boolean);
};

// Only checkers for the 8 missing ones
const MISSING_CHECKERS = {
  "杀破狼格":   p => ["七杀","破军","贪狼"].every(x => hasAny(tfz(p), x)),
  "机月同梁格": p => ["天机","太阴","天同","天梁"].every(x => hasAny(tfz(p), x)),
  "紫府同宫格": p => { const s=soul(p); return !!s && ["丑","未"].includes(s.earthlyBranch) && hasMajor(s,"紫微") && hasMajor(s,"天府"); },
  "百官朝拱格": p => {
    const s=soul(p); if(!hasMajor(s,"紫微")) return false; const t=tfz(p);
    return ["左辅","右弼","文昌","文曲","天魁","天钺"].filter(x=>hasAny(t,x)).length >= 4;
  },
  "刑囚夹印格": p => {
    const s=soul(p); if(!hasMajor(s,"天相")||!s) return false;
    const sn=sides(p,s).flatMap(x=>x.stars.map(st=>st.name));
    return sn.includes("廉贞") && sn.includes("擎羊");
  },
  "府相朝垣格": p => { const t=tfz(p); return hasAny(t,"天府") && hasAny(t,"天相"); },
  "日月反背格": p => {
    const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major"));
    const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major"));
    return sunP?.earthlyBranch==="酉" && moonP?.earthlyBranch==="卯";
  },
  "财荫夹印格": p => {
    const s=soul(p); if(!hasMajor(s,"天相")||!s) return false;
    const sn=sides(p,s).flatMap(x=>x.stars.map(st=>st.name));
    return sn.includes("太阴") && sn.includes("天梁");
  },
};

function describeExample(palaces, slug) {
  const s = soul(palaces);
  const soulStars = s?.stars.filter(x=>x.type==="major").map(x=>`${x.name}（${x.brightness||""}）`).join("、") || "（空宫）";
  const soulBranch = s?.earthlyBranch ?? "?";
  const t = tfz(palaces);
  const tfzStars = t.flatMap(p=>p.stars.filter(x=>x.type==="major").map(x=>`${x.name}在${p.name}`)).join("、");
  const aux = t.flatMap(p=>p.stars.filter(x=>x.type!=="major"&&["文昌","文曲","左辅","右弼","天魁","天钺","禄存","天马","火星","铃星","擎羊","陀罗"].includes(x.name)).map(x=>`${x.name}在${p.name}${x.mutagen?"（化"+x.mutagen+"）":""}`));
  return `命宫在${soulBranch}宫，主星：${soulStars}；三方四正主星：${tfzStars||"（无）"}；${aux.length?"辅煞："+aux.join("、"):""}`.replace(/；$/, "");
}

// ── Dense search: every year 1950-2025, every month, every day, every 2 hours ─
const SLUGS = Object.keys(MISSING_CHECKERS).filter(s => !alreadyFound.has(s));
console.log(`\nSearching for ${SLUGS.length} missing formations: ${SLUGS.join("、")}`);

const found = {};
let checked = 0;
const YEARS  = Array.from({length: 76}, (_, i) => 1950 + i);
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const DAYS   = Array.from({length: 28}, (_, i) => i + 1);
const HOURS  = [1,3,5,7,9,11,13,15,17,19,21,23];
const GENDERS= ["男", "女"];

outer:
for (const y of YEARS) {
  for (const m of MONTHS) {
    for (const d of DAYS) {
      for (const g of GENDERS) {
        for (const h of HOURS) {
          if (Object.keys(found).length === SLUGS.length) break outer;
          try {
            const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const al = astro.bySolar(dateStr, hourToShichen(h), g, true);
            const palaces = buildPalaces(al);
            checked++;

            for (const slug of SLUGS) {
              if (found[slug]) continue;
              try {
                if (MISSING_CHECKERS[slug](palaces)) {
                  found[slug] = {
                    slug, year: y, month: m, day: d, hour: h,
                    shichen: shichenLabel(h), gender: g + "命",
                    soulBranch: soul(palaces)?.earthlyBranch ?? "?",
                    description: describeExample(palaces, slug),
                  };
                  console.log(`✓ ${slug}: ${y}年${m}月${d}日 ${shichenLabel(h)} (${g}命)`);
                }
              } catch {}
            }
            if (checked % 50000 === 0) {
              console.log(`  … ${checked.toLocaleString()} checked, found ${Object.keys(found).length}/${SLUGS.length}`);
            }
          } catch {}
        }
      }
    }
  }
}

console.log(`\n搜索完成: 检验 ${checked.toLocaleString()} 个组合，找到 ${Object.keys(found).length}/${SLUGS.length}`);

const missing = SLUGS.filter(s => !found[s]);
if (missing.length) {
  console.log("仍未找到:", missing.join("、"));
  console.log("可能原因：入格条件极为罕见，或需调整 checker 逻辑");
}

// Merge with existing and write
const merged = [...existing, ...Object.values(found)];
fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2));
console.log(`\n已更新 lib/minggeExamples.json (共 ${merged.length} 个格局示例)`);
