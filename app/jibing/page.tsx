import type { Metadata } from "next";
import Link from "next/link";
import { JIBING } from "@/lib/jibingData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "疾厄宮星曜詳解 · 體質與健康命理 — 命裡",
  description:
    "廉貞在疾厄宮、七殺在疾厄宮、破軍在疾厄宮……14顆主星坐疾厄宮的體質特徵與健康方向完整解析。瞭解先天體質優勢、需要關注的健康方向與養生建議。",
  openGraph: {
    title: "疾厄宮星曜詳解 · 體質與健康命理 — 命裡",
    description: "14顆主星 × 疾厄宮 · 體質特徵 · 健康注意方向 · 養生建議，用命盤讀懂先天體質底色。",
    url: "https://www.mingli.study/jibing",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/jibing" },
};

const FAQ = [
  {
    question: "疾厄宮能預測我會得什麼病嗎？",
    answer:
      "紫微斗數的疾厄宮不是精準醫學診斷，而是指出先天體質的偏向——某些系統天生較強或較弱，某些型別的健康挑戰機率略高。這不代表一定會生病，而是告訴你「這些方向值得主動關注和調養」。現代人的健康深受生活方式影響，命盤只是參考底色。",
  },
  {
    question: "疾厄宮有兇星（廉貞/火星/鈴星/七殺）是不是代表命不好？",
    answer:
      "完全不是。疾厄宮有強烈主星或煞星，代表這個人的身體能量比較「強烈」——可能意味著更強的意志力和恢復能力，也可能意味著某些方向需要特別呵護。很多健康長壽的人，疾厄宮都有強星或煞星——關鍵是用對了養生方向。",
  },
  {
    question: "疾厄宮化忌是當年一定會生病嗎？",
    answer:
      "不是。疾厄宮化忌代表當年身體需要更多關注和維護，是提醒你主動體檢、注意作息、避免過勞的訊號，而非預言生病。如果你提前做好預防（體檢、調整生活方式），化忌的影響往往只是「感到疲憊或小病」，而非大病。",
  },
  {
    question: "怎麼知道自己哪些年要特別注意身體？",
    answer:
      "主要訊號：流年化忌入疾厄宮（最直接）、大執行到疾厄宮運程（該10年的體質較脆弱）、煞星在流年內觸動疾厄宮或命宮。這幾個訊號疊加出現的年份，是最需要主動做健康檢查的時期。命裡 AI 會在大運和流年解析中標註健康預警訊號。",
  },
];

export default function JibingHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "疾厄宮星曜", path: "/jibing" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="jibing" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-teal-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            疾厄宮星曜詳解
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            疾厄宮是命盤中最容易被忽視但最值得關注的宮位——它告訴你先天體質的優劣、需要關注的健康方向，以及如何通過了解自己來做到預防重於治療。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的疾厄宮格局與體質特徵 →" />

        {/* Articles flat list */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-teal-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-teal-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              14顆主星 × 疾厄宮
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{JIBING.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {JIBING.map(e => (
              <Link
                key={e.urlSlug}
                href={`/jibing/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}在疾厄宮</p>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-teal-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-teal-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              常見問題
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ.map(item => (
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

        <ToolCTA
          variant="card"
          label="解析我的體質與健康方向"
          sub="AI 依據逾百部典籍，結合你的疾厄宮主星與四化，分析你的先天體質特徵、需要關注的健康方向與養生調理建議。"
        />
      </div>
    </main>
  );
}
