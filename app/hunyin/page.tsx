import type { Metadata } from "next";
import Link from "next/link";
import { HUNYIN } from "@/lib/hunyinData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "夫妻宮星曜詳解 · 婚姻與感情命理 — 命裡",
  description:
    "紫微在夫妻宮、貪狼在夫妻宮、七殺在夫妻宮……14顆主星坐夫妻宮的完整婚姻解析。瞭解配偶特質、感情模式與婚姻穩定度。",
  openGraph: {
    title: "夫妻宮星曜詳解 · 婚姻與感情命理 — 命裡",
    description: "14顆主星 × 夫妻宮，配偶特質 · 感情模式 · 婚姻穩定度全解析。",
    url: "https://www.mingli.study/hunyin",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/hunyin" },
};

const FAQ = [
  {
    question: "夫妻宮主星能決定我的配偶是什麼樣的人嗎？",
    answer:
      "夫妻宮主星是判斷配偶特質與感情模式的核心參考——它代表你婚姻能量的底色，以及你容易被哪類人吸引。但配偶的完整面貌還需結合命宮（你自身的性格）、福德宮（內心需求）以及八字日柱綜合判斷。主星給你配偶的基本輪廓，四化決定這段婚姻的實際走向。",
  },
  {
    question: "夫妻宮有煞星（七殺、破軍、廉貞）是不是感情不順？",
    answer:
      "不一定。七殺、破軍、廉貞在夫妻宮意味著感情能量強烈，配偶個性突出，婚姻道路比較有張力——這些都不等同於「不順」，而是對感情投入度和成熟度要求更高。很多感情充實、婚姻深厚的人命盤裡恰恰是這類格局。關鍵是大運流年的配合與個人的成熟度。",
  },
  {
    question: "夫妻宮空宮代表難以找到伴侶嗎？",
    answer:
      "不是。夫妻宮空宮需借對宮（官祿宮）主星來看婚姻方向，往往意味著婚姻路徑更靈活、不侷限於某一型別的配偶。四化入夫妻宮的力量比主星更決定性——化忌入夫妻才是需要留意的訊號，而非空宮本身。",
  },
  {
    question: "怎麼判斷自己什麼時候結婚最順？",
    answer:
      "婚姻的最佳時機通常在大執行經夫妻宮或其三方（命宮/福德宮）且化祿或化科觸動的時期。流年化祿入夫妻宮是感情順遂、婚緣到來的訊號；流年化忌入夫妻需要特別謹慎，避免在此年做重大婚姻決定。命裡 AI 會在大運解析時自動標註婚姻機遇的時間視窗。",
  },
];

export default function HunyinHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "夫妻宮星曜", path: "/hunyin" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="hunyin" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-rose-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            夫妻宮星曜詳解
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            夫妻宮決定了你婚姻能量的底色——這顆星坐在你的夫妻宮，就是你感情關係的核心模式。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的夫妻宮格局與婚姻運勢 →" />

        {/* Articles flat list */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-rose-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-rose-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              14 主星 × 夫妻宮
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{HUNYIN.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {HUNYIN.map(e => (
              <Link
                key={e.urlSlug}
                href={`/hunyin/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}在夫妻宮</p>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-rose-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-rose-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的婚姻運勢" sub="AI 依據逾百部典籍，結合你的夫妻宮主星與四化，分析你的配偶特質、感情模式與婚姻最佳時機。" />
      </div>
    </main>
  );
}
