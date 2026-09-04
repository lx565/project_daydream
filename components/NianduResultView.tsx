"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import EntryTracker from "./EntryTracker";
import ToolCTA from "./ToolCTA";
import ZiweiChart from "./ZiweiChart";
import Md from "./Md";
import type { NianduCharts } from "./NianduFlow";
import { usePaywall } from "@/lib/usePaywall";
import { useSSEStream } from "@/lib/useSSEStream";
import type { Reference } from "@/lib/rag";
import type { NianduSignal } from "@/lib/niandu";
import type { NianduPreviewResult } from "@/app/api/reading/niandu/preview/route";

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

const SCHOOL_LABELS: Record<string, string> = {
  "三合派": "三合", "四化派": "四化", "飛星派": "飛星",
  "北派河洛": "北派", "古籍經典": "古籍", "其他名家": "名家", "倪師學派": "倪師",
};

function RefList({ refs }: { refs: Reference[] }) {
  const [open, setOpen] = useState(false);
  if (refs.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-border-light">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-4 hover:text-ink-3 transition-colors">
        <span className="text-gold">📚</span>
        <span>參考典籍（{refs.length}部）</span>
        <span className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {refs.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-ink-4">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-paper-2 border border-border-light text-ink-3 flex-shrink-0">
                {SCHOOL_LABELS[r.school] ?? r.school}
              </span>
              <span>{r.book.replace(/-/g, " · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_h3]:text-gold [&_h3]:font-semibold [&_h3]:text-xs [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0 [&_li]:before:text-vermillion [&_li]:before:font-bold [&_li>p]:inline [&_li>p]:m-0";

const NIANDU_INCLUDED = [
  "今年每個四化落點的完整展開",
  "對應到感情、事業、財務、健康等具體領域",
  "每點附一條可操作建議",
  "AI 依據上百部命理典籍撰寫",
];

const NIANDU_PROOF_STRIP = [
  { icon: "🔮", stat: "紫微斗數", label: "流年四化分析" },
  { icon: "🎯", stat: "只講", label: "今年真正關鍵" },
  { icon: "📚", stat: "上百部", label: "命理典籍加持" },
  { icon: "⚡", stat: "$1.99", label: "一次解鎖全年" },
];

const TONE_STYLE: Record<NianduSignal["tone"], string> = {
  positive: "bg-jade-l text-jade",
  caution: "bg-vermillion-l text-vermillion",
  neutral: "bg-gold-l text-gold",
};

export default function NianduResultView({ charts, onReset }: { charts: NianduCharts; onReset: () => void }) {
  const { ziwei, name, gender, date, hour, sessionId } = charts;
  const label = name || (gender === "male" ? "命主（男）" : "命主（女）");

  const chartId = `niandu_${sessionId}`;
  const paywall = usePaywall(chartId);
  const gated = paywall.enabled && !paywall.unlocked;

  const [preview, setPreview] = useState<NianduPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const previewRequestRef = useRef(0);

  const fetchPreview = () => {
    const requestId = ++previewRequestRef.current;
    setPreviewLoading(true);
    setPreviewError(false);
    fetch("/api/reading/niandu/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: NianduPreviewResult) => { if (previewRequestRef.current === requestId) setPreview(d); })
      .catch(() => { if (previewRequestRef.current === requestId) setPreviewError(true); })
      .finally(() => { if (previewRequestRef.current === requestId) setPreviewLoading(false); });
  };

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const full = useSSEStream("/api/reading/niandu", `${chartId}_full`, { validate: true });
  const fullStarted = useRef(false);
  useEffect(() => {
    if (!gated && !paywall.loading && !fullStarted.current) {
      fullStarted.current = true;
      if (full.status === "idle") full.start({ ziwei, name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, paywall.loading]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <EntryTracker date={date} hour={hour} gender={gender} name={name} method="niandu" dedupeKey="niandu_birth" />

      <button onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      <div className="paper-card rounded-2xl border border-border-warm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-vermillion rounded-full" />
          <h2 className="text-base font-bold text-ink tracking-wide">
            {label} · {preview ? `${preview.year}年` : "今年"}關鍵訊號
          </h2>
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
            <div className="flex flex-wrap gap-2">
              {preview.signals.map((s) => (
                <span key={`${s.star}${s.mutagen}`} className={`text-xs px-2.5 py-1 rounded-full ${TONE_STYLE[s.tone]}`}>
                  {s.domain} · {s.star}化{s.mutagen}
                </span>
              ))}
              {preview.signals.length === 0 && (
                <span className="text-xs text-ink-3">今年命盤整體平穩，無明顯四化牽動。</span>
              )}
            </div>

            {preview.teaser && (
              <div className="mt-4 pt-4 border-t border-border-warm">
                <p className="text-xs text-vermillion font-semibold mb-1.5">免費短評</p>
                <p className="text-sm text-ink-2 leading-relaxed">{preview.teaser}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase flex items-center gap-2 mb-2 px-1">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">年度解讀</span>
        </p>
        {gated ? (
          <PaywallLock chartId={chartId} sectionLabel="年度解讀" included={NIANDU_INCLUDED} proofStrip={NIANDU_PROOF_STRIP} />
        ) : (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {full.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{full.errorMsg}</p>
                <button onClick={() => { fullStarted.current = false; full.reset(); }} className="text-xs text-gold underline">重試</button>
              </div>
            )}
            {full.status === "streaming" && !full.text && <LoadingSkeleton />}
            {(full.status === "streaming" || full.status === "done") && full.text && (
              <div className="animate-fade-in space-y-1">
                <Md className={MD_PROSE}>{full.text}</Md>
                <RefList refs={full.refs} />
              </div>
            )}
            {full.status === "idle" && <LoadingSkeleton />}
          </div>
        )}
      </div>

      <div className="mb-6">
        <ToolCTA
          source="niandu"
          sub="看完年度關鍵提醒，也來看看你的完整命盤吧——三合、四化、飛星三派合參，AI 依據逾百部典籍，為你逐宮詳批命格、大限與流年。"
          label="生成我的個人命盤詳批"
        />
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

      <BugReportButton sessionId={chartId} page="niandu" />
    </div>
  );
}
