"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { useSSEStream } from "@/lib/useSSEStream";
import { parseModernBlocks } from "@/lib/modernBlocks";
import ZiweiChart from "./ZiweiChart";
import ChatInterface from "./ChatInterface";
import ShareButton from "@/app/result/ShareButton";

interface Props {
  baziA: BaziResult; ziweiA: ZiweiResult; nameA?: string; genderA: "male" | "female";
  baziB: BaziResult; ziweiB: ZiweiResult; nameB?: string; genderB: "male" | "female";
  sessionId: string;
  relationshipType?: string;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e0d6" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 60 60)" />
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
      {desc && <p className="text-[11px] text-ink-4 leading-relaxed">{desc}</p>}
    </div>
  );
}

const LOADING_STEPS = ["正在读取夫妻宫星曜…", "检索典籍参考…", "分析八字缘分结构…", "生成合盘解读…"];

function CoupleLoadingSkeleton() {
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

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-vermillion [&_li]:before:font-bold";

function ModernBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-xl border border-sky-200/80 overflow-hidden bg-sky-50/40">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left gap-2 hover:bg-sky-50/60 transition-colors">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />现代视角
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

function CoupleReadingText({ text }: { text: string }) {
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

// Splits the share-card block (after "### 分享卡片") out of the full reading and
// renders it as a copyable card for 小红书 sharing.
function CoupleFullReading({ text }: { text: string }) {
  const marker = "### 分享卡片";
  const idx = text.indexOf(marker);
  const body = idx >= 0 ? text.slice(0, idx) : text;
  const card = idx >= 0 ? text.slice(idx + marker.length).trim() : "";
  return (
    <div className="space-y-4">
      <CoupleReadingText text={body} />
      {card && <ShareCard text={card} />}
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
        {copied ? "已复制 ✓" : "复制 · 分享到小红书"}
      </button>
    </div>
  );
}

export default function CoupleResultView({ baziA, ziweiA, nameA, genderA, baziB, ziweiB, nameB, genderB, sessionId, relationshipType }: Props) {
  const cfg = getRelationshipConfig(relationshipType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const coupleChartId = `${sessionId}_couple`;
  const full = useSSEStream("/api/reading/couple", coupleChartId);

  // 合盘免费 — single reading call, auto-start on mount.
  useEffect(() => {
    if (full.status === "idle") {
      full.start({ baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType: cfg.key });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coupleContext = `合盘追问 — ${labelA}（${baziA.summary}）与 ${labelB}（${baziB.summary}）。请专注于两人之间的感情互动、相处模式与具体建议。`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新推算
      </Link>

      {/* Score card */}
      <div className="paper-card rounded-2xl border border-border-warm p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-vermillion rounded-full" />
          <h2 className="text-base font-bold text-ink tracking-wide">合盘缘分指数</h2>
        </div>
        <p className="text-xs text-ink-4 mb-4 pl-3">
          {cfg.label} · {cfg.shareLabel}：<span className="text-vermillion font-medium">{score.label}</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing score={score.total} color={score.color} />
            <span className="text-sm font-bold tracking-widest mt-1" style={{ color: score.color }}>
              {score.label}
            </span>
          </div>

          <div className="flex-1 w-full space-y-3">
            {score.dims.map((d) => (
              <DimRow key={d.name} label={d.name} score={d.score} desc="" />
            ))}
          </div>
        </div>

        <p className="text-[10px] text-ink-4 mt-4 text-center leading-relaxed">
          合盘指数基于五行结构、日主关系与夫妻宫星曜，仅供参考，缘分深浅因人而异
        </p>
      </div>

      {/* 合盘 AI 解读 — 免费 */}
      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">合盘 AI 解读</span>
        </p>
        <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
          {(full.status === "streaming" || full.status === "idle") && <CoupleLoadingSkeleton />}
          {full.status === "done" && <div className="animate-fade-in"><CoupleFullReading text={full.text} /></div>}
          {full.status === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-vermillion">{full.errorMsg}</p>
              <button
                onClick={() => full.start({ baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType: cfg.key })}
                className="text-xs text-gold underline">重试</button>
            </div>
          )}
        </div>
      </div>

      {/* Two charts side-by-side */}
      <div className="space-y-4">
        <p className="text-xs text-ink-4 tracking-widest uppercase px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-ink-4 inline-block" />双方命盘
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

      {/* Follow-up Q&A */}
      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">追问 · 深入分析</span>
        </p>
        <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
          <ChatInterface
            ziwei={ziweiA}
            partnerZiwei={ziweiB}
            initialContext={coupleContext}
            placeholder="问关于两人的问题，如：我们的相处难点是什么？如何化解？"
          />
        </div>
      </div>

      {/* Share */}
      <div className="paper-card rounded-2xl border border-border-warm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">分享合盘结果</p>
          <p className="text-xs text-ink-4 mt-0.5">复制链接给对方</p>
        </div>
        <ShareButton />
      </div>

      <p className="text-center text-xs text-ink-4 pb-4">
        仅供学习参考与娱乐，请理性看待，切勿迷信
      </p>
    </div>
  );
}
