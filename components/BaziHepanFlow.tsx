"use client";

// 八字雙人合盤 flow — pure 子平 lens, no 紫微.
// · deterministic 八字緣分指數         — always free
// · AI 免費預覽 (/api/reading/bazi-couple/preview) — always free
// · AI 完整八字合盤 (/api/reading/bazi-couple)     — gated behind PaywallLock

import { useEffect, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import { BirthdayWheel } from "./WheelPicker";
import { calculateBazi, type BaziResult } from "@/lib/bazi";
import { calcBaziCoupleScore } from "@/lib/baziCouple";
import { RELATIONSHIP_TYPES, getRelationshipConfig, type RelationshipType } from "@/lib/coupleTypes";
import { useSSEStream } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";

interface PersonFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

interface BaziCharts {
  baziA: BaziResult;
  baziB: BaziResult;
  nameA?: string; nameB?: string;
  genderA: "male" | "female"; genderB: "male" | "female";
  sessionId: string;
  relType: RelationshipType;
}

const BAZI_COUPLE_INCLUDED = [
  "日主相見 · 緣分底色詳解",
  "甲乙雙方各自的八字感情模式",
  "天干合化 · 陰陽牽引分析",
  "地支合衝刑害 · 緣分結構",
  "五行互補 · 喜用神匹配",
  "大運時機 · 關係高峰與考驗",
  "可分享緣分卡片 · 一鍵複製發小紅書",
];

// ── Input form ────────────────────────────────────────────────────────────────

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

// ── Score card components ─────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e0d6" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
      <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{score}</text>
      <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#8a7a6a">/ 100</text>
    </svg>
  );
}

function DimRow({ label, score, desc }: { label: string; score: number; desc: string }) {
  const color = score >= 80 ? "#16a34a" : score >= 65 ? "#d97706" : "#6b7280";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-ink-3">{label}</span>
        <span className="font-semibold" style={{ color }}>{score}分</span>
      </div>
      <div className="h-1.5 rounded-full bg-border-warm overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <p className="text-[10px] text-ink-4 leading-snug">{desc}</p>
    </div>
  );
}

// ── Reading components ────────────────────────────────────────────────────────

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-vermillion [&_li]:before:font-bold";

function ShareCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className="rounded-xl border-2 border-gold/40 bg-gradient-to-b from-gold-l/30 to-paper p-4">
      <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed text-center">{text}</pre>
      <button onClick={copy}
        className="mt-3 w-full rounded-full bg-vermillion px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
        {copied ? "已複製 ✓" : "複製 · 分享到小紅書"}
      </button>
    </div>
  );
}

function FullReading({ text }: { text: string }) {
  const marker = "### 分享卡片";
  const idx = text.indexOf(marker);
  const body = idx >= 0 ? text.slice(0, idx) : text;
  const card = idx >= 0 ? text.slice(idx + marker.length).trim() : "";
  return (
    <div className="space-y-4">
      <Md className={MD_PROSE}>{body}</Md>
      {card && <ShareCard text={card} />}
    </div>
  );
}

const LOADING_STEPS = ["正在解析雙方八字四柱…", "分析日主五行生克…", "檢索命理典籍…", "生成八字合盤解讀…"];

