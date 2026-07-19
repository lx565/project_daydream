"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Md from "./Md";
import { useSSEStream } from "@/lib/useSSEStream";
import type { Reference } from "@/lib/rag";
import type { ZiweiResult } from "@/lib/ziwei";
import type { BaziResult } from "@/lib/bazi";
import FlowYearDetail from "./FlowYearDetail";
import BaziDecades from "./BaziDecades";
import ChatInterface from "./ChatInterface";
import { parseModernBlocks } from "@/lib/modernBlocks";
import PaywallLock from "./PaywallLock";
import { usePaywall } from "@/lib/usePaywall";
import { gtagEvent } from "@/lib/gtag";
import ChartLoadingOverlay from "./ChartLoadingOverlay";
import UnlockLoadingOverlay from "./UnlockLoadingOverlay";

type Tab = "overview" | "palaces" | "decades" | "bazi" | "dualschool" | "perspectives" | "cautions" | "wenming";

// Free tab everyone sees; the rest unlock together with one purchase.
const FREE_TABS = new Set<Tab>(["overview", "palaces"]);

const TABS: { id: Tab; label: string; char: string }[] = [
  { id: "overview",      label: "總覽", char: "觀" },
  { id: "palaces",       label: "宮位", char: "宮" },
  { id: "decades",       label: "大運", char: "運" },
  { id: "bazi",          label: "八字", char: "字" },
  { id: "perspectives",  label: "眾說", char: "源" },
  { id: "cautions",      label: "注意", char: "警" },
  { id: "wenming",      label: "問命", char: "問" },
];

const SCHOOL_LABELS: Record<string, string> = {
  "三合派": "三合", "四化派": "四化", "飛星派": "飛星",
  "北派河洛": "北派", "古籍經典": "古籍", "其他名家": "名家", "倪師學派": "倪師",
};

// One-line description shown at the top of each tab.
const TAB_INTRO: Partial<Record<Tab, React.ReactNode>> = {
  overview: <>融合<span className="text-vermillion font-semibold">紫微斗數</span>與<span className="text-amber-600 font-semibold">八字命理</span>兩套獨立體系，經雙模型交叉校驗，生成全面而獨到的命格解讀。</>,
  palaces: "逐一拆解命盤十二宮，看主星、輔星與三方四正如何牽動你人生的各個領域。",
  decades: "以十年大限為脈絡，疊合流年起伏，把握運勢的節奏、機遇與轉折。",
  bazi: "以日主旺衰與五行喜忌為綱，深入排盤，詳論命局格局與大運走向；附歷代相似命造案例對照，及祿命法與盲派兩種歷史視角。",
  perspectives: "三合、四化、飛星三派各陳其說，倪師學派直傳旁參，再納小眾諸家，終歸於綜合共識。",
  cautions: "如實點出命盤中需留意之處——一生格局與當前大運，並各附可行的應對。",
  wenming: "向 AI 深度追問命盤細節——有疑必答，追根究柢。",
};

function TabIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-ink-3 leading-relaxed bg-paper-2 border border-border-light rounded-lg px-3.5 py-3 mb-4">
      {children}
    </p>
  );
}

// Classical section header with left border accent
function SectionTitle({ children, accent = "vermillion" }: { children: React.ReactNode; accent?: "vermillion" | "gold" | "jade" }) {
  const borderColor = accent === "gold" ? "bg-gold" : accent === "jade" ? "bg-jade" : "bg-vermillion";
  const textColor = accent === "gold" ? "text-gold" : accent === "jade" ? "text-jade" : "text-vermillion";
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`w-1 h-5 rounded-full ${borderColor} flex-shrink-0`} />
      <h3 className={`text-sm font-bold tracking-widest uppercase ${textColor}`}>{children}</h3>
      <div className="flex-1 h-px bg-border-light" />
    </div>
  );
}

