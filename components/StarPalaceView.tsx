import Link from "next/link";
import { PALACES, MAJOR_STARS } from "@/lib/starData";
import type { Reference } from "@/lib/rag";
import SeoMarkdown from "./SeoMarkdown";
import VoteWidget from "./VoteWidget";
import ToolCTA from "./ToolCTA";
import LibraryNav from "./LibraryNav";
import LikeButton from "./LikeButton";

interface StarShape {
  name: string;
  urlSlug: string;
  element: string;
  polarity: string;
  brief: string;
}

type PalaceDef = (typeof PALACES)[number];

interface Props {
  star: StarShape;
  palace: PalaceDef;
  markdown: string;
  refs: Reference[];
  faq: { question: string; answer: string }[];
}

export default function StarPalaceView({ star, palace, markdown, refs, faq }: Props) {
  const hasContent = markdown.trim().length > 0;
  const starBrief = star.brief.replace(/。+$/, "");
  const oneLineAnswer = `${starBrief}，入${palace.name}：${palace.brief}。`;

  return (
    <main className="min-h-screen bg-parchment">
      <LibraryNav category="star" currentTitle={`${star.name}在${palace.name}`} />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

        {/* Hero */}
        <div className="text-center pt-8 pb-4 space-y-2">
          <h1
            className="text-4xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.15em" }}
          >
            {star.name}在{palace.name}
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">紫微斗數 · 命裡解讀</p>
          <div className="flex items-center gap-3 justify-center pt-1">
            <div className="h-px w-16 bg-vermillion/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
            <div className="h-px w-16 bg-vermillion/20" />
          </div>
        </div>

        {/* Answer box — direct one-sentence answer before the reader has to read past anything */}
        <div className="paper-card rounded-2xl border-2 border-vermillion/30 bg-vermillion-l/40 p-4">
          <p className="text-xs text-vermillion font-bold tracking-widest mb-1.5">一句話</p>
          <p className="text-sm text-ink font-medium leading-[1.8]">{oneLineAnswer}</p>
        </div>

        {/* Star + palace summary card */}
        <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink">{star.name} · {star.polarity}</p>
              <p className="text-xs text-ink-3 mt-0.5">五行屬{star.element}</p>
            </div>
            <span className="text-xs bg-vermillion-l text-vermillion px-2 py-0.5 rounded-full shrink-0">
              {star.element}
            </span>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">{star.brief}</p>
          <div className="border-t border-border-light pt-3">
            <p className="text-xs text-ink-4 font-medium mb-1">落於{palace.name}</p>
            <p className="text-sm text-ink-2 leading-relaxed">{palace.brief}</p>
          </div>
        </div>

        <ToolCTA variant="slim" label={`這只是通論 · AI 詳批${star.name}在你命盤中的真實作用 →`} />

        {hasContent && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
            <SeoMarkdown>{markdown}</SeoMarkdown>
          </div>
        )}

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

        <LikeButton />
        <ToolCTA
          variant="card"
          sub={`以上為通論。你命盤中的${star.name}落於何宮、廟旺或落陷、是否帶四化？AI 綜合三派典籍，為你詳批專屬命格。`}
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

        {/* Palace navigator — same star across the 12 palaces */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">{star.name}在其他宮位</p>
          <div className="flex flex-wrap gap-2">
            {PALACES.map(p => (
              <Link
                key={p.name}
                href={`/star/${star.urlSlug}/${p.urlSlug}`}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  p.name === palace.name
                    ? "bg-vermillion text-white border-vermillion"
                    : "border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion"
                }`}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Star navigator — the 14 major stars in THIS palace (horizontal axis;
            complements the palace navigator's vertical axis so every star×palace
            page reaches its full row and column of siblings). */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">其他主星在{palace.name}</p>
          <div className="flex flex-wrap gap-2">
            {MAJOR_STARS.map(s => (
              <Link
                key={s.urlSlug}
                href={`/star/${s.urlSlug}/${palace.urlSlug}`}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  s.name === star.name
                    ? "bg-vermillion text-white border-vermillion"
                    : "border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Up-links to the two hubs this article sits under */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/star/${star.urlSlug}`}
            className="px-3 py-1.5 rounded-lg border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
          >
            {star.name}星總覽 →
          </Link>
          <Link
            href={`/palace/${palace.urlSlug}`}
            className="px-3 py-1.5 rounded-lg border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
          >
            {palace.name}總覽 →
          </Link>
        </div>

        <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />

      </div>
    </main>
  );
}
