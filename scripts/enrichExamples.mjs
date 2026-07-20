// Fast two-step approach:
// 1. Enrich existing 23 examples with palaceSnapshot (~5 seconds)
// 2. Targeted search for 8 missing slugs (1960-1990, every 5th day, ~30 seconds)
//
// Usage: npx tsx --env-file=.env.local scripts/enrichExamples.mjs

import fs from "fs";
import path from "path";

const { astro } = await import("iztro");
const OUT = path.join(process.cwd(), "lib", "minggeExamples.json");

// ── helpers ────────────────────────────────────────────────────────────────
const KEY_MINOR = new Set([
  "左辅","右弼","文昌","文曲","天魁","天钺",
  "禄存","天马","擎羊","陀罗","火星","铃星","地空","地劫",
]);

function buildPalaces(al) {
  return al.palaces.map(p => ({
    name: p.name, earthlyBranch: p.earthlyBranch, index: p.index,
    isBodyPalace: p.isBodyPalace, isSoulPalace: p.isSoulPalace,
    heavenlyStem: p.heavenlyStem,
    stars: [
      ...(p.majorStars    ||[]).map(s=>({name:s.name,brightness:s.brightness??"",type:"major",    mutagen:s.mutagen??""})),
      ...(p.minorStars    ||[]).map(s=>({name:s.name,brightness:s.brightness??"",type:"minor",    mutagen:s.mutagen??""})),
      ...(p.adjectiveStars||[]).map(s=>({name:s.name,brightness:s.brightness??"",type:"adjective",mutagen:s.mutagen??""})),
    ],
  }));
}

function palaceSnapshot(palaces) {
  const snap = {};
  for (const p of palaces) {
    const major    = p.stars.filter(s=>s.type==="major").map(s=>({name:s.name,brightness:s.brightness,...(s.mutagen?{mutagen:s.mutagen}:{})}));
    const keyMinors= p.stars.filter(s=>KEY_MINOR.has(s.name)).map(s=>s.name+(s.mutagen?`(化${s.mutagen})`:""));
    if (major.length||keyMinors.length) snap[p.name]={earthlyBranch:p.earthlyBranch,major,keyMinors};
  }
  return snap;
}

function compute(y, m, d, h) {
  const timeIndex = h===23||h===0 ? 0 : Math.ceil(h/2);
  const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  return astro.bySolar(dateStr, timeIndex, "男", true);
}

function soul(palaces) { return palaces.find(p=>p.isSoulPalace); }
function hasMajor(p, name) { return p?.stars.some(s=>s.type==="major"&&s.name===name); }
function hasAny(p, name)   { return p?.stars.some(s=>s.name===name); }
function majors(p)         { return p?.stars.filter(s=>s.type==="major").map(s=>s.name)||[]; }
function tfz(palaces) {    // 三方四正 of soul palace
  const s = soul(palaces);
  if (!s) return [];
  const ORDER = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
  const i = ORDER.indexOf(s.earthlyBranch);
  if (i<0) return [s];
  const opp  = ORDER[(i+6)%12], t1=ORDER[(i+4)%12], t2=ORDER[(i+8)%12];
  return palaces.filter(p=>[s.earthlyBranch,opp,t1,t2].includes(p.earthlyBranch));
}

