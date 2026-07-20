"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STEMS    = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// Only branches whose parity matches the stem (valid ganzhi pairs)
function validBranchesFor(stem: string) {
  const si = STEMS.indexOf(stem);
  return BRANCHES.filter((_, bi) => bi % 2 === si % 2);
}

const ITEM_H  = 40;
const PADDING = 2; // items visible above/below center

function DrumScroller({
  items, value, onChange,
}: {
  items: string[]; value: string; onChange: (v: string) => void;
}) {
  const ref   = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_H;
    }
  }, [value, items]);

  const onScroll = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
      if (items[idx] !== value) onChange(items[idx]);
    }, 80);
  }, [items, value, onChange]);

  return (
    <div className="relative overflow-hidden" style={{ width: 36, height: ITEM_H * (PADDING * 2 + 1) }}>
      {/* Fade overlay */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        background: "linear-gradient(to bottom,#FEFDF8 0%,transparent 32%,transparent 68%,#FEFDF8 100%)",
      }} />
      {/* Selection highlight */}
      <div className="absolute left-0 right-0 pointer-events-none z-10 border-y border-vermillion/30 bg-vermillion/6 rounded-sm"
        style={{ top: PADDING * ITEM_H, height: ITEM_H }} />
      {/* Scrollable drum */}
      <div ref={ref} onScroll={onScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}>
        <div style={{ height: PADDING * ITEM_H }} />
        {items.map(item => (
          <div key={item}
            className="flex items-center justify-center snap-center text-base font-medium text-ink select-none"
            style={{ height: ITEM_H }}>
            {item}
          </div>
        ))}
        <div style={{ height: PADDING * ITEM_H }} />
      </div>
    </div>
  );
}

function GanzhiPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const stem   = STEMS.includes(value[0]) ? value[0] : STEMS[0];
  const vb     = validBranchesFor(stem);
  const branch = vb.includes(value[1]) ? value[1] : vb[0];

  const onStemChange = useCallback((s: string) => {
    const branches = validBranchesFor(s);
    onChange(s + (branches.includes(branch) ? branch : branches[0]));
  }, [branch, onChange]);

  const onBranchChange = useCallback((b: string) => {
    onChange(stem + b);
  }, [stem, onChange]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[10px] text-ink-4 tracking-wide">{label}</p>
      <div className="flex items-center gap-0.5 rounded-xl border border-border-warm bg-parchment overflow-hidden px-1.5">
        <DrumScroller items={STEMS} value={stem}   onChange={onStemChange}   />
        <div className="w-px bg-border-warm/60 self-stretch my-2" />
        <DrumScroller items={vb}    value={branch} onChange={onBranchChange} />
      </div>
    </div>
  );
}

interface Candidate {
  year: number; month: number; day: number; hour: number;
  dateLabel: string; shichenLabel: string; approxAge: number;
  date: string; hourStr: string;
  fiveElementsClass?: string; mainStar?: string; bodyStar?: string;
  soulPalace?: string; bodyPalace?: string; summary?: string;
}

const PILLAR_LABELS = ["年柱", "月柱", "日柱", "時柱"];
const DEFAULTS      = ["甲子", "甲子", "甲子", "甲子"];

export default function BaziInputFlow({
  gender, name, tz,
}: {
  gender: "male" | "female" | ""; name: string; tz: number;
}) {
  const router = useRouter();
  const [pillars, setPillars] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);

  function updatePillar(idx: number, val: string) {
    const next = pillars.slice();
    next[idx] = val;
    setPillars(next);
    setError("");
    setCandidates(null);
  }

  const combined = pillars.join("");

  async function lookup() {
    if (!gender) { setError("請先選擇性別"); return; }
    setLoading(true);
    setError("");
    setCandidates(null);
    try {
      const res  = await fetch("/api/bazi-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: combined, gender }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "invalid_bazi") setError("八字組合無效，請重新選擇");
        else if (data.error === "no_match") setError("未找到匹配的公曆日期，請核對八字");
        else setError("查詢失敗，請重試");
        return;
      }
      setCandidates(data.candidates);
    } catch {
      setError("網路錯誤，請重試");
    } finally {
      setLoading(false);
    }
  }

  function selectCandidate(c: Candidate) {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    params.set("date", c.date);
    params.set("hour", c.hourStr);
    params.set("gender", gender);
    params.set("tz", String(tz));
    params.set("method", "ziwei");
    router.push(`/result?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* 4 pillar drum scrollers */}
      <div>
        <p className="block text-xs text-ink-3 tracking-widest uppercase mb-3">
          四柱八字 <span className="text-vermillion">*</span>
        </p>
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          {PILLAR_LABELS.map((label, i) => (
            <GanzhiPicker
              key={label}
              label={label}
              value={pillars[i]}
              onChange={(v) => updatePillar(i, v)}
            />
          ))}
        </div>
        <p className="text-[10px] text-ink-4 mt-2 text-center">
          上下滑動選擇天干地支
        </p>
      </div>

      {/* Lookup button */}
      <button
        type="button"
        onClick={lookup}
        disabled={loading || !gender}
        style={gender ? { color: "#FDFCF8" } : {}}
        className={`w-full font-bold py-3 rounded-xl transition-all tracking-widest text-sm ${
          gender
            ? "bg-vermillion hover:bg-vermillion-h shadow-sm"
            : "bg-vermillion/40 cursor-not-allowed text-paper/60"
        }`}
      >
        {loading ? "查詢中…" : "查詢公曆對應日期 →"}
      </button>

      {error && (
        <p className="text-xs text-vermillion text-center">{error}</p>
      )}

      {/* Candidate results — cross-check selection */}
      {candidates && candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-px h-3 bg-gold" />
            <p className="text-xs text-gold font-medium tracking-wide">
              找到 {candidates.length} 個匹配命盤 · 請確認你的出生年份
            </p>
          </div>
          <p className="text-[11px] text-ink-4 leading-relaxed pl-3">
            同一八字每60年重複一次。以下為符合條件的所有結果，對照你的大致年齡或五行局，選擇正確的那一個。
          </p>

          {candidates.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectCandidate(c)}
              className="w-full text-left rounded-xl border border-border-warm bg-paper hover:border-vermillion/40 hover:bg-vermillion/3 transition-all p-4 space-y-2 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">
                    {c.dateLabel}
                    <span className="text-ink-3 font-normal ml-1.5">{c.shichenLabel}</span>
                  </p>
                  <p className="text-[11px] text-ink-4 mt-0.5">今年約 {c.approxAge} 歲</p>
                </div>
                <span className="shrink-0 text-xs text-vermillion/70 group-hover:text-vermillion transition-colors mt-0.5">
                  選擇 →
                </span>
              </div>

              {(c.fiveElementsClass || c.mainStar) && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border-light">
                  {c.fiveElementsClass && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-gold/10 border border-gold/20 text-gold font-medium">
                      {c.fiveElementsClass}
                    </span>
                  )}
                  {c.mainStar && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-paper-2 border border-border-light text-ink-3">
                      命主：{c.mainStar}
                    </span>
                  )}
                  {c.bodyStar && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-paper-2 border border-border-light text-ink-3">
                      身主：{c.bodyStar}
                    </span>
                  )}
                  {c.soulPalace && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-paper-2 border border-border-light text-ink-3">
                      命宮：{c.soulPalace}宮
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}

          <p className="text-[10px] text-ink-4 text-center pt-1">
            選擇後將進入完整命盤解讀
          </p>
        </div>
      )}
    </div>
  );
}
