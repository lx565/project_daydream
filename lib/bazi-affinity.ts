// lib/bazi-affinity.ts
// Shared deterministic 八字 affinity primitives — day master, five-element
// complementarity, and stem/branch relations (合/冲/刑) — used by both the
// 紫微+八字 combined couple scoring (lib/couple.ts) and the pure-八字 couple
// scoring (lib/baziCouple.ts). Consolidated here to avoid the two files
// re-implementing identical logic.
import type { BaziResult } from "./bazi";

export const GENERATES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
export const CONTROLS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const EL_NAMES: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

export function dayMasterAffinity(a: string, b: string): { score: number; desc: string } {
  if (a === b) return { score: 70, desc: `同為${a}，志趣相近但易同質化` };
  if (GENERATES[a] === b) return { score: 88, desc: `${a}生${b}，甲方滋養乙方，相扶相助` };
  if (GENERATES[b] === a) return { score: 85, desc: `${b}生${a}，乙方滋養甲方，相扶相助` };
  if (CONTROLS[a] === b) return { score: 55, desc: `${a}克${b}，甲方對乙方約束較強，需多包容` };
  if (CONTROLS[b] === a) return { score: 58, desc: `${b}克${a}，乙方對甲方約束較強，需多包容` };
  return { score: 72, desc: `${a}與${b}無直接生克，各自獨立，後天緣分為主` };
}

export function elementComplementarity(
  a: BaziResult["elements"],
  b: BaziResult["elements"],
): { score: number; desc: string } {
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
  if (aBoosted && bBoosted) return { score: 90, desc: `${EL_NAMES[aWeak]}與${EL_NAMES[bWeak]}互補，五行均衡` };
  if (aBoosted) return { score: 78, desc: `乙方${EL_NAMES[aWeak]}旺，補甲方所缺` };
  if (bBoosted) return { score: 78, desc: `甲方${EL_NAMES[bWeak]}旺，補乙方所缺` };
  return { score: 62, desc: "五行結構相近，互補性一般，需後天磨合" };
}

// 天干五合：甲己合土 乙庚合金 丙辛合水 丁壬合木 戊癸合火
const TIAN_GAN_HE: [string, string][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
];
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];

// 地支三合、六合、六冲、三刑
const SAN_HE = [["子", "辰", "申"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"]];
const LIU_HE: [string, string][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];
const LIU_CHONG: [string, string][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];
const SAN_XING: [string, string, string][] = [["寅", "巳", "申"], ["丑", "戌", "未"]];
const SELF_XING = new Set(["辰", "午", "酉", "亥"]); // 自刑

export function branchRelation(a: string, b: string): { score: number; tag: string } {
  const base = 74;
  for (const g of SAN_HE) {
    if (g.includes(a) && g.includes(b) && a !== b) return { score: base + 15, tag: "三合" };
  }
  for (const [x, y] of LIU_HE) {
    if ((x === a && y === b) || (x === b && y === a)) return { score: base + 18, tag: "六合" };
  }
  for (const [x, y] of LIU_CHONG) {
    if ((x === a && y === b) || (x === b && y === a)) return { score: base - 10, tag: "六冲" };
  }
  for (const g of SAN_XING) {
    if (g.includes(a) && g.includes(b) && a !== b) return { score: base - 6, tag: "相刑" };
  }
  if (a === b && SELF_XING.has(a)) return { score: base - 4, tag: "自刑" };
  return { score: base, tag: "" };
}

export function stemRelation(a: string, b: string): { score: number; tag: string } {
  const base = 74;
  for (const [x, y] of TIAN_GAN_HE) {
    if ((x === a && y === b) || (x === b && y === a)) return { score: base + 16, tag: "合" };
  }
  if (a === b) return { score: base + 6, tag: "同气" };
  const ai = STEMS.indexOf(a), bi = STEMS.indexOf(b);
  if (ai >= 0 && bi >= 0) {
    const ae = STEM_ELEM[ai], be = STEM_ELEM[bi];
    if (CONTROLS[ae] === be || CONTROLS[be] === ae) return { score: base - 8, tag: "克" };
  }
  return { score: base, tag: "" };
}

export const BRANCH_ZODIAC: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龙", 巳: "蛇",
  午: "马", 未: "羊", 申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

export function yearBranchAffinity(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
  const a = baziA.year.branch, b = baziB.year.branch;
  const { score, tag } = branchRelation(a, b);
  const za = BRANCH_ZODIAC[a] ?? a, zb = BRANCH_ZODIAC[b] ?? b;
  const desc = tag ? `生肖${za}与${zb}${tag}` : `生肖${za}与${zb}无特殊合冲，各自独立`;
  return { score, desc };
}

export function dayBranchAffinity(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
  const a = baziA.day.branch, b = baziB.day.branch;
  const { score, tag } = branchRelation(a, b);
  const desc = tag ? `日支${a}与${b}${tag}，日常相处受此牵引` : `日支${a}与${b}无特殊合冲`;
  return { score, desc };
}

export function dayStemCombination(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
  const a = baziA.day.stem, b = baziB.day.stem;
  const { score, tag } = stemRelation(a, b);
  const desc = tag ? `日干${a}与${b}${tag}` : `日干${a}与${b}各自运行，互不牵制`;
  return { score, desc };
}

// All 4×4 pillar-branch cross-scan (year/month/day/hour × year/month/day/hour).
// Coarser than yearBranchAffinity/dayBranchAffinity (which look at one specific
// pillar pair) — kept for lib/baziCouple.ts's existing scoring, which predates
// the pinpoint signals above and scans the whole chart rather than one pillar.
export function allBranchesHarmony(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
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

export function allStemsHarmony(baziA: BaziResult, baziB: BaziResult): { score: number; desc: string } {
  const stemsA = [baziA.year.stem, baziA.month.stem, baziA.day.stem, baziA.hour.stem];
  const stemsB = [baziB.year.stem, baziB.month.stem, baziB.day.stem, baziB.hour.stem];
  let score = 72;
  const combos: string[] = [];
  for (const sa of stemsA) {
    for (const sb of stemsB) {
      for (const [x, y] of TIAN_GAN_HE) {
        if ((x === sa && y === sb) || (x === sb && y === sa)) { score += 10; combos.push(`${sa}${sb}合`); break; }
      }
      if (sa === sb) score += 2;
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
