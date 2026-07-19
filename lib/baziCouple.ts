import type { BaziResult } from "./bazi";
import { getRelationshipConfig, type RelationshipType } from "./coupleTypes";

const GENERATES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];

// 天干合：甲己合土 乙庚合金 丙辛合水 丁壬合木 戊癸合火
const TIAN_GAN_HE: [string, string][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
];

// 地支三合、六合、六冲、三刑
const SAN_HE = [["子", "辰", "申"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"]];
const LIU_HE: [string, string][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];
const LIU_CHONG: [string, string][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];
const SAN_XING: [string, string, string][] = [["寅", "巳", "申"], ["丑", "戌", "未"]];

function dayMasterAffinity(a: string, b: string): { score: number; desc: string } {
  if (a === b) return { score: 70, desc: `同為${a}，志趣相近但易同質化` };
  if (GENERATES[a] === b) return { score: 88, desc: `${a}生${b}，甲方滋養乙方，相扶相助` };
  if (GENERATES[b] === a) return { score: 85, desc: `${b}生${a}，乙方滋養甲方，相扶相助` };
  if (CONTROLS[a] === b) return { score: 55, desc: `${a}克${b}，甲方對乙方約束較強，需多包容` };
  if (CONTROLS[b] === a) return { score: 58, desc: `${b}克${a}，乙方對甲方約束較強，需多包容` };
  return { score: 72, desc: `${a}與${b}無直接生克，各自獨立，後天緣分為主` };
}

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
  const aWeak = aEntries.slice().sort((x, y) => x[1] - y[1])[0][0];
  const bWeak = bEntries.slice().sort((x, y) => x[1] - y[1])[0][0];
  const aBoosted = bRatio[aWeak] > 0.2;
  const bBoosted = aRatio[bWeak] > 0.2;
  if (aBoosted && bBoosted) return { score: 90, desc: `${elNames[aWeak]}與${elNames[bWeak]}互補，五行均衡` };
  if (aBoosted) return { score: 78, desc: `乙方${elNames[aWeak]}旺，補甲方所缺` };
  if (bBoosted) return { score: 78, desc: `甲方${elNames[bWeak]}旺，補乙方所缺` };
  return { score: 62, desc: "五行結構相近，互補性一般，需後天磨合" };
}

function branchHarmonyScore(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
  const branchesA = [baziA.year.branch, baziA.month.branch, baziA.day.branch, baziA.hour.branch];
  const branchesB = [baziB.year.branch, baziB.month.branch, baziB.day.branch, baziB.hour.branch];

  let score = 72;
  const positives: string[] = [];
  const negatives: string[] = [];

  for (const ba of branchesA) {
    for (const bb of branchesB) {
      for (const g of SAN_HE) {
        if (g.includes(ba) && g.includes(bb)) { score += 8; positives.push(`${ba}${bb}三合`); break; }
      }
      for (const [x, y] of LIU_HE) {
        if ((x === ba && y === bb) || (x === bb && y === ba)) { score += 5; positives.push(`${ba}${bb}六合`); break; }
      }
      for (const [x, y] of LIU_CHONG) {
        if ((x === ba && y === bb) || (x === bb && y === ba)) { score -= 6; negatives.push(`${ba}${bb}六沖`); break; }
      }
      for (const g of SAN_XING) {
        if (g.includes(ba) && g.includes(bb)) { score -= 4; negatives.push(`${ba}${bb}相刑`); break; }
      }
    }
  }

  score = Math.min(98, Math.max(42, score));
  const top = [...positives.slice(0, 2), ...negatives.slice(0, 2)];
  const desc = top.length > 0 ? top.join("、") : "地支無特殊合衝，後天緣分為主";
  return { score, desc };
}

function stemCombScore(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
  const stemsA = [baziA.year.stem, baziA.month.stem, baziA.day.stem, baziA.hour.stem];
  const stemsB = [baziB.year.stem, baziB.month.stem, baziB.day.stem, baziB.hour.stem];

  let score = 72;
  const combos: string[] = [];

  for (const sa of stemsA) {
    for (const sb of stemsB) {
      for (const [x, y] of TIAN_GAN_HE) {
        if ((x === sa && y === sb) || (x === sb && y === sa)) {
          score += 10;
          combos.push(`${sa}${sb}合`);
          break;
        }
      }
      // Same stem = comparable energy
      if (sa === sb) score += 2;
      // Stem control (controlling = tension)
      const si = STEMS.indexOf(sa), oi = STEMS.indexOf(sb);
      if (si >= 0 && oi >= 0) {
        const se = STEM_ELEM[si], oe = STEM_ELEM[oi];
        if (CONTROLS[se] === oe || CONTROLS[oe] === se) score -= 3;
      }
    }
  }

  score = Math.min(98, Math.max(42, score));
  const desc = combos.length > 0 ? `天干${combos.slice(0, 2).join("、")}，陰陽相引` : "天干無特殊合化，各自獨立運行";
  return { score, desc };
}

export interface BaziCoupleScore {
  type: RelationshipType;
  total: number;
  label: string;
  color: string;
  dims: { name: string; score: number; desc: string }[];
  dayMasterDesc: string;
  elementDesc: string;
}

function yuanfenLabel(total: number, type: RelationshipType): string {
  const romantic = type === "lover" || type === "spouse";
  if (total >= 85) return romantic ? "命中注定型" : "天生一對型";
  if (total >= 75) return romantic ? "深度契合型" : "默契知己型";
  if (total >= 62) return romantic ? "互補成長型" : "相輔相成型";
  return "需要經營型";
}

export function calcBaziCoupleScore(
  baziA: BaziResult,
  baziB: BaziResult,
  type: RelationshipType,
): BaziCoupleScore {
  const cfg = getRelationshipConfig(type);
  const dm = dayMasterAffinity(baziA.dayMasterElement, baziB.dayMasterElement);
  const el = elementComplementarity(baziA.elements, baziB.elements);
  const br = branchHarmonyScore(baziA, baziB);
  const st = stemCombScore(baziA, baziB);

  const clamp = (n: number) => Math.min(98, Math.max(42, Math.round(n)));

  // 4 dimensions weighted differently to give spread
  const raw = [
    dm.score * 0.5 + st.score * 0.3 + el.score * 0.2,    // 維度1: 緣分底色
    el.score * 0.4 + dm.score * 0.3 + br.score * 0.3,    // 維度2: 互補默契
    br.score * 0.5 + dm.score * 0.3 + st.score * 0.2,    // 維度3: 干支結構
    el.score * 0.4 + br.score * 0.35 + st.score * 0.25,  // 維度4: 成長潛力
  ];

  const descs = [dm.desc, el.desc, br.desc, st.desc];
  const dims = cfg.dimensions.map((name, i) => ({ name, score: clamp(raw[i]), desc: descs[i] }));
  const total = Math.round(dims.reduce((s, d) => s + d.score, 0) / 4);

  let color = "#6b7280";
  if (total >= 85) color = "#8B1A1A";
  else if (total >= 75) color = "#d97706";
  else if (total >= 62) color = "#0891b2";

  return {
    type, total, label: yuanfenLabel(total, type), color, dims,
    dayMasterDesc: dm.desc,
    elementDesc: el.desc,
  };
}
