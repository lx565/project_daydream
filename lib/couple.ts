import type { BaziResult } from "./bazi";
import type { ZiweiResult } from "./ziwei";
import { getRelationshipConfig, type RelationshipType } from "./coupleTypes";
import {
  dayMasterAffinity, elementComplementarity,
  yearBranchAffinity, dayBranchAffinity, dayStemCombination,
} from "./bazi-affinity";

// 夫妻宮 star quality (simple heuristic on major stars) — generalized to any palace.
// Traditional Chinese — ziwei.ts requests zh-TW from iztro (astro.bySolar's
// language param), so star/palace names from ZiweiResult are Traditional.
const FAVORABLE_STARS = new Set(["天同", "太陰", "天梁", "天相", "天府", "紫微", "武曲"]);
const CHALLENGING_STARS = new Set(["七殺", "破軍", "貪狼", "廉貞"]);

// iztro's zh-TW locale names this palace 僕役 (classical term); the rest of
// this app (RelationshipConfig, prompts, UI copy) says 交友 (modern usage) —
// same palace, different label. "命" needs a suffix too: only 命宮 carries the
// 宮 suffix in ZiweiResult.palaces[].name (see lib/ziwei.ts), the other 11
// palaces are stored as short names. "交友"/"命" are the two coupleTypes.ts
// palette labels that don't already match a real palaces[].name value.
// Resolve both aliases here rather than renaming coupleTypes.ts's user-facing
// labels, which are also used for RAG topic search text and UI copy where the
// short/modern form is preferable. Exported so any consumer of
// RelationshipConfig.palaces (e.g. AI-prompt grounding builders) can resolve
// the same way instead of re-deriving this mapping.
export const PALACE_ALIASES: Record<string, string> = { "交友": "僕役", "命": "命宮" };

// Real ZiweiResult.palaces[].name values (post-alias-resolution) — used to
// filter out non-palace entries like coupleTypes.ts's sibling config's "六亲"
// (a loose relational grouping, not one of the 12 actual palaces). Shared by
// every couple-native reading route (couple, bazi-couple, and the deep-tier
// palaces/decades/schools/cautions routes) so relationship-type palace lists
// never crash a lookup or render a broken "（無資料）" line.
export const REAL_PALACE_NAMES = new Set([
  "命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄",
  "遷移", "僕役", "官祿", "田宅", "福德", "父母",
]);

export function isRealPalace(palaceName: string): boolean {
  const resolved = PALACE_ALIASES[palaceName] ?? palaceName;
  return REAL_PALACE_NAMES.has(resolved);
}

