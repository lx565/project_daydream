// Collect up to MAX_PER_SLUG verified iztro examples for every 命格.
// Saves full palace snapshot so examples can be used to ground AI readings.
// Output: lib/minggeExamples.json  (keyed by slug, each entry is an array)
//
// Usage: npx tsx --env-file=.env.local scripts/collectMinggeExamples.mjs
//
// Runtime: ~5-15 min depending on how quickly it finds rare formations.

import fs from "fs";
import path from "path";

const { astro } = await import("iztro");

const MAX_PER_SLUG = 5;   // collect up to 5 verified examples per 格局
const OUT = path.join(process.cwd(), "lib", "minggeExamples.json");

// ── helpers ────────────────────────────────────────────────────────────────
const SHICHEN = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
function hourToShichen(h) { return h === 23 || h === 0 ? 0 : Math.ceil(h / 2); }
function shichenLabel(h) { return SHICHEN[hourToShichen(h)] + "时"; }
function pad(n) { return String(n).padStart(2, "0"); }

const KEY_MINOR_STARS = new Set([
  "左辅","右弼","文昌","文曲","天魁","天钺",
  "禄存","天马","擎羊","陀罗","火星","铃星","地空","地劫",
]);

function buildPalaces(al) {
  return al.palaces.map(p => ({
    name: p.name,
    earthlyBranch: p.earthlyBranch,
    index: p.index,
    stars: [
      ...(p.majorStars    || []).map(s => ({ name: s.name, brightness: s.brightness ?? "", type: "major",     mutagen: s.mutagen ?? "" })),
      ...(p.minorStars    || []).map(s => ({ name: s.name, brightness: s.brightness ?? "", type: "minor",     mutagen: s.mutagen ?? "" })),
      ...(p.adjectiveStars|| []).map(s => ({ name: s.name, brightness: s.brightness ?? "", type: "adjective", mutagen: s.mutagen ?? "" })),
    ],
  }));
}

// Compact palace snapshot — captures the info needed for AI grounding
function palatialSnapshot(palaces) {
  const snap = {};
  for (const p of palaces) {
    const major = p.stars.filter(s => s.type === "major").map(s => ({
      name: s.name,
      brightness: s.brightness,
      ...(s.mutagen ? { mutagen: s.mutagen } : {}),
    }));
    const keyMinors = p.stars
      .filter(s => KEY_MINOR_STARS.has(s.name))
      .map(s => s.name + (s.mutagen ? `(化${s.mutagen})` : ""));
    if (major.length || keyMinors.length) {
      snap[p.name] = { earthlyBranch: p.earthlyBranch, major, keyMinors };
    }
  }
  return snap;
}

function shortDesc(palaces) {
  const soul = palaces.find(x => x.name === "命宫");
  const tfzPals = ["命宫","财帛宫","官禄宫","迁移宫"];
  const tfz = tfzPals.map(n => palaces.find(x => x.name === n)).filter(Boolean);
  const soulStars = soul?.stars.filter(x => x.type === "major").map(x => `${x.name}（${x.brightness||""}）`).join("、") || "（空宫）";
  const tfzMajor = tfz.flatMap(p => p.stars.filter(x => x.type === "major").map(x => `${x.name}在${p.name}`)).join("、");
  const sihua = tfz.flatMap(p => p.stars.filter(x => x.mutagen).map(x => `${x.name}化${x.mutagen}`)).join("、");
  return [
    `命宫在${soul?.earthlyBranch ?? "?"}宫，主星：${soulStars}`,
    tfzMajor ? `三方四正：${tfzMajor}` : null,
    sihua ? `四化：${sihua}` : null,
  ].filter(Boolean).join("；");
}

