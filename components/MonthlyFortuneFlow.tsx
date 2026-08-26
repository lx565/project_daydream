"use client";

// Standalone single-person 逐月運勢 (monthly fortune) flow for the /yueyun SEO
// landing page. Self-contained: collects ONE birth, computes the chart
// CLIENT-side (calculateZiwei), then hands off to MonthlyResultView, which
// owns the free score grid, free AI teaser, and paywall-gated 12-month
// full reading. Mirrors components/HepanFlow.tsx's form half, minus the
// second person, the relationship-type selector, and bazi (this product is
// 紫微-only).
//
// Birth data is mirrored into the URL query string on submit (raw
// history.replaceState, not next/navigation, to avoid re-triggering this
// component's own effects). lib/checkout.ts builds the Stripe return URL from
// window.location.pathname+search, so this is what lets a return-from-Stripe
// reload land back on the same chart instead of a blank form — the exact gap
// solo's /result avoided by reading birth params server-side from the start.

import { useEffect, useState } from "react";
import { BirthdayWheel } from "./WheelPicker";
import type { ZiweiResult } from "@/lib/ziwei";
import MonthlyResultView from "./MonthlyResultView";

interface PersonFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

export interface MonthlyCharts {
  ziwei: ZiweiResult;
  name?: string;
  gender: "male" | "female";
  // Raw submitted date/hour (not derivable losslessly from ZiweiResult.birth,
  // which stores an iztro shichen index, not a clock hour) — carried through
  // so MonthlyResultView can log entries via the same schema ChartSaver uses.
  date: string;
  hour: number;
  sessionId: string;
}

function personKey(p: PersonFields) {
  return `${p.date.replace(/-/g, "")}${p.hour}${p.gender}`;
}

/** Writes the submitted birth fields into the URL so a reload (e.g. returning
 *  from Stripe checkout) can restore the same chart. Uses raw history.replaceState
 *  (not router.replace) so it never re-renders/re-triggers this component's effects. */
function syncUrl(p: PersonFields) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set("date", p.date);
  params.set("hour", p.hour);
  params.set("gender", p.gender);
  if (p.name) params.set("name", p.name);
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}

/** Reads birth fields back out of the URL, if present. Returns null if the
 *  required fields (date/hour/gender) are missing or malformed. */
function personFromUrl(): PersonFields | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const date = params.get("date") ?? "";
  const hour = params.get("hour") ?? "";
  const gender = params.get("gender");
  if (!date || hour === "" || (gender !== "male" && gender !== "female")) return null;
  return { name: params.get("name") ?? "", date, hour, gender };
}

async function computeCharts(p: PersonFields): Promise<MonthlyCharts> {
  const { calculateZiwei } = await import("@/lib/ziwei");
  const [y, m, d] = p.date.split("-").map(Number);
  const h = parseInt(p.hour, 10);
  const gender = p.gender as "male" | "female";
  const ziwei = await calculateZiwei(y, m, d, h, gender);
  return { ziwei, name: p.name || undefined, gender, date: p.date, hour: h, sessionId: personKey(p) };
}

export default function MonthlyFortuneFlow() {
  const [person, setPerson] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<MonthlyCharts | null>(null);
  // True only while checking the URL for restorable birth params on first mount —
  // keeps the form from flashing before a Stripe-return reload finishes restoring.
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const restored = personFromUrl();
    if (!restored) { setRestoring(false); return; }
    computeCharts(restored)
      .then((c) => { setPerson(restored); setCharts(c); })
      .catch(() => {}) // malformed/edge-case URL params — fall back to the blank form
      .finally(() => setRestoring(false));
  }, []);

  const ready = !!person.date && !!person.gender && person.hour !== "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!person.date) e.date = "請填寫出生日期";
    if (!person.gender) e.gender = "請選擇性別";
    if (!person.hour && person.hour !== "0") e.hour = "請選擇出生時辰";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || computing) return;
    setComputing(true);
    try {
      const c = await computeCharts(person);
      syncUrl(person);
      setCharts(c);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setComputing(false);
    }
  }

  if (restoring) return null;

  if (charts) {
    return (
      <MonthlyResultView
        charts={charts}
        onReset={() => {
          setCharts(null);
          if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        }}
      />
    );
  }

  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
        <div>
          <label className={labelClass}>稱呼（可選）</label>
          <input
            value={person.name}
            onChange={(e) => setPerson((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="如：小美"
            className="w-full bg-parchment border border-border-warm rounded-lg px-4 py-2.5 text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/50 focus:ring-1 focus:ring-vermillion/20 transition-all text-sm"
          />
        </div>

        <div>
          <label className={labelClass}>出生日期 · 時辰 <span className="text-vermillion">*</span></label>
          <BirthdayWheel
            date={person.date}
            hour={person.hour}
            onDateChange={(d) => setPerson((prev) => ({ ...prev, date: d }))}
            onHourChange={(h) => setPerson((prev) => ({ ...prev, hour: h }))}
          />
          {(errors.date || errors.hour) && (
            <p className="text-xs text-vermillion mt-1">{errors.date || errors.hour}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>性別 <span className="text-vermillion">*</span></label>
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => (
              <button key={g} type="button"
                onClick={() => setPerson((prev) => ({ ...prev, gender: g }))}
                style={person.gender === g ? { background: "#8B1A1A", color: "#FDFCF8", borderColor: "#8B1A1A" } : {}}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                  person.gender === g ? "shadow-md" : "bg-parchment border-border-warm text-ink-2 hover:border-vermillion/60"
                }`}>
                {person.gender === g ? "✓ " : ""}{g === "male" ? "男命" : "女命"}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-xs text-vermillion mt-1">{errors.gender}</p>}
        </div>
      </div>

      <button type="submit" disabled={computing} style={{ color: "#FDFCF8" }}
        className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm ${
          ready && !computing
            ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
            : "bg-vermillion/60 cursor-pointer opacity-80"
        }`}>
        {computing ? "正在排盤…" : ready ? "檢視逐月運勢 →" : "請填寫出生資訊"}
      </button>

      <p className="text-center text-[11px] text-ink-4">
        出生時間預設按北京時間（UTC+8）排盤 · 資訊僅用於本次推算與網站使用統計，不會用於其他用途
      </p>
    </form>
  );
}
