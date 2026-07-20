import type { Metadata } from "next";
import Link from "next/link";
import { BAZI_JIBING } from "@/lib/baziJibingData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "八字看健康安全 · 五行五臟 · 養生方向 — 命裡",
  description:
    "從八字看健康：五行對應五臟（金肺木肝水腎火心土脾），忌神與需關注的健康方向，意外安全提醒，流年保養預警，五行失衡，養生方向。7篇溫和、負責任的八字健康科普，重在預防與調養。",
  openGraph: {
    title: "八字看健康安全 · 五行五臟 · 養生方向 — 命裡",
    description: "五行配五臟 · 忌神 · 養生方向 · 安全防範，從八字看你需要多留意保養的方向（非醫學診斷）。",
    url: "https://www.mingli.study/bazi/jibing",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/bazi/jibing" },
};

const FAQ = [
  {
    question: "八字和健康有什麼關係？",
    answer:
      "傳統命理沿用中醫的五行配五臟：木對應肝、火對應心、土對應脾、金對應肺、水對應腎。命局裡哪個五行偏弱或被嚴重剋制，對應的臟腑就是先天相對需要多留意保養的環節。這是「體質傾向」的提示，幫你知道往哪個方向養護，並非醫學診斷，任何不適都應及時就醫。",
  },
  {
    question: "八字裡有「忌神」「七殺」「羊刃」是不是會生病或出意外？",
    answer:
      "不是。忌神所屬臟腑是相對需要多關注的方向；七殺無制、羊刃旺、刑衝多是傳統提示「注意安全」的訊號——意思是開車、運動、用器械、情緒衝突時多一分小心。它們是「提醒加強防範」，絕不是預言疾病或災禍。命理不應制造恐懼，真正決定健康與安全的是日常的好習慣。",
  },
  {
    question: "八字能算出我會得什麼病嗎？",
    answer:
      "不能，也不應該。八字只能從五行平衡提示「哪些方面值得多留意保養」，不能預言具體疾病。它的價值在於提醒你有針對性地保養、規律作息、定期體檢。健康受飲食、運動、醫療等眾多後天因素影響，命理只是一個關注方向的輔助參考，絕不能替代現代醫療。",
  },
  {
    question: "知道自己五行偏弱後能做什麼？",
    answer:
      "可以順著用神調候來養生：命局偏寒宜溫養、偏燥宜清潤；薄弱五行對應的臟腑有針對性地照顧（如木弱護肝目、水弱補腎氣）；再配合情緒管理（五行對應五志）。本質就是把命理方向轉化為均衡的飲食、作息、運動與情緒習慣——溫和可落地，不誇大功效。",
  },
];

export default function BaziJibingHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: "八字看健康安全", path: "/bazi/jibing" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="bazi" currentTitle="八字看健康安全" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 八字命理</p>
          <h1
            className="text-3xl font-bold text-emerald-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            八字看健康安全
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            從八字讀體質：五行對應五臟，哪個臟腑先天偏弱，養生該往哪個方向走，以及如何把傳統訊號轉成日常的保養與安全習慣。重在預防調養，非醫學診斷。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的八字 · AI 解析你的五行體質與養生方向 →" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-emerald-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字論健康 · {BAZI_JIBING.length} 篇
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">五行五臟 · 用神調候 · 養生</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {BAZI_JIBING.map(e => (
              <Link
                key={e.urlSlug}
                href={`/bazi/jibing/${e.urlSlug}`}
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

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-emerald-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的八字型質" sub="AI 依據子平與五行養生理路，從你的五行強弱與用神，分析先天體質傾向與可落地的養生方向。僅供保健參考，非醫學診斷。" />
      </div>
    </main>
  );
}
