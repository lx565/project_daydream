import type { Metadata } from "next";
import Link from "next/link";
import { STAR_ZODIAC_LIST, ZODIAC_ZIWEI_LIST } from "@/lib/personalityData";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微斗數 × 星座 性格對照 — 命裡",
  description: "命裡獨家研究：14顆紫微命宮主星與12星座的性格原型對照。一東一西，異曲同工——用你熟悉的星座，讀懂陌生的紫微主星。注意是原型類比，不是等同。",
  openGraph: {
    title: "紫微斗數 × 星座 性格對照 — 命裡",
    description: "紫微斗數主星與西方12星座的跨文化性格原型對照，命裡獨家研究。",
    url: "https://www.mingli.study/zodiac",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/zodiac" },
};

// Element colors keyed by zodiac slug — 火/土/風/水.
const ZODIAC_COLORS: Record<string, string> = {
  baiyang: "bg-vermillion-l text-vermillion border-vermillion/30",
  shizi: "bg-vermillion-l text-vermillion border-vermillion/30",
  sheshou: "bg-vermillion-l text-vermillion border-vermillion/30",
  jinniu: "bg-jade/10 text-jade border-jade/30",
  chunv: "bg-jade/10 text-jade border-jade/30",
  mojie: "bg-jade/10 text-jade border-jade/30",
  shuangzi: "bg-gold/10 text-gold border-gold/30",
  tiancheng: "bg-gold/10 text-gold border-gold/30",
  shuiping: "bg-gold/10 text-gold border-gold/30",
  juxie: "bg-jade/10 text-jade border-jade/30",
  tianxie: "bg-jade/10 text-jade border-jade/30",
  shuangyu: "bg-jade/10 text-jade border-jade/30",
};

export default function ZodiacPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "紫微×星座", path: "/zodiac" },
        ]),
        collectionPageSchema({
          name: "紫微斗數 × 星座 性格對照",
          description: "14顆紫微命宮主星與12星座的性格原型對照，一東一西、異曲同工，用你熟悉的星座讀懂陌生的紫微主星。",
          path: "/zodiac",
        }),
      ]} />
    <main className="min-h-screen bg-parchment">
      <LibraryNav category="zodiac" currentTitle="紫微×星座" />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-10">
        <div className="text-center pt-8 pb-2 space-y-3">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            紫微斗數 × 星座
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 獨家跨文化性格對照</p>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            一東一西，異曲同工——14顆命宮主星，對照西方12星座的性格原型，用你熟悉的星座讀懂陌生的紫微主星。
          </p>
        </div>

        <ToolCTA variant="slim" label="先排你的命盤，看命宮主星是誰 →" />

        {/* 主星 → 星座 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-vermillion rounded-full" />
            <h2 className="text-base font-bold text-ink">命宮主星 → 星座 對照</h2>
            <span className="text-xs text-ink-4">14 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed pl-4">
            你的命宮坐什麼星，性格原型就最像哪個星座。找到你的主星，看看西方星座裡像誰。
          </p>
          <div className="grid grid-cols-1 gap-3">
            {STAR_ZODIAC_LIST.map(entry => (
              <Link
                key={entry.slug}
                href={`/zodiac/${entry.slug}`}
                className="paper-card rounded-xl border border-border-warm p-4 hover:border-vermillion/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink group-hover:text-vermillion transition-colors">
                        {entry.starName}星命宮
                      </span>
                      <span className="text-ink-4 text-xs">×</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${ZODIAC_COLORS[entry.primaryZodiacSlug] ?? "bg-ink-5 text-ink-3 border-border-warm"}`}>
                        {entry.primaryZodiac}
                      </span>
                    </div>
                    <p className="text-xs text-ink-4 leading-relaxed line-clamp-2">{entry.brief}</p>
                  </div>
                  <span className="text-ink-4 text-sm shrink-0 group-hover:text-vermillion transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 星座 → 紫微 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-jade rounded-full" />
            <h2 className="text-base font-bold text-ink">12星座 → 紫微命盤</h2>
            <span className="text-xs text-ink-4">12 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed pl-4">
            知道自己的星座？來看看你的性格原型，在紫微斗數裡最像哪顆星。
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ZODIAC_ZIWEI_LIST.map(entry => (
              <Link
                key={entry.slug}
                href={`/zodiac/${entry.slug}`}
                className="paper-card rounded-xl border border-border-warm p-4 hover:border-jade/50 transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full border ${ZODIAC_COLORS[entry.zodiacSlug] ?? "bg-ink-5 text-ink-3 border-border-warm"}`}>
                      {entry.zodiacName}
                    </span>
                  </div>
                  <p className="text-xs text-ink-4">{entry.primaryStar}星</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-2">
          <p className="text-xs font-medium text-ink-3">關於這套對照體系</p>
          <p className="text-xs text-ink-4 leading-relaxed">
            紫微斗數的主星與西方星座沒有任何天文或歷史淵源，是兩套互不相干的系統。
            命裡這套對照做的是「性格原型類比」——用大家熟悉的星座當入口，去理解紫微主星的氣質底色，
            而不是說「紫微星就是獅子座」。兩者是異曲同工，不是同一回事；結合著看，自我認知會更立體。
          </p>
        </div>
      </div>
    </main>
    </>
  );
}
