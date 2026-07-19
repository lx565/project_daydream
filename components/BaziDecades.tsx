"use client";

import React, { useEffect, useState } from "react";
import Md from "./Md";
import { useSSEStream } from "@/lib/useSSEStream";
import type { BaziResult, BaziDecade } from "@/lib/bazi";

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-amber-700 [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-4 [&_h2]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-2.5 [&_p]:text-[13px] [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:space-y-1 [&_li]:text-[13px] [&_li]:text-ink-2";

const EL_CHAR: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const EL_COLOR: Record<string, string> = { 木: "text-jade", 火: "text-vermillion", 土: "text-gold", 金: "text-ink-3", 水: "text-blue-700" };

function stemColor(gz: string): string {
  const el = EL_CHAR[gz?.[0] ?? ""] ?? "";
  return EL_COLOR[el] ?? "text-ink";
}

interface Props {
  bazi: BaziResult;
  name?: string;
  gender: "male" | "female";
  sessionId?: string;
  preload?: boolean;
  onReady?: (text: string) => void;
}

export default function BaziDecades({ bazi, name, gender, sessionId, preload, onReady }: Props) {
  const { decades, luckStartAge } = bazi;
  const currentYear = new Date().getFullYear();
  const currentDecadeIdx = decades.findIndex(d => currentYear >= d.startYear && currentYear <= d.endYear);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const readyFired = React.useRef(false);

  const ck = (idx: number) => sessionId ? `${sessionId}_bd_${idx}` : undefined;

  const s0 = useSSEStream("/api/reading/bazi-decade", ck(0));
  const s1 = useSSEStream("/api/reading/bazi-decade", ck(1));
  const s2 = useSSEStream("/api/reading/bazi-decade", ck(2));
  const s3 = useSSEStream("/api/reading/bazi-decade", ck(3));
  const s4 = useSSEStream("/api/reading/bazi-decade", ck(4));
  const s5 = useSSEStream("/api/reading/bazi-decade", ck(5));
  const s6 = useSSEStream("/api/reading/bazi-decade", ck(6));
  const s7 = useSSEStream("/api/reading/bazi-decade", ck(7));
  const streams = [s0, s1, s2, s3, s4, s5, s6, s7];

  // Preload all decades whenever `preload` is true; idle guard prevents re-starting already-loaded streams
  useEffect(() => {
    if (!preload) return;
    decades.forEach((decade, i) => {
      if (streams[i] && streams[i].status === "idle") {
        streams[i].start({ bazi, decade, name, gender });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preload]);

  // When preloading, fire onReady once all active decade streams have completed
  useEffect(() => {
    if (!preload || !onReady || readyFired.current) return;
    const activeStreams = streams.slice(0, decades.length);
    const allDone = activeStreams.every(s => s.status === "done" || s.status === "error");
    if (!allDone) return;
    readyFired.current = true;
    const combined = decades.map((d, i) => {
      const text = streams[i]?.text?.trim();
      if (!text) return "";
      return `### ${d.ganZhi}大運（${d.startAge}–${d.endAge}歲 · ${d.startYear}–${d.endYear}年）\n${text}`;
    }).filter(Boolean).join("\n\n");
    if (combined) onReady(combined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams.map(s => s.status).join(",")]);

  const autoLoadIdx = currentDecadeIdx >= 0 ? currentDecadeIdx : 0;

  // Auto-load the current decade on mount
  useEffect(() => {
    const decade = decades[autoLoadIdx];
    if (!decade) return;
    setSelectedIdx(autoLoadIdx);
    if (streams[autoLoadIdx] && streams[autoLoadIdx].status === "idle") {
      streams[autoLoadIdx].start({ bazi, decade, name, gender });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(idx: number) {
    const decade = decades[idx];
    if (!decade) return;
    if (selectedIdx === idx) { setSelectedIdx(null); return; }
    setSelectedIdx(idx);
    if (streams[idx] && streams[idx].status === "idle") {
      streams[idx].start({ bazi, decade, name, gender });
    }
  }

  if (!decades.length) return null;

  return (
    <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-amber-100">
        <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />
        <span className="text-xs font-semibold text-amber-800">八字大運走勢</span>
        {luckStartAge > 0 && (
          <span className="text-[10px] text-ink-4 ml-1">{luckStartAge}歲起運</span>
        )}
      </div>

      {/* Decade timeline grid */}
      <div className="px-3 py-3 border-b border-amber-100/60">
        <div className="flex gap-1.5 flex-wrap">
          {decades.map((d, i) => {
            const isCurrent = i === currentDecadeIdx;
            const isSelected = i === selectedIdx;
            const color = stemColor(d.ganZhi);
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`flex flex-col items-center px-2 py-1.5 rounded-lg border transition-all text-left
                  ${isCurrent
                    ? "border-amber-400 bg-amber-100/80 shadow-sm"
                    : isSelected
                    ? "border-amber-300 bg-amber-50/80"
                    : "border-border-warm bg-paper hover:border-amber-200 hover:bg-amber-50/40"
                  }`}
              >
                <span className={`text-sm font-bold leading-tight ${color}`}>
                  {d.ganZhi}
                </span>
                <span className="text-[9px] text-ink-4 mt-0.5 whitespace-nowrap">
                  {d.startAge}–{d.endAge}歲
                </span>
                <span className="text-[9px] text-ink-4 whitespace-nowrap">
                  {d.startYear}
                </span>
                {isCurrent && (
                  <span className="mt-1 text-[7px] px-1 py-px bg-amber-500 text-white font-bold rounded-sm leading-none">
                    當前
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected decade reading */}
      {selectedIdx !== null && (() => {
        const active = streams[selectedIdx];
        const d = decades[selectedIdx];
        const isCurrent = selectedIdx === currentDecadeIdx;
        return (
          <div className="px-3 sm:px-4 py-3 bg-paper/60">
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`text-sm font-bold ${stemColor(d.ganZhi)}`}>
                {d.ganZhi}大運
              </span>
              <span className="text-[11px] text-ink-4">
                {d.startAge}–{d.endAge}歲
                · {d.startYear}–{d.endYear}年
              </span>
              {isCurrent && (
                <span className="text-[8px] px-1.5 py-px bg-amber-500 text-white font-bold rounded-sm leading-none">
                  當前大運
                </span>
              )}
            </div>

            {active?.status === "streaming" && !active.text && (
              <p className="text-[11px] text-ink-4 animate-pulse">大運推演中…</p>
            )}
            {active?.status === "error" && (
              <p className="text-[11px] text-vermillion">推演失敗，請重試。</p>
            )}
            {(active?.text || active?.status === "done") && (
              <Md className={MD_PROSE}>{active?.text ?? ""}</Md>
            )}
          </div>
        );
      })()}
    </div>
  );
}
