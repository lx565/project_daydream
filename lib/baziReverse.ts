import { calculateBazi } from "./bazi";

const STEMS    = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// Each branch maps to the odd hour at the start of that 2-hour period
export const BRANCH_TO_HOUR: Record<string, number> = {
  "子": 23, "丑": 1, "寅": 3,  "卯": 5,  "辰": 7,  "巳": 9,
  "午": 11, "未": 13, "申": 15, "酉": 17, "戌": 19, "亥": 21,
};

export const SHICHEN_LABEL: Record<string, string> = {
  "子": "子時（23–1時）", "丑": "丑時（1–3時）", "寅": "寅時（3–5時）",
  "卯": "卯時（5–7時）", "辰": "辰時（7–9時）", "巳": "巳時（9–11時）",
  "午": "午時（11–13時）","未": "未時（13–15時）","申": "申時（15–17時）",
  "酉": "酉時（17–19時）","戌": "戌時（19–21時）","亥": "亥時（21–23時）",
};

export interface BaziPillars {
  year: string;   // e.g. "甲子"
  month: string;  // e.g. "乙丑"
  day: string;    // e.g. "丙寅"
  hour: string;   // e.g. "丁卯"
}

export interface BaziCandidate {
  year: number;
  month: number;
  day: number;
  hour: number;     // representative hour for 紫微 calculation
  dateLabel: string;
  shichenLabel: string;
  approxAge: number;
}

// Parse "甲子乙丑丙寅丁卯" or "甲子 乙丑 丙寅 丁卯" into pillars object.
// Returns null if invalid.
export function parseBaziInput(raw: string): BaziPillars | null {
  const s = raw.replace(/[\s　·，,、]+/g, "").trim();
  if (s.length !== 8) return null;

  const pairs = [s.slice(0, 2), s.slice(2, 4), s.slice(4, 6), s.slice(6, 8)];

  for (const pair of pairs) {
    const si = STEMS.indexOf(pair[0]);
    const bi = BRANCHES.indexOf(pair[1]);
    if (si < 0 || bi < 0) return null;
    // Valid 干支 combo: stem index and branch index must share parity
    if (si % 2 !== bi % 2) return null;
  }

  return { year: pairs[0], month: pairs[1], day: pairs[2], hour: pairs[3] };
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

// Iterate all dates in [startYear, endYear] and return those whose Bazi matches.
// Gender is included because lunar-javascript's getEightChar sometimes factors it in.
export function findBaziCandidates(
  pillars: BaziPillars,
  gender: "male" | "female",
  startYear = 1920,
  endYear = 2009,
): BaziCandidate[] {
  const hourBranch = pillars.hour[1]; // branch char of hour pillar
  const baseHour = BRANCH_TO_HOUR[hourBranch] ?? 11;
  const currentYear = new Date().getFullYear();
  const results: BaziCandidate[] = [];

  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const maxDay = daysInMonth(y, m);
      for (let d = 1; d <= maxDay; d++) {
        const bz = calculateBazi(y, m, d, baseHour, gender);
        if (
          bz.year.stem  + bz.year.branch  === pillars.year  &&
          bz.month.stem + bz.month.branch === pillars.month &&
          bz.day.stem   + bz.day.branch   === pillars.day   &&
          bz.hour.stem  + bz.hour.branch  === pillars.hour
        ) {
          results.push({
            year: y, month: m, day: d, hour: baseHour,
            dateLabel: `${y}年${m}月${d}日`,
            shichenLabel: SHICHEN_LABEL[hourBranch] ?? hourBranch + "時",
            approxAge: currentYear - y,
          });
        }
      }
    }
  }

  return results;
}
