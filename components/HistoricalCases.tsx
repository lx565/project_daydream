"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BaziResult } from "@/lib/bazi";
import type { CaseRecord } from "@/lib/casesData";

interface Props {
  bazi: BaziResult;
}

interface MatchResult {
  cases: CaseRecord[];
  rizi: string;
  geju: string;
}

export default function HistoricalCases({ bazi }: Props) {
  const [data, setData] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bazi?.day?.stem) return;
    setLoading(true);
    fetch("/api/cases/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bazi }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: MatchResult) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [bazi?.day?.stem, bazi?.month?.branch]);

  // Hidden if loading or no matches
  if (loading || !data || data.cases.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-amber-100">
        <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />
        <span className="text-xs font-semibold text-amber-800">歷史類似命盤</span>
        <span className="text-[10px] text-ink-4 ml-1">
          {data.rizi}{data.geju ? ` · ${data.geju}` : ""}
        </span>
      </div>

      <div className="divide-y divide-amber-100/60 bg-paper">
        {data.cases.map((c) => (
          <div key={c.id} className="px-3 py-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-xs font-semibold text-ink">{c.rizi}{c.geju ? `·${c.geju}` : ""}</span>
                {c.bazi_text && (
                  <span className="ml-2 text-[11px] font-mono text-ink-3">{c.bazi_text}</span>
                )}
              </div>
              <span className="text-[10px] text-ink-4 whitespace-nowrap shrink-0">{c.sourceLabel}</span>
            </div>

            <p className="text-[12px] text-ink-2 leading-relaxed line-clamp-3">{c.analysis}</p>

            {c.outcome && (
              <p className="mt-1.5 text-[11px] text-green-700">
                <span className="font-medium">结局：</span>{c.outcome}
              </p>
            )}

            <Link
              href={`/cases/${c.slug}`}
              className="inline-block mt-2 text-[10px] text-amber-700 hover:underline"
            >
              查看完整案例 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
