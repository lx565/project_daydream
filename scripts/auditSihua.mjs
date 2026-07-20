import { astro } from "iztro";

const HOUR_MAP = { 子:0, 丑:2, 寅:4, 卯:6, 辰:8, 巳:10, 午:12, 未:14, 申:16, 酉:18, 戌:20, 亥:22 };
const hourToShichen = (h) => (h === 23 || h === 0) ? 0 : Math.ceil(h / 2);

// name, birthLabel, gender
const PEOPLE = [
  ["马云",     "1964年9月10日 巳时",  "male"],
  ["郭富城",   "1965年10月26日 午时", "male"],
  ["居里夫人", "1867年11月7日 午时",  "female"],
  ["姚明",     "1980年9月12日 午时",  "male"],
  ["刘德华",   "1961年9月27日 午时",  "male"],
  ["周杰伦",   "1979年1月18日 卯时",  "male"],
  ["巩俐",     "1965年12月31日 午时", "female"],
  ["莫扎特",   "1756年1月27日 戌时",  "male"],
  ["李宁",     "1963年9月8日 卯时",   "male"],
];

function parse(label) {
  const m = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\S)时/);
  return { year:+m[1], month:+m[2], day:+m[3], hour: HOUR_MAP[m[4]] ?? 6 };
}

for (const [name, label, gender] of PEOPLE) {
  const b = parse(label);
  const dateStr = `${b.year}-${String(b.month).padStart(2,"0")}-${String(b.day).padStart(2,"0")}`;
  const ti = hourToShichen(b.hour);
  const a = astro.bySolar(dateStr, ti, gender === "male" ? "男" : "女", true);
  const found = [];
  for (const p of a.palaces ?? []) {
    for (const s of [...(p.majorStars||[]), ...(p.minorStars||[]), ...(p.adjectiveStars||[])]) {
      if (s.mutagen) found.push(`${s.name}化${s.mutagen} → ${p.name}宫`);
    }
  }
  console.log(`\n【${name}】${label}  (${dateStr})`);
  console.log("  生年四化:", found.length ? found.join("  ·  ") : "（无 — 异常！）");
}
