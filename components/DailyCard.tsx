"use client";

import { useEffect, useRef } from "react";
import { useSSEStream } from "@/lib/useSSEStream";
import type { SavedChart } from "./ChartSaver";
import Md from "./Md";

const WEEKDAYS = ["日","一","二","三","四","五","六"];

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth()+1}月${d.getDate()}日 · 周${WEEKDAYS[d.getDay()]}`;
}

export default function DailyCard({ chart }: { chart: SavedChart }) {
  const stream = useSSEStream("/api/reading/daily");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    stream.start({
      summary: chart.summary,
      soulPalace: chart.soulPalace,
      mainStar: chart.mainStar,
      fiveElementsClass: chart.fiveElementsClass,
      gender: chart.gender,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-vermillion rounded-full" />
          <span className="text-sm font-bold text-ink tracking-wide">今日運勢</span>
        </div>
        <span className="text-xs text-ink-4">{todayLabel()}</span>
      </div>

      {/* Content */}
      {stream.status === "idle" || stream.status === "streaming" ? (
        <div className="space-y-2 py-1">
          <div className="flex gap-1 mb-2">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-vermillion/40 animate-bounce"
                style={{ animationDelay: `${i*150}ms` }} />
            ))}
          </div>
          {[75,60,50].map((w,i) => (
            <div key={i} className="h-2.5 rounded bg-border-light animate-pulse"
              style={{ width: `${w}%`, animationDelay: `${i*60}ms` }} />
          ))}
        </div>
      ) : stream.status === "error" ? (
        <p className="text-xs text-ink-4">今日運勢暫時無法獲取</p>
      ) : (
        <div className="text-sm leading-relaxed
          [&_p]:text-ink-2 [&_p]:mb-1.5
          [&_strong]:text-vermillion [&_strong]:font-semibold">
          <Md>{stream.text}</Md>
        </div>
      )}

      {/* Footer link */}
      <div className="pt-1 border-t border-border-light flex items-center justify-between">
        <span className="text-xs text-ink-4">
          {chart.name ? `${chart.name} · ` : ""}{chart.fiveElementsClass}
        </span>
        <a
          href={`/result?date=${chart.date}&hour=${chart.hour}&gender=${chart.gender}${chart.name ? `&name=${encodeURIComponent(chart.name)}` : ""}`}
          className="text-xs text-vermillion hover:underline"
        >
          檢視完整命盤 →
        </a>
      </div>
    </div>
  );
}
