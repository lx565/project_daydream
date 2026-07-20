// Deterministic 命格 detection from a computed ZiweiResult palace array.
// Pure computation — no AI calls, no async. Returns all formations that apply.

import type { Palace } from "./ziwei";
import { MINGGE_LIST, type MinggeEntry } from "./minggeData";

// ── helpers ────────────────────────────────────────────────────────────────

function soul(p: Palace[]) { return p.find(x => x.name === "命宮"); }
function byName(p: Palace[], name: string) { return p.find(x => x.name === name); }

function tfz(p: Palace[]) {
  return ["命宮","財帛","官祿","遷移"]
    .map(n => byName(p, n)).filter(Boolean) as Palace[];
}

function hasMajor(palace: Palace | undefined, star: string): boolean {
  return palace?.stars.some(s => s.name === star && s.type === "major") ?? false;
}

function hasStar(palace: Palace | undefined, star: string): boolean {
  return palace?.stars.some(s => s.name === star) ?? false;
}

function hasStarAny(list: Palace[], star: string): boolean {
  return list.some(p => hasStar(p, star));
}

function hasMutagen(list: Palace[], mutagen: string): boolean {
  return list.some(p => p.stars.some(s => s.mutagen === mutagen));
}

function sides(p: Palace[], palace: Palace): Palace[] {
  const idx = palace.index;
  return [
    p.find(x => x.index === (idx - 1 + 12) % 12),
    p.find(x => x.index === (idx + 1) % 12),
  ].filter(Boolean) as Palace[];
}

// ── condition checkers ─────────────────────────────────────────────────────

type Checker = (p: Palace[]) => boolean;

