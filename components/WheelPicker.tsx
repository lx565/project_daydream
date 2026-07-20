"use client";

import { useEffect, useRef } from "react";

const ROW_H = 46;        // px per row
const VISIBLE = 5;       // visible rows (odd → center is the selection)
const PAD = ((VISIBLE - 1) / 2) * ROW_H;

export interface WheelOption {
  label: string;
  value: number;
}

interface WheelProps {
  options: WheelOption[];
  value: number;
  onChange: (v: number) => void;
  /** small caption under the column, e.g. 年 / 月 / 日 */
  unit?: string;
  className?: string;
}

/** Single scroll-snap wheel column (Apple-alarm style). */
export function Wheel({ options, value, onChange, unit, className = "" }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  // Keep the wheel scrolled to the active value (e.g. when day count changes)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = idx * ROW_H;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target });
  }, [idx]);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    if (settleRef.current) clearTimeout(settleRef.current);
    // Let CSS scroll-snap do the centering; just sync the selected value once the
    // scroll settles. (Forcing scrollTo here fought the user's momentum scroll.)
    settleRef.current = setTimeout(() => {
      const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW_H)));
      const opt = options[i];
      if (opt && opt.value !== value) onChange(opt.value);
    }, 130);
  }

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <div className="relative w-full" style={{ height: VISIBLE * ROW_H }}>
        {/* center selection band */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-md border-y border-vermillion/40 bg-vermillion/5"
          style={{ height: ROW_H }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-y-contain touch-pan-y"
        >
          <div style={{ height: PAD }} />
          {options.map((o, i) => (
            <div
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`flex snap-center items-center justify-center tabular-nums transition-all duration-150 ${
                i === idx ? "text-ink font-bold text-base" : "text-ink-4 text-sm"
              }`}
              style={{ height: ROW_H, scrollSnapAlign: "center" }}
            >
              {o.label}
            </div>
          ))}
          <div style={{ height: PAD }} />
        </div>
        {/* top / bottom fades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-paper to-transparent" style={{ height: PAD }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-paper to-transparent" style={{ height: PAD }} />
      </div>
      {unit && <span className="mt-1 text-[10px] tracking-widest text-ink-4">{unit}</span>}
    </div>
  );
}

// ── Birthday + 時辰 composite ────────────────────────────────────────────────

const SHICHEN_SHORT: WheelOption[] = [
  { label: "子 23–1", value: 0 },
  { label: "丑 1–3", value: 1 },
  { label: "寅 3–5", value: 3 },
  { label: "卯 5–7", value: 5 },
  { label: "辰 7–9", value: 7 },
  { label: "巳 9–11", value: 9 },
  { label: "午 11–13", value: 11 },
  { label: "未 13–15", value: 13 },
  { label: "申 15–17", value: 15 },
  { label: "酉 17–19", value: 17 },
  { label: "戌 19–21", value: 19 },
  { label: "亥 21–23", value: 21 },
];

const pad2 = (n: number) => String(n).padStart(2, "0");
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTS: WheelOption[] = range(1930, THIS_YEAR).reverse().map((y) => ({ label: String(y), value: y }));
const MONTH_OPTS: WheelOption[] = range(1, 12).map((m) => ({ label: pad2(m), value: m }));

interface BirthdayWheelProps {
  /** YYYY-MM-DD, or "" when unset */
  date: string;
  hour: string;            // "" or shichen value as string
  onDateChange: (date: string) => void;
  onHourChange: (hour: string) => void;
}

/** Year · Month · Day · 時辰 wheels, packed for mobile. */
export function BirthdayWheel({ date, hour, onDateChange, onHourChange }: BirthdayWheelProps) {
  const [yy, mm, dd] = date
    ? date.split("-").map(Number)
    : [1990, 1, 1];

  const dayOpts: WheelOption[] = range(1, daysInMonth(yy, mm)).map((d) => ({ label: pad2(d), value: d }));

  function emit(y: number, m: number, d: number) {
    const clampedDay = Math.min(d, daysInMonth(y, m));
    onDateChange(`${y}-${pad2(m)}-${pad2(clampedDay)}`);
  }

  // Commit the displayed defaults so "what you see is selected" (Apple-wheel behavior)
  useEffect(() => {
    if (!date) emit(yy, mm, dd);
    if (hour === "") onHourChange("11");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hourVal = hour === "" ? 11 : Number(hour);

  return (
    <div className="rounded-xl border border-border-warm bg-paper px-1.5 py-3">
      <div className="grid grid-cols-[1.1fr_1fr_1fr_1.6fr] gap-1.5">
        <Wheel options={YEAR_OPTS}  value={yy} unit="年"  onChange={(v) => emit(v, mm, dd)} />
        <Wheel options={MONTH_OPTS} value={mm} unit="月"  onChange={(v) => emit(yy, v, dd)} />
        <Wheel options={dayOpts}    value={dd} unit="日"  onChange={(v) => emit(yy, mm, v)} />
        <Wheel
          options={SHICHEN_SHORT}
          value={hourVal}
          unit="時辰"
          onChange={(v) => onHourChange(String(v))}
        />
      </div>
      {(!date || hour === "") && (
        <p className="mt-2 text-center text-[11px] text-ink-4">滑動選擇 · 出生日期與時辰</p>
      )}
    </div>
  );
}