// Minimal formation detectors for the 8 missing slugs
const DETECTORS = {
  "紫府同宫格": (p) => {
    const s = soul(p);
    return hasMajor(s,"紫微") && hasMajor(s,"天府");
  },
  "机月同梁格": (p) => {
    const t = tfz(p);
    return ["天机","太阴","天同","天梁"].every(n=>t.some(pl=>hasMajor(pl,n)));
  },
  "杀破狼格": (p) => {
    const s = soul(p);
    return ["七杀","破军","贪狼"].some(n=>hasMajor(s,n));
  },
  "财荫夹印格": (p) => {
    const s = soul(p);
    if (!hasMajor(s,"天相")) return false;
    const ORDER=["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const i=ORDER.indexOf(s.earthlyBranch);
    if(i<0) return false;
    const left=p.find(pl=>pl.earthlyBranch===ORDER[(i+1)%12]);
    const right=p.find(pl=>pl.earthlyBranch===ORDER[(i+11)%12]);
    return (hasMajor(left,"太阴")||hasMajor(left,"天梁"))&&(hasMajor(right,"太阴")||hasMajor(right,"天梁"));
  },
  "府相朝垣格": (p) => {
    const t=tfz(p);
    return t.some(pl=>hasMajor(pl,"天府"))&&t.some(pl=>hasMajor(pl,"天相"));
  },
  "百官朝拱格": (p) => {
    const t=tfz(p);
    if(!t.some(pl=>hasMajor(pl,"紫微"))) return false;
    const helpers=["左辅","右弼","文昌","文曲","天魁","天钺"];
    return helpers.filter(n=>t.some(pl=>hasAny(pl,n))).length>=4;
  },
  "刑囚夹印格": (p) => {
    const s=soul(p);
    if(!hasMajor(s,"天相")) return false;
    const ORDER=["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const i=ORDER.indexOf(s.earthlyBranch);
    if(i<0) return false;
    const left=p.find(pl=>pl.earthlyBranch===ORDER[(i+1)%12]);
    const right=p.find(pl=>pl.earthlyBranch===ORDER[(i+11)%12]);
    return (hasMajor(left,"廉贞")||hasMajor(right,"廉贞"))&&(hasAny(left,"擎羊")||hasAny(right,"擎羊")||hasAny(left,"陀罗")||hasAny(right,"陀罗"));
  },
  "日月反背格": (p) => {
    const s=soul(p);
    const ORDER=["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const i=ORDER.indexOf(s?.earthlyBranch??"");
    if(i<0) return false;
    const opp=p.find(pl=>pl.earthlyBranch===ORDER[(i+6)%12]);
    return (hasMajor(s,"太阳")||hasMajor(opp,"太阳"))&&(hasMajor(s,"太阴")||hasMajor(opp,"太阴"));
  },
};

const MISSING_SLUGS = Object.keys(DETECTORS);

// ── Step 1: Enrich existing examples ──────────────────────────────────────
console.log("Step 1: Enriching existing 23 examples with palaceSnapshot...");
const raw = JSON.parse(fs.readFileSync(OUT, "utf8"));
const result = {};

for (const e of raw) {
  const al = compute(e.year, e.month, e.day, e.hour);
  const palaces = buildPalaces(al);
  const soulP = palaces.find(p=>p.isSoulPalace);
  result[e.slug] = [{
    year: e.year, month: e.month, day: e.day, hour: e.hour,
    shichen: e.shichen, gender: e.gender,
    soulBranch: soulP?.earthlyBranch ?? e.soulBranch,
    description: e.description,
    palaceSnapshot: palaceSnapshot(palaces),
  }];
  process.stdout.write(`  ✓ ${e.slug}\n`);
}
console.log(`Done — ${Object.keys(result).length} enriched.\n`);

// ── Step 2: Targeted search for 8 missing slugs ────────────────────────────
console.log(`Step 2: Searching for ${MISSING_SLUGS.length} missing formations (1960–1990, sparse)...`);
const YEARS  = Array.from({length:31},(_,i)=>1960+i);
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const DAYS   = [1,5,10,15,20,25]; // every 5th-ish day
const HOURS  = [1,3,5,7,9,11,13,15,17,19,21,23];
const GENDERS= ["男","女"];
let checked=0;

outer: for (const y of YEARS) {
  for (const m of MONTHS) {
    for (const d of DAYS) {
      for (const h of HOURS) {
        for (const g of GENDERS) {
          checked++;
          let al;
          try { al = compute(y,m,d,h); } catch { continue; }
          const palaces = buildPalaces(al);

          for (const slug of MISSING_SLUGS) {
            if (result[slug]) continue; // already found
            try {
              if (DETECTORS[slug](palaces)) {
                const soulP = palaces.find(p=>p.isSoulPalace);
                const shichenMap={1:"丑",3:"寅",5:"卯",7:"辰",9:"巳",11:"午",13:"未",15:"申",17:"酉",19:"戌",21:"亥",23:"子"};
                result[slug] = [{
                  year:y,month:m,day:d,hour:h,
                  shichen: (shichenMap[h]??"子")+"时",
                  gender: g+"命",
                  soulBranch: soulP?.earthlyBranch??"",
                  description: `命宫在${soulP?.earthlyBranch??""}宫，主星：${majors(soulP).join("、")||"（空宫）"}`,
                  palaceSnapshot: palaceSnapshot(palaces),
                }];
                console.log(`  ✓ ${slug}: ${y}年${m}月${d}日 ${shichenMap[h]??"子"}时（${g}命）`);
              }
            } catch {}
          }

          if (MISSING_SLUGS.every(s=>result[s])) break outer;
        }
      }
    }
  }
}

const found = MISSING_SLUGS.filter(s=>result[s]).length;
const notFound = MISSING_SLUGS.filter(s=>!result[s]);
console.log(`\nSearched ${checked.toLocaleString()} charts. Found ${found}/${MISSING_SLUGS.length} missing formations.`);
if (notFound.length) console.log(`Not found (very rare): ${notFound.join("、")}`);

// ── Write output ───────────────────────────────────────────────────────────
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\n✓ Saved to lib/minggeExamples.json (${Object.keys(result).length} formations)`);
