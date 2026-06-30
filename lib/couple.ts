import type { BaziResult } from "./bazi";
import type { ZiweiResult } from "./ziwei";
import { getRelationshipConfig, type RelationshipType } from "./coupleTypes";

// Day master mutual relationships (生/克/合/同)
const GENERATES: Record<string, string> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};
const CONTROLS: Record<string, string> = {
  木: "土", 土: "水", 水: "火", 火: "金", 金: "木",
};

// How well A's day master relates to B's day master
function dayMasterAffinity(a: string, b: string): { score: number; desc: string } {
  if (a === b) return { score: 70, desc: "同性日主，志趣相近，但需避免同质化" };
  if (GENERATES[a] === b) return { score: 88, desc: `${a}生${b}，甲方滋养乙方，相扶相助` };
  if (GENERATES[b] === a) return { score: 85, desc: `${b}生${a}，乙方滋养甲方，相扶相助` };
  if (CONTROLS[a] === b) return { score: 55, desc: `${a}克${b}，甲方对乙方约束较强，需多包容` };
  if (CONTROLS[b] === a) return { score: 58, desc: `${b}克${a}，乙方对甲方约束较强，需多包容` };
  return { score: 72, desc: "日主无直接生克，各自独立，互不干扰" };
}

// Five-element complementarity: each person's deficit filled by the other
function elementComplementarity(
  a: BaziResult["elements"],
  b: BaziResult["elements"],
): { score: number; desc: string } {
  const elNames: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  const aEntries = Object.entries(a) as [string, number][];
  const bEntries = Object.entries(b) as [string, number][];
  const aTotal = aEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const bTotal = bEntries.reduce((s, [, v]) => s + v, 0) || 1;

  const aRatio = Object.fromEntries(aEntries.map(([k, v]) => [k, v / aTotal]));
  const bRatio = Object.fromEntries(bEntries.map(([k, v]) => [k, v / bTotal]));

  // A's weakest element boosted by B's strength
  const aWeak = aEntries.sort((x, y) => x[1] - y[1])[0][0];
  const bWeak = bEntries.sort((x, y) => x[1] - y[1])[0][0];

  const aBoosted = bRatio[aWeak] > 0.2;
  const bBoosted = aRatio[bWeak] > 0.2;

  if (aBoosted && bBoosted) return { score: 90, desc: `五行互补：${elNames[aWeak]}与${elNames[bWeak]}相互填补，搭配均衡` };
  if (aBoosted) return { score: 78, desc: `乙方${elNames[aWeak]}旺，补甲方所缺` };
  if (bBoosted) return { score: 78, desc: `甲方${elNames[bWeak]}旺，补乙方所缺` };
  return { score: 62, desc: "五行结构相近，互补性一般，需后天磨合" };
}

// 夫妻宫 star quality (simple heuristic on major stars)
const FAVORABLE_STARS = new Set(["天同", "太阴", "天梁", "天相", "天府", "紫微", "武曲"]);
const CHALLENGING_STARS = new Set(["七杀", "破军", "贪狼", "廉贞"]);

function weddingPalaceScore(ziwei: ZiweiResult): { score: number; stars: string[] } {
  const palace = ziwei.palaces.find((p) => p.name === "夫妻");
  if (!palace) return { score: 70, stars: [] };
  const major = palace.stars.filter((s) => s.type === "major").map((s) => s.name);
  let score = 72;
  for (const s of major) {
    if (FAVORABLE_STARS.has(s)) score += 8;
    if (CHALLENGING_STARS.has(s)) score -= 6;
    // 化禄/化科 in 夫妻宫 are good
    if (s && palace.stars.find((x) => x.name === s && (x.mutagen === "化禄" || x.mutagen === "化科"))) score += 5;
    if (s && palace.stars.find((x) => x.name === s && x.mutagen === "化忌")) score -= 8;
  }
  return { score: Math.min(98, Math.max(42, score)), stars: major };
}

export interface CoupleScore {
  total: number;           // 0–100
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

  let label = "缘分深厚";
  let color = "#16a34a";
  if (total >= 85) { label = "天作之合"; color = "#8B1A1A"; }
  else if (total >= 75) { label = "缘分深厚"; color = "#d97706"; }
  else if (total >= 62) { label = "相辅相成"; color = "#0891b2"; }
  else { label = "磨合为主"; color = "#6b7280"; }

  return { total, dayMaster: dm, elements: el, aWedding: aw, bWedding: bw, label, color };
}

// ── v2: relationship-aware 4-dimension scoring ──────────────────────────────

export interface CoupleScoreV2 {
  type: RelationshipType;
  total: number;                 // 0–100
  label: string;                 // 缘分类型标签
  color: string;
  dims: { name: string; score: number }[]; // 4 项，名称来自 coupleTypes
  weddingStarsA: string[];
  weddingStarsB: string[];
}

// 缘分类型标签——按总分分档，文案随关系类型微调
function yuanfenLabel(total: number, type: RelationshipType): string {
  const lover = type === "lover" || type === "spouse";
  if (total >= 85) return lover ? "命中注定型" : "天生一对型";
  if (total >= 75) return lover ? "深度契合型" : "默契知己型";
  if (total >= 62) return lover ? "互补成长型" : "相辅相成型";
  return "需要经营型";
}

// 把三个确定性子分（日主/五行/夫妻宫均值）按关系类型映射到 4 个命名维度。
// 每个维度用一个稳定的加权组合，保证：同一对命盘结果恒定、4 个维度有区分度、
// 落在 42–98 区间。
export function calcCoupleScoreV2(
  baziA: BaziResult, ziweiA: ZiweiResult,
  baziB: BaziResult, ziweiB: ZiweiResult,
  type: RelationshipType,
): CoupleScoreV2 {
  const cfg = getRelationshipConfig(type);
  const dm = dayMasterAffinity(baziA.dayMasterElement, baziB.dayMasterElement);
  const el = elementComplementarity(baziA.elements, baziB.elements);
  const aw = weddingPalaceScore(ziweiA);
  const bw = weddingPalaceScore(ziweiB);
  const wed = (aw.score + bw.score) / 2;

  const clamp = (n: number) => Math.min(98, Math.max(42, Math.round(n)));

  // 4 个维度各用不同权重，避免四格雷同；每组权重之和=1
  const raw = [
    dm.score * 0.5 + wed * 0.3 + el.score * 0.2,   // 维度1 偏"关系底色"
    dm.score * 0.3 + el.score * 0.3 + wed * 0.4,   // 维度2 偏"互动契合"
    wed * 0.5 + dm.score * 0.3 + el.score * 0.2,   // 维度3 偏"稳定/深度"
    el.score * 0.45 + dm.score * 0.35 + wed * 0.2, // 维度4 偏"成长/潜力"
  ];
  const dims = cfg.dimensions.map((name, i) => ({ name, score: clamp(raw[i]) }));
  const total = Math.round(dims.reduce((s, d) => s + d.score, 0) / 4);

  let color = "#6b7280";
  if (total >= 85) color = "#8B1A1A";
  else if (total >= 75) color = "#d97706";
  else if (total >= 62) color = "#0891b2";

  return {
    type, total, label: yuanfenLabel(total, type), color, dims,
    weddingStarsA: aw.stars, weddingStarsB: bw.stars,
  };
}
