"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import ZiweiChart from "./ZiweiChart";
import type { MonthlyCharts } from "./MonthlyFortuneFlow";
import { useSSEStream, type StreamResult } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";

interface MonthScore {
  year: number;
  month: number;
  ganzhi: string;
  overall: number;
  career: number;
  romance: number;
  theme: string;
}

interface PreviewData {
  months: MonthScore[];
  teaser: string;
}

function Dots({ n, type }: { n: number; type: "overall" | "career" | "romance" }) {
  const colors = {
    overall: ["bg-vermillion", "bg-vermillion/12"],
    career:  ["bg-amber-500",  "bg-amber-100"],
    romance: ["bg-rose-400",   "bg-rose-100"],
  };
  const [filled, empty] = colors[type];
  return (
    <span className="flex gap-px items-center justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < n ? filled : empty}`} />
      ))}
    </span>
  );
}

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

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(false);
    fetch("/api/reading/monthly/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PreviewData) => { if (!cancelled) setPreview(d); })
      .catch(() => { if (!cancelled) setPreviewError(true); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const body = { ziwei, name };
  const batch1 = useSSEStream("/api/reading/monthly", `${chartId}_b1`);
  const batch2 = useSSEStream("/api/reading/monthly", `${chartId}_b2`);
  const batch3 = useSSEStream("/api/reading/monthly", `${chartId}_b3`);

  useEffect(() => {
    if (paywall.loading || gated) return;
    if (batch1.status === "idle") batch1.start({ ...body, batch: 1 });
    if (batch2.status === "idle") batch2.start({ ...body, batch: 2 });
    if (batch3.status === "idle") batch3.start({ ...body, batch: 3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  const batches: [StreamResult, StreamResult, StreamResult] = [batch1, batch2, batch3];
  const allDone = batches.every((b) => b.status === "done");
  const anyLoading = batches.some((b) => b.status === "idle" || b.status === "streaming");
  const firstError = batches.find((b) => b.status === "error");
  const firstErrorBatchNum = firstError ? batches.indexOf(firstError) + 1 : 0;

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
          <p className="text-sm text-vermillion">推算失敗，請重新整理重試。</p>
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
              {preview.months.map((m, i) => (
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
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5 space-y-4">
            {anyLoading && <LoadingSkeleton />}
            {firstError && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{firstError.errorMsg}</p>
                <button onClick={() => firstError.start({ ...body, batch: firstErrorBatchNum })} className="text-xs text-gold underline">重試</button>
              </div>
            )}
            {allDone && (
              <div className="animate-fade-in prose max-w-none text-sm [&_h3]:text-vermillion [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold">
                <Md>{batch1.text}</Md>
                <Md>{batch2.text}</Md>
                <Md>{batch3.text}</Md>
              </div>
            )}
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
