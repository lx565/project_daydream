"use client";

import { useEffect, useState } from "react";
import type { ZiweiResult } from "@/lib/ziwei";

interface YearScore {
  year: number;
  age: number;
  ganzhi: string;
  overall: number;
  career: number;
  romance: number;
  theme: string;
}

interface ScoresData {
  scores: YearScore[];
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

// Year with highest career / romance / overall scores gets a highlight badge
function computeHighlights(scores: YearScore[]): Record<number, ("事" | "情" | "旺")[]> {
  if (!scores.length) return {};
  const maxCareer  = Math.max(...scores.map(s => s.career));
  const maxRomance = Math.max(...scores.map(s => s.romance));
  const maxOverall = Math.max(...scores.map(s => s.overall));
  const badges: Record<number, ("事" | "情" | "旺")[]> = {};
  for (const s of scores) {
    const b: ("事" | "情" | "旺")[] = [];
    if (s.career  === maxCareer  && maxCareer  >= 4) b.push("事");
    if (s.romance === maxRomance && maxRomance >= 4) b.push("情");
    if (s.overall === maxOverall && maxOverall >= 4 && !b.length) b.push("旺");
    badges[s.year] = b;
  }
  return badges;
}

interface Props {
  ziwei: ZiweiResult;
  birthYear?: number;
  name?: string;
  onReady?: (text: string) => void;
}

function dots(n: number): string { return "●".repeat(n) + "○".repeat(5 - n); }

export default function FlowYearDetail({ ziwei, name, onReady }: Props) {
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<ScoresData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const canDrill = !!ziwei?.birth?.solarDate;
  const birthKey = ziwei?.birth?.solarDate ?? "";

  useEffect(() => {
    if (!birthKey) return;
    setLoading(true);
    setData(null);
    setFetchError(false);
    fetch("/api/reading/flowyears-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, currentYear, name }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: ScoresData) => {
        setData(d);
        if (onReady && d.scores?.length) {
          const header = "| 年份 | 干支 | 歲 | 綜合 | 事業 | 感情 | 主題 |\n|------|------|---|------|------|------|------|";
          const rows = d.scores.map(s =>
            `| ${s.year}${s.year === currentYear ? "（今年）" : ""} | ${s.ganzhi} | ${s.age} | ${dots(s.overall)} | ${dots(s.career)} | ${dots(s.romance)} | ${s.theme} |`
          ).join("\n");
          onReady(`${header}\n${rows}`);
        }
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthKey]);

  if (!canDrill) return null;

  const highlights = data ? computeHighlights(data.scores) : {};

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-purple-100">
        <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />
        <span className="text-xs font-semibold text-purple-700">流年運勢總覽</span>
        {data && (
          <span className="text-[10px] text-ink-4 ml-1">
            {data.scores[0]?.year}–{data.scores[data.scores.length - 1]?.year}年
          </span>
        )}
      </div>

      {loading && (
        <div className="px-4 py-5 text-center text-[11px] text-ink-4 animate-pulse">
          正在推算未來十年流年運勢…
        </div>
      )}

      {fetchError && !loading && (
        <p className="px-3 py-3 text-[11px] text-vermillion">流年推算失敗，請重新整理重試。</p>
      )}

      {data && !loading && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-3 py-1.5 bg-purple-50/70 border-b border-purple-100 text-[9px] text-ink-4 font-medium uppercase tracking-wider">
            <span>年份 · 主題</span>
            <span className="text-center">綜合</span>
            <span className="text-center">事業</span>
            <span className="text-center">感情</span>
          </div>

          {/* Year rows */}
          <div className="divide-y divide-purple-100/60 bg-paper">
            {data.scores.map(s => {
              const isCurrentYear = s.year === currentYear;
              const rowBadges = highlights[s.year] ?? [];

              return (
                <div
                  key={s.year}
                  className={`grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-3 py-2 ${
                    isCurrentYear ? "bg-rose-50/60" : ""
                  }`}
                >
                  {/* Year + ganzhi + badges */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-xs tabular-nums ${isCurrentYear ? "font-bold text-vermillion" : "font-medium text-ink-2"}`}>
                        {s.year} {s.ganzhi}
                      </span>
                      {isCurrentYear && (
                        <span className="text-[8px] px-1 py-px bg-vermillion text-white font-bold rounded-sm leading-none whitespace-nowrap">今年</span>
                      )}
                      {!isCurrentYear && (
                        <span className="text-[9px] text-ink-4">{s.age}歲</span>
                      )}
                      {rowBadges.map(b => (
                        <span key={b} className="text-[8px] px-1 py-px bg-purple-100 text-purple-700 font-bold rounded-sm leading-none">{b}</span>
                      ))}
                    </div>
                    <p className={`text-[11px] mt-0.5 truncate ${isCurrentYear ? "text-ink font-medium" : "text-ink-3"}`}>
                      {s.theme}
                    </p>
                  </div>

                  <Dots n={s.overall} type="overall" />
                  <Dots n={s.career}  type="career"  />
                  <Dots n={s.romance} type="romance" />
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-purple-50/60 border-t border-purple-100 text-[9px] text-ink-4 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-vermillion inline-block" />綜合</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />事業</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />感情</span>
          </div>
        </>
      )}
    </div>
  );
}
