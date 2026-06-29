"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Md from "./Md";
import { useSSEStream } from "@/lib/useSSEStream";
import type { Reference } from "@/lib/rag";
import type { ZiweiResult } from "@/lib/ziwei";
import type { BaziResult } from "@/lib/bazi";
import FlowYearDetail from "./FlowYearDetail";
import BaziDecades from "./BaziDecades";
import HistoricalCases from "./HistoricalCases";
import { parseModernBlocks } from "@/lib/modernBlocks";
import PaywallLock from "./PaywallLock";
import { usePaywall } from "@/lib/usePaywall";
import { gtagEvent } from "@/lib/gtag";

type Tab = "overview" | "palaces" | "decades" | "bazi" | "dualschool" | "perspectives" | "cautions";

// Free tab everyone sees; the rest unlock together with one purchase.
const FREE_TABS = new Set<Tab>(["overview"]);

const TABS: { id: Tab; label: string; char: string }[] = [
  { id: "overview",      label: "总览", char: "观" },
  { id: "palaces",       label: "宫位", char: "宫" },
  { id: "decades",       label: "大运", char: "运" },
  { id: "bazi",          label: "八字", char: "字" },
  { id: "perspectives",  label: "众说", char: "源" },
  { id: "cautions",      label: "注意", char: "警" },
];

const SCHOOL_LABELS: Record<string, string> = {
  "三合派": "三合", "四化派": "四化", "飞星派": "飞星",
  "北派河洛": "北派", "古籍经典": "古籍", "其他名家": "名家", "倪师学派": "倪师",
};