// ── condition checkers (mirror detectMingge.ts exactly) ───────────────────
const soul    = p => p.find(x => x.name === "命宫");
const byName  = (p, n) => p.find(x => x.name === n);
const tfz     = p => ["命宫","财帛宫","官禄宫","迁移宫"].map(n => byName(p,n)).filter(Boolean);
const hasMajor= (pal, s) => pal?.stars.some(x => x.name === s && x.type === "major") ?? false;
const hasStar = (pal, s) => pal?.stars.some(x => x.name === s) ?? false;
const hasAny  = (list, s) => list.some(p => hasStar(p, s));
const hasMut  = (list, m) => list.some(p => p.stars.some(s => s.mutagen === m));
const sides   = (p, pal) => {
  const idx = pal.index;
  return [p.find(x => x.index === (idx-1+12)%12), p.find(x => x.index === (idx+1)%12)].filter(Boolean);
};

const CHECKERS = {
  "石中隐玉格": p => { const s=soul(p); if(!s||!["子","午"].includes(s.earthlyBranch)||!hasMajor(s,"巨门")) return false; return ["文昌","文曲","天魁","天钺"].some(x=>hasAny(tfz(p),x)); },
  "君臣庆会格": p => { const s=soul(p); if(!hasMajor(s,"紫微")) return false; const t=tfz(p); return ["天府","天相"].some(x=>hasAny(t,x))&&["左辅","右弼","文昌","文曲"].some(x=>hasAny(t,x)); },
  "紫府同宫格": p => { const s=soul(p); return !!s&&["丑","未"].includes(s.earthlyBranch)&&hasMajor(s,"紫微")&&hasMajor(s,"天府"); },
  "日月并明格": p => { const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major")); const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major")); if(!sunP||!moonP) return false; const sb=sunP.stars.find(s=>s.name==="太阳")?.brightness??""; const mb=moonP.stars.find(s=>s.name==="太阴")?.brightness??""; return ["旺","庙"].includes(sb)&&["旺","庙"].includes(mb); },
  "机月同梁格": p => ["天机","太阴","天同","天梁"].every(x=>hasAny(tfz(p),x)),
  "杀破狼格":   p => ["七杀","破军","贪狼"].every(x=>hasAny(tfz(p),x)),
  "日照雷门格": p => { const s=soul(p); return s?.earthlyBranch==="卯"&&hasMajor(s,"太阳"); },
  "月朗天门格": p => { const s=soul(p); return s?.earthlyBranch==="亥"&&hasMajor(s,"太阴"); },
  "火贪格":     p => p.some(x=>hasMajor(x,"贪狼")&&hasStar(x,"火星")),
  "铃贪格":     p => p.some(x=>hasMajor(x,"贪狼")&&hasStar(x,"铃星")),
  "财荫夹印格": p => { const s=soul(p); if(!hasMajor(s,"天相")||!s) return false; const sn=sides(p,s).flatMap(x=>x.stars.map(st=>st.name)); return sn.includes("太阴")&&sn.includes("天梁"); },
  "禄马交驰格": p => p.some(x=>hasStar(x,"禄存")&&hasStar(x,"天马")),
  "阳梁昌禄格": p => { const t=tfz(p); return hasAny(t,"太阳")&&hasAny(t,"天梁")&&hasAny(t,"文昌")&&(hasMut(t,"禄")||hasAny(t,"禄存")); },
  "府相朝垣格": p => { const t=tfz(p); return hasAny(t,"天府")&&hasAny(t,"天相"); },
  "三奇加会格": p => { const t=tfz(p); return hasMut(t,"禄")&&hasMut(t,"权")&&hasMut(t,"科"); },
  "贪武同行格": p => { const s=soul(p); return !!s&&["丑","未"].includes(s.earthlyBranch)&&hasMajor(s,"贪狼")&&hasMajor(s,"武曲"); },
  "马头带箭格": p => { const s=soul(p); return s?.earthlyBranch==="午"&&hasStar(s,"擎羊"); },
  "七杀朝斗格": p => { const s=soul(p); return !!s&&["子","午"].includes(s.earthlyBranch)&&hasMajor(s,"七杀"); },
  "百官朝拱格": p => { const s=soul(p); if(!hasMajor(s,"紫微")) return false; const t=tfz(p); return ["左辅","右弼","文昌","文曲","天魁","天钺"].filter(x=>hasAny(t,x)).length>=4; },
  "铃昌陀武格": p => { const t=tfz(p); return hasAny(t,"铃星")&&hasAny(t,"文昌")&&hasAny(t,"陀罗")&&hasAny(t,"武曲"); },
  "风流彩杖格": p => p.some(x=>hasMajor(x,"贪狼")&&hasStar(x,"擎羊")),
  "刑囚夹印格": p => { const s=soul(p); if(!hasMajor(s,"天相")||!s) return false; const sn=sides(p,s).flatMap(x=>x.stars.map(st=>st.name)); return sn.includes("廉贞")&&sn.includes("擎羊"); },
  "日月反背格": p => { const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major")); const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major")); return sunP?.earthlyBranch==="酉"&&moonP?.earthlyBranch==="卯"; },
  "命无正曜格": p => { const s=soul(p); return !!s&&!s.stars.some(x=>x.type==="major"); },
  "日月照壁格": p => { const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major")); const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major")); if(!sunP||!moonP) return false; const sb=sunP.stars.find(s=>s.name==="太阳")?.brightness??""; const mb=moonP.stars.find(s=>s.name==="太阴")?.brightness??""; return ["陷","不"].includes(sb)&&["陷","不"].includes(mb); },
  "极居卯酉格": p => { const s=soul(p); return !!s&&["卯","酉"].includes(s.earthlyBranch)&&hasMajor(s,"紫微"); },
  "羊陀夹忌格": p => { const jiP=p.find(x=>x.stars.some(s=>s.mutagen==="忌")); if(!jiP) return false; const sn=sides(p,jiP).flatMap(x=>x.stars.map(s=>s.name)); return sn.includes("擎羊")&&sn.includes("陀罗"); },
  "火铃夹命格": p => { const s=soul(p); if(!s) return false; const [a,b]=sides(p,s); const an=(a?.stars||[]).map(x=>x.name); const bn=(b?.stars||[]).map(x=>x.name); return (an.includes("火星")&&bn.includes("铃星"))||(an.includes("铃星")&&bn.includes("火星")); },
  "明珠出海格": p => { const s=soul(p); return s?.earthlyBranch==="子"&&hasMajor(s,"太阴"); },
  "极向离明格": p => { const s=soul(p); return s?.earthlyBranch==="午"&&hasMajor(s,"紫微"); },
  "丹墀桂墀格": p => { const s=soul(p); if(!s) return false; const names=[s,...sides(p,s)].flatMap(x=>x.stars.map(st=>st.name)); return names.includes("文昌")&&names.includes("文曲"); },
};

