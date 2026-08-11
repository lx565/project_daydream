import type { Metadata } from "next";
import Link from "next/link";
import { CAIYUN } from "@/lib/caiyunData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "財帛宮星曜詳解 · 財運與理財命理 — 命裡",
  description:
    "武曲在財帛宮、天府在財帛宮、破軍在財帛宮……14顆主星坐財帛宮的完整財運解析。瞭解你的進財方式、理財風格與財富積累路徑。",
  openGraph: {
    title: "財帛宮星曜詳解 · 財運與理財命理 — 命裡",
    description: "14顆主星坐財帛宮全解析 · 進財方式 · 理財風格 · 財富積累路徑。",
    url: "https://www.mingli.study/caiyun",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/caiyun" },
};

const FAQ = [
  {
    question: "財帛宮主星能決定我有多有錢嗎？",
    answer:
      "財帛宮主星決定的是你的財運底色——進財方式、理財風格和財富格局的方向，而非絕對金額。同一顆主星，因四化（化祿/權/科/忌）不同，財運表現差異極大。命宮與財帛宮的三方四正關係、大運流年的觸動，才是決定財運高低起伏的主要動態因素。",
  },
  {
    question: "財帛宮空宮（沒有主星）是不是財運差？",
    answer:
      "不是。財帛宮空宮需借對宮（官祿宮）主星來看財運方向，往往意味著財源多元、不固化於一條路——事業越好，財運就越好。空財帛宮的關鍵在四化：化祿入財帛的年份財運特別順，化忌則需特別謹慎理財。",
  },
  {
    question: "破軍在財帛宮是不是代表財運特別差？",
    answer:
      "不是。破軍代表「財來財去」而非無財——破軍財帛宮的人往往善於開拓新財源，早年起伏大，中晚年穩定後格局往往相當可觀。關鍵是不要把破財的週期理解為永久狀態，每一次的財務波動都是為下一次開拓積累經驗。",
  },
  {
    question: "怎麼看自己哪一年財運最旺？",
    answer:
      "財運最旺的訊號通常是：流年化祿入財帛宮、流年命宮化祿、大執行到財帛宮運程。這三者如果疊加（尤其是大運+流年雙祿），往往是收入最旺盛的時期。命裡 AI 會在流年解析時自動標註進財訊號。",
  },
];

export default function CaiyunHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "財運宮位", path: "/caiyun" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="caiyun" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-amber-600"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            財帛宮星曜詳解
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            財帛宮決定了你財運能量的底色——這顆星坐在你的財帛宮，就是你賺錢方式與財富格局的核心來源。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的財帛宮格局與財運走勢 →" />

        {/* Flat article list */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-600 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              十四主星 · 財帛宮
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{CAIYUN.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {CAIYUN.map(e => (
              <Link
                key={e.urlSlug}
                href={`/caiyun/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}在財帛宮</p>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-600 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的財運走勢" sub="AI 依據逾百部典籍，結合你的財帛宮主星與四化，分析你的進財方式、理財性格與財運高峰期。" />
      </div>
    </main>
  );
}