const CHECKERS: Record<string, Checker> = {
  "石中隱玉格": (p) => {
    const s = soul(p);
    if (!s || !["子","午"].includes(s.earthlyBranch)) return false;
    if (!hasMajor(s, "巨門")) return false;
    return ["文昌","文曲","天魁","天鉞"].some(x => hasStarAny(tfz(p), x));
  },

  "君臣慶會格": (p) => {
    const s = soul(p);
    if (!hasMajor(s, "紫微")) return false;
    const t = tfz(p);
    return (["天府","天相"].some(x => hasStarAny(t, x))) &&
           (["左輔","右弼","文昌","文曲"].some(x => hasStarAny(t, x)));
  },

  "紫府同宮格": (p) => {
    const s = soul(p);
    if (!s || !["丑","未"].includes(s.earthlyBranch)) return false;
    return hasMajor(s, "紫微") && hasMajor(s, "天府");
  },

  "日月並明格": (p) => {
    const sunP = p.find(x => x.stars.some(s => s.name === "太陽" && s.type === "major"));
    const moonP = p.find(x => x.stars.some(s => s.name === "太陰" && s.type === "major"));
    if (!sunP || !moonP) return false;
    const sunB = sunP.stars.find(s => s.name === "太陽")?.brightness ?? "";
    const moonB = moonP.stars.find(s => s.name === "太陰")?.brightness ?? "";
    return ["旺","廟"].includes(sunB) && ["旺","廟"].includes(moonB);
  },

  "機月同梁格": (p) => {
    const t = tfz(p);
    return ["天機","太陰","天同","天梁"].every(x => hasStarAny(t, x));
  },

  "殺破狼格": (p) => {
    const t = tfz(p);
    return ["七殺","破軍","貪狼"].every(x => hasStarAny(t, x));
  },

  "日照雷門格": (p) => {
    const s = soul(p);
    return s?.earthlyBranch === "卯" && hasMajor(s, "太陽");
  },

  "月朗天門格": (p) => {
    const s = soul(p);
    return s?.earthlyBranch === "亥" && hasMajor(s, "太陰");
  },

  "火貪格": (p) => p.some(x => hasMajor(x, "貪狼") && hasStar(x, "火星")),

  "鈴貪格": (p) => p.some(x => hasMajor(x, "貪狼") && hasStar(x, "鈴星")),

  "財蔭夾印格": (p) => {
    const s = soul(p);
    if (!hasMajor(s, "天相") || !s) return false;
    const sideNames = sides(p, s).flatMap(x => x.stars.map(st => st.name));
    return sideNames.includes("太陰") && sideNames.includes("天梁");
  },

  "祿馬交馳格": (p) => p.some(x => hasStar(x, "祿存") && hasStar(x, "天馬")),

  "陽梁昌祿格": (p) => {
    const t = tfz(p);
    return hasStarAny(t, "太陽") && hasStarAny(t, "天梁") && hasStarAny(t, "文昌") &&
           (hasMutagen(t, "祿") || hasStarAny(t, "祿存"));
  },

  "府相朝垣格": (p) => {
    const t = tfz(p);
    return hasStarAny(t, "天府") && hasStarAny(t, "天相");
  },

  "三奇加會格": (p) => {
    const t = tfz(p);
    return hasMutagen(t, "祿") && hasMutagen(t, "權") && hasMutagen(t, "科");
  },

  "貪武同行格": (p) => {
    const s = soul(p);
    if (!s || !["丑","未"].includes(s.earthlyBranch)) return false;
    return hasMajor(s, "貪狼") && hasMajor(s, "武曲");
  },

  "馬頭帶箭格": (p) => {
    const s = soul(p);
    return s?.earthlyBranch === "午" && hasStar(s, "擎羊");
  },

  "七殺朝鬥格": (p) => {
    const s = soul(p);
    if (!s || !["子","午"].includes(s.earthlyBranch)) return false;
    return hasMajor(s, "七殺");
  },

  "百官朝拱格": (p) => {
    const s = soul(p);
    if (!hasMajor(s, "紫微")) return false;
    const t = tfz(p);
    const aux = ["左輔","右弼","文昌","文曲","天魁","天鉞"];
    return aux.filter(x => hasStarAny(t, x)).length >= 4;
  },

  "鈴昌陀武格": (p) => {
    const t = tfz(p);
    return hasStarAny(t, "鈴星") && hasStarAny(t, "文昌") &&
           hasStarAny(t, "陀羅") && hasStarAny(t, "武曲");
  },

  "風流彩杖格": (p) => p.some(x => hasMajor(x, "貪狼") && hasStar(x, "擎羊")),

  "刑囚夾印格": (p) => {
    const s = soul(p);
    if (!hasMajor(s, "天相") || !s) return false;
    const sideNames = sides(p, s).flatMap(x => x.stars.map(st => st.name));
    return sideNames.includes("廉貞") && sideNames.includes("擎羊");
  },

  "日月反背格": (p) => {
    const sunP = p.find(x => x.stars.some(s => s.name === "太陽" && s.type === "major"));
    const moonP = p.find(x => x.stars.some(s => s.name === "太陰" && s.type === "major"));
    return sunP?.earthlyBranch === "酉" && moonP?.earthlyBranch === "卯";
  },

  "命無正曜格": (p) => {
    const s = soul(p);
    return !!s && !s.stars.some(x => x.type === "major");
  },

  "日月照壁格": (p) => {
    const sunP = p.find(x => x.stars.some(s => s.name === "太陽" && s.type === "major"));
    const moonP = p.find(x => x.stars.some(s => s.name === "太陰" && s.type === "major"));
    if (!sunP || !moonP) return false;
    const sunB = sunP.stars.find(s => s.name === "太陽")?.brightness ?? "";
    const moonB = moonP.stars.find(s => s.name === "太陰")?.brightness ?? "";
    return ["陷","不"].includes(sunB) && ["陷","不"].includes(moonB);
  },

  "極居卯酉格": (p) => {
    const s = soul(p);
    return !!s && ["卯","酉"].includes(s.earthlyBranch) && hasMajor(s, "紫微");
  },

  "羊陀夾忌格": (p) => {
    const jiP = p.find(x => x.stars.some(s => s.mutagen === "忌"));
    if (!jiP) return false;
    const sideNames = sides(p, jiP).flatMap(x => x.stars.map(s => s.name));
    return sideNames.includes("擎羊") && sideNames.includes("陀羅");
  },

  "火鈴夾命格": (p) => {
    const s = soul(p);
    if (!s) return false;
    const [a, b] = sides(p, s);
    const an = (a?.stars ?? []).map(x => x.name);
    const bn = (b?.stars ?? []).map(x => x.name);
    return (an.includes("火星") && bn.includes("鈴星")) ||
           (an.includes("鈴星") && bn.includes("火星"));
  },

  "明珠出海格": (p) => {
    const s = soul(p);
    return s?.earthlyBranch === "子" && hasMajor(s, "太陰");
  },

  "極向離明格": (p) => {
    const s = soul(p);
    return s?.earthlyBranch === "午" && hasMajor(s, "紫微");
  },

  "丹墀桂墀格": (p) => {
    const s = soul(p);
    if (!s) return false;
    const region = [s, ...sides(p, s)];
    const names = region.flatMap(x => x.stars.map(st => st.name));
    return names.includes("文昌") && names.includes("文曲");
  },
};

// ── public API ─────────────────────────────────────────────────────────────

/** Returns all 命格 that apply to the given palace array. */
export function detectMingge(palaces: Palace[]): MinggeEntry[] {
  if (!palaces.length) return [];
  return MINGGE_LIST.filter(entry => {
    const checker = CHECKERS[entry.slug];
    if (!checker) return false;
    try { return checker(palaces); } catch { return false; }
  });
}