const SLUGS = Object.keys(CHECKERS);

// ── search ─────────────────────────────────────────────────────────────────
const collected = {};   // slug → MinggeExample[]
for (const slug of SLUGS) collected[slug] = [];

let checked = 0;
const YEARS  = Array.from({length: 76}, (_, i) => 1950 + i);
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const DAYS   = Array.from({length: 28}, (_, i) => i + 1);
const HOURS  = [1,5,9,13,17,21];           // 6 representative hours across day
const GENDERS = ["男", "女"];

function allFull() {
  return SLUGS.every(s => collected[s].length >= MAX_PER_SLUG);
}
function anyEmpty() {
  return SLUGS.some(s => collected[s].length === 0);
}

outer:
for (const y of YEARS) {
  for (const m of MONTHS) {
    for (const d of DAYS) {
      for (const g of GENDERS) {
        for (const h of HOURS) {
          if (allFull()) break outer;
          try {
            const dateStr = `${y}-${pad(m)}-${pad(d)}`;
            const al = astro.bySolar(dateStr, hourToShichen(h), g, true);
            const palaces = buildPalaces(al);
            checked++;

            for (const slug of SLUGS) {
              if (collected[slug].length >= MAX_PER_SLUG) continue;
              try {
                if (!CHECKERS[slug](palaces)) continue;
                collected[slug].push({
                  year: y, month: m, day: d, hour: h,
                  shichen: shichenLabel(h),
                  gender: g + "命",
                  soulBranch: soul(palaces)?.earthlyBranch ?? "?",
                  description: shortDesc(palaces),
                  palaceSnapshot: palatialSnapshot(palaces),
                });
                const total = collected[slug].length;
                if (total === 1) console.log(`✓ ${slug} [1/${MAX_PER_SLUG}]: ${y}年${m}月${d}日 ${shichenLabel(h)} (${g}命)`);
                else            process.stdout.write(`  + ${slug} [${total}/${MAX_PER_SLUG}]\n`);
              } catch {}
            }

            if (checked % 100000 === 0) {
              const found = SLUGS.filter(s => collected[s].length > 0).length;
              const full  = SLUGS.filter(s => collected[s].length >= MAX_PER_SLUG).length;
              console.log(`[${checked.toLocaleString()} checked] ${found}/31 格局有例，${full}/31 已满 ${MAX_PER_SLUG} 例`);
            }
          } catch {}
        }
      }
    }
  }
}

