import type { Metadata } from "next";
import Link from "next/link";
import { LIUNIAN } from "@/lib/liuNianData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "流年運勢 · 命盤年份解析 — 命裡",
  description:
    "流年怎麼看、流年命宮化忌是什麼意思、流年財運事業運健康運怎麼判斷……紫微斗數流年推算完整解析，讀懂每一年的能量走向與課題方向。",
  openGraph: {
    title: "流年運勢 · 命盤年份解析 — 命裡",
    description: "流年命宮 · 流年四化 · 大運與流年疊加，用命盤讀懂今年的重心與課題。",
    url: "https://www.mingli.study/liunian",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/liunian" },
};

const FAQ = [
  {
    question: "流年和大運有什麼區別？",
    answer:
      "大運是約10年一個週期的底色運勢，由節氣與性別決定；流年是每一年（以農曆年干支為基準）對命盤的短期影響。大運決定這段時期的整體走向，流年在大運框架內決定當年的具體觸發——就像大運是氣候，流年是天氣。判斷當年運勢，要先看大運背景再看流年細節。",
  },
  {
    question: "流年化忌一定代表這一年不好嗎？",
    answer:
      "不是。流年化忌代表當年某個宮位（事業/財運/感情等）是重點課題方向，需要比平時多花心力，但未必等於壞事發生。化忌更像是一個提示燈：這裡需要你認真對待。若大運走勢好、且命盤整體格局穩健，單一流年化忌的影響通常是有限的。",
  },
  {
    question: "怎麼知道自己今年的流年命宮在哪裡？",
    answer:
      "用今年的年支（如2025年為巳年）在你的出生命盤上逆布十二宮，找到流年命宮所在的位置。不同生年的人，流年命宮落在不同的原盤宮位。命裡 AI 在排盤後會自動標註當年的流年命宮位置與四化落點，無需手動對照。",
  },
  {
    question: "流年運勢對哪些人影響最大？",
    answer:
      "一般來說，流年影響最顯著的情況是：(1) 流年化忌與生年化忌疊加在同一宮位（忌上加忌）；(2) 流年命宮落在生年命宮（整體人生重心當年再次聚焦）；(3) 流年四化同時觸動三方四正中的多個宮位。這些情況下當年的運勢變化往往更明顯、更具體。",
  },
];

const KIND_LABELS: Record<string, string> = {
  jichu: "基礎入門",
  gongwei: "宮位流年",
  sihua: "四化流年",
};

const KINDS = ["jichu", "gongwei", "sihua"] as const;

export default function LiuNianHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "流年運勢", path: "/liunian" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="liunian" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-amber-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            流年運勢
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            每一年都有它自己的能量走向——通過流年推算，讀懂今年的重心與課題，比盲目等待結果更有價值。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的流年運勢走向 →" />

        {/* Articles by kind */}
        {KINDS.map(kind => {
          const items = LIUNIAN.filter(e => e.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind} className="space-y-3">
              <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
                <div className="w-1.5 h-5 bg-amber-600 rounded-full self-center" />
                <h2 className="text-lg font-bold text-amber-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
                  {KIND_LABELS[kind]}
                </h2>
                <span className="ml-auto text-[11px] text-ink-4">{items.length} 篇</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {items.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/liunian/${e.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                    <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-600 rounded-full self-center" />
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

        <ToolCTA variant="card" label="解析我的流年運勢" sub="AI 依據逾百部典籍，結合你的命盤格局分析當年的重點宮位與四化變化，給出具體的流年判斷。" />
      </div>
    </main>
  );
}
