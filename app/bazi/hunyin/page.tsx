import type { Metadata } from "next";
import Link from "next/link";
import { BAZI_HUNYIN } from "@/lib/baziHunyinData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";
import BaziCaseExamples from "@/components/BaziCaseExamples";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "八字看婚姻 · 配偶星 · 夫妻宮 · 正緣時機 — 命裡",
  description:
    "從八字看婚姻：男看財、女看官的配偶星，日支夫妻宮怎麼讀，桃花異性緣，正緣與結婚時機，婚姻穩定度與早晚婚。7篇八字論婚科普。",
  openGraph: {
    title: "八字看婚姻 · 配偶星 · 夫妻宮 · 正緣時機 — 命裡",
    description: "配偶星 · 日支夫妻宮 · 桃花 · 正緣時機 · 婚姻穩定度，從八字角度看你的感情婚姻。",
    url: "https://www.mingli.study/bazi/hunyin",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/bazi/hunyin" },
};

const FAQ = [
  {
    question: "八字怎麼看配偶？",
    answer:
      "八字看配偶有兩條主線：一是配偶星——男命以財星（正財偏財）為妻、女命以官殺（正官七殺）為夫，看這顆星的清濁、旺衰與遠近；二是夫妻宮——也就是日柱的地支（日支），看它坐什麼十神、是否被刑衝。兩者合參，才能較完整地看出配偶特質與婚姻狀態。",
  },
  {
    question: "八字裡沒有配偶星是不是不會結婚？",
    answer:
      "不是。命中無明顯配偶星不代表無婚姻，可以借日支（夫妻宮）、用神，以及大運流年補到配偶星的時段來看。很多人是在行運引動配偶星的大運裡成婚的。無配偶星更多意味著要看時機和後天經營，而非註定單身。",
  },
  {
    question: "官殺混雜、比劫奪財是不是一定婚姻不順？",
    answer:
      "這是傳統認為感情「容易有波折」的結構，但絕非「註定離婚」。官殺混雜（女命）喜合官留殺來清，比劫奪財（男命）喜官殺制比劫或食傷通關。很多穩定婚姻的八字也帶這些結構，關鍵在大運配合與兩人的相處經營。命理是提醒，不是判決。",
  },
  {
    question: "八字能算出我什麼時候結婚嗎？",
    answer:
      "算不出確切日期，但能指出婚緣較旺的時段——通常是大運流年引動配偶星、合住夫妻宮，或把命局補到位的年份；紅鸞天喜、桃花年可作輔助參考。配偶星或夫妻宮逢衝的年份則宜謹慎。命理標出機率較高的視窗，最終仍靠你自己的相遇與選擇。",
  },
];

export default function BaziHunyinHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: "八字看婚姻", path: "/bazi/hunyin" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="bazi" currentTitle="八字看婚姻" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 八字命理</p>
          <h1
            className="text-3xl font-bold text-fuchsia-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            八字看婚姻
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            從八字讀感情：男看財、女看官的配偶星，日支夫妻宮，桃花異性緣，正緣時機與婚姻穩定度——子平命理眼中的你的婚姻。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的八字 · AI 解析你的配偶星、夫妻宮與正緣時機 →" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-fuchsia-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-fuchsia-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字論婚 · {BAZI_HUNYIN.length} 篇
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">配偶星 · 夫妻宮 · 五行喜忌</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {BAZI_HUNYIN.map(e => (
              <Link
                key={e.urlSlug}
                href={`/bazi/hunyin/${e.urlSlug}`}
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

        <BaziCaseExamples domain="hunyin" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-fuchsia-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-fuchsia-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的八字婚姻" sub="AI 依據子平典籍，從你的配偶星、日支夫妻宮與大運流年，分析配偶特質、感情模式與正緣時機。" />
      </div>
    </main>
  );
}