function LoadingSkeleton() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % LOADING_STEPS.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3">
        <div className="relative w-6 h-6 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-vermillion/20" />
          <div className="absolute inset-0 rounded-full border-2 border-vermillion border-t-transparent animate-spin" />
        </div>
        <span className="text-sm text-ink-3">{LOADING_STEPS[step]}</span>
      </div>
      <div className="space-y-2.5 pl-9">
        {[90, 75, 82, 65, 70].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full bg-border-light overflow-hidden" style={{ width: `${w}%` }}>
            <div className="h-full bg-gradient-to-r from-transparent via-border-warm to-transparent animate-shimmer"
              style={{ animationDelay: `${i * 200}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Result view ───────────────────────────────────────────────────────────────

function BaziHepanResult({ charts, onReset }: { charts: BaziCharts; onReset: () => void }) {
  const { baziA, baziB, nameA, nameB, genderA, genderB, sessionId, relType } = charts;
  const cfg = getRelationshipConfig(relType);
  const score = calcBaziCoupleScore(baziA, baziB, cfg.key);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const chartId = `bazihepan_${sessionId}`;
  const paywall = usePaywall(chartId);
  const gated = paywall.enabled && !paywall.unlocked;

  const body = { baziA, baziB, nameA, nameB, genderA, genderB, relationshipType: cfg.key };

  const preview = useSSEStream("/api/reading/bazi-couple/preview", `${chartId}_preview`);
  useEffect(() => {
    if (preview.status === "idle") preview.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const full = useSSEStream("/api/reading/bazi-couple", `${chartId}_full`);
  useEffect(() => {
    if (!paywall.loading && !gated && full.status === "idle") full.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  return (
    <div className="space-y-6">
      <button onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      {/* Score card — free */}
      <div className="paper-card rounded-2xl border border-border-warm p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-vermillion rounded-full" />
          <h2 className="text-base font-bold text-ink tracking-wide">八字緣分指數</h2>
        </div>
        <p className="text-xs text-ink-4 mb-4 pl-3">
          {cfg.label} · {cfg.shareLabel}：<span className="text-vermillion font-medium">{score.label}</span>
        </p>

        {/* Day master banner */}
        <div className="mb-4 rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
          <p className="text-xs text-amber-800 font-medium mb-0.5">
            {labelA} 日主 {baziA.dayMaster}（{baziA.dayMasterElement}）
            {" · "}
            {labelB} 日主 {baziB.dayMaster}（{baziB.dayMasterElement}）
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed">{score.dayMasterDesc}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing score={score.total} color={score.color} />
            <span className="text-sm font-bold tracking-widest mt-1" style={{ color: score.color }}>{score.label}</span>
          </div>
          <div className="flex-1 w-full space-y-4">
            {score.dims.map((d) => <DimRow key={d.name} label={d.name} score={d.score} desc={d.desc} />)}
          </div>
        </div>
        <p className="text-[10px] text-ink-4 mt-4 text-center leading-relaxed">
          八字緣分指數基於日主五行生克、干支合衝與五行互補結構，僅供參考，緣分深淺因人而異
        </p>
      </div>

      {/* Free preview */}
      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">緣分一瞥 · 免費預覽</span>
        </p>
        <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
          {(preview.status === "streaming" || preview.status === "idle") && <LoadingSkeleton />}
          {preview.status === "done" && (
            <div className="animate-fade-in"><Md className={MD_PROSE}>{preview.text}</Md></div>
          )}
          {preview.status === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-vermillion">{preview.errorMsg}</p>
              <button onClick={() => preview.start(body)} className="text-xs text-gold underline">重試</button>
            </div>
          )}
        </div>
      </div>

      {/* Full reading — gated */}
      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">完整八字合盤解讀</span>
        </p>
        {paywall.loading ? (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5"><LoadingSkeleton /></div>
        ) : gated ? (
          <PaywallLock chartId={chartId} sectionLabel="八字雙人合盤 · 完整解讀" included={BAZI_COUPLE_INCLUDED} />
        ) : (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {(full.status === "streaming" || full.status === "idle") && <LoadingSkeleton />}
            {full.status === "done" && <div className="animate-fade-in"><FullReading text={full.text} /></div>}
            {full.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{full.errorMsg}</p>
                <button onClick={() => full.start(body)} className="text-xs text-gold underline">重試</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two bazi summaries */}
      <div className="space-y-3">
        <p className="text-xs text-ink-4 tracking-widest uppercase px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-ink-4 inline-block" />雙方八字
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { label: labelA, bazi: baziA },
            { label: labelB, bazi: baziB },
          ] as { label: string; bazi: BaziResult }[]).map(({ label, bazi }) => (
            <div key={label} className="rounded-xl border border-border-warm bg-paper p-4 space-y-2">
              <p className="text-xs font-semibold text-ink-2">{label}</p>
              <p className="font-mono text-base tracking-widest text-ink font-bold">
                {bazi.year.stem}{bazi.year.branch} {bazi.month.stem}{bazi.month.branch}{" "}
                {bazi.day.stem}{bazi.day.branch} {bazi.hour.stem}{bazi.hour.branch}
              </p>
              <p className="text-[11px] text-ink-4 leading-relaxed">{bazi.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-ink-4 pb-4">
        僅供學習參考與娛樂，請理性看待，切勿迷信 ·{" "}
        <Link href="/" className="text-vermillion hover:underline">測個人命盤 →</Link>
        {" · "}
        <Link href="/hepan" className="text-ink-3 hover:underline">改測紫微合盤</Link>
      </p>

      <BugReportButton sessionId={chartId} page="bazihepan" />
    </div>
  );
}

// ── Top-level flow ────────────────────────────────────────────────────────────

export default function BaziHepanFlow() {
  const [personA, setPersonA] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [personB, setPersonB] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [relType, setRelType] = useState<RelationshipType>("lover");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<BaziCharts | null>(null);

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
      const [ya, ma, da] = personA.date.split("-").map(Number);
      const [yb, mb, db] = personB.date.split("-").map(Number);
      const ha = parseInt(personA.hour, 10);
      const hb = parseInt(personB.hour, 10);
      const gA = personA.gender as "male" | "female";
      const gB = personB.gender as "male" | "female";

      const [baziA, baziB] = [
        calculateBazi(ya, ma, da, ha, gA),
        calculateBazi(yb, mb, db, hb, gB),
      ];

      setCharts({
        baziA, baziB,
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
    return <BaziHepanResult charts={charts} onReset={() => setCharts(null)} />;
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

      <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
        <PersonForm label="甲方（你）" person={personA} onChange={(p) => setPersonA((prev) => ({ ...prev, ...p }))} errors={errors} prefix="a" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-warm" />
        <span className="text-xs text-vermillion font-bold tracking-widest">與</span>
        <div className="flex-1 h-px bg-border-warm" />
      </div>

      <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
        <PersonForm label="乙方（對方）" person={personB} onChange={(p) => setPersonB((prev) => ({ ...prev, ...p }))} errors={errors} prefix="b" />
      </div>

      <button type="submit" disabled={computing} style={{ color: "#FDFCF8" }}
        className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm ${
          ready && !computing
            ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
            : "bg-vermillion/60 cursor-pointer opacity-80"
        }`}>
        {computing ? "正在排盤…" : ready ? "測八字合盤緣分 →" : "請填寫兩人資訊"}
      </button>

      <p className="text-center text-[11px] text-ink-4">
        出生時間預設按北京時間（UTC+8）排盤 · 雙方資訊僅用於本次推算，不會儲存
      </p>
    </form>
  );
}
