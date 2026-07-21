import type { BaziResult } from "./bazi";
import { getRelationshipConfig, type RelationshipType } from "./coupleTypes";
import { dayMasterAffinity, elementComplementarity, allBranchesHarmony, allStemsHarmony } from "./bazi-affinity";

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
  const br = allBranchesHarmony(baziA, baziB);
  const st = allStemsHarmony(baziA, baziB);

  const clamp = (n: number) => Math.min(96, Math.max(66, Math.round(n)));

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
