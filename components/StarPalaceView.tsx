import Link from "next/link";
import { PALACES } from "@/lib/starData";
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
}

export default function StarPalaceView({ star, palace, markdown, refs }: Props) {
  const hasContent = markdown.trim().length > 0;

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

        {/* Palace navigator */}
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

        <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />

      </div>
    </main>
  );
}
