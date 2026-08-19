"use client";

// Standalone 雙人合盤 (couple compatibility) flow for the /hepan SEO landing page.
// Self-contained: collects TWO births + a relationship type, computes both charts
// CLIENT-side (calculateBazi + calculateZiwei), then:
//   · deterministic 四維緣分 score card        — always free
//   · AI 免費預覽 (/api/reading/couple/preview) — always free teaser
//   · AI 完整合盤 (/api/reading/couple)         — gated behind PaywallLock
// The full reading only streams when the paywall is off or already unlocked, so
// we never pay for a locked section (mirrors the app's client-gating pattern).

import { useState } from "react";
import { BirthdayWheel } from "./WheelPicker";
import { calculateBazi, type BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@/lib/coupleTypes";
import HepanResultView from "./HepanResultView";

interface PersonFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

interface Charts {
  baziA: BaziResult; ziweiA: ZiweiResult;
  baziB: BaziResult; ziweiB: ZiweiResult;
  nameA?: string; nameB?: string;
  genderA: "male" | "female"; genderB: "male" | "female";
  sessionId: string;
  relType: RelationshipType;
}

// ── Input form ──────────────────────────────────────────────────────────────

function PersonForm({
  label, person, onChange, errors, prefix,
}: {
  label: string;
  person: PersonFields;
  onChange: (p: Partial<PersonFields>) => void;
  errors: Record<string, string>;
  prefix: string;
}) {
  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-vermillion rounded-full" />
        <span className="text-xs font-semibold text-ink tracking-widest">{label}</span>
      </div>

      <div>
        <label className={labelClass}>稱呼（可選）</label>
        <input
          value={person.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={prefix === "a" ? "如：小美" : "如：阿明"}
          className="w-full bg-parchment border border-border-warm rounded-lg px-4 py-2.5 text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/50 focus:ring-1 focus:ring-vermillion/20 transition-all text-sm"
        />
      </div>

      <div>
        <label className={labelClass}>出生日期 · 時辰 <span className="text-vermillion">*</span></label>
        <BirthdayWheel
          date={person.date}
          hour={person.hour}
          onDateChange={(d) => onChange({ date: d })}
          onHourChange={(h) => onChange({ hour: h })}
        />
        {(errors[`${prefix}date`] || errors[`${prefix}hour`]) && (
          <p className="text-xs text-vermillion mt-1">{errors[`${prefix}date`] || errors[`${prefix}hour`]}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>性別 <span className="text-vermillion">*</span></label>
        <div className="flex gap-3">
          {(["male", "female"] as const).map((g) => (
            <button key={g} type="button"
              onClick={() => onChange({ gender: g })}
              style={person.gender === g ? { background: "#8B1A1A", color: "#FDFCF8", borderColor: "#8B1A1A" } : {}}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                person.gender === g ? "shadow-md" : "bg-parchment border-border-warm text-ink-2 hover:border-vermillion/60"
              }`}>
              {person.gender === g ? "✓ " : ""}{g === "male" ? "男命" : "女命"}
            </button>
          ))}
        </div>
        {errors[`${prefix}gender`] && <p className="text-xs text-vermillion mt-1">{errors[`${prefix}gender`]}</p>}
      </div>
    </div>
  );
}

function personKey(p: PersonFields) {
  return `${p.date.replace(/-/g, "")}${p.hour}${p.gender}`;
}

// ── Result view (hooks always run while mounted) ──────────────────────────────

function HepanResult({ charts, onReset }: { charts: Charts; onReset: () => void }) {
  return <HepanResultView charts={charts} onReset={onReset} />;
}

// ── Top-level flow ────────────────────────────────────────────────────────────

export default function HepanFlow() {
  const [personA, setPersonA] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [personB, setPersonB] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [relType, setRelType] = useState<RelationshipType>("lover");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<Charts | null>(null);

  const ready = !!personA.date && !!personA.gender && personA.hour !== "" &&
                !!personB.date && !!personB.gender && personB.hour !== "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!personA.date) e.adate = "請填寫出生日期";
    if (!personA.gender) e.agender = "請選擇性別";
    if (!personA.hour && personA.hour !== "0") e.ahour = "請選擇出生時辰";
    if (!personB.date) e.bdate = "請填寫出生日期";
    if (!personB.gender) e.bgender = "請選擇性別";
    if (!personB.hour && personB.hour !== "0") e.bhour = "請選擇出生時辰";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || computing) return;
    setComputing(true);
    try {
      const { calculateZiwei } = await import("@/lib/ziwei");
      const [ya, ma, da] = personA.date.split("-").map(Number);
      const [yb, mb, db] = personB.date.split("-").map(Number);
      const ha = parseInt(personA.hour, 10);
      const hb = parseInt(personB.hour, 10);
      const gA = personA.gender as "male" | "female";
      const gB = personB.gender as "male" | "female";

      const [baziA, ziweiA, baziB, ziweiB] = await Promise.all([
        Promise.resolve(calculateBazi(ya, ma, da, ha, gA)),
        calculateZiwei(ya, ma, da, ha, gA),
        Promise.resolve(calculateBazi(yb, mb, db, hb, gB)),
        calculateZiwei(yb, mb, db, hb, gB),
      ]);

      setCharts({
        baziA, ziweiA, baziB, ziweiB,
        nameA: personA.name || undefined,
        nameB: personB.name || undefined,
        genderA: gA, genderB: gB,
        sessionId: `${personKey(personA)}_${personKey(personB)}_${relType}`,
        relType,
      });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setComputing(false);
    }
  }

  if (charts) {
    return <HepanResult charts={charts} onReset={() => setCharts(null)} />;
  }

  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className={labelClass}>關係型別 <span className="text-vermillion">*</span></label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(RELATIONSHIP_TYPES).map((r) => (
            <button key={r.key} type="button" onClick={() => setRelType(r.key)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-all ${
                relType === r.key
                  ? "border-vermillion bg-vermillion-l text-vermillion font-semibold"
                  : "border-border-warm bg-paper text-ink-3 hover:border-vermillion/40"
              }`}>
              <span className="text-lg leading-none">{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side on md+, stacked on mobile. The 與 divider is a grid child
          shown only when stacked — on two columns the pairing is self-evident. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
          <PersonForm label="甲方（你）" person={personA} onChange={(p) => setPersonA((prev) => ({ ...prev, ...p }))} errors={errors} prefix="a" />
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <div className="flex-1 h-px bg-border-warm" />
          <span className="text-xs text-vermillion font-bold tracking-widest">與</span>
          <div className="flex-1 h-px bg-border-warm" />
        </div>

        <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
          <PersonForm label="乙方（對方）" person={personB} onChange={(p) => setPersonB((prev) => ({ ...prev, ...p }))} errors={errors} prefix="b" />
        </div>
      </div>

      <button type="submit" disabled={computing} style={{ color: "#FDFCF8" }}
        className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm ${
          ready && !computing
            ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
            : "bg-vermillion/60 cursor-pointer opacity-80"
        }`}>
        {computing ? "正在排盤…" : ready ? "檢視雙人合盤 →" : "請填寫兩人資訊"}
      </button>

      <p className="text-center text-[11px] text-ink-4">
        出生時間預設按北京時間（UTC+8）排盤 · 雙方資訊僅用於本次推算，不會儲存
      </p>
    </form>
  );
}
