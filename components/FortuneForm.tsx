"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BirthdayWheel } from "./WheelPicker";
import BaziInputFlow from "./BaziInputFlow";
import { gtagEvent } from "@/lib/gtag";

interface PersonFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

const TZ_OPTIONS = [
  { label: "UTC+8 · 北京 / 上海 / 台北 / 香港 / 新加坡", value: 8 },
  { label: "UTC+9 · 東京 / 首爾", value: 9 },
  { label: "UTC+10 · 悉尼（冬）", value: 10 },
  { label: "UTC+11 · 悉尼（夏）", value: 11 },
  { label: "UTC+5:45 · 加德滿都（尼泊爾）", value: 5.75 },
  { label: "UTC+5:30 · 新德里 / 孟買（印度）", value: 5.5 },
  { label: "UTC+3:30 · 德黑蘭（伊朗）", value: 3.5 },
  { label: "UTC+1 · 歐洲中部（冬）/ 倫敦（夏）", value: 1 },
  { label: "UTC+0 · 倫敦（冬）", value: 0 },
  { label: "UTC-4 · 紐約 / 多倫多（夏）", value: -4 },
  { label: "UTC-5 · 紐約 / 多倫多（冬）", value: -5 },
  { label: "UTC-6 · 芝加哥 / 達拉斯（冬）", value: -6 },
  { label: "UTC-7 · 丹佛（冬）/ 洛杉磯（夏）", value: -7 },
  { label: "UTC-8 · 洛杉磯 / 溫哥華（冬）", value: -8 },
];

const SAVED_KEY = "ziwei_saved_inputs";

function loadSaved() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null"); } catch { return null; }
}

