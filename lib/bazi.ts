// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar, LunarYear, LunarUtil } = require("lunar-javascript") as {
  Solar: {
    fromYmdHms: (y:number,m:number,d:number,h:number,mi:number,s:number) => {
      getJulianDay: () => number;
      getLunar: () => {
        getEightChar: () => {
          getYear:()=>string; getYearGan:()=>string; getYearZhi:()=>string; getYearWuXing:()=>string;
          getMonth:()=>string; getMonthGan:()=>string; getMonthZhi:()=>string; getMonthWuXing:()=>string;
          getDay:()=>string; getDayGan:()=>string; getDayZhi:()=>string; getDayWuXing:()=>string;
          getTime:()=>string; getTimeGan:()=>string; getTimeZhi:()=>string; getTimeWuXing:()=>string;
          getYun: (gender: number) => {
            getStartYear: () => number;
            getDaYun: () => Array<{
              getGanZhi: () => string;
              getStartAge: () => number;
              getEndAge: () => number;
              getStartYear: () => number;
              getEndYear: () => number;
            }>;
          };
        }
      }
    }
  };
  LunarYear: { fromYear: (y:number) => { getJieQiJulianDays: () => number[] } };
  LunarUtil: { JIE_QI: string[] };
};

export interface JieQiInfo {
  prevJieQi: string;
  nextJieQi: string;
  daysFromPrev: number;
  daysToNext: number;
  season: string;
  isNearBoundary: boolean;
}

export interface Pillar {
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
}

export interface BaziDecade {
  ganZhi: string;      // e.g. "壬午"
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
}

export interface BaziResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  elements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dayMaster: string;
  dayMasterElement: string;
  summary: string;
  jieQiInfo: JieQiInfo;
  luckStartAge: number;   // age when decade luck cycles begin
  decades: BaziDecade[];  // 8 decade luck periods
}

function parsePillar(gan: string, zhi: string, wuXing: string): Pillar {
  return {
    stem: gan,
    branch: zhi,
    stemElement: wuXing[0],
    branchElement: wuXing[1],
  };
}

function elementCount(pillars: Pillar[]): BaziResult['elements'] {
  const counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const map: Record<string, keyof typeof counts> = {
    '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
  };
  for (const p of pillars) {
    counts[map[p.stemElement]]++;
    counts[map[p.branchElement]]++;
  }
  return counts;
}

function buildSummary(
  dayMaster: string,
  dayMasterEl: string,
  elements: BaziResult['elements'],
): string {
  const entries = Object.entries(elements) as [keyof typeof elements, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const elNames: Record<keyof typeof elements, string> = {
    wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
  };
  const dominant = elNames[entries[0][0]];
  const weakest = elNames[entries[entries.length - 1][0]];
  let yongshen = weakest;
  if (weakest === dayMasterEl && entries.length > 1) {
    yongshen = elNames[entries[entries.length - 2][0]];
  }
  return `日主${dayMaster}${dayMasterEl}，五行偏${dominant}，喜用神為${yongshen}`;
}

const SEASON: Record<string, string> = {
  寅: '春', 卯: '春', 辰: '春',
  巳: '夏', 午: '夏', 未: '夏',
  申: '秋', 酉: '秋', 戌: '秋',
  亥: '冬', 子: '冬', 丑: '冬',
};

function computeJieQiInfo(
  year: number, month: number, day: number, hour: number,
  monthBranch: string,
): JieQiInfo {
  const birthJD: number = Solar.fromYmdHms(year, month, day, hour, 0, 0).getJulianDay();
  // LunarYear.fromYear(year) returns 31 Julian days starting from DA_XUE of year-1,
  // so it already covers late-December of the previous year — no concatenation needed.
  const jds: number[] = LunarYear.fromYear(year).getJieQiJulianDays();
  const JQ: string[] = LunarUtil.JIE_QI; // 24 names starting at 冬至

  // jds[i] maps to JQ[(i+23)%24]: index 0=DA_XUE(prev), 1=冬至, 2=小寒, …
  let prevIdx = 0;
  for (let i = jds.length - 1; i >= 0; i--) {
    if (jds[i] <= birthJD) { prevIdx = i; break; }
  }

  const daysFromPrev = Math.round(birthJD - jds[prevIdx]);
  const daysToNext   = prevIdx + 1 < jds.length
    ? Math.round(jds[prevIdx + 1] - birthJD)
    : 15;

  return {
    prevJieQi: JQ[(prevIdx + 23) % 24],
    nextJieQi: JQ[(prevIdx + 24) % 24],
    daysFromPrev,
    daysToNext,
    season: SEASON[monthBranch] ?? '冬',
    isNearBoundary: daysFromPrev <= 3 || daysToNext <= 3,
  };
}

export function calculateBazi(
  year: number,
  month: number,
  day: number,
  hour: number,
  gender: 'male' | 'female',
): BaziResult {
  // Use lunar-javascript for accurate 節氣-based pillar calculation
  const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
  const bz = solar.getLunar().getEightChar();

  const yearPillar  = parsePillar(bz.getYearGan(),  bz.getYearZhi(),  bz.getYearWuXing());
  const monthPillar = parsePillar(bz.getMonthGan(), bz.getMonthZhi(), bz.getMonthWuXing());
  const dayPillar   = parsePillar(bz.getDayGan(),   bz.getDayZhi(),   bz.getDayWuXing());
  const hourPillar  = parsePillar(bz.getTimeGan(),  bz.getTimeZhi(),  bz.getTimeWuXing());

  const allPillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const elements = elementCount(allPillars);
  const dayMaster = dayPillar.stem;
  const dayMasterEl = dayPillar.stemElement;
  const jieQiInfo = computeJieQiInfo(year, month, day, hour, monthPillar.branch);

  // 大運 — decade luck cycles (gender: male=1, female=0)
  const genderNum = gender === 'male' ? 1 : 0;
  const yun = bz.getYun(genderNum);
  const luckStartAge = yun.getStartYear(); // library names it "StartYear" but returns the start AGE
  const allDaYun = yun.getDaYun();
  // Index 0 is the pre-luck period (month pillar itself); skip it
  const decades: BaziDecade[] = allDaYun.slice(1, 9).map(d => ({
    ganZhi: String(d.getGanZhi()),
    startAge: d.getStartAge(),
    endAge: d.getEndAge(),
    startYear: d.getStartYear(),
    endYear: d.getEndYear(),
  }));

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    elements,
    dayMaster,
    dayMasterElement: dayMasterEl,
    summary: buildSummary(dayMaster, dayMasterEl, elements),
    jieQiInfo,
    luckStartAge,
    decades,
  };
}