// Second pass: try to fill incomplete slugs with denser hour sampling
const needsMore = SLUGS.filter(s => collected[s].length > 0 && collected[s].length < MAX_PER_SLUG);
if (needsMore.length > 0) {
  console.log(`\n补充搜索 ${needsMore.length} 个格局（已有例但未满）...`);
  const HOURS2 = [1,3,5,7,9,11,13,15,17,19,21,23];
  outer2:
  for (const y of YEARS) {
    for (const m of MONTHS) {
      for (const d of DAYS) {
        for (const g of GENDERS) {
          for (const h of HOURS2) {
            if (needsMore.every(s => collected[s].length >= MAX_PER_SLUG)) break outer2;
            try {
              const dateStr = `${y}-${pad(m)}-${pad(d)}`;
              const al = astro.bySolar(dateStr, hourToShichen(h), g, true);
              const palaces = buildPalaces(al);
              for (const slug of needsMore) {
                if (collected[slug].length >= MAX_PER_SLUG) continue;
                try {
                  if (!CHECKERS[slug](palaces)) continue;
                  // deduplicate: skip if same birth combo already saved
                  const dup = collected[slug].some(e => e.year===y&&e.month===m&&e.day===d&&e.hour===h&&e.gender===g+"命");
                  if (dup) continue;
                  collected[slug].push({
                    year: y, month: m, day: d, hour: h,
                    shichen: shichenLabel(h),
                    gender: g + "命",
                    soulBranch: soul(palaces)?.earthlyBranch ?? "?",
                    description: shortDesc(palaces),
                    palaceSnapshot: palatialSnapshot(palaces),
                  });
                  process.stdout.write(`  + ${slug} [${collected[slug].length}/${MAX_PER_SLUG}]\n`);
                } catch {}
              }
            } catch {}
          }
        }
      }
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`总计检验: ${checked.toLocaleString()} 个组合`);
const withExamples = SLUGS.filter(s => collected[s].length > 0);
const empty = SLUGS.filter(s => collected[s].length === 0);
console.log(`有示例: ${withExamples.length}/31 格局`);
if (empty.length) {
  console.log(`无示例（条件极为罕见或 checker 需复查）: ${empty.join("、")}`);
}
for (const slug of SLUGS) {
  console.log(`  ${collected[slug].length > 0 ? "✓" : "✗"} ${slug}: ${collected[slug].length} 例`);
}

// ── Write ──────────────────────────────────────────────────────────────────
fs.writeFileSync(OUT, JSON.stringify(collected, null, 2));
console.log(`\n已写入 lib/minggeExamples.json`);
console.log(`格式：{ [slug]: MinggeExample[] }，每例含 palaceSnapshot 供 AI 对照`);
