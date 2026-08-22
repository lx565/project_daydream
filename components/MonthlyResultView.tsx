"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Dots from "./Dots";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import ZiweiChart from "./ZiweiChart";
import MonthCard from "./MonthCard";
import type { MonthlyCharts } from "./MonthlyFortuneFlow";
import { usePaywall } from "@/lib/usePaywall";
import type { MonthScore, MonthlyPreviewResult } from "@/app/api/reading/monthly/preview/route";
import type { MonthlyDetail, MonthlyBatchResult } from "@/app/api/reading/monthly/route";
import type { ZiweiResult } from "@/lib/ziwei";

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 py-4 px-1">
      {[90, 75, 82, 65, 70].map((w, i) => (
        <div key={i} className="h-2.5 rounded-full bg-border-light overflow-hidden" style={{ width: `${w}%` }}>
          <div className="h-full bg-gradient-to-r from-transparent via-border-warm to-transparent animate-shimmer"
            style={{ animationDelay: `${i * 200}ms` }} />
        </div>
      ))}
    </div>
  );
}

interface BatchState {
  data: MonthlyDetail[] | null;
  loading: boolean;
  error: boolean;
}

/** Fetches one paid batch (4 months of structured fields) from
 *  /api/reading/monthly. Mirrors this file's existing fetchPreview
 *  stale-response-guard pattern (a request-id ref, not just a boolean),
 *  so a retry firing after this component has moved on doesn't clobber
 *  newer state. */
