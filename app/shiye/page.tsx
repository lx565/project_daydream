import type { Metadata } from "next";
import Link from "next/link";
import { SHIYE } from "@/lib/shiyeData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "官祿宮星曜詳解 · 事業與職業命理 — 命裡",
  description:
    "紫微在官祿宮、七殺在官祿宮、破軍在官祿宮……14顆主星坐官祿宮的完整事業解析。瞭解你的職業天賦、適合行業與事業發展軌跡。",
  openGraph: {
    title: "官祿宮星曜詳解 · 事業與職業命理 — 命裡",
    description: "14顆主星 × 官祿宮，職業天賦 · 適合行業 · 事業發展軌跡全解析。",
    url: "https://www.mingli.study/shiye",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/shiye" },
};

const FAQ = [
  {
    question: "官祿宮主星能決定我適合什麼職業嗎？",
    answer:
      "官祿宮主星是判斷職業方向的核心參考——它代表你事業能量的底色和天然傾向。但最終職業還需結合命宮主星（性格底色）、財帛宮（財運方向）以及八字的十神格局綜合來看。主星給你一個大方向，四化和大運決定什麼時候機遇來臨。",
  },
  {
    question: "官祿宮空宮（沒有主星）代表沒有事業心嗎？",
    answer:
      "不是。官祿宮空宮需借對宮（遷移宮）主星來看事業方向，往往意味著事業路徑更多元、不固化於一條路——許多跨界人士、斜槓青年的命盤裡都有官祿宮空宮。四化對空宮的影響比主星更關鍵。",
  },
  {
    question: "七殺或破軍在官祿宮是不是不好？",
    answer:
      "完全不是。七殺和破軍都是有強烈能量的主星，在官祿宮往往帶來出色的領導力、改革魄力和開拓精神。七殺適合軍警/競爭性行業/創業；破軍適合改革/非傳統行業。問題不在於「哪顆星好」，而在於你是否把這股能量用對了方向。",
  },
  {
    question: "怎麼判斷自己幾歲事業高峰？",
    answer:
      "事業高峰通常在大執行到官祿宮或其三方（命宮/財帛宮）且化權或化祿觸動的時期。流年化權入官祿是升職、擴張的訊號；流年化祿是順遂機遇的訊號。命裡 AI 會在大運解析時自動標註事業高峰期的時間視窗。",
  },
];

export default function ShiyeHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "官祿宮星曜", path: "/shiye" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="shiye" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-indigo-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            官祿宮星曜詳解
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            官祿宮決定了你事業能量的底色——這顆星坐在你的官祿宮，就是你職業發展的核心驅動力。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的官祿宮格局與事業運勢 →" />

        {/* Articles flat list */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-indigo-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              14 主星 × 官祿宮
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{SHIYE.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {SHIYE.map(e => (
              <Link
                key={e.urlSlug}
                href={`/shiye/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}在官祿宮</p>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-indigo-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-indigo-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的事業運勢" sub="AI 依據逾百部典籍，結合你的官祿宮主星與四化，分析你的職業天賦、適合行業與事業發展時機。" />
      </div>
    </main>
  );
}
