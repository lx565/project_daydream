import Link from "next/link";
import { loadDomainCases, CASE_DOMAINS, type CaseDomain } from "@/lib/caseDomains";

export default function BaziCaseExamples({ domain, max = 8 }: { domain: CaseDomain; max?: number }) {
  const meta = CASE_DOMAINS[domain];
  const cases = loadDomainCases(domain).slice(0, max);
  if (cases.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
        <div className={`w-1.5 h-5 ${meta.accent} rounded-full self-center`} />
        <h2 className="text-lg font-bold text-ink">{meta.sectionTitle}</h2>
      </div>
      <p className="text-xs text-ink-3">{meta.intro}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cases.map((c) => (
          <div key={c.caseId} className="bg-paper rounded-lg shadow-sm p-4 space-y-3 border-t-2 border-border-warm">
            {/* chart header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink">
                {c.rizi}{c.geju ? ` · ${c.geju}` : ""}
              </span>
              {c.bazi_text && (
                <span className="text-[11px] font-mono text-ink-3">{c.bazi_text}</span>
              )}
            </div>

            {/* 命裡 AI blind read */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-bold text-white px-1.5 py-px rounded ${meta.accent}`}>命裡 AI 解讀</span>
                <span className="text-[10px] text-ink-4">僅憑八字盲測</span>
              </div>
              <p className="text-[13px] text-ink-2 leading-relaxed">{c.mingliRead}</p>
            </div>

            {/* 古籍參照 — the "answer key" */}
            <div className="border-t border-border-warm/60 pt-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-ink-3 border border-border-warm px-1.5 py-px rounded">古籍參照</span>
                {c.sourceLabel && <span className="text-[10px] text-ink-4 truncate">{c.sourceLabel}</span>}
              </div>
              <p className="text-[12px] text-ink-3 leading-relaxed">{c.masterVerdict}</p>
              {c.outcome && (
                <p className="text-[11px] text-green-700 mt-1"><span className="font-medium">結局：</span>{c.outcome}</p>
              )}
            </div>

            <Link href={`/cases/${c.slug}`} className="inline-block text-[11px] text-vermillion hover:underline">
              看完整命例 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
