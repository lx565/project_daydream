"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import ZiweiChart from "./ZiweiChart";
import PaywallLock from "./PaywallLock";
import ChatInterface from "./ChatInterface";
import BugReportButton from "./BugReportButton";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { getRelationshipConfig, type RelationshipType } from "@/lib/coupleTypes";
import { useSSEStream } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";
import { parseModernBlocks } from "@/lib/modernBlocks";
import { extractSection, removeSection } from "@/lib/extractSection";

export interface HepanCharts {
  baziA: BaziResult; ziweiA: ZiweiResult;
  baziB: BaziResult; ziweiB: ZiweiResult;
  nameA?: string; nameB?: string;
  genderA: "male" | "female"; genderB: "male" | "female";
  sessionId: string;
  relType: RelationshipType;
}

const COUPLE_INCLUDED = [
  "各自解讀 · 雙方獨立命盤解讀",
  "合盤綫析 · 紫微＋八字雙系統",
  "飛化互入 · 彼此牽動的領域",
  "緣分時機 · 高峰與考驗階段",
  "相處之道 · 具體可行建議",
  "問合盤 · 追問深入分析",
  "可分享緣分卡片 · 一鍵複製分享",
];

// ── Score card ──────────────────────────────────────────────────────────────

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

function DimRow({ label, score }: { label: string; score: number }) {
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
    </div>
  );
}

// ── Reading renderers ─────────────────────────────────────────────────────────

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-vermillion [&_li]:before:font-bold";

function ModernBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-xl border border-sky-200/80 overflow-hidden bg-sky-50/40">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left gap-2 hover:bg-sky-50/60 transition-colors">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />現代視角
        </span>
        <span className={`text-sky-400 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-sky-900/80 leading-relaxed border-t border-sky-100">
          <Md>{content}</Md>
        </div>
      )}
    </div>
  );
}

function ReadingText({ text }: { text: string }) {
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
        {copied ? "已複製 ✓" : "複製 · 分享給朋友"}
      </button>
    </div>
  );
}

// Splits off the "### 分享卡片" block; stripHeading additionally removes a named
// section (already surfaced in its own tab, e.g. "緣分時機") from the body.
function FullReading({ text, stripHeading }: { text: string; stripHeading?: string }) {
  const marker = "### 分享卡片";
  const idx = text.indexOf(marker);
  let body = idx >= 0 ? text.slice(0, idx) : text;
  if (stripHeading) body = removeSection(body, stripHeading);
  const card = idx >= 0 ? text.slice(idx + marker.length).trim() : "";
  return (
    <div className="space-y-4">
      <ReadingText text={body} />
      {card && <ShareCard text={card} />}
    </div>
  );
}

const LOADING_STEPS = ["正在讀取雙方夫妻宮星曜…", "檢索典籍參考…", "分析八字緣分結構…", "生成合盤解讀…"];

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

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "solo" | "analysis" | "timing" | "chat";

const TABS: { id: Tab; label: string; char: string }[] = [
  { id: "overview", label: "總覽", char: "緣" },
  { id: "solo", label: "各自", char: "個" },
  { id: "analysis", label: "綫析", char: "合" },
  { id: "timing", label: "時機", char: "時" },
  { id: "chat", label: "問合盤", char: "問" },
];

const FREE_TABS = new Set<Tab>(["overview"]);

// ── Main component ───────────────────────────────────────────────────────────

export default function HepanResultView({ charts, onReset }: { charts: HepanCharts; onReset: () => void }) {
  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, sessionId, relType } = charts;
  const cfg = getRelationshipConfig(relType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const coupleChartId = `hepan_${sessionId}`;
  const paywall = usePaywall(coupleChartId);
  const gated = paywall.enabled && !paywall.unlocked;
  const isLocked = (tab: Tab) => gated && !FREE_TABS.has(tab);

  const body = { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType: cfg.key };
  const soloBodyA = { ziwei: ziweiA, bazi: baziA, gender: genderA, name: nameA };
  const soloBodyB = { ziwei: ziweiB, bazi: baziB, gender: genderB, name: nameB };

  // Free teaser — always runs.
  const preview = useSSEStream("/api/reading/couple/preview", `${coupleChartId}_preview`);
  useEffect(() => {
    if (preview.status === "idle") preview.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paid streams — only start once unlocked. synthesisA/B reuse the exact solo
  // route+payload shape WizardFlow.tsx uses (validate:true matches solo's own
  // usage of this route, so "reuse existing solo logic" is faithful, not partial).
  const synthesisA = useSSEStream("/api/reading/synthesis", `${coupleChartId}_synthesisA`, { validate: true });
  const synthesisB = useSSEStream("/api/reading/synthesis", `${coupleChartId}_synthesisB`, { validate: true });
  const coupleFull = useSSEStream("/api/reading/couple", `${coupleChartId}_full`);
  const baziCoupleFull = useSSEStream("/api/reading/bazi-couple", `${coupleChartId}_bazifull`);

  useEffect(() => {
    if (paywall.loading || gated) return;
    if (synthesisA.status === "idle") synthesisA.start(soloBodyA);
    if (synthesisB.status === "idle") synthesisB.start(soloBodyB);
    if (coupleFull.status === "idle") coupleFull.start(body);
    if (baziCoupleFull.status === "idle") baziCoupleFull.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  const coupleContext = `合盤追問 — ${labelA}（${baziA.summary}）與 ${labelB}（${baziB.summary}）。請專注於兩人之間的感情互動、相處模式與具體建議。`;

  function renderContent() {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="paper-card rounded-2xl border border-border-warm p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 bg-vermillion rounded-full" />
                <h2 className="text-base font-bold text-ink tracking-wide">合盤緣分指數</h2>
              </div>
              <p className="text-xs text-ink-4 mb-4 pl-3">
                {cfg.label} · {cfg.shareLabel}：<span className="text-vermillion font-medium">{score.label}</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <ScoreRing score={score.total} color={score.color} />
                  <span className="text-sm font-bold tracking-widest mt-1" style={{ color: score.color }}>{score.label}</span>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {score.dims.map((d) => <DimRow key={d.name} label={d.name} score={d.score} />)}
                </div>
              </div>
              <p className="text-[10px] text-ink-4 mt-4 text-center leading-relaxed">
                合盤指數基於五行結構、日主關係與{cfg.palaces[0] ?? "夫妻"}宮星曜，僅供參考，緣分深淺因人而異
              </p>
            </div>

            <div>
              <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
                <span className="w-px h-3 bg-vermillion inline-block" />
                <span className="text-vermillion">緣分一瞥 · 免費預覽</span>
              </p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(preview.status === "streaming" || preview.status === "idle") && <LoadingSkeleton />}
                {preview.status === "done" && <div className="animate-fade-in"><ReadingText text={preview.text} /></div>}
                {preview.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{preview.errorMsg}</p>
                    <button onClick={() => preview.start(body)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "solo":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelA}</p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(synthesisA.status === "streaming" || synthesisA.status === "idle") && <LoadingSkeleton />}
                {synthesisA.status === "done" && <div className="animate-fade-in"><ReadingText text={synthesisA.text} /></div>}
                {synthesisA.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{synthesisA.errorMsg}</p>
                    <button onClick={() => synthesisA.start(soloBodyA)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelB}</p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(synthesisB.status === "streaming" || synthesisB.status === "idle") && <LoadingSkeleton />}
                {synthesisB.status === "done" && <div className="animate-fade-in"><ReadingText text={synthesisB.text} /></div>}
                {synthesisB.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{synthesisB.errorMsg}</p>
                    <button onClick={() => synthesisB.start(soloBodyB)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "analysis":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
                <span className="w-px h-3 bg-vermillion inline-block" />
                <span className="text-vermillion">紫微合盤</span>
              </p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(coupleFull.status === "streaming" || coupleFull.status === "idle") && <LoadingSkeleton />}
                {coupleFull.status === "done" && <div className="animate-fade-in"><FullReading text={coupleFull.text} stripHeading="緣分時機" /></div>}
                {coupleFull.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{coupleFull.errorMsg}</p>
                    <button onClick={() => coupleFull.start(body)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
                <span className="w-px h-3 bg-vermillion inline-block" />
                <span className="text-vermillion">八字合盤</span>
              </p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(baziCoupleFull.status === "streaming" || baziCoupleFull.status === "idle") && <LoadingSkeleton />}
                {baziCoupleFull.status === "done" && <div className="animate-fade-in"><FullReading text={baziCoupleFull.text} stripHeading="大運時機" /></div>}
                {baziCoupleFull.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{baziCoupleFull.errorMsg}</p>
                    <button onClick={() => baziCoupleFull.start(body)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "timing": {
        const ziweiTiming = coupleFull.status === "done" ? extractSection(coupleFull.text, "緣分時機") : "";
        const baziTiming = baziCoupleFull.status === "done" ? extractSection(baziCoupleFull.text, "大運時機") : "";
        const stillLoading = coupleFull.status === "idle" || coupleFull.status === "streaming" ||
          baziCoupleFull.status === "idle" || baziCoupleFull.status === "streaming";
        return (
          <div className="space-y-4">
            <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
              <span className="w-px h-3 bg-vermillion inline-block" />
              <span className="text-vermillion">緣分時機</span>
            </p>
            <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5 space-y-4">
              {stillLoading && <LoadingSkeleton />}
              {!stillLoading && (
                <>
                  {coupleFull.status === "error" && (
                    <div className="space-y-2">
                      <p className="text-sm text-vermillion">{coupleFull.errorMsg}</p>
                      <button onClick={() => coupleFull.start(body)} className="text-xs text-gold underline">重試</button>
                    </div>
                  )}
                  {ziweiTiming && (
                    <div>
                      <p className="text-xs font-semibold text-ink-2 mb-1.5">紫微視角</p>
                      <ReadingText text={ziweiTiming} />
                    </div>
                  )}
                  {baziCoupleFull.status === "error" && (
                    <div className="space-y-2 pt-2 border-t border-border-light">
                      <p className="text-sm text-vermillion">{baziCoupleFull.errorMsg}</p>
                      <button onClick={() => baziCoupleFull.start(body)} className="text-xs text-gold underline">重試</button>
                    </div>
                  )}
                  {baziTiming && (
                    <div className="pt-2 border-t border-border-light">
                      <p className="text-xs font-semibold text-ink-2 mb-1.5 mt-2">八字視角</p>
                      <ReadingText text={baziTiming} />
                    </div>
                  )}
                  {coupleFull.status === "done" && baziCoupleFull.status === "done" && !ziweiTiming && !baziTiming && (
                    <p className="text-sm text-ink-4">本次未取得時機分析，可至「綫析」頁查看完整解讀。</p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }

      case "chat":
        return (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            <ChatInterface
              ziwei={ziweiA}
              partnerZiwei={ziweiB}
              initialContext={coupleContext}
              placeholder="問關於兩人的問題，如：我們的相處難點是什麼？如何化解？"
              chartId={coupleChartId}
              maxQuestions={10}
            />
          </div>
        );
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      <button onClick={onReset}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      <div className="flex border border-border-warm overflow-hidden bg-paper-2 rounded-t-xl">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 min-w-0 flex flex-col items-center py-2.5 px-0.5 border-r last:border-r-0 border-border-light transition-all duration-200 ${
              activeTab === tab.id ? "bg-vermillion text-paper" : "text-ink-3 hover:bg-paper hover:text-ink"
            }`}>
            {isLocked(tab.id) && (
              <span className={`absolute top-1 right-1 text-[10px] leading-none ${activeTab === tab.id ? "opacity-90" : "opacity-80"}`}>🔒</span>
            )}
            <span className={`text-xs font-bold leading-none ${activeTab === tab.id ? "text-paper/70" : "text-ink-4"}`}>{tab.char}</span>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="border border-t-0 border-border-warm rounded-b-xl bg-paper p-4 sm:p-5 min-h-[200px] mb-6">
        {isLocked(activeTab) ? (
          <PaywallLock chartId={coupleChartId} sectionLabel={TABS.find((t) => t.id === activeTab)?.label} included={COUPLE_INCLUDED} />
        ) : renderContent()}
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-xs text-ink-4 tracking-widest uppercase px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-ink-4 inline-block" />雙方命盤
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelA}</p>
            <ZiweiChart
              palaces={ziweiA.palaces} soulPalace={ziweiA.soulPalace} bodyPalace={ziweiA.bodyPalace}
              fiveElementsClass={ziweiA.fiveElementsClass} mainStar={ziweiA.mainStar} bodyStar={ziweiA.bodyStar}
              name={nameA} gender={genderA}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelB}</p>
            <ZiweiChart
              palaces={ziweiB.palaces} soulPalace={ziweiB.soulPalace} bodyPalace={ziweiB.bodyPalace}
              fiveElementsClass={ziweiB.fiveElementsClass} mainStar={ziweiB.mainStar} bodyStar={ziweiB.bodyStar}
              name={nameB} gender={genderB}
            />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-ink-4 pb-4">
        僅供學習參考與娛樂，請理性看待，切勿迷信 ·{" "}
        <Link href="/" className="text-vermillion hover:underline">測個人命盤 →</Link>
      </p>

      <BugReportButton sessionId={coupleChartId} page="hepan" />
    </div>
  );
}
