import Link from "next/link";
import type { GuideTopic } from "@/lib/guideTopics";
import type { Reference } from "@/lib/rag";
import { MAJOR_STARS, PALACES } from "@/lib/starData";
import SeoMarkdown from "./SeoMarkdown";
import VoteWidget from "./VoteWidget";
import ToolCTA from "./ToolCTA";
import LibraryNav from "./LibraryNav";
import LikeButton from "./LikeButton";

interface Props {
  topic: GuideTopic;
  /** Synthesized, reader-friendly Chinese markdown (empty if synthesis unavailable). */
  markdown: string;
  refs: Reference[];
  allTopics: Pick<GuideTopic, "slug" | "urlSlug" | "title">[];
}

export default function GuideView({ topic, markdown, refs, allTopics }: Props) {
  const hasContent = markdown.trim().length > 0;
  const relatedTopics = allTopics.filter(t => topic.related.includes(t.slug));

  return (
    <main className="min-h-screen bg-parchment">
      {/* Library navigation bar */}
      <LibraryNav category="guide" currentTitle={topic.title} />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

        {/* Hero */}
        <div className="text-center pt-8 pb-4 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion leading-snug"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            {topic.title}
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">{topic.subtitle}</p>
          <div className="flex items-center gap-3 justify-center pt-1">
            <div className="h-px w-16 bg-vermillion/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
            <div className="h-px w-16 bg-vermillion/20" />
          </div>
        </div>

        {/* Intro */}
        <div className="paper-card rounded-2xl border border-border-warm p-5">
          <p className="text-sm text-ink-2 leading-[1.9]">{topic.intro}</p>
        </div>

        {/* Early CTA */}
        <ToolCTA variant="slim" label="懂了理論 · 讓 AI 用三派典籍詳批你自己的命盤 →" />

        {/* Synthesized article */}
        {hasContent && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
            <SeoMarkdown>{markdown}</SeoMarkdown>
          </div>
        )}

        {/* Systematic walkthrough: 十二宮 → every palace hub */}
        {topic.slug === "十二宮" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-vermillion rounded-full" />
              <h2 className="text-sm font-bold text-ink tracking-wide">逐一瞭解十二宮</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PALACES.map(p => (
                <Link
                  key={p.name}
                  href={`/palace/${p.urlSlug}`}
                  className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 space-y-1 block"
                >
                  <p className="text-sm font-bold text-ink">{p.name}</p>
                  <p className="text-[11px] text-ink-4 leading-relaxed">{p.brief}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Systematic walkthrough: 主星總覽 → every star overview */}
        {topic.slug === "主星總覽" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-vermillion rounded-full" />
              <h2 className="text-sm font-bold text-ink tracking-wide">逐一瞭解十四主星</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MAJOR_STARS.map(s => (
                <Link
                  key={s.name}
                  href={`/star/${s.urlSlug}`}
                  className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 space-y-1 block"
                >
                  <p className="text-sm font-bold text-ink">{s.name}</p>
                  <p className="text-[11px] text-ink-4 leading-relaxed">{s.polarity} · 五行屬{s.element}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

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
              本文由命裡 AI 綜合典籍整理，僅供學習參考。
            </p>
          </div>
        )}

        {/* Helpfulness vote */}
        <VoteWidget />

        {/* Main CTA */}
        <LikeButton />
        <ToolCTA variant="card" sub="理論之外，更要看你自己的盤。三合、四化、飛星三派合參，AI 依據逾百部典籍為你詳批命格、大限與流年。" label="生成我的命盤詳批" />


        {/* Related guides */}
        {relatedTopics.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-ink-4 font-medium">相關內容</p>
            <div className="grid grid-cols-2 gap-2">
              {relatedTopics.map(t => (
                <Link
                  key={t.slug}
                  href={`/guide/${t.urlSlug}`}
                  className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-vermillion/40 hover:text-vermillion transition-colors"
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Final CTA */}
        <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />

      </div>
    </main>
  );
}
