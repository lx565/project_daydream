import fs from "fs";
import path from "path";

// NOTE: health (jibing) was intentionally excluded — 八字 health cases are inherently
// accidents/illnesses (car crashes, disease, injury) with no non-alarming variety, which
// recreated the fatalistic content this feature exists to avoid. Marriage/career/wealth
// have neutral-to-positive variety and read as learning material.
export type CaseDomain = "hunyin" | "shiye" | "caiyun";

export interface CaseDomainMeta {
  domain: CaseDomain;
  label: string;        // 婚姻 / 事業 / 財運 / 健康
  sectionTitle: string; // heading on the hub
  intro: string;        // one-line framing under the heading
  accent: string;       // tailwind bg class for the accent bar
  keywords: string[];   // pre-filter tokens (match in analysis/prediction/outcome)
}

export const CASE_DOMAINS: Record<CaseDomain, CaseDomainMeta> = {
  hunyin: {
    domain: "hunyin", label: "婚姻",
    sectionTitle: "真實命例 · 命裡 AI 對照古籍",
    intro: "以下為古今命書中的真實婚姻命例：先看命裡 AI 只憑八字給出的解讀，再對照古籍名家的斷語與真實結局。",
    accent: "bg-fuchsia-500",
    keywords: ["婚", "妻", "夫", "配偶", "離", "桃花", "感情", "再娶", "克妻", "剋夫", "姻緣", "娶"],
  },
  shiye: {
    domain: "shiye", label: "事業",
    sectionTitle: "真實命例 · 命裡 AI 對照古籍",
    intro: "以下為古今命書中的真實事業命例：先看命裡 AI 只憑八字給出的解讀，再對照古籍名家的斷語與真實結局。",
    accent: "bg-indigo-500",
    keywords: ["官", "事業", "職", "升", "仕", "創業", "經商", "公職", "罷官", "功名", "貴"],
  },
  caiyun: {
    domain: "caiyun", label: "財運",
    sectionTitle: "真實命例 · 命裡 AI 對照古籍",
    intro: "以下為古今命書中的真實財運命例：先看命裡 AI 只憑八字給出的解讀，再對照古籍名家的斷語與真實結局。",
    accent: "bg-amber-500",
    keywords: ["財", "富", "破財", "發財", "鉅富", "破產", "求財", "錢", "商", "利"],
  },
};

export interface DomainCase {
  caseId: string;
  slug: string;
  bazi_text: string;
  rizi: string;
  geju: string;
  sourceLabel: string;   // book attribution, e.g. "韋千里《千里命稿》"
  mingliRead: string;    // 命裡 AI's blind read of the chart (domain-scoped)
  masterVerdict: string; // one-line condensed classical verdict
  outcome: string;       // 結局 — what actually happened
}

export interface CaseAiRead {
  domain: CaseDomain;
  label: string;
  accent: string;
  mingliRead: string;
}

/** All 命裡 AI blind reads for a case, across every domain it was curated into.
 *  Lets the individual /cases/[slug] page show the same AI read the hub card teased. */
export function getCaseAiReads(caseId: string): CaseAiRead[] {
  const out: CaseAiRead[] = [];
  for (const domain of Object.keys(CASE_DOMAINS) as CaseDomain[]) {
    const hit = loadDomainCases(domain).find((c) => c.caseId === caseId);
    if (hit?.mingliRead) {
      const m = CASE_DOMAINS[domain];
      out.push({ domain, label: m.label, accent: m.accent, mingliRead: hit.mingliRead });
    }
  }
  return out;
}

export function loadDomainCases(domain: CaseDomain): DomainCase[] {
  try {
    const file = path.join(process.cwd(), "content", "cases-domains", `${domain}.json`);
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw) as DomainCase[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