function useMonthlyBatch(ziwei: ZiweiResult, name: string | undefined, batch: 1 | 2 | 3, enabled: boolean) {
  const [state, setState] = useState<BatchState>({ data: null, loading: false, error: false });
  const requestRef = useRef(0);

  const fetchBatch = useCallback(() => {
    const requestId = ++requestRef.current;
    setState({ data: null, loading: true, error: false });
    fetch("/api/reading/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name, batch }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MonthlyBatchResult) => { if (requestRef.current === requestId) setState({ data: d.months, loading: false, error: false }); })
      .catch(() => { if (requestRef.current === requestId) setState({ data: null, loading: false, error: true }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  useEffect(() => {
    if (!enabled || state.data || state.loading) return;
    fetchBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchBatch]);

  return { ...state, retry: fetchBatch };
}

const MONTHLY_INCLUDED = [
  "未來 12 個月 · 逐月詳細解讀",
  "每月流月命宮 · 星曜與四化落點",
  "每月機遇與需留意之處",
  "每月一句可操作建議",
];

const MONTHLY_PROOF_STRIP = [
  { icon: "📅", stat: "12 個月", label: "逐月詳解" },
  { icon: "🔮", stat: "紫微斗數", label: "流月命宮分析" },
  { icon: "📚", stat: "上百部", label: "命理典籍加持" },
  { icon: "⚡", stat: "$1.99", label: "一次解鎖全年" },
];

export default function MonthlyResultView({ charts, onReset }: { charts: MonthlyCharts; onReset: () => void }) {
  const { ziwei, name, gender, sessionId } = charts;
  const label = name || (gender === "male" ? "命主（男）" : "命主（女）");

  const chartId = `yueyun_${sessionId}`;
  const paywall = usePaywall(chartId);
  const gated = paywall.enabled && !paywall.unlocked;

  const [preview, setPreview] = useState<MonthlyPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  // Guards against a stale response (e.g. a retry fired after sessionId already
  // changed) overwriting newer state — each call stamps its own request id and
  // only applies its result if still the most recent one in flight.
  const previewRequestRef = useRef(0);

  const fetchPreview = useCallback(() => {
    const requestId = ++previewRequestRef.current;
    setPreviewLoading(true);
    setPreviewError(false);
    fetch("/api/reading/monthly/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MonthlyPreviewResult) => { if (previewRequestRef.current === requestId) setPreview(d); })
      .catch(() => { if (previewRequestRef.current === requestId) setPreviewError(true); })
      .finally(() => { if (previewRequestRef.current === requestId) setPreviewLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const batchEnabled = !paywall.loading && !gated;
  const batch1 = useMonthlyBatch(ziwei, name, 1, batchEnabled);
  const batch2 = useMonthlyBatch(ziwei, name, 2, batchEnabled);
  const batch3 = useMonthlyBatch(ziwei, name, 3, batchEnabled);
  const batches = [batch1, batch2, batch3];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      <div className="paper-card rounded-2xl border border-border-warm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-vermillion rounded-full" />
          <h2 className="text-base font-bold text-ink tracking-wide">{label} · 未來 12 個月總覽</h2>
        </div>

        {previewLoading && <LoadingSkeleton />}
        {previewError && !previewLoading && (
          <div className="space-y-1.5">
            <p className="text-sm text-vermillion">推算失敗，請重新整理重試。</p>
            <button onClick={fetchPreview} className="text-xs text-gold underline">重試</button>
          </div>
        )}

        {preview && !previewLoading && (
          <>
            <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-1 py-1.5 border-b border-border-warm text-[9px] text-ink-4 font-medium uppercase tracking-wider">
              <span>月份 · 主題</span>
              <span className="text-center">綜合</span>
              <span className="text-center">事業</span>
              <span className="text-center">感情</span>
            </div>
            <div className="divide-y divide-border-light">
              {preview.months.map((m: MonthScore, i) => (
                <div key={`${m.year}-${m.month}`}
                  className={`grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-1 py-2 ${i === 0 ? "bg-vermillion-l/40" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-xs tabular-nums ${i === 0 ? "font-bold text-vermillion" : "font-medium text-ink-2"}`}>
                        {m.year}年{m.month}月 {m.ganzhi}
                      </span>
                      {i === 0 && (
                        <span className="text-[8px] px-1 py-px bg-vermillion text-white font-bold rounded-sm leading-none whitespace-nowrap">本月</span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 truncate ${i === 0 ? "text-ink font-medium" : "text-ink-3"}`}>{m.theme}</p>
                  </div>
                  <Dots n={m.overall} type="overall" />
                  <Dots n={m.career} type="career" />
                  <Dots n={m.romance} type="romance" />
                </div>
              ))}
            </div>

            {preview.teaser && (
              <div className="mt-4 pt-4 border-t border-border-warm">
                <p className="text-xs text-vermillion font-semibold mb-1.5">本月免費短評</p>
                <p className="text-sm text-ink-2 leading-relaxed">{preview.teaser}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">逐月詳細解讀</span>
        </p>
        {gated ? (
          <PaywallLock chartId={chartId} sectionLabel="逐月詳細解讀" included={MONTHLY_INCLUDED} proofStrip={MONTHLY_PROOF_STRIP} />
        ) : (
          <div className="space-y-4">
            {batches.map((b, i) => {
              // Each batch covers a fixed 4-month slice of the same 12-month
              // window the free preview already computed — pairing by index
              // is safe because both this route and the preview route derive
              // their ordering from the same getFlowMonths() call, and the
              // paid route's own (year,month) matching (Task 2) guarantees
              // its 4 returned entries are in that same flow order.
              const scoreSlice = preview?.months.slice(i * 4, i * 4 + 4) ?? [];
              // preview is ONE shared piece of state feeding all three batch panels.
              // If it hasn't resolved yet (still loading / not started), the batch's
              // AI content may already be in even though we don't have scores to pair
              // it with yet — show a skeleton rather than nothing. If preview has
              // failed (or, defensively, resolved but still doesn't line up), show an
              // error with a retry that re-fetches the actual thing that's broken
              // (the preview), not the batch (which already succeeded).
              const previewPending = previewLoading || (!preview && !previewError);
              return (
                <div key={i} className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                  {(b.loading || (!b.data && !b.error)) && <LoadingSkeleton />}
                  {b.error && (
                    <div className="space-y-2">
                      <p className="text-sm text-vermillion">推算失敗，請重新整理重試。</p>
                      <button onClick={b.retry} className="text-xs text-gold underline">重試</button>
                    </div>
                  )}
                  {b.data && scoreSlice.length !== b.data.length && previewPending && <LoadingSkeleton />}
                  {b.data && scoreSlice.length !== b.data.length && !previewPending && (
                    <div className="space-y-2">
                      <p className="text-sm text-vermillion">總覽資料載入失敗，請重新整理重試。</p>
                      <button onClick={fetchPreview} className="text-xs text-gold underline">重試</button>
                    </div>
                  )}
                  {b.data && scoreSlice.length === b.data.length && (
                    <div className="space-y-4 animate-fade-in">
                      {b.data.map((detail, j) => (
                        <MonthCard
                          key={`${detail.year}-${detail.month}`}
                          score={scoreSlice[j]}
                          detail={detail}
                          isCurrentMonth={i === 0 && j === 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1">命盤</p>
        <ZiweiChart
          palaces={ziwei.palaces} soulPalace={ziwei.soulPalace} bodyPalace={ziwei.bodyPalace}
          fiveElementsClass={ziwei.fiveElementsClass} mainStar={ziwei.mainStar} bodyStar={ziwei.bodyStar}
          name={name} gender={gender}
        />
      </div>

      <p className="text-center text-xs text-ink-4 pb-4">
        僅供學習參考與娛樂，請理性看待，切勿迷信 ·{" "}
        <Link href="/" className="text-vermillion hover:underline">測完整命盤 →</Link>
      </p>

      <BugReportButton sessionId={chartId} page="yueyun" />
    </div>
  );
}