// One-line description shown at the top of each tab.
const TAB_INTRO: Partial<Record<Tab, React.ReactNode>> = {
  overview: <>融合<span className="text-vermillion font-semibold">紫微斗数</span>与<span className="text-amber-600 font-semibold">八字命理</span>两套独立体系，经双模型交叉校验，生成全面而独到的命格解读。</>,
  palaces: "逐一拆解命盘十二宫，看主星、辅星与三方四正如何牵动你人生的各个领域。",
  decades: "以十年大限为脉络，叠合流年起伏，把握运势的节奏、机遇与转折。",
  bazi: "以日主旺衰与五行喜忌为纲，深入排盘，详论命局格局与大运走向；附历代相似命造案例对照，及禄命法与盲派两种历史视角。",
  perspectives: "三合、四化、飞星三派各陈其说，倪师学派直传旁参，再纳小众诸家，终归于综合共识。",
  cautions: "如实点出命盘中需留意之处——一生格局与当前大运，并各附可行的应对。",
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
        <span>参考典籍（{refs.length}部）</span>
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
  "正在读取命盘数据…",
  "检索历史典籍参考…",
  "比对三合派论断…",
  "梳理四化飞星脉络…",
  "生成个人化解读…",
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

// Parse [现代]...[/现代] blocks out of markdown text
function ModernBlock({ content }: { content: string }) {
  return (
    <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/40 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-100/80">
        <span className="text-amber-500 text-sm leading-none">💡</span>
        <span className="text-[11px] font-semibold text-amber-700 tracking-widest uppercase">给你的话</span>
      </div>
      <div className="px-3 py-2.5 text-[13px] text-ink-2 leading-relaxed">
        <Md>{content}</Md>
      </div>
    </div>
  );
}

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_h3]:text-gold [&_h3]:font-semibold [&_h3]:text-xs [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0 [&_li]:before:text-vermillion [&_li]:before:font-bold [&_li>p]:inline [&_li>p]:m-0";

// Markdown renderer — splits out [现代]...[/现代] blocks as always-visible "给你的话" callouts
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
        className="text-xs text-gold underline">重试</button>
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

// Multi-school overview split (三合 / 四化 / 飞星 + 综合共识)
const OVERVIEW_SCHOOLS = [
  { key: "sanhe",   marker: "## 三合派观点", label: "三合派", desc: "宫位星曜组合", card: "border-vermillion/30 bg-vermillion-l/20", badge: "bg-vermillion text-paper border-vermillion" },
  { key: "sihua",   marker: "## 四化派观点", label: "四化派", desc: "四化飞化落宫", card: "border-amber-400/30 bg-amber-50/40", badge: "bg-amber-600 text-paper border-amber-600" },
  { key: "feixing", marker: "## 飞星派观点", label: "飞星派", desc: "飞星入宫脉络", card: "border-emerald-500/30 bg-emerald-50/40", badge: "bg-emerald-700 text-paper border-emerald-700" },
  { key: "nishi",   marker: "## 倪师学派观点", label: "倪师学派", desc: "倪师直传视角", card: "border-indigo-400/30 bg-indigo-50/40", badge: "bg-indigo-700 text-paper border-indigo-700" },
  { key: "niche",   marker: "## 小众学派观点", label: "小众学派", desc: "三派之外旁参", card: "border-purple-400/30 bg-purple-50/40", badge: "bg-purple-700 text-paper border-purple-700" },
] as const;

// mode controls which slice of the overview reading renders:
//  "full"      — intro + 3 school cards + 综合共识 (legacy dual-school tab)
//  "consensus" — intro + 综合共识 only (总览 · 紫薇综合, the holistic conclusion)
//  "schools"   — the 3 派 breakdowns only (众说 · 紫微三派详解)
function OverviewDualView({ text, refs, mode = "full" }: { text: string; refs: Reference[]; mode?: "full" | "consensus" | "schools" }) {
  // Consensus marker varies: overview uses 综合共识, legacy dual-school uses 两派共识
  const consensusMarker = text.includes("## 综合共识") ? "## 综合共识" : "## 两派共识";

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
          in "consensus" mode (O2 · 紫薇综合) render plain, consistent with 八字综合. */}
      {showConsensus && parts.consensus && (
        mode === "full" ? (
          <div className="rounded-xl border border-jade/30 bg-jade-l/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-jade rounded-full" />
              <span className="text-xs font-bold text-jade tracking-wide">综合共识</span>
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

// Per-palace card view — parses the palaces reading so each 宫 shows as clean rows:
// row 1 = 宫位 · 地支 + 主星, row 2 = 解读. Avoids the "everything clustered" markdown blob.
function PalacesView({ text, refs }: { text: string; refs: Reference[] }) {
  // Split on each "## " heading; the first chunk may be intro text (no heading).
  const blocks = text.split(/\n(?=##\s)/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="space-y-3 animate-fade-in">
      {blocks.map((block, i) => {
        if (!block.startsWith("##")) {
          // Intro or trailing [现代] block — render as-is.
          return <ClassicalMd key={i} text={block} />;
        }
        const nl = block.indexOf("\n");
        const title = block.slice(2, nl < 0 ? undefined : nl).trim(); // 命宫 · 子宫
        const rest = nl < 0 ? "" : block.slice(nl + 1).trim();
        // Pull the 主星 line out for the header row; leave the rest as 解读.
        // Strip ** markers (header is plain text, so markdown bold would show literally).
        const starMatch = rest.match(/\*\*\s*主星\s*\*\*[：:]\s*([^\n]+)|^主星[：:]\s*([^\n]+)/m);
        const stars = (starMatch?.[1] ?? starMatch?.[2] ?? "").replace(/\*\*/g, "").trim();
        const body = (starMatch ? rest.replace(starMatch[0], "") : rest).trim();

        return (
          <div key={i} className="rounded-lg border border-border-light bg-paper-2/30 p-3.5">
            {/* Row 1 — 宫位 · 地支 + 主星 */}
            <div className="flex items-baseline gap-x-2.5 gap-y-1 flex-wrap pb-2 mb-2 border-b border-border-light/70">
              <span className="text-sm font-bold text-vermillion">{title}</span>
              {stars && (
                <span className="text-xs text-ink-3">
                  <span className="text-ink-4">主星：</span>{stars}
                </span>
              )}
            </div>
            {/* Row 2 — 解读 */}
            {body && <ClassicalMd text={body} />}
          </div>
        );
      })}
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
  onReadingComplete?: (key: string, text: string) => void;
}

function ValidationBadge({ status }: { status: import("@/lib/useSSEStream").ValidationStatus }) {
  if (status === "checking") {
    return <p className="mt-3 text-[11px] text-ink-4 flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-4 animate-pulse" />双模型交叉校验中…</p>;
  }
  if (status === "reprocessing") {
    return <p className="mt-3 text-[11px] text-vermillion flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-vermillion animate-pulse" />校验发现偏差，正在为你重新处理以确保准确性…</p>;
  }
  if (status === "pass") {
    return <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-gold border border-gold/30 bg-gold-l rounded-full px-2.5 py-1">✓ 已双模型交叉校验（DeepSeek × Gemini）</p>;
  }
  if (status === "fail") {
    return <p className="mt-3 text-[11px] text-ink-4">本次解读已尽力校验，个别细节仅供参考。</p>;
  }
  return null;
}

export default function WizardFlow({ ziwei, bazi, gender, birthYear, sessionId, name, onReadingComplete }: WizardFlowProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Paywall: when enabled & not unlocked, non-free tabs are gated and their
  // (costly) AI sections are NOT auto-run until the chart is unlocked.
  const paywall = usePaywall(sessionId);
  const gated = paywall.enabled && !paywall.unlocked;
  const isLocked = (tab: Tab) => gated && !FREE_TABS.has(tab);

  const ck = (tab: string) => sessionId ? `${sessionId}_${tab}` : undefined;

  // Free cross-domain synthesis (紫微 + 八字) — the new top of the 总览 tab.
  const synthesis     = useSSEStream("/api/reading/synthesis",     ck("synthesis"), { validate: true });
  // The deep multi-school 紫微 reading — now a PAID deep-dive below the free teaser.
  const overview      = useSSEStream("/api/reading/overview",      ck("overview"), { validate: true });
  const palaces       = useSSEStream("/api/reading/palaces",       ck("palaces"), { validate: true });
  const decades       = useSSEStream("/api/reading/decades",       ck("decades"), { validate: true });
  const dualschool    = useSSEStream("/api/reading/dual-school",   ck("dualschool"), { validate: true });
  const cautions      = useSSEStream("/api/reading/cautions",      ck("cautions"));
  const bazi_         = useSSEStream("/api/reading/bazi",          ck("bazi"));         // O3 · 总览 八字综合 (summary)
  const baziDeep      = useSSEStream("/api/reading/bazi-deep",     ck("bazideep"), { validate: true });  // B1 · 八字 tab (deep, paid)
  const baziSchools   = useSSEStream("/api/reading/bazi-schools",  ck("bazischools"));  // B3 · 各派视角 (禄命+盲派)

  // Notify parent when each core reading completes so the chat can use it as background context
  const notified = useRef<Set<string>>(new Set());
  useEffect(() => {
    // The chat expects the "overview" key as background context — feed it from the
    // FREE synthesis (always runs), so chat works even while the paid 紫微深解 is locked.
    const pairs: [string, typeof overview][] = [
      ["overview", synthesis], ["palaces", palaces], ["decades", decades],
      ["bazi", bazi_], ["cautions", cautions],
    ];
    for (const [key, stream] of pairs) {
      if (stream.status === "done" && stream.text && !notified.current.has(key)) {
        notified.current.add(key);
        onReadingComplete?.(key, stream.text);
        if (key === "overview") gtagEvent("reading_completed");
      }
    }
  }, [synthesis.status, palaces.status, decades.status, bazi_.status, cautions.status, onReadingComplete, synthesis, palaces, decades, bazi_, cautions]);

  const ziweiPayload     = { ziwei, gender, name };
  const ziweiWithBirth   = { ziwei, birthYear, name };
  const baziPayload      = { bazi, gender, ziwei };  // ziwei passed so cross-validator can check fabricated 格局
  const synthesisPayload = { ziwei, bazi, gender, name };

  // The FREE 总览 sections always run on mount: cross-domain synthesis (混合解读),
  // the 紫微 overview (紫薇综合 = its 综合共识 slice), and the bazi reading (八字综合).
  useEffect(() => {
    gtagEvent("reading_started");
    if (synthesis.status === "idle") synthesis.start(synthesisPayload);
    if (overview.status === "idle")  overview.start(ziweiPayload);
    if (bazi_.status === "idle")     bazi_.start(baziPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paid sections start only once the paywall state is known AND not gated —
  // this both avoids paying for AI the user can't see and runs them
  // immediately after unlock (the effect re-fires when `gated` flips false).
  useEffect(() => {
    if (paywall.loading || gated) return;
    if (palaces.status === "idle")      palaces.start({ ziwei, name });
    if (decades.status === "idle")      decades.start(ziweiWithBirth);
    if (cautions.status === "idle")     cautions.start(ziweiWithBirth);
    if (baziDeep.status === "idle")     baziDeep.start(baziPayload);
    if (baziSchools.status === "idle")  baziSchools.start({ bazi, gender });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  // Global progress across the auto-run sections (the free 总览 trio always runs)
  const coreStreams = gated ? [synthesis, overview, bazi_] : [synthesis, overview, bazi_, palaces, decades, cautions, baziDeep, baziSchools];
  const coreTotal = coreStreams.length;
  const coreDone = coreStreams.filter((s) => s.status === "done").length;
  const coreErrored = coreStreams.filter((s) => s.status === "error").length;
  const allSettled = coreDone + coreErrored >= coreTotal;


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
              <SectionTitle>混合解读</SectionTitle>
              {synthesis.status === "streaming" ? (
                <LoadingSkeleton label="正在融合紫微与八字…" />
              ) : synthesis.status === "done" ? (
                <div>
                  <ClassicalMd text={synthesis.text} />
                  <RefList refs={synthesis.refs} />
                </div>
              ) : synthesis.status === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-vermillion">{synthesis.errorMsg}</p>
                  <button onClick={() => synthesis.start(synthesisPayload)} className="text-xs text-gold underline">重试</button>
                </div>
              ) : (
                <LoadingSkeleton label="正在初始化…" />
              )}
              <ValidationBadge status={synthesis.validation} />
            </div>

            {/* FREE — 紫薇综合 (the overview 综合共识 slice) */}
            <div className="space-y-4 pt-4 border-t border-border-light">
              <SectionTitle accent="gold">紫薇综合</SectionTitle>
              {overview.status === "done" ? (
                <div>
                  <OverviewDualView text={overview.text} refs={overview.refs} mode="consensus" />
                  <ValidationBadge status={overview.validation} />
                </div>
              ) : overview.status === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-vermillion">{overview.errorMsg}</p>
                  <button onClick={() => overview.start(ziweiPayload)} className="text-xs text-gold underline">重试</button>
                </div>
              ) : (
                <ReadingCard stream={overview} skeleton="正在生成紫薇综合…"
                  onMount={() => overview.status === "idle" && overview.start(ziweiPayload)} />
              )}
            </div>

            {/* FREE — 八字综合 (comprehensive bazi summary) */}
            <div className="space-y-4 pt-4 border-t border-border-light">
              <SectionTitle accent="gold">八字综合</SectionTitle>
              {bazi_.status === "done" ? (
                <div>
                  <ClassicalMd text={bazi_.text} />
                  <RefList refs={bazi_.refs} />
                  <ValidationBadge status={bazi_.validation} />
                </div>
              ) : bazi_.status === "error" ? (
                <div className="space-y-2">
                  <p className="text-sm text-vermillion">{bazi_.errorMsg}</p>
                  <button onClick={() => bazi_.start(baziPayload)} className="text-xs text-gold underline">重试</button>
                </div>
              ) : (
                <ReadingCard stream={bazi_} skeleton="正在生成八字综合…"
                  onMount={() => bazi_.status === "idle" && bazi_.start(baziPayload)} />
              )}
            </div>
          </div>
        );

      case "palaces":
        return (
          <div className="space-y-4">
            <SectionTitle accent="jade">十二宫位逐宫解读</SectionTitle>
            {palaces.status === "idle" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-ink-3 text-center">逐一解读命盘十二宫位的主星与含义</p>
                <button
                  onClick={() => palaces.start({ ziwei, name })}
                  className="px-5 py-2 bg-jade text-paper text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                  开始宫位解读
                </button>
              </div>
            ) : palaces.status === "done" ? (
              <PalacesView text={palaces.text} refs={palaces.refs} />
            ) : (
              <ReadingCard stream={palaces} skeleton="正在逐宫分析…" />
            )}
            <ValidationBadge status={palaces.validation} />
          </div>
        );

      case "decades":
        return (
          <div className="space-y-4">
            <SectionTitle accent="gold">大运解读</SectionTitle>
            {decades.status === "idle" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-ink-3">分析当前大限运势及下一大限预告</p>
                <button
                  onClick={() => decades.start(ziweiWithBirth)}
                  className="px-5 py-2 bg-vermillion text-white text-sm font-medium rounded-lg hover:bg-vermillion-h transition-colors">
                  开始大运分析
                </button>
              </div>
            ) : (
              <ReadingCard stream={decades} skeleton="正在分析大运…" />
            )}
            <ValidationBadge status={decades.validation} />
            {/* Per-year 流年 deep reading — moved here from the ziwei chart */}
            <FlowYearDetail ziwei={ziwei} birthYear={birthYear} name={name} />
          </div>
        );

      case "bazi":
        return (
          <div className="space-y-6">
            <SectionTitle accent="gold">八字命理 · 深度详批</SectionTitle>
            <ReadingCard stream={baziDeep} skeleton="正在深度排盘解八字…"
              onMount={() => baziDeep.status === "idle" && baziDeep.start(baziPayload)} />
            <BaziDecades bazi={bazi} name={name} gender={gender as "male" | "female"} />
            <HistoricalCases bazi={bazi} />
            <div className="pt-2 border-t border-parchment-2">
              <SectionTitle>各派视角 · 禄命法与盲派</SectionTitle>
              <p className="text-xs text-ink-3 mb-3">以子平法（B1）为主轴，以下补充两种历史流派的独特解读视角，供对照参考。</p>
              <ReadingCard stream={baziSchools} skeleton="正在调取禄命法与盲派视角…"
                onMount={() => baziSchools.status === "idle" && baziSchools.start({ bazi, gender })} />
            </div>
          </div>
        );

      case "dualschool":
        return (
          <div className="space-y-4">
            <SectionTitle>三合 vs 四化 · 双派比较</SectionTitle>
            {dualschool.status === "done" ? (
              <div>
                <OverviewDualView text={dualschool.text} refs={dualschool.refs} />
              </div>
            ) : (
              <ReadingCard stream={dualschool} skeleton="正在生成双派解读…"
                onMount={() => dualschool.status === "idle" && dualschool.start({ ziwei })} />
            )}
            <ValidationBadge status={dualschool.validation} />
          </div>
        );

      case "perspectives":
        return (
          <div className="space-y-4">
            <SectionTitle accent="gold">紫微三派详解</SectionTitle>
            {overview.status === "done" ? (
              <div>
                {/* mode="schools": only the 三合/四化/飞星/小众 派 cards — the 综合共识
                    conclusion lives solely in O2 (紫薇综合), so it isn't repeated here. */}
                <OverviewDualView text={overview.text} refs={overview.refs} mode="schools" />
                <ValidationBadge status={overview.validation} />
              </div>
            ) : overview.status === "error" ? (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{overview.errorMsg}</p>
                <button onClick={() => overview.start(ziweiPayload)} className="text-xs text-gold underline">重试</button>
              </div>
            ) : (
              <ReadingCard stream={overview} skeleton="正在生成三派详解…"
                onMount={() => overview.status === "idle" && overview.start(ziweiPayload)} />
            )}
          </div>
        );

      case "cautions":
        return (
          <div className="space-y-4">
            <SectionTitle accent="jade">特别注意 & 当前运势</SectionTitle>
            <ReadingCard stream={cautions} skeleton="正在分析注意事项…"
              onMount={() => cautions.status === "idle" && cautions.start(ziweiWithBirth)} />
          </div>
        );

    }
  }

  return (
    <div className="space-y-0">
      {/* Global progress while sections crunch */}
      {!allSettled && (
        <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border border-b-0 border-border-warm rounded-t-xl bg-paper-2">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-vermillion/20" />
            <div className="absolute inset-0 rounded-full border-2 border-vermillion border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-vermillion">命</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-ink-2">正在推算命盘各部分…</span>
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
      <div className={`flex border border-border-warm overflow-hidden bg-paper-2 sticky top-0 z-10 ${allSettled ? "rounded-t-xl" : "border-t-0"}`}>
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
      <div className="border border-t-0 border-border-warm rounded-b-xl bg-paper p-4 sm:p-5 min-h-[200px]">
        {TAB_INTRO[activeTab] && <TabIntro>{TAB_INTRO[activeTab]}</TabIntro>}
        {renderContent()}
      </div>

    </div>
  );
}
