// Find a verified iztro birth combination for each 命格.
// Iterates birth data combinations, checks conditions against the actual
// computed chart, saves the first valid example per 命格.
// Output: /tmp/mingge_examples.json  (also written to lib/minggeExamples.json)
// Usage: npx tsx --env-file=.env.local scripts/findMinggeExamples.mjs

import fs from "fs";
import path from "path";

const { astro } = await import("iztro");

const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// Convert clock hour → shichen index (mirrors calculateZiwei logic)
function hourToShichen(h) {
  if (h === 23 || h === 0) return 0;
  return Math.ceil(h / 2);
}

const SHICHEN_NAME = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
function shichenLabel(h) { return SHICHEN_NAME[hourToShichen(h)] + "时"; }

// Build palace list from iztro astrolabe
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

// ── helpers (mirror detectMingge.ts) ───────────────────────────────────────
const soul   = p => p.find(x => x.name === "命宫");
const byName = (p, n) => p.find(x => x.name === n);
const tfz    = p => ["命宫","财帛宫","官禄宫","迁移宫"].map(n => byName(p,n)).filter(Boolean);

const hasMajor  = (pal, s) => pal?.stars.some(x => x.name === s && x.type === "major") ?? false;
const hasStar   = (pal, s) => pal?.stars.some(x => x.name === s) ?? false;
const hasAny    = (list, s) => list.some(p => hasStar(p, s));
const hasMutagen= (list, m) => list.some(p => p.stars.some(s => s.mutagen === m));
const sides     = (p, pal) => {
  const idx = pal.index;
  return [p.find(x => x.index === (idx-1+12)%12), p.find(x => x.index === (idx+1)%12)].filter(Boolean);
};

// ── condition checkers ─────────────────────────────────────────────────────
const CHECKERS = {
  "石中隐玉格": p => {
    const s = soul(p); if (!s||!["子","午"].includes(s.earthlyBranch)||!hasMajor(s,"巨门")) return false;
    return ["文昌","文曲","天魁","天钺"].some(x => hasAny(tfz(p), x));
  },
  "君臣庆会格": p => {
    const s = soul(p); if (!hasMajor(s,"紫微")) return false; const t = tfz(p);
    return ["天府","天相"].some(x=>hasAny(t,x)) && ["左辅","右弼","文昌","文曲"].some(x=>hasAny(t,x));
  },
  "紫府同宫格": p => { const s=soul(p); return s&&["丑","未"].includes(s.earthlyBranch)&&hasMajor(s,"紫微")&&hasMajor(s,"天府"); },
  "日月并明格": p => {
    const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major"));
    const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major"));
    if(!sunP||!moonP) return false;
    const sb=sunP.stars.find(s=>s.name==="太阳")?.brightness??"";
    const mb=moonP.stars.find(s=>s.name==="太阴")?.brightness??"";
    return ["旺","庙"].includes(sb)&&["旺","庙"].includes(mb);
  },
  "机月同梁格": p => ["天机","太阴","天同","天梁"].every(x=>hasAny(tfz(p),x)),
  "杀破狼格":   p => ["七杀","破军","贪狼"].every(x=>hasAny(tfz(p),x)),
  "日照雷门格": p => { const s=soul(p); return s?.earthlyBranch==="卯"&&hasMajor(s,"太阳"); },
  "月朗天门格": p => { const s=soul(p); return s?.earthlyBranch==="亥"&&hasMajor(s,"太阴"); },
  "火贪格":     p => p.some(x=>hasMajor(x,"贪狼")&&hasStar(x,"火星")),
  "铃贪格":     p => p.some(x=>hasMajor(x,"贪狼")&&hasStar(x,"铃星")),
  "财荫夹印格": p => {
    const s=soul(p); if(!hasMajor(s,"天相")||!s) return false;
    const sn=sides(p,s).flatMap(x=>x.stars.map(st=>st.name));
    return sn.includes("太阴")&&sn.includes("天梁");
  },
  "禄马交驰格": p => p.some(x=>hasStar(x,"禄存")&&hasStar(x,"天马")),
  "阳梁昌禄格": p => {
    const t=tfz(p);
    return hasAny(t,"太阳")&&hasAny(t,"天梁")&&hasAny(t,"文昌")&&(hasMutagen(t,"禄")||hasAny(t,"禄存"));
  },
  "府相朝垣格": p => { const t=tfz(p); return hasAny(t,"天府")&&hasAny(t,"天相"); },
  "三奇加会格": p => { const t=tfz(p); return hasMutagen(t,"禄")&&hasMutagen(t,"权")&&hasMutagen(t,"科"); },
  "贪武同行格": p => { const s=soul(p); return s&&["丑","未"].includes(s.earthlyBranch)&&hasMajor(s,"贪狼")&&hasMajor(s,"武曲"); },
  "马头带箭格": p => { const s=soul(p); return s?.earthlyBranch==="午"&&hasStar(s,"擎羊"); },
  "七杀朝斗格": p => { const s=soul(p); return s&&["子","午"].includes(s.earthlyBranch)&&hasMajor(s,"七杀"); },
  "百官朝拱格": p => {
    const s=soul(p); if(!hasMajor(s,"紫微")) return false; const t=tfz(p);
    return ["左辅","右弼","文昌","文曲","天魁","天钺"].filter(x=>hasAny(t,x)).length>=4;
  },
  "铃昌陀武格": p => { const t=tfz(p); return hasAny(t,"铃星")&&hasAny(t,"文昌")&&hasAny(t,"陀罗")&&hasAny(t,"武曲"); },
  "风流彩杖格": p => p.some(x=>hasMajor(x,"贪狼")&&hasStar(x,"擎羊")),
  "刑囚夹印格": p => {
    const s=soul(p); if(!hasMajor(s,"天相")||!s) return false;
    const sn=sides(p,s).flatMap(x=>x.stars.map(st=>st.name));
    return sn.includes("廉贞")&&sn.includes("擎羊");
  },
  "日月反背格": p => {
    const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major"));
    const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major"));
    return sunP?.earthlyBranch==="酉"&&moonP?.earthlyBranch==="卯";
  },
  "命无正曜格": p => { const s=soul(p); return !!s&&!s.stars.some(x=>x.type==="major"); },
  "日月照壁格": p => {
    const sunP=p.find(x=>x.stars.some(s=>s.name==="太阳"&&s.type==="major"));
    const moonP=p.find(x=>x.stars.some(s=>s.name==="太阴"&&s.type==="major"));
    if(!sunP||!moonP) return false;
    const sb=sunP.stars.find(s=>s.name==="太阳")?.brightness??"";
    const mb=moonP.stars.find(s=>s.name==="太阴")?.brightness??"";
    return ["陷","不"].includes(sb)&&["陷","不"].includes(mb);
  },
  "极居卯酉格": p => { const s=soul(p); return !!s&&["卯","酉"].includes(s.earthlyBranch)&&hasMajor(s,"紫微"); },
  "羊陀夹忌格": p => {
    const jiP=p.find(x=>x.stars.some(s=>s.mutagen==="忌")); if(!jiP) return false;
    const sn=sides(p,jiP).flatMap(x=>x.stars.map(s=>s.name));
    return sn.includes("擎羊")&&sn.includes("陀罗");
  },
  "火铃夹命格": p => {
    const s=soul(p); if(!s) return false;
    const [a,b]=sides(p,s);
    const an=(a?.stars||[]).map(x=>x.name); const bn=(b?.stars||[]).map(x=>x.name);
    return (an.includes("火星")&&bn.includes("铃星"))||(an.includes("铃星")&&bn.includes("火星"));
  },
  "明珠出海格": p => { const s=soul(p); return s?.earthlyBranch==="子"&&hasMajor(s,"太阴"); },
  "极向离明格": p => { const s=soul(p); return s?.earthlyBranch==="午"&&hasMajor(s,"紫微"); },
  "丹墀桂墀格": p => {
    const s=soul(p); if(!s) return false;
    const names=[s,...sides(p,s)].flatMap(x=>x.stars.map(st=>st.name));
    return names.includes("文昌")&&names.includes("文曲");
  },
};

