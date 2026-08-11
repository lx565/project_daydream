import type { Metadata } from "next";
import Link from "next/link";
import { BAZI_CAIYUN } from "@/lib/baziCaiyunData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";
import BaziCaseExamples from "@/components/BaziCaseExamples";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "八字看財運 · 正財偏財 · 財格 · 發財時機 — 命裡",
  description:
    "從八字看財運：正財與偏財的區別，財格與身財平衡，適合的求財方式，發財時機，破財與守財，投資還是儲蓄，如何改善財運。7篇八字論財科普。",
  openGraph: {
    title: "八字看財運 · 正財偏財 · 財格 · 發財時機 — 命裡",
    description: "正財偏財 · 身財兩旺 · 求財方式 · 發財時機 · 守財之道，從八字看你的財運。",
    url: "https://www.mingli.study/bazi/caiyun",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/bazi/caiyun" },
};

const FAQ = [
  {
    question: "八字裡財星越多越有錢嗎？",
    answer:
      "不是。真正能聚財的是「身能任財」——你本身的力量（日主旺衰）扛得起這份財。身財兩旺才是富格；財星再多而身弱扛不住，反而是「財多身弱，富屋貧人」，見財難取、為財奔勞。看財之多寡要看財星，看財之得失要看身能否任財。",
  },
  {
    question: "正財和偏財有什麼區別？",
    answer:
      "正財是與日主陰陽相異的財，主穩定、正當、計劃內的收入——工資、本業、租金，性質踏實可守；偏財是與日主陰陽相同的財，主流動、偏門、意外、眾人之財——投資、副業、生意週轉，來去快、格局大者善經營。兩者本無高下，看身能否任、是否為用。",
  },
  {
    question: "為什麼我很會賺錢卻存不住？",
    answer:
      "這往往是「比劫奪財」的結構——比肩劫財太旺，把財星克掉、分掉，表現為財來財去、被人分利、合夥破耗、衝動消費。守財之道是借官殺制比劫，或用食傷通關把比劫之力導向生財；現實層面則要明算賬、慎合夥、控消費。這是結構性的財務提示，可經營化解。",
  },
  {
    question: "八字能看出什麼時候發財嗎？",
    answer:
      "能大致定位。發財時機的核心是「財星或食傷為用 × 身能任財 × 大運引動」三者俱備：身旺行財運、行食傷生財運時財源大開；財多身弱者則要行印比幫身運、擔得起財時才是真正的聚財期。行比劫奪財運、忌神運多主破財，宜守。命理標出機率較高的視窗，仍需理性決策。",
  },
];

export default function BaziCaiyunHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: "八字看財運", path: "/bazi/caiyun" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="bazi" currentTitle="八字看財運" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 八字命理</p>
          <h1
            className="text-3xl font-bold text-amber-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            八字看財運
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            從八字讀財運：正財偏財之別，身財兩旺的富格，求財方式，發財時機，破財與守財，以及如何順用神改善財運。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的八字 · AI 解析你的財格、求財方式與發財大運 →" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字論財 · {BAZI_CAIYUN.length} 篇
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">正偏財 · 身財平衡 · 用神調候</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {BAZI_CAIYUN.map(e => (
              <Link
                key={e.urlSlug}
                href={`/bazi/caiyun/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.title}</p>
                <p className="text-[11px] text-ink-4 leading-relaxed">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        <BaziCaseExamples domain="caiyun" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的八字財運" sub="AI 依據子平典籍，從你的財格、身財關係與大運流年，分析求財方式、發財時機與守財之道。" />
      </div>
    </main>
  );
}
