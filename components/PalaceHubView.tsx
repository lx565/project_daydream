import Link from "next/link";
import { MAJOR_STARS, PALACES } from "@/lib/starData";
import type { Reference } from "@/lib/rag";
import SeoMarkdown from "./SeoMarkdown";
import VoteWidget from "./VoteWidget";
import ToolCTA from "./ToolCTA";
import LibraryNav from "./LibraryNav";
import LikeButton from "./LikeButton";

type PalaceDef = typeof PALACES[number];

interface Props {
  palace: PalaceDef;
  markdown: string;
  refs: Reference[];
  faq: { question: string; answer: string }[];
}

export default function PalaceHubView({ palace, markdown, refs, faq }: Props) {
  const hasContent = markdown.trim().length > 0;

  return (
    <main className="min-h-screen bg-parchment">
      <LibraryNav category="palace" currentTitle={palace.name} />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

        {/* Hero */}
        <div className="text-center pt-8 pb-4 space-y-2">
          <h1
            className="text-4xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.15em" }}
          >
            {palace.name}
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">紫微斗數十二宮 · 命裡詳解</p>
          <div className="flex items-center gap-3 justify-center pt-1">
            <div className="h-px w-16 bg-vermillion/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
            <div className="h-px w-16 bg-vermillion/20" />
          </div>
        </div>

        {/* Palace summary */}
        <div className="paper-card rounded-2xl border border-border-warm p-5">
          <p className="text-sm text-ink-2 leading-relaxed">{palace.brief}</p>
        </div>

        {/* Early CTA */}
        <ToolCTA variant="slim" label={`這只是通論 · AI 詳批你的${palace.name}究竟由哪顆星主宰 →`} />

        {/* Synthesized overview */}
        {hasContent && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
            <SeoMarkdown>{markdown}</SeoMarkdown>
          </div>
        )}

        {/* 14 star detail links */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-vermillion rounded-full" />
            <h2 className="text-sm font-bold text-ink tracking-wide">
              十四主星在{palace.name}（點選看詳解）
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MAJOR_STARS.map(s => (
              <Link
                key={s.name}
                href={`/star/${s.urlSlug}/${palace.urlSlug}`}
                className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 space-y-1 block"
              >
                <p className="text-sm font-bold text-ink">{s.name}在{palace.name}</p>
                <p className="text-[11px] text-ink-4 leading-relaxed">{s.polarity} · 五行屬{s.element}</p>
              </Link>
            ))}
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
              以上由命裡 AI 綜合典籍整理，僅供參考。
            </p>
          </div>
        )}

        {/* Helpfulness vote */}
        <VoteWidget />

        {/* Main CTA */}
        <LikeButton />
        <ToolCTA
          variant="card"
          sub={`以上為${palace.name}通論。你的${palace.name}由哪顆主星坐守、四化與煞吉如何牽動？AI 綜合三派典籍為你詳批。`}
          label="生成我的命盤詳批"
        />

        {/* FAQ */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">常見問題</p>
          <div className="space-y-2">
            {faq.map(item => (
              <details
                key={item.question}
                className="paper-card rounded-xl border border-border-warm px-4 py-3 group"
              >
                <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>{item.question}</span>
                  <span className="text-ink-4 text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-xs text-ink-3 leading-relaxed pt-2.5">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Other palaces */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">其他宮位</p>
          <div className="flex flex-wrap gap-2">
            {PALACES.filter(p => p.name !== palace.name).map(p => (
              <Link
                key={p.name}
                href={`/palace/${p.urlSlug}`}
                className="text-xs px-3 py-1 rounded-full border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />

      </div>
    </main>
  );
}
