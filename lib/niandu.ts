// Deterministic domain-mapping for 年度解讀 (annual critical-moments reading).
// For a single target year, finds where each of that year's four 四化 stars
// (化祿/化權/化科/化忌) sit natally, and maps that palace to a plain-language
// life domain — same idea as monthly/preview/route.ts's palace→area mapping,
// scoped to one full year (so every palace is covered, not just the four
// NOTABLE_PALACES a single month bothers with).

import { getFlowYears } from './flowYears';
import type { BirthInfo, ZiweiResult } from './ziwei';

export type MutagenType = "祿" | "權" | "科" | "忌";

export interface NianduSignal {
  star: string;
  mutagen: MutagenType;
  palace: string;   // natal palace name the star sits in, e.g. "夫妻"
  domain: string;   // plain-language life area, e.g. "感情"
  tone: "positive" | "caution" | "neutral";
}

export interface NianduYear {
  age: number;
  year: number;
  ganzhi: string;
  signals: NianduSignal[];
}

const DOMAIN_LABEL: Record<string, string> = {
  命宮: "整體運勢", 兄弟: "合夥與同輩", 夫妻: "感情", 子女: "子女與創作",
  財帛: "財務", 疾厄: "健康", 遷移: "外出與人際", 僕役: "人脈與合作",
  官祿: "事業", 田宅: "居住與置業", 福德: "心境與福澤", 父母: "長輩與貴人",
};

function toneOf(mutagen: MutagenType): NianduSignal["tone"] {
  if (mutagen === "忌") return "caution";
  if (mutagen === "祿" || mutagen === "權") return "positive";
  return "neutral"; // 科
}

function parseMutagenStar(entry: string): { star: string; mutagen: MutagenType } | null {
  const m = entry.match(/^(.+)化([祿權科忌])$/);
  if (!m) return null;
  return { star: m[1], mutagen: m[2] as MutagenType };
}

/** Which natal palace each star sits in — includes all star types since
 *  mutagen stars can be major or minor. */
function buildStarPalaceMap(palaces: ZiweiResult["palaces"]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of palaces ?? []) {
    for (const s of p.stars) {
      map[s.name] = p.name;
    }
  }
  return map;
}

/** Computes the four 四化 signals (natal palace + life domain) for exactly one
 *  target age/year — the "critical moments" a 年度解讀 reading is built from. */
export async function getNianduYear(ziwei: ZiweiResult, targetAge: number): Promise<NianduYear | null> {
  const birth: BirthInfo = ziwei.birth;
  const flows = await getFlowYears(birth, targetAge, targetAge);
  const flow = flows[0];
  if (!flow) return null;

  const starPalaceMap = buildStarPalaceMap(ziwei.palaces);
  const signals: NianduSignal[] = flow.yearlyMutagen
    .map(parseMutagenStar)
    .filter((s): s is { star: string; mutagen: MutagenType } => !!s)
    .map((s) => {
      const palace = starPalaceMap[s.star] ?? "";
      return { star: s.star, mutagen: s.mutagen, palace, domain: DOMAIN_LABEL[palace] ?? "整體運勢", tone: toneOf(s.mutagen) };
    })
    .filter((s) => s.palace); // drop a mutagen star iztro didn't place on a natal major-star palace (edge charts)

  return { age: flow.age, year: flow.year, ganzhi: flow.ganzhi, signals };
}

/** Deterministic facts string for grounding the paid AI generation (Task 4) —
 *  same role as lib/flowYears.ts's flowYearFactsFrom, scoped to just the
 *  domain-mapped signals a 年度解讀 reading covers. */
export function nianduFactsFrom(ny: NianduYear): string {
  const lines = ny.signals.map((s) => `${s.star}化${s.mutagen} → 落於本命${s.palace}宮（${s.domain}）`);
  return `流年：${ny.year}年 ${ny.ganzhi}（${ny.age}歲）\n四化落點：\n${lines.join('\n') || '（本命盤四化星未落入任何主星所在宮位）'}`;
}
