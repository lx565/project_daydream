import Link from "next/link";
import type { MinggeEntry } from "@/lib/minggeData";
import type { Reference } from "@/lib/rag";
import type { ZiweiResult } from "@/lib/ziwei";
import SeoMarkdown from "./SeoMarkdown";
import VoteWidget from "./VoteWidget";
import ToolCTA from "./ToolCTA";
import ZiweiChart from "./ZiweiChart";
import LibraryNav from "./LibraryNav";
import LikeButton from "./LikeButton";

const TYPE_COLOR: Record<MinggeEntry["type"], string> = {
  吉格: "bg-jade/10 text-jade border-jade/30",
  兇格: "bg-vermillion-l text-vermillion border-vermillion/30",
  特殊: "bg-gold/10 text-gold border-gold/30",
};

interface Props {
  entry: MinggeEntry;
  markdown: string;
  refs: Reference[];
  chartData?: ZiweiResult;
  chartGender?: "male" | "female";
  chartLabel?: string;
}

export default function MinggeView({ entry, markdown, refs, chartData, chartGender, chartLabel }: Props) {
  const hasContent = markdown.trim().length > 0;

  return (
    <main className="min-h-screen bg-parchment">
      {/* Library navigation bar */}
      <LibraryNav category="mingge" currentTitle={entry.name} />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

        {/* Hero */}
        <div className="text-center pt-8 pb-4 space-y-2">
          <h1
            className="text-4xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.15em" }}
          >
            {entry.name}
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">紫微斗數 · 命格詳解</p>
          <div className="flex items-center gap-3 justify-center pt-1">
            <div className="h-px w-16 bg-vermillion/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
            <div className="h-px w-16 bg-vermillion/20" />
          </div>
        </div>

        {/* Summary card */}
        <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-bold text-ink">{entry.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${TYPE_COLOR[entry.type]}`}>
              {entry.type}
            </span>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">{entry.brief}</p>
          {entry.stars.length > 0 && (
            <div className="border-t border-border-light pt-3 flex flex-wrap gap-1.5">
              {entry.stars.map(s => (
                <span key={s} className="text-[11px] bg-paper-2 border border-border-light text-ink-3 px-2 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sample ziwei chart */}
        {chartData && chartData.palaces.length > 0 && chartGender && (
          <div className="paper-card rounded-2xl border border-border-warm overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border-light flex items-center justify-between">
              <div>
                <p className="text-[11px] text-ink-4 tracking-widest uppercase flex items-center gap-2">
                  <span className="w-px h-3 bg-gold inline-block" />
                  <span className="text-gold">示例命盤</span>
                </p>
                {chartLabel && (
                  <p className="text-[11px] text-ink-4 mt-0.5">{chartLabel} · 格局驗證盤</p>
                )}
              </div>
            </div>
            <div className="px-5 py-4">
              <ZiweiChart
                palaces={chartData.palaces}
                soulPalace={chartData.soulPalace}
                bodyPalace={chartData.bodyPalace}
                fiveElementsClass={chartData.fiveElementsClass}
                mainStar={chartData.mainStar}
                bodyStar={chartData.bodyStar}
                gender={chartGender}
                isExample={true}
              />
            </div>
          </div>
        )}

        {/* Early CTA */}
        <ToolCTA variant="slim" label="看看你的命盤是否有此格局 · AI 詳批專屬命格 →" />

        {/* Article */}
        {hasContent && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
            <SeoMarkdown>{markdown}</SeoMarkdown>
          </div>
        )}

        {/* Quality badge */}
        <div className="flex items-start gap-2.5 bg-paper-2/60 border border-border-light rounded-xl px-4 py-3">
          <div className="mt-0.5 w-4 h-4 rounded-full bg-jade/15 flex items-center justify-center shrink-0">
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="#4a7c59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-ink-3 font-medium">多模型交叉審校</p>
            <p className="text-[11px] text-ink-4 leading-relaxed">
              本文內容經 Gemini · Claude · DeepSeek 三大模型多輪交叉稽核與驗證，確保命理準確性，力求為你呈現高質量的格局解讀。
            </p>
          </div>
        </div>

        {/* Refs */}
        {refs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-ink-4 font-medium">參考典籍</p>
            <div className="flex flex-wrap gap-2">
              {refs.map((ref, i) => (
                <span
                  key={i}
                  className="text-[11px] text-ink-4 bg-paper-2 border border-border-light px-2 py-0.5 rounded"
                >
                  {ref.school} · {ref.book}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-ink-4/80 leading-relaxed">
              以上解讀由命裡 AI 綜合典籍整理，僅供參考。
            </p>
          </div>
        )}

        <VoteWidget />

        {/* Main CTA */}
        <LikeButton />
        <ToolCTA
          variant="card"
          sub={`以上為通論。你命盤中是否具備${entry.name}的入格條件？AI 綜合三派典籍，根據你的完整命盤給出專屬解讀。`}
          label="生成我的命盤詳批"
        />

        {/* Navigator — other 命格 */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">更多格局</p>
          <Link
            href="/mingge"
            className="text-xs px-3 py-1.5 rounded-lg border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors inline-block"
          >
            檢視全部 31 個格局 →
          </Link>
        </div>

        <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />
      </div>
    </main>
  );
}
