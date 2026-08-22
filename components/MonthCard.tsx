"use client";

import { useRef, useState } from "react";
import Dots from "./Dots";
import { monthlyLuck } from "@/lib/monthlyLuck";
import type { MonthScore } from "@/app/api/reading/monthly/preview/route";
import type { MonthlyDetail } from "@/app/api/reading/monthly/route";

interface MonthCardProps {
  score: MonthScore;
  detail: MonthlyDetail;
  isCurrentMonth: boolean;
}

export default function MonthCard({ score, detail, isCurrentMonth }: MonthCardProps) {
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const luck = monthlyLuck(score.ganzhi);
  const headline = detail.headline || score.theme;

  async function handleDownload() {
    if (!captureRef.current || capturing) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = captureRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#faf7f2",
        logging: false,
        width: el.offsetWidth,
        height: el.scrollHeight,
        windowHeight: el.scrollHeight,
        scrollY: 0,
        scrollX: 0,
      });
      const link = document.createElement("a");
      link.download = `命裡-逐月-${score.year}${score.month}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setCapturing(false);
    }
  }

  const CardBody = ({ forCapture = false }: { forCapture?: boolean }) => (
    <div
      ref={forCapture ? captureRef : undefined}
      className={`rounded-xl border p-4 bg-paper ${isCurrentMonth ? "border-vermillion/50 ring-1 ring-vermillion/20" : "border-border-warm"}`}
      style={forCapture ? { width: 360 } : undefined}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-sm font-bold tabular-nums ${isCurrentMonth ? "text-vermillion" : "text-ink"}`}>
          {score.year}年{score.month}月 {score.ganzhi}
        </span>
        {isCurrentMonth && (
          <span className="text-[9px] px-1.5 py-px bg-vermillion text-white font-bold rounded-sm leading-none">本月</span>
        )}
      </div>
      <p className="text-sm text-ink-2 font-medium mb-3">{headline}</p>

      <div className="flex items-center gap-4 mb-3 text-[11px] text-ink-4">
        <span className="flex items-center gap-1">綜合<Dots n={score.overall} type="overall" /></span>
        <span className="flex items-center gap-1">事業<Dots n={score.career} type="career" /></span>
        <span className="flex items-center gap-1">感情<Dots n={score.romance} type="romance" /></span>
      </div>

      <div className="space-y-1 mb-3 text-xs">
        <p className="text-emerald-700"><span className="font-semibold">✓ 宜：</span>{detail.good}</p>
        <p className="text-amber-700"><span className="font-semibold">⚠ 忌：</span>{detail.caution}</p>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-ink-3">
        <span>幸運色：{luck.color}</span>
        <span>方位：{luck.direction}</span>
      </div>

      <p className="text-xs text-ink-2 leading-relaxed border-t border-border-light pt-2.5">
        <span className="font-semibold text-ink">建議：</span>{detail.advice}
      </p>
    </div>
  );

  return (
    <div className="relative">
      <CardBody />
      <button
        onClick={handleDownload}
        disabled={capturing}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border-warm bg-paper-2 hover:bg-paper text-[11px] text-ink-3 hover:text-ink transition-all disabled:opacity-60"
      >
        {capturing ? (
          <>
            <div className="w-3 h-3 border-2 border-ink-3/30 border-t-ink-3 rounded-full animate-spin" />
            正在生成圖片…
          </>
        ) : (
          <>↓ 下載本月圖卡</>
        )}
      </button>
      {/* Hidden capture target — fixed off-screen, matches ExportReport.tsx's
          established pattern for html2canvas exports in this codebase. */}
      <div style={{ position: "fixed", top: 0, left: "-9999px", zIndex: -1, pointerEvents: "none" }}>
        <CardBody forCapture />
      </div>
    </div>
  );
}