// Describe a palace with all its stars. Resolves coupleTypes.ts's short/modern
// palace labels (e.g. "交友", "命") against ZiweiResult.palaces[].name's actual
// stored form (e.g. "僕役", "命宮") via PALACE_ALIASES.
export function palaceDesc(ziwei: ZiweiResult, palaceName: string): string {
  const resolvedName = PALACE_ALIASES[palaceName] ?? palaceName;
  const p = ziwei.palaces.find(x => x.name === palaceName || x.name === resolvedName);
  if (!p) return `${palaceName}（無資料）`;
  const stars = p.stars
    .filter(s => s.type === "major" || s.type === "minor" || ["紅鸞","天喜","天馬","孤辰","寡宿"].includes(s.name))
    .map(s => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`)
    .join("、");
  const stem = p.heavenlyStem ? `[${p.heavenlyStem}干]` : "";
  return `${palaceName}${stem}：${stars || "空宮"}`;
}

export function palaceStarScore(ziwei: ZiweiResult, palaceName: string): { score: number; stars: string[] } {
  const resolvedName = PALACE_ALIASES[palaceName] ?? palaceName;
  const palace = ziwei.palaces.find((p) => p.name === palaceName || p.name === resolvedName);
  if (!palace) return { score: 70, stars: [] };
  const major = palace.stars.filter((s) => s.type === "major").map((s) => s.name);
  let score = 72;
  for (const s of major) {
    if (FAVORABLE_STARS.has(s)) score += 8;
    if (CHALLENGING_STARS.has(s)) score -= 6;
    // iztro returns the bare mutagen character ("祿"/"權"/"科"/"忌"), not
    // Simplified+化-prefixed ("化禄"/"化科") — see lib/ziwei.ts's StarInfo.mutagen
    // JSDoc and 2026-10-02 audit P1-18. The old comparison never matched, so
    // 四化 had zero effect on 四維得分 despite the prompt asking the model to
    // explain scores driven by it.
    if (s && palace.stars.find((x) => x.name === s && (x.mutagen === "祿" || x.mutagen === "科"))) score += 5;
    if (s && palace.stars.find((x) => x.name === s && x.mutagen === "忌")) score -= 8;
  }
  return { score: Math.min(98, Math.max(42, score)), stars: major };
}

// Kept for callers that specifically want 夫妻宮 regardless of relationship type
// (the preview route's "夫妻宫主星" prompt line).
function weddingPalaceScore(ziwei: ZiweiResult): { score: number; stars: string[] } {
  return palaceStarScore(ziwei, "夫妻");
}

export interface CoupleScore {
  total: number;
  dayMaster: { score: number; desc: string };
  elements: { score: number; desc: string };
  aWedding: { score: number; stars: string[] };
  bWedding: { score: number; stars: string[] };
  label: string;
  color: string;
}

export function calcCoupleScore(
  baziA: BaziResult, ziweiA: ZiweiResult,
  baziB: BaziResult, ziweiB: ZiweiResult,
): CoupleScore {
  const dm = dayMasterAffinity(baziA.dayMasterElement, baziB.dayMasterElement);
  const el = elementComplementarity(baziA.elements, baziB.elements);
  const aw = weddingPalaceScore(ziweiA);
  const bw = weddingPalaceScore(ziweiB);

  const weddingAvg = (aw.score + bw.score) / 2;
  const total = Math.round(dm.score * 0.30 + el.score * 0.25 + weddingAvg * 0.45);

  let label = "緣分深厚";
  let color = "#16a34a";
  if (total >= 85) { label = "天作之合"; color = "#8B1A1A"; }
  else if (total >= 75) { label = "緣分深厚"; color = "#d97706"; }
  else if (total >= 62) { label = "相輔相成"; color = "#0891b2"; }
  else { label = "磨合為主"; color = "#6b7280"; }

  return { total, dayMaster: dm, elements: el, aWedding: aw, bWedding: bw, label, color };
}

// ── v2: relationship-aware 4-dimension scoring ──────────────────────────────

export interface CoupleScoreV2 {
  type: RelationshipType;
  total: number;
  label: string;
  color: string;
  dims: { name: string; score: number; desc: string }[];
  weddingStarsA: string[];
  weddingStarsB: string[];
}

function yuanfenLabel(total: number, type: RelationshipType): string {
  const lover = type === "lover" || type === "spouse";
  if (total >= 85) return lover ? "命中注定型" : "天生一對型";
  if (total >= 75) return lover ? "深度契合型" : "默契知己型";
  if (total >= 62) return lover ? "互補成長型" : "相輔相成型";
  return "需要經營型";
}

// Per-type 4-dimension weight tables. Each row is one dimension (in the same
// order as RelationshipConfig.dimensions for that type), weights sum to 1,
// and every row within a type uses a distinct combination — no two dimensions
// share a weight vector. Signal keys: dm=dayMaster, el=element, yb=yearBranch,
// db=dayBranch, ds=dayStem, pp=primaryPalace (cfg.palaces[0]), cp=childPalace.
const DIMENSION_WEIGHTS: Record<RelationshipType, Record<
  "dm" | "el" | "yb" | "db" | "ds" | "pp" | "cp", number
>[]> = {
  lover: [ // 吸引力, 默契度, 稳定度, 成长潜力
    { ds: 0.40, dm: 0.35, pp: 0.25, el: 0, yb: 0, db: 0, cp: 0 },
    { db: 0.40, pp: 0.35, el: 0.25, dm: 0, yb: 0, ds: 0, cp: 0 },
    { pp: 0.45, db: 0.30, dm: 0.25, el: 0, yb: 0, ds: 0, cp: 0 },
    { el: 0.45, yb: 0.30, cp: 0.25, dm: 0, db: 0, ds: 0, pp: 0 },
  ],
  spouse: [ // 稳定度, 子嗣缘, 家庭运, 白头到老
    { pp: 0.45, db: 0.30, dm: 0.25, el: 0, yb: 0, ds: 0, cp: 0 },
    { cp: 0.55, el: 0.25, yb: 0.20, dm: 0, db: 0, ds: 0, pp: 0 },
    { yb: 0.40, el: 0.35, pp: 0.25, dm: 0, db: 0, ds: 0, cp: 0 },
    { db: 0.40, dm: 0.30, el: 0.30, yb: 0, ds: 0, pp: 0, cp: 0 },
  ],
  friend: [ // 默契度, 互补性, 长久性, 互相成就
    { db: 0.40, dm: 0.35, pp: 0.25, el: 0, yb: 0, ds: 0, cp: 0 },
    { el: 0.50, ds: 0.25, pp: 0.25, dm: 0, yb: 0, db: 0, cp: 0 },
    { pp: 0.40, yb: 0.35, db: 0.25, dm: 0, el: 0, ds: 0, cp: 0 },
    { dm: 0.40, el: 0.35, pp: 0.25, yb: 0, db: 0, ds: 0, cp: 0 },
  ],
  sibling: [ // 手足情深, 互帮互助, 缘分深浅, 相处模式
    { pp: 0.45, yb: 0.30, dm: 0.25, el: 0, db: 0, ds: 0, cp: 0 },
    { el: 0.45, dm: 0.30, pp: 0.25, yb: 0, db: 0, ds: 0, cp: 0 },
    { yb: 0.40, db: 0.35, ds: 0.25, dm: 0, el: 0, pp: 0, cp: 0 },
    { db: 0.40, pp: 0.35, el: 0.25, dm: 0, yb: 0, ds: 0, cp: 0 },
  ],
  parentchild: [ // 亲缘深度, 教育契合, 前世羁绊, 共同成长
    { pp: 0.45, yb: 0.30, dm: 0.25, el: 0, db: 0, ds: 0, cp: 0 },
    { el: 0.40, db: 0.35, pp: 0.25, dm: 0, yb: 0, ds: 0, cp: 0 },
    { yb: 0.40, ds: 0.35, dm: 0.25, el: 0, db: 0, pp: 0, cp: 0 },
    { cp: 0.40, el: 0.35, pp: 0.25, dm: 0, yb: 0, db: 0, ds: 0 },
  ],
};

export function calcCoupleScoreV2(
  baziA: BaziResult, ziweiA: ZiweiResult,
  baziB: BaziResult, ziweiB: ZiweiResult,
  type: RelationshipType,
): CoupleScoreV2 {
  const cfg = getRelationshipConfig(type);
  const primaryPalaceName = cfg.palaces[0] ?? "夫妻";

  const dm = dayMasterAffinity(baziA.dayMasterElement, baziB.dayMasterElement);
  const el = elementComplementarity(baziA.elements, baziB.elements);
  const yb = yearBranchAffinity(baziA, baziB);
  const db = dayBranchAffinity(baziA, baziB);
  const ds = dayStemCombination(baziA, baziB);

  const ppA = palaceStarScore(ziweiA, primaryPalaceName);
  const ppB = palaceStarScore(ziweiB, primaryPalaceName);
  const pp = (ppA.score + ppB.score) / 2;

  const cpA = palaceStarScore(ziweiA, "子女");
  const cpB = palaceStarScore(ziweiB, "子女");
  const cp = (cpA.score + cpB.score) / 2;

  const signals = { dm: dm.score, el: el.score, yb: yb.score, db: db.score, ds: ds.score, pp, cp };
  const clamp = (n: number) => Math.min(96, Math.max(66, Math.round(n)));

  // Human-readable grounding per signal — lets the prompt explain each
  // dimension's score from its actual dominant contributors instead of
  // inventing a reason for a number it was never told how to derive.
  const ppDesc = `${primaryPalaceName}宮主星：甲方${ppA.stars.join("、") || "空宮"}、乙方${ppB.stars.join("、") || "空宮"}`;
  const cpDesc = `子女宮主星：甲方${cpA.stars.join("、") || "空宮"}、乙方${cpB.stars.join("、") || "空宮"}`;
  const signalDescs: Record<keyof typeof signals, string> = {
    dm: dm.desc, el: el.desc, yb: yb.desc, db: db.desc, ds: ds.desc, pp: ppDesc, cp: cpDesc,
  };

  const weights = DIMENSION_WEIGHTS[type];
  const dims = cfg.dimensions.map((name, i) => {
    const w = weights[i];
    const raw = w.dm * signals.dm + w.el * signals.el + w.yb * signals.yb
      + w.db * signals.db + w.ds * signals.ds + w.pp * signals.pp + w.cp * signals.cp;
    const contributors = (Object.keys(w) as (keyof typeof signals)[])
      .filter((k) => w[k] > 0)
      .sort((a, b) => w[b] - w[a])
      .map((k) => signalDescs[k]);
    return { name, score: clamp(raw), desc: contributors.join("；") };
  });

  const total = Math.round(dims.reduce((s, d) => s + d.score, 0) / 4);

  let color = "#6b7280";
  if (total >= 85) color = "#8B1A1A";
  else if (total >= 75) color = "#d97706";
  else if (total >= 62) color = "#0891b2";

  // 夫妻宮 stars specifically — kept for the preview prompt's "夫妻宫主星" line,
  // independent of which palace this relationship type actually scores on.
  const weddingA = weddingPalaceScore(ziweiA);
  const weddingB = weddingPalaceScore(ziweiB);

  return {
    type, total, label: yuanfenLabel(total, type), color, dims,
    weddingStarsA: weddingA.stars, weddingStarsB: weddingB.stars,
  };
}