// References collapsible
function RefList({ refs }: { refs: Reference[] }) {
  const [open, setOpen] = useState(false);
  if (refs.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-border-light">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-4 hover:text-ink-3 transition-colors">
        <span className="text-gold">📚</span>
        <span>參考典籍（{refs.length}部）</span>
        <span className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {refs.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-ink-4">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-paper-2 border border-border-light text-ink-3 flex-shrink-0">
                {SCHOOL_LABELS[r.school] ?? r.school}
              </span>
              <span>{r.book.replace(/-/g, " · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LOADING_STEPS = [
  "正在讀取命盤資料…",
  "檢索歷史典籍參考…",
  "比對三合派論斷…",
  "梳理四化飛星脈絡…",
  "生成個人化解讀…",
];

function LoadingSkeleton({ label }: { label?: string }) {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const steps = label ? [label] : LOADING_STEPS;
    if (steps.length <= 1) return;
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 2200);
    return () => clearInterval(id);
  }, [label]);

  const steps = label ? [label] : LOADING_STEPS;
  const current = steps[step % steps.length];

  return (
    <div className="space-y-4 py-4">
      {/* Spinner + message */}
      <div className="flex items-center gap-3">
        <div className="relative w-6 h-6 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-vermillion/20" />
          <div className="absolute inset-0 rounded-full border-2 border-vermillion border-t-transparent animate-spin" />
        </div>
        <span className="text-sm text-ink-3 transition-all duration-500">{current}</span>
      </div>
      {/* Step dots */}
      {!label && (
        <div className="flex items-center gap-1.5 pl-9">
          {LOADING_STEPS.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${
              i <= step ? "bg-vermillion w-4" : "bg-border-warm w-2"
            }`} />
          ))}
        </div>
      )}
      {/* Shimmer bars */}
      <div className="space-y-2.5 pl-9">
        {[85, 70, 78, 60].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full bg-border-light overflow-hidden"
            style={{ width: `${w}%` }}>
            <div className="h-full bg-gradient-to-r from-transparent via-border-warm to-transparent animate-shimmer"
              style={{ animationDelay: `${i * 200}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Parse [現代]...[/現代] blocks out of markdown text
function ModernBlock({ content }: { content: string }) {
  return (
    <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/40 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-100/80">
        <span className="text-amber-500 text-sm leading-none">💡</span>
        <span className="text-[11px] font-semibold text-amber-700 tracking-widest uppercase">給你的話</span>
      </div>
      <div className="px-3 py-2.5 text-[13px] text-ink-2 leading-relaxed">
        <Md>{content}</Md>
      </div>
    </div>
  );
}

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_h3]:text-gold [&_h3]:font-semibold [&_h3]:text-xs [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0 [&_li]:before:text-vermillion [&_li]:before:font-bold [&_li>p]:inline [&_li>p]:m-0";

// Markdown renderer — splits out [現代]...[/現代] blocks as always-visible "給你的話" callouts
function ClassicalMd({ text }: { text: string }) {
  const parts = parseModernBlocks(text);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "modern"
          ? <ModernBlock key={i} content={part.content} />
          : <Md key={i} className={MD_PROSE}>{part.content}</Md>
      )}
    </div>
  );
}

// Generic reading card
function ReadingCard({
  stream,
  skeleton,
  children,
  onMount,
}: {
  stream: ReturnType<typeof useSSEStream>;
  skeleton?: string;
  children?: React.ReactNode;
  onMount?: () => void;
}) {
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; onMount?.(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stream.status === "error") return (
    <div className="space-y-2">
      <p className="text-sm text-vermillion">{stream.errorMsg}</p>
      <button onClick={() => { mounted.current = false; onMount?.(); }}
        className="text-xs text-gold underline">重試</button>
    </div>
  );

  if (stream.status === "streaming") return <LoadingSkeleton label={skeleton} />;

  if (stream.status === "done") return (
    <div className="animate-fade-in space-y-1">
      <ClassicalMd text={stream.text} />
      {children}
      <RefList refs={stream.refs} />
    </div>
  );

  return children ? <>{children}</> : <LoadingSkeleton label={skeleton} />;
}

// Multi-school overview split (三合 / 四化 / 飛星 + 綜合共識)
// IMPORTANT: markers must match exactly what DeepSeek returns — Traditional Chinese headers
// (model copies the format headers verbatim from the system prompt, which uses Traditional)
const OVERVIEW_SCHOOLS = [
  { key: "sanhe",   marker: "## 三合派觀點", label: "三合派", desc: "宮位星曜組合", card: "border-vermillion/30 bg-vermillion-l/20", badge: "bg-vermillion text-paper border-vermillion" },
  { key: "sihua",   marker: "## 四化派觀點", label: "四化派", desc: "四化飛化落宮", card: "border-amber-400/30 bg-amber-50/40", badge: "bg-amber-600 text-paper border-amber-600" },
  { key: "feixing", marker: "## 飛星派觀點", label: "飛星派", desc: "飛星入宮脈絡", card: "border-emerald-500/30 bg-emerald-50/40", badge: "bg-emerald-700 text-paper border-emerald-700" },
  { key: "nishi",   marker: "## 倪師學派觀點", label: "倪師學派", desc: "倪師直傳視角", card: "border-indigo-400/30 bg-indigo-50/40", badge: "bg-indigo-700 text-paper border-indigo-700" },
  { key: "niche",   marker: "## 小眾學派觀點", label: "小眾學派", desc: "三派之外旁參", card: "border-purple-400/30 bg-purple-50/40", badge: "bg-purple-700 text-paper border-purple-700" },
] as const;

// mode controls which slice of the overview reading renders:
//  "full"      — intro + 3 school cards + 綜合共識 (legacy dual-school tab)
//  "consensus" — intro + 綜合共識 only (總覽 · 紫薇綜合, the holistic conclusion)
//  "schools"   — the 3 派 breakdowns only (眾說 · 紫微三派詳解)
function OverviewDualView({ text, refs, mode = "full" }: { text: string; refs: Reference[]; mode?: "full" | "consensus" | "schools" }) {
  // Consensus marker: Traditional (綜合共識) from overview, Simplified (综合共识) fallback, legacy dual-school (两派共识)
  const consensusMarker = text.includes("## 綜合共識") ? "## 綜合共識"
    : text.includes("## 综合共识") ? "## 综合共识"
    : "## 两派共识";

  const ordered = [
    ...OVERVIEW_SCHOOLS.map((s) => ({ key: s.key as string, marker: s.marker })),
    { key: "consensus", marker: consensusMarker },
  ]
    .map((x) => ({ ...x, idx: text.indexOf(x.marker) }))
    .filter((x) => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  const hasMarkers = ordered.some((x) => x.key === "sanhe" || x.key === "sihua");
  // Markers absent (e.g. still streaming early) — render raw so nothing is lost.
  if (!hasMarkers) {
    return (
      <div className="space-y-4 animate-fade-in">
        <ClassicalMd text={text} />
        <RefList refs={refs} />
      </div>
    );
  }

  const parts: Record<string, string> = { intro: "", sanhe: "", sihua: "", feixing: "", nishi: "", niche: "", consensus: "" };
  parts.intro = ordered[0]?.idx > 0 ? text.slice(0, ordered[0].idx).trim() : "";
  for (let i = 0; i < ordered.length; i++) {
    const start = ordered[i].idx + ordered[i].marker.length;
    const end = ordered[i + 1]?.idx;
    parts[ordered[i].key] = text.slice(start, end).trim();
  }

  const showSchools = mode === "full" || mode === "schools";
  const showConsensus = mode === "full" || mode === "consensus";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Intro frames the holistic read — show it with the consensus slice, not the schools slice */}
      {mode !== "schools" && parts.intro && <ClassicalMd text={parts.intro} />}

      {/* School cards — stacked full-width for mobile readability */}
      {showSchools && OVERVIEW_SCHOOLS.map((s) => (
        <div key={s.key} className={`rounded-xl border-2 ${s.card} p-4`}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border ${s.badge}`}>{s.label}</span>
            <span className="text-xs text-ink-4">{s.desc}</span>
          </div>
          {parts[s.key]
            ? <ClassicalMd text={parts[s.key]} />
            : <p className="text-xs text-ink-4">（生成中…）</p>}
        </div>
      ))}

      {/* Consensus — boxed only in "full" mode (where it caps the school cards);
          in "consensus" mode (O2 · 紫薇綜合) render plain, consistent with 八字綜合. */}
      {showConsensus && parts.consensus && (
        mode === "full" ? (
          <div className="rounded-xl border border-jade/30 bg-jade-l/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-jade rounded-full" />
              <span className="text-xs font-bold text-jade tracking-wide">綜合共識</span>
            </div>
            <ClassicalMd text={parts.consensus} />
          </div>
        ) : (
          <ClassicalMd text={parts.consensus} />
        )
      )}

      <RefList refs={refs} />
    </div>
  );
}

// Per-palace card view — parses the palaces reading so each 宮 shows as clean rows:
// row 1 = 宮位 · 地支 + 主星, row 2 = 解讀. Avoids the "everything clustered" markdown blob.
function PalacesView({ text, refs }: { text: string; refs: Reference[] }) {
  // The palaces reading ends with ONE whole-reading [現代]/[现代] "給你的話" block — a summary of
  // the whole person, not any single palace. Pull it out FIRST so it isn't swallowed into
  // the last palace card (父母宮), where it wrongly reads as a parents-specific note.
  // Render it once, after all the palace cards.
  // Match both Traditional and Simplified variants, with or without a closing tag.
  const modernMatch = text.match(/\[(?:現代|现代)\][\s\S]*?(?:\[\/(?:現代|现代)\]|$)/);
  const modernBlock = modernMatch ? modernMatch[0] : "";
  const palacesText = modernBlock ? text.replace(modernBlock, "").trim() : text;
  // Split on each "## " heading; the first chunk may be intro text (no heading).
  const blocks = palacesText.split(/\n(?=##\s)/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="space-y-3 animate-fade-in">
      {blocks.map((block, i) => {
        if (!block.startsWith("##")) {
          // Intro or trailing [現代] block — render as-is.
          return <ClassicalMd key={i} text={block} />;
        }
        const nl = block.indexOf("\n");
        const title = block.slice(2, nl < 0 ? undefined : nl).trim(); // 命宮 · 子宮
        const rest = nl < 0 ? "" : block.slice(nl + 1).trim();
        // Pull the 主星 line out for the header row; leave the rest as 解讀.
        // Strip ** markers (header is plain text, so markdown bold would show literally).
        const starMatch = rest.match(/\*\*\s*主星\s*\*\*[：:]\s*([^\n]+)|^主星[：:]\s*([^\n]+)/m);
        const stars = (starMatch?.[1] ?? starMatch?.[2] ?? "").replace(/\*\*/g, "").trim();
        const body = (starMatch ? rest.replace(starMatch[0], "") : rest).trim();

        return (
          <div key={i} className="rounded-lg border border-border-light bg-paper-2/30 p-3.5">
            {/* Row 1 — 宮位 · 地支 + 主星 */}
            <div className="flex items-baseline gap-x-2.5 gap-y-1 flex-wrap pb-2 mb-2 border-b border-border-light/70">
              <span className="text-sm font-bold text-vermillion">{title}</span>
              {stars && (
                <span className="text-xs text-ink-3">
                  <span className="text-ink-4">主星：</span>{stars}
                </span>
              )}
            </div>
            {/* Row 2 — 解讀 */}
            {body && <ClassicalMd text={body} />}
          </div>
        );
      })}
      {modernBlock && <ClassicalMd text={modernBlock} />}
      <RefList refs={refs} />
    </div>
  );
}

// ── Main wizard ──────────────────────────────────────────────────────────────

interface WizardFlowProps {
  ziwei: ZiweiResult;
  bazi: BaziResult;
  gender: string;
  birthYear: number;
  sessionId?: string;
  name?: string;
  dateLabel?: string;
  timeLabel?: string;
  onExportReady?: (data: import("@/lib/emailTemplate").ReadingEmailData) => void;
}

function ValidationBadge({ status }: { status: import("@/lib/useSSEStream").ValidationStatus }) {
  if (status === "checking") {
    return <p className="mt-3 text-[11px] text-ink-4 flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-4 animate-pulse" />雙模型交叉校驗中…</p>;
  }
  if (status === "reprocessing") {
    return <p className="mt-3 text-[11px] text-vermillion flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-vermillion animate-pulse" />校驗發現偏差，正在為你重新處理以確保準確性…</p>;
  }
  if (status === "pass") {
    return <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-gold border border-gold/30 bg-gold-l rounded-full px-2.5 py-1">✓ 已雙模型交叉校驗（DeepSeek × Gemini）</p>;
  }
  if (status === "fail") {
    return <p className="mt-3 text-[11px] text-ink-4">本次解讀已盡力校驗，個別細節僅供參考。</p>;
  }
  return null;
}

export default function WizardFlow({ ziwei, bazi, gender, birthYear, sessionId, name, dateLabel, timeLabel, onExportReady }: WizardFlowProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  // null = not yet arrived; "" = arrived but empty/errored; string = content
  const [baziDecadesText, setBaziDecadesText] = useState<string | null>(null);
  const [flowYearsText, setFlowYearsText] = useState<string | null>(null);

  // Paywall: when enabled & not unlocked, non-free tabs are gated and their
  // (costly) AI sections are NOT auto-run until the chart is unlocked.
  const paywall = usePaywall(sessionId);
  const gated = paywall.enabled && !paywall.unlocked;

  // Detect Stripe return — set once on mount, stable for the component's lifetime
  const justPaidRef = useRef(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("paid")
  );
  const justPaid = justPaidRef.current;
  const isLocked = (tab: Tab) => gated && !FREE_TABS.has(tab);

  const ck = (tab: string) => sessionId ? `${sessionId}_${tab}` : undefined;

  // Free cross-domain synthesis (紫微 + 八字) — the new top of the 總覽 tab.
  const synthesis     = useSSEStream("/api/reading/synthesis",     ck("synthesis"), { validate: true });
  // The deep multi-school 紫微 reading — now a PAID deep-dive below the free teaser.
  const overview      = useSSEStream("/api/reading/overview",      ck("overview"), { validate: true });
  const palaces       = useSSEStream("/api/reading/palaces",       ck("palaces"), { validate: true });
  const decades       = useSSEStream("/api/reading/decades",       ck("decades"), { validate: true });
  const dualschool    = useSSEStream("/api/reading/dual-school",   ck("dualschool"), { validate: true });
  const cautions      = useSSEStream("/api/reading/cautions",      ck("cautions"), { validate: true });
  const bazi_         = useSSEStream("/api/reading/bazi",          ck("bazi"), { validate: true });         // O3 · 總覽 八字綜合 (summary)
  const baziDeep      = useSSEStream("/api/reading/bazi-deep",     ck("bazideep"), { validate: true });  // B1 · 八字 tab (deep, paid)
  const baziSchools   = useSSEStream("/api/reading/bazi-schools",  ck("bazischools"), { validate: true });  // B3 · 各派視角 (祿命+盲派)

  // Background context for 問命 ChatInterface — built live from stream texts
  const backgroundReadings: Record<string, string> = {};
  if (synthesis.text) backgroundReadings.synthesis = synthesis.text;
  if (overview.text)  backgroundReadings.overview  = overview.text;
  if (bazi_.text)     backgroundReadings.bazi       = bazi_.text;
  if (baziDeep.text)  backgroundReadings.baziDeep   = baziDeep.text;
  if (palaces.text)   backgroundReadings.palaces    = palaces.text;
  if (decades.text)   backgroundReadings.decades    = decades.text;
  if (cautions.text)  backgroundReadings.cautions   = cautions.text;

  const ziweiPayload     = { ziwei, gender, name };
  const ziweiWithBirth   = { ziwei, birthYear, name };
  const baziPayload      = { bazi, gender, ziwei };  // ziwei passed so cross-validator can check fabricated 格局
  const synthesisPayload = { ziwei, bazi, gender, name };

  // The FREE sections always run on mount: cross-domain synthesis (混合解讀),
  // the 紫微 overview (紫薇綜合 = its 綜合共識 slice), the bazi reading (八字綜合),
  // and the 宮位 per-palace reading (also free).
  useEffect(() => {
    gtagEvent("reading_started");
    if (synthesis.status === "idle") synthesis.start(synthesisPayload);
    if (overview.status === "idle")  overview.start(ziweiPayload);
    if (bazi_.status === "idle")     bazi_.start(baziPayload);
    if (palaces.status === "idle")   palaces.start({ ziwei, name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paid sections start only once the paywall state is known AND not gated —
  // this both avoids paying for AI the user can't see and runs them
  // immediately after unlock (the effect re-fires when `gated` flips false).
  useEffect(() => {
    if (paywall.loading || gated) return;
    if (decades.status === "idle")      decades.start(ziweiWithBirth);
    if (cautions.status === "idle")     cautions.start(ziweiWithBirth);
    if (baziDeep.status === "idle")     baziDeep.start(baziPayload);
    if (baziSchools.status === "idle")  baziSchools.start({ bazi, gender });
    if (dualschool.status === "idle")   dualschool.start({ ziwei });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  // Global progress across the auto-run sections (the free 總覽 trio + 宮位 always run)
  const coreStreams = gated ? [synthesis, overview, bazi_, palaces] : [synthesis, overview, bazi_, palaces, decades, cautions, baziDeep, baziSchools, dualschool];
  const coreTotal = coreStreams.length;
  const coreDone = coreStreams.filter((s) => s.status === "done").length;
  const coreErrored = coreStreams.filter((s) => s.status === "error").length;
  const allSettled = coreDone + coreErrored >= coreTotal;

  // Show 儲存&分享 only once every piece of content is ready:
  //   1. All SSE core streams settled (allSettled)
  //   2. FlowYearDetail fetch resolved (flowYearsText !== null)
  //   3. BaziDecades preload complete (baziDecadesText !== null)
  // null = still loading; "" = finished but empty/errored; string = content
  const allContentReady = allSettled && flowYearsText !== null && baziDecadesText !== null;

  const exportFired = React.useRef(false);
  useEffect(() => {
    if (!allContentReady || gated || !onExportReady) return;
    if (!exportFired.current) {
      exportFired.current = true;
      gtagEvent("reading_completed");
    }
    onExportReady({
      name,
      birthSummary: [dateLabel, timeLabel, gender].filter(Boolean).join(" · "),
      chartSummary: ziwei.summary ?? "",
      readings: {
        synthesis:    synthesis.text,
        overview:     overview.text,
        bazi:         bazi_.text,
        palaces:      palaces.text,
        decades:      decades.text,
        flowYears:    flowYearsText ?? "",
        baziDeep:     baziDeep.text,
        baziSchools:  baziSchools.text,
        baziDecades:  baziDecadesText ?? "",
        dualschool:   dualschool.text,
        cautions:     cautions.text,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContentReady, gated]);


  function renderContent() {
    // Gated tabs show the paywall instead of the (un-run) reading.
    if (isLocked(activeTab)) {
      const label = TABS.find((t) => t.id === activeTab)?.label;
      return (
        <div className="space-y-4">
          <SectionTitle accent="gold">{label}</SectionTitle>
          <PaywallLock chartId={sessionId ?? ""} sectionLabel={label} />
        </div>
      );
    }
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* FREE — cross-domain synthesis */}
            <div className="space-y-4">
              <SectionTitle>混合解讀</SectionTitle>
              {synthesis.status === "streaming" ? (
                <LoadingSkeleton label="正在融合紫微與八字…" />
              ) : synthesis.status === "done" ? (
                <div>
                  <ClassicalMd text={synthesis.text} />
                  <RefList refs={synthesis.refs} />
                </div>
              ) : synthesis.status === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-vermillion">{synthesis.errorMsg}</p>
                  <button onClick={() => synthesis.start(synthesisPayload)} className="text-xs text-gold underline">重試</button>
                </div>
              ) : (
                <LoadingSkeleton label="正在初始化…" />
              )}
              <ValidationBadge status={synthesis.validation} />
            </div>

            {/* FREE — 紫薇綜合 (the overview 綜合共識 slice) */}
            <div className="space-y-4 pt-4 border-t border-border-light">
              <SectionTitle accent="gold">紫薇綜合</SectionTitle>
              {overview.status === "done" ? (
                <div>
                  <OverviewDualView text={overview.text} refs={overview.refs} mode="consensus" />
                  <ValidationBadge status={overview.validation} />
                </div>
              ) : overview.status === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-vermillion">{overview.errorMsg}</p>
                  <button onClick={() => overview.start(ziweiPayload)} className="text-xs text-gold underline">重試</button>
                </div>
              ) : (
                <ReadingCard stream={overview} skeleton="正在生成紫薇綜合…"
                  onMount={() => overview.status === "idle" && overview.start(ziweiPayload)} />
              )}
            </div>

            {/* FREE — 八字綜合 (comprehensive bazi summary) */}
            <div className="space-y-4 pt-4 border-t border-border-light">
              <SectionTitle accent="gold">八字綜合</SectionTitle>
              {bazi_.status === "done" ? (
                <div>
                  <ClassicalMd text={bazi_.text} />
                  <RefList refs={bazi_.refs} />
                  <ValidationBadge status={bazi_.validation} />
                </div>
              ) : bazi_.status === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-vermillion">{bazi_.errorMsg}</p>
                  <button onClick={() => bazi_.start(baziPayload)} className="text-xs text-gold underline">重試</button>
                </div>
              ) : (
                <ReadingCard stream={bazi_} skeleton="正在生成八字綜合…"
                  onMount={() => bazi_.status === "idle" && bazi_.start(baziPayload)} />
              )}
            </div>
          </div>
        );

      case "palaces":
        return (
          <div className="space-y-4">
            <SectionTitle accent="jade">十二宮位逐宮解讀</SectionTitle>
            {palaces.status === "idle" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-ink-3 text-center">逐一解讀命盤十二宮位的主星與含義</p>
                <button
                  onClick={() => palaces.start({ ziwei, name })}
                  className="px-5 py-2 bg-jade text-paper text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                  開始宮位解讀
                </button>
              </div>
            ) : palaces.status === "done" ? (
              <PalacesView text={palaces.text} refs={palaces.refs} />
            ) : (
              <ReadingCard stream={palaces} skeleton="正在逐宮分析…" />
            )}
            <ValidationBadge status={palaces.validation} />
          </div>
        );

      case "decades":
        return (
          <div className="space-y-4">
            <SectionTitle accent="gold">大運解讀</SectionTitle>
            {decades.status === "idle" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-ink-3">分析當前大限運勢及下一大限預告</p>
                <button
                  onClick={() => decades.start(ziweiWithBirth)}
                  className="px-5 py-2 bg-vermillion text-white text-sm font-medium rounded-lg hover:bg-vermillion-h transition-colors">
                  開始大運分析
                </button>
              </div>
            ) : (
              <ReadingCard stream={decades} skeleton="正在分析大運…" />
            )}
            <ValidationBadge status={decades.validation} />
            {/* Per-year 流年 deep reading — moved here from the ziwei chart */}
            <FlowYearDetail ziwei={ziwei} birthYear={birthYear} name={name} onReady={setFlowYearsText} />
          </div>
        );

      case "bazi":
        return (
          <div className="space-y-6">
            <SectionTitle accent="gold">八字命理 · 深度詳批</SectionTitle>
            <ReadingCard stream={baziDeep} skeleton="正在深度排盤解八字…"
              onMount={() => baziDeep.status === "idle" && baziDeep.start(baziPayload)} />
            <div className="pt-2 border-t border-parchment-2">
              <SectionTitle>各派視角 · 祿命法與盲派</SectionTitle>
              <p className="text-xs text-ink-3 mb-3">以子平法（B1）為主軸，以下補充兩種歷史流派的獨特解讀視角，供對照參考。</p>
              <ReadingCard stream={baziSchools} skeleton="正在調取祿命法與盲派視角…"
                onMount={() => baziSchools.status === "idle" && baziSchools.start({ bazi, gender })} />
            </div>
            <BaziDecades bazi={bazi} name={name} gender={gender as "male" | "female"} sessionId={sessionId} preload={!gated} onReady={setBaziDecadesText} />
          </div>
        );

      case "dualschool":
        return (
          <div className="space-y-4">
            <SectionTitle>三合 · 四化 · 飛星 · 三派深解</SectionTitle>
            {dualschool.status === "done" ? (
              <div>
                <OverviewDualView text={dualschool.text} refs={dualschool.refs} />
              </div>
            ) : (
              <ReadingCard stream={dualschool} skeleton="正在生成三派深解…"
                onMount={() => dualschool.status === "idle" && dualschool.start({ ziwei })} />
            )}
            <ValidationBadge status={dualschool.validation} />
          </div>
        );

      case "perspectives":
        return (
          <div className="space-y-4">
            <SectionTitle accent="gold">紫微三派詳解</SectionTitle>
            {overview.status === "done" ? (
              <div>
                {/* mode="schools": only the 三合/四化/飛星/小眾 派 cards — the 綜合共識
                    conclusion lives solely in O2 (紫薇綜合), so it isn't repeated here. */}
                <OverviewDualView text={overview.text} refs={overview.refs} mode="schools" />
                <ValidationBadge status={overview.validation} />
              </div>
            ) : overview.status === "error" ? (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{overview.errorMsg}</p>
                <button onClick={() => overview.start(ziweiPayload)} className="text-xs text-gold underline">重試</button>
              </div>
            ) : (
              <ReadingCard stream={overview} skeleton="正在生成三派詳解…"
                onMount={() => overview.status === "idle" && overview.start(ziweiPayload)} />
            )}
          </div>
        );

      case "cautions":
        return (
          <div className="space-y-4">
            <SectionTitle accent="jade">特別注意 & 當前運勢</SectionTitle>
            <ReadingCard stream={cautions} skeleton="正在分析注意事項…"
              onMount={() => cautions.status === "idle" && cautions.start(ziweiWithBirth)} />
          </div>
        );

    }
  }

  return (
    <>
      {/* Birth loading overlay — shown until first SSE chunk + 2s minimum */}
      <ChartLoadingOverlay firstChunkArrived={synthesis.text.length > 0 || synthesis.status === "error"} />

      {/* Post-payment overlay — shown when returning from payment until unlock confirmed */}
      {justPaid && paywall.loading && (
        <UnlockLoadingOverlay unlocked={paywall.unlocked} />
      )}

    <div className="space-y-0">
      {/* Global progress while sections crunch */}
      {!allSettled && (
        <div className="no-print flex items-center gap-3 px-3 sm:px-4 py-3 border border-b-0 border-border-warm rounded-t-xl bg-paper-2">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-vermillion/20" />
            <div className="absolute inset-0 rounded-full border-2 border-vermillion border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-vermillion">命</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-ink-2">正在推算命盤各部分…</span>
              <span className="text-[10px] text-ink-4 tabular-nums">{coreDone}/{coreTotal}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border-light overflow-hidden">
              <div className="h-full bg-vermillion rounded-full transition-all duration-500"
                style={{ width: `${(coreDone / coreTotal) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Classical tab bar — sticky so tabs stay reachable while the reading scrolls with the page */}
      <div className={`no-print flex border border-border-warm overflow-hidden bg-paper-2 sticky top-0 z-10 ${allSettled ? "rounded-t-xl" : "border-t-0"}`}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 min-w-0 flex flex-col items-center py-2.5 px-0.5 border-r last:border-r-0 border-border-light transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-vermillion text-paper"
                : "text-ink-3 hover:bg-paper hover:text-ink"
            }`}>
            {isLocked(tab.id) && (
              <span className={`absolute top-1 right-1 text-[8px] leading-none ${activeTab === tab.id ? "opacity-80" : "opacity-50"}`}>🔒</span>
            )}
            <span className={`text-xs font-bold leading-none ${activeTab === tab.id ? "text-paper/70" : "text-ink-4"}`}>
              {tab.char}
            </span>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="no-print border border-t-0 border-border-warm rounded-b-xl bg-paper p-4 sm:p-5 min-h-[200px]">
        {activeTab !== "wenming" && (
          <>
            {TAB_INTRO[activeTab] && <TabIntro>{TAB_INTRO[activeTab]}</TabIntro>}
            {renderContent()}
          </>
        )}
        {/* 問命 — paywall when locked; always mounted (hidden) when unlocked so chat history survives tab switches */}
        {isLocked("wenming") ? (
          activeTab === "wenming" && (
            <div className="space-y-4">
              <SectionTitle accent="gold">問命</SectionTitle>
              <PaywallLock chartId={sessionId ?? ""} sectionLabel="問命" />
            </div>
          )
        ) : (
          <div className={activeTab === "wenming" ? undefined : "hidden"}>
            {TAB_INTRO.wenming && <TabIntro>{TAB_INTRO.wenming}</TabIntro>}
            <div className="space-y-3">
              <ChatInterface
                ziwei={ziwei}
                initialContext={`你好，我已瞭解你的命盤（${ziwei.summary}）。可就性格、事業、感情、流年等追問，我會據盤而論、利弊並陳。`}
                backgroundReadings={backgroundReadings}
                chartId={sessionId ?? ""}
                maxQuestions={10}
              />
            </div>
          </div>
        )}
      </div>


    </div>
    </>
  );
}
