import type { BaziResult } from "./bazi";

// 五行 for each 天干
const STEM_WX: Record<string, string> = {
  甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"
};
// 阴阳 polarity (1=阳, 0=阴)
const STEM_YY: Record<string, number> = {
  甲:1,乙:0,丙:1,丁:0,戊:1,己:0,庚:1,辛:0,壬:1,癸:0
};
// 月支 主气 (本气天干)
const BRANCH_MAIN_STEM: Record<string, string> = {
  子:"癸",丑:"己",寅:"甲",卯:"乙",辰:"戊",巳:"丙",
  午:"丁",未:"己",申:"庚",酉:"辛",戌:"戊",亥:"壬"
};
// 五行生克
const GENERATES: Record<string, string> = { 木:"火",火:"土",土:"金",金:"水",水:"木" };
const CONTROLS:  Record<string, string>  = { 木:"土",土:"水",水:"火",火:"金",金:"木" };

function getShishen(riZhu: string, stem: string): string {
  const rWx = STEM_WX[riZhu];
  const sWx = STEM_WX[stem];
  if (!rWx || !sWx) return "";
  const samePolar = STEM_YY[riZhu] === STEM_YY[stem];
  if (rWx === sWx)                    return samePolar ? "比肩" : "劫财";
  if (GENERATES[rWx] === sWx)         return samePolar ? "食神" : "伤官";
  if (GENERATES[sWx] === rWx)         return samePolar ? "正印" : "偏印";
  if (CONTROLS[rWx]  === sWx)         return samePolar ? "偏财" : "正财";
  if (CONTROLS[sWx]  === rWx)         return samePolar ? "七杀" : "正官";
  return "";
}

const SHISHEN_TO_GEJU: Record<string, string> = {
  食神:"食神格", 伤官:"伤官格",
  正财:"正财格", 偏财:"偏财格",
  正官:"正官格", 七杀:"七杀格",
  正印:"正印格", 偏印:"偏印格",
  // 比肩/劫财 → 建禄格/月刃格 — uncommon, return empty to use rizi-only fallback
};

/**
 * Detect 格局 from BaziResult using 月令本气 method.
 * Returns "" if uncertain (caller falls back to rizi-only matching).
 */
export function detectGeju(bazi: BaziResult): string {
  const riZhu = bazi.day.stem;             // e.g. "甲"
  const yueZhi = bazi.month.branch;        // e.g. "卯"
  const mainStem = BRANCH_MAIN_STEM[yueZhi];
  if (!mainStem) return "";
  const shishen = getShishen(riZhu, mainStem);
  return SHISHEN_TO_GEJU[shishen] ?? "";
}