// ── describe the relevant palace config for an example ─────────────────────
function describeExample(palaces, slug) {
  const s = soul(palaces);
  const soulStars = s?.stars.filter(x=>x.type==="major").map(x=>`${x.name}（${x.brightness||""}）`).join("、")||"（空宫）";
  const soulBranch = s?.earthlyBranch ?? "?";

  const t = tfz(palaces);
  const tfzStars = t.flatMap(p=>p.stars.filter(x=>x.type==="major").map(x=>`${x.name}在${p.name}`)).join("、");
  const aux = t.flatMap(p=>p.stars.filter(x=>x.type!=="major"&&["文昌","文曲","左辅","右弼","天魁","天钺","禄存","天马","火星","铃星","擎羊","陀罗"].includes(x.name)).map(x=>`${x.name}在${p.name}${x.mutagen?"（化"+x.mutagen+"）":""}`));
  const sihua = t.flatMap(p=>p.stars.filter(x=>x.mutagen).map(x=>`${x.name}化${x.mutagen}（${p.name}）`));

  return `命宫在${soulBranch}宫，主星：${soulStars}；三方四正主星：${tfzStars||"（无）"}；${aux.length?"辅煞："+aux.join("、")+"；":""}${sihua.length?"流年四化："+sihua.join("、"):""}`.replace(/；$/, "");
}

// ── search ─────────────────────────────────────────────────────────────────
const SLUGS = Object.keys(CHECKERS);
const found = {};
let checked = 0;

// Search space: 1970-2005 × all 12 months × days 1,5,10,15,20,25 × 12 hours
const YEARS = Array.from({length:36},(_,i)=>1970+i);
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const DAYS = [1,5,10,15,20,25];
const HOURS = [1,3,5,7,9,11,13,15,17,19,21,23];

outer:
for (const y of YEARS) {
  for (const m of MONTHS) {
    for (const d of DAYS) {
      for (const h of HOURS) {
        if (Object.keys(found).length === SLUGS.length) break outer;
        try {
          const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const al = astro.bySolar(dateStr, hourToShichen(h), "男", true);
          const palaces = buildPalaces(al);
          checked++;

          for (const slug of SLUGS) {
            if (found[slug]) continue;
            try {
              if (CHECKERS[slug](palaces)) {
                found[slug] = {
                  slug,
                  year: y, month: m, day: d, hour: h,
                  shichen: shichenLabel(h),
                  gender: "男命",
                  soulBranch: soul(palaces)?.earthlyBranch ?? "?",
                  description: describeExample(palaces, slug),
                };
                console.log(`✓ ${slug}: ${y}年${m}月${d}日 ${shichenLabel(h)}`);
              }
            } catch {}
          }
        } catch {}
      }
    }
  }
}

console.log(`\n搜索完成: 检验 ${checked} 个组合，找到 ${Object.keys(found).length}/${SLUGS.length} 个格局示例`);

const missing = SLUGS.filter(s => !found[s]);
if (missing.length) console.log("未找到:", missing.join("、"));

const output = Object.values(found);
fs.writeFileSync("/tmp/mingge_examples.json", JSON.stringify(output, null, 2));
fs.writeFileSync(path.join(process.cwd(), "lib", "minggeExamples.json"), JSON.stringify(output, null, 2));
console.log(`\n已写入 /tmp/mingge_examples.json 和 lib/minggeExamples.json`);
