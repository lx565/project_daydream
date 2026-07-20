import type { FlowYear } from './flowYears';
import type { ZiweiResult } from './ziwei';

const XIONG_STARS = new Set(['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫']);

const CAUTION_PALACE_SCORES: Record<string, number> = {
  '命宮': 3,
  '疾厄宮': 2,
  '官祿宮': 2,
  '財帛宮': 2,
  '夫妻宮': 1,
};

export interface RiskYear extends FlowYear {
  riskScore: number;
}

export function buildStarPalaceMap(palaces: ZiweiResult['palaces']): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of palaces ?? []) {
    for (const s of p.stars) {
      if (s.type === 'major') map[s.name] = p.name;
    }
  }
  return map;
}

export function scoreFlowYearRisk(
  flow: FlowYear,
  starPalaceMap: Record<string, string>
): number {
  let score = 0;
  for (const mutagen of flow.yearlyMutagen) {
    if (!mutagen.endsWith('化忌')) continue;
    const star = mutagen.replace(/化忌$/, '');
    const palace = starPalaceMap[star];
    score += CAUTION_PALACE_SCORES[palace] ?? (palace ? 1 : 0);
  }
  for (const star of flow.natalStars) {
    if (XIONG_STARS.has(star)) score += 1;
  }
  return score;
}

export function pickRiskYears(
  flows: FlowYear[],
  starPalaceMap: Record<string, string>,
  count = 3
): RiskYear[] {
  const scored: RiskYear[] = flows.map(f => ({
    ...f,
    riskScore: scoreFlowYearRisk(f, starPalaceMap),
  }));
  scored.sort((a, b) => b.riskScore - a.riskScore);
  return scored.slice(0, Math.max(2, count));
}
