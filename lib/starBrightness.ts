// Classical brightness (廟旺得利平陷) for assistant stars that iztro leaves blank.
//
// INTEGRITY GUARDRAIL: only values with a real classical source belong here. These
// brightnesses become authoritative facts that readings are grounded in and proofread
// against — a fabricated value would corrupt exactly what it's meant to strengthen.
//
// Status of the eight assistant stars iztro returns blank for:
//   祿存  → 廟 in every palace. Well attested (《紫微斗數全書》: 祿存無失陷).
//   左輔 右弼 天魁 天鉞 天馬 地空 地劫 → NO standard 廟旺 rating in the classical
//     廟旺利陷表. Intentionally omitted → they stay blank (correct), not fabricated.
//     Add here ONLY if a cited authoritative table is provided.
//
// (iztro already supplies brightness for the 14 major stars and 文昌 文曲 火星 鈴星
//  擎羊 陀羅, so those never reach this table.)

// Fixed brightness (same in all palaces).
const FIXED: Record<string, string> = {
  祿存: "廟",
};

// Palace-dependent brightness, keyed by [starName][地支]. Empty until a cited
// classical table is encoded. Shape ready for e.g. 左輔/右弼 by-branch tables.
const BY_BRANCH: Record<string, Record<string, string>> = {};

/**
 * Classical brightness for an assistant star iztro left blank.
 * @param star  star name (e.g. "祿存")
 * @param branch  the palace's earthly branch (地支), for palace-dependent stars
 * @returns the brightness char, or "" if none is authoritatively known (never fabricated)
 */
export function assistBrightness(star: string, branch?: string): string {
  if (FIXED[star]) return FIXED[star];
  if (branch && BY_BRANCH[star]?.[branch]) return BY_BRANCH[star][branch];
  return "";
}