export default function FortuneForm() {
  const router = useRouter();
  const saved = loadSaved();
  const formRef = useRef<HTMLFormElement>(null);

  // SEO article CTAs link to /?from=seo#form. Next.js App Router doesn't
  // reliably auto-scroll to an in-page hash on cross-route navigation, so
  // scroll + focus the form on mount as a safety net (in-page anchor clicks
  // via <a href="#form"> still work natively without this).
  useEffect(() => {
    if (window.location.hash !== "#form") return;
    const target = document.getElementById("form") ?? formRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = setTimeout(() => formRef.current?.focus({ preventScroll: true }), 400);
    return () => clearTimeout(t);
  }, []);

  const [inputMethod, setInputMethod] = useState<"solar" | "bazi">("solar");
  const [showTz, setShowTz] = useState<boolean>((saved?.tz ?? 8) !== 8);

  // Personal
  const [person, setPerson] = useState<PersonFields>({
    name: saved?.name ?? "",
    date: saved?.date ?? "",
    hour: saved?.hour ?? "",
    gender: saved?.gender ?? "",
  });
  const [tz, setTz] = useState<number>(saved?.tz ?? 8);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const personalReady = !!person.date && !!person.gender && person.hour !== "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!person.date) e.date = "請填寫出生日期";
    if (!person.gender) e.gender = "請選擇性別";
    if (!person.hour && person.hour !== "0") e.hour = "請選擇出生時辰";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // form_validation_failed is the friction signal: the gap between a landing
    // page visit and reading_started was previously invisible, so someone
    // bouncing off the form (e.g. stuck on the 時辰 picker) left no trace.
    if (!validate()) {
      gtagEvent("form_validation_failed");
      return;
    }
    gtagEvent("form_submit");
    const params = new URLSearchParams();
    if (person.name) params.set("name", person.name);
    params.set("date", person.date);
    params.set("hour", person.hour);
    params.set("gender", person.gender);
    params.set("tz", String(tz));
    params.set("method", "ziwei");
    try { localStorage.setItem(SAVED_KEY, JSON.stringify({ name: person.name, date: person.date, hour: person.hour, gender: person.gender, tz })); } catch {}
    router.push(`/result?${params.toString()}`);
  }

  const inputClass = "w-full bg-parchment border border-border-warm rounded-lg px-4 py-2.5 text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/50 focus:ring-1 focus:ring-vermillion/20 transition-all text-sm";
  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";

  return (
    <form onSubmit={handleSubmit} ref={formRef} tabIndex={-1} className="space-y-5 outline-none">
      {/* Mode tabs — 個人命盤 stays on this page; 合盤 · 緣分 goes straight to /hepan
          (no intermediate link-through card — direct navigation on click). */}
      <div className="flex rounded-xl overflow-hidden border border-border-warm">
        <button type="button"
          className="flex-1 py-2 text-xs font-semibold tracking-wide transition-all bg-vermillion text-white">
          個人命盤
        </button>
        <Link href="/hepan"
          className="flex-1 py-2 text-xs font-semibold tracking-wide transition-all bg-paper text-ink-3 hover:text-vermillion text-center">
          合盤 · 緣分
        </Link>
      </div>

      {/* Dev shortcut */}
      <div className="flex justify-end">
        <a href="/result?date=1990-03-21&hour=11&gender=male&tz=8&name=示例"
          className="text-[11px] text-ink-4 hover:text-vermillion underline underline-offset-2 transition-colors">
          查看示例命盤 →
        </a>
      </div>

      {/* Input method toggle */}
      <div>
        <label className={labelClass}>出生信息 <span className="text-vermillion">*</span></label>
        <div className="flex rounded-lg overflow-hidden border border-border-warm mb-3">
          {(["solar", "bazi"] as const).map((m) => (
            <button key={m} type="button"
              onClick={() => { setInputMethod(m); setErrors({}); }}
              className={`flex-1 py-2 text-xs font-semibold tracking-wide transition-all ${
                inputMethod === m
                  ? "bg-vermillion text-white"
                  : "bg-paper text-ink-3 hover:text-vermillion"
              }`}>
              {m === "solar" ? "公历出生日期" : "八字四柱"}
            </button>
          ))}
        </div>

        {inputMethod === "solar" ? (
          <>
            <BirthdayWheel
              date={person.date}
              hour={person.hour}
              onDateChange={(d) => { setPerson(p => ({ ...p, date: d })); setErrors(e => ({ ...e, date: "" })); }}
              onHourChange={(h) => { setPerson(p => ({ ...p, hour: h })); setErrors(e => ({ ...e, hour: "" })); }}
            />
            {(errors.date || errors.hour) && (
              <p className="text-xs text-vermillion mt-1">{errors.date || errors.hour}</p>
            )}
          </>
        ) : (
          <BaziInputFlow
            gender={person.gender}
            name={person.name}
            tz={tz}
          />
        )}
      </div>

      <div>
        <label className={labelClass}>性別 <span className="text-vermillion">*</span></label>
        <div className="flex gap-3">
          {(["male", "female"] as const).map((g) => (
            <button key={g} type="button"
              onClick={() => { setPerson(p => ({ ...p, gender: g })); setErrors(e => ({ ...e, gender: "" })); }}
              style={person.gender === g ? { background: "#8B1A1A", color: "#FDFCF8", borderColor: "#8B1A1A" } : {}}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all duration-200 ${
                person.gender === g ? "shadow-md" : "bg-parchment border-border-warm text-ink-2 hover:border-vermillion/60"
              }`}>
              {person.gender === g ? "✓ " : ""}{g === "male" ? "男命" : "女命"}
            </button>
          ))}
        </div>
        {errors.gender && <p className="text-xs text-vermillion mt-1">{errors.gender}</p>}
      </div>

      {inputMethod === "solar" && (
        showTz ? (
          <div>
            <label className={labelClass}>
              出生時區
              {tz !== 8 && <span className="ml-2 text-vermillion normal-case tracking-normal">將換算為北京時間推盤</span>}
            </label>
            <select value={tz} onChange={(e) => setTz(Number(e.target.value))}
              className={`${inputClass} appearance-none cursor-pointer`}>
              {TZ_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-paper">{opt.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <button type="button" onClick={() => setShowTz(true)}
            className="text-[11px] text-ink-4 hover:text-vermillion underline underline-offset-2 transition-colors">
            出生地不在中國（UTC+8）？設定出生時區 →
          </button>
        )
      )}

      {inputMethod === "solar" && (
        <button type="submit"
          style={{ color: "#FDFCF8" }}
          className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm mt-2 ${
            personalReady
              ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
              : "bg-vermillion/60 cursor-pointer opacity-80"
          }`}>
          {personalReady ? "開始推算 →" : "請填寫完整資訊"}
        </button>
      )}
    </form>
  );
}
