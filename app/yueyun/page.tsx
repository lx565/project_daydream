import type { Metadata } from "next";
import Link from "next/link";
import MonthlyFortuneFlow from "@/components/MonthlyFortuneFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微逐月運勢 · 未來12個月每月詳批 — 命裡",
  description:
    "紫微斗數逐月運勢，輸入出生資訊，免費檢視未來12個月運勢總覽與本月短評。付費解鎖每月流月命宮、四化落點與可操作建議的完整逐月詳批，只要 $1.99。",
  keywords: ["紫微逐月運勢", "每月運勢預測", "流月運勢", "紫微斗數流月", "2026年運勢逐月", "月運勢"],
  openGraph: {
    title: "紫微逐月運勢 · 未來12個月每月詳批 — 命裡",
    description:
      "輸入出生資訊，免費檢視未來12個月運勢總覽，付費解鎖每月完整詳批，只要 $1.99。",
    url: "https://www.mingli.study/yueyun",
    siteName: "命裡",
    locale: "zh_TW",
    type: "website",
  },
  alternates: { canonical: "https://www.mingli.study/yueyun" },
};

const FAQ = [
  {
    question: "什麼是紫微逐月運勢？",
    answer:
      "逐月運勢是把紫微斗數的流月推算，逐一套用在接下來12個月的每一個月上，分析每個月的流月命宮落在本命哪個宮位、當月四化落點、流耀與三方四正會照，給出該月的機遇、需留意之處與一條可操作建議。比起只看年度大方向的流年運勢，逐月運勢更聚焦在「這個月」與「下個月」具體會發生什麼。",
  },
  {
    question: "逐月運勢需要提供什麼資訊？",
    answer:
      "只需要出生日期、出生時辰與性別。出生時辰越準確，流月命宮的定位越精準。不需要姓名，稱呼可留空。資訊僅用於本次推算，不會被儲存。",
  },
  {
    question: "逐月運勢免費嗎？",
    answer:
      "未來12個月的運勢總覽格（綜合運、事業財、感情緣三項評分與主題）與本月的免費短評完全免費，輸入出生資訊即可檢視。完整的12個月逐月詳批（每月約130字，涵蓋流月命宮星曜、四化落點與具體建議）為付費內容，一次 $1.99 解鎖全部12個月，永久保存可重複查閱。",
  },
  {
    question: "逐月運勢跟命裡其他產品有什麼不同？",
    answer:
      "命裡的完整命書（$6.99）涵蓋十二宮位、大運流年、紫微＋八字雙系統與問命追問，是全面的命盤解讀。逐月運勢（$1.99）是更聚焦、更輕量的獨立產品，只看紫微斗數的未來12個月逐月細節，適合只想知道「接下來這一年每個月會發生什麼」的人。兩者是完全獨立的購買，互不影響。",
  },
  {
    question: "逐月運勢的推算依據是什麼？",
    answer:
      "運勢總覽格由確定性演算法根據流月四化是否落入命宮、財帛、官祿、夫妻、疾厄等關鍵宮位計算，同一張命盤每次結果一致、不會隨機波動。付費的逐月詳批則由AI根據每月真實的流月命宮、四化與三方四正資料撰寫，並參考命理典籍，不會憑空杜撰星曜落宮。命理揭示的是運勢傾向，請理性看待，僅供學習參考與娛樂。",
  },
];

export default function YueYunPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "紫微逐月運勢", path: "/yueyun" },
        ]),
        faqSchema(FAQ),
      ]} />

      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 返回首頁
        </Link>

        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 逐月運勢</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-wide">紫微逐月運勢</h1>
          <p className="text-sm text-ink-3 leading-relaxed max-w-xl mx-auto">
            輸入出生資訊，免費檢視<strong className="text-ink-2">未來12個月運勢總覽</strong>與
            <strong className="text-ink-2">本月免費短評</strong>，一眼看清接下來每個月的機遇與需留意之處。
          </p>
        </header>

        {/* SEO content — above the form: the value (12 months, this specific) has
            to be clear before asking for birth details. */}
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink tracking-wide">逐月運勢看什麼？</h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              命裡的逐月運勢把紫微斗數的流月推算逐一套用在接下來12個月的每一個月，
              聚焦「這個月」與「下個月」具體會發生什麼，而不只是年度大方向。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "12個月運勢總覽", d: "每月綜合運、事業財、感情緣三項評分與一句主題，確定性演算法，結果穩定、完全免費。" },
              { t: "流月命宮", d: "解析每個月流月命宮落在本命哪個宮位、該宮星曜組合，看這個月的重心落在哪裡。" },
              { t: "流月四化", d: "每月化祿、化權、化科、化忌各自的落點，具體點出機遇所在與需留意之處。" },
              { t: "三方四正會照", d: "每月流月命宮的對宮、財帛位、官祿位與會照星曜，完整還原當月的運勢結構。" },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border-warm bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink mb-1">{c.t}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive flow */}
        <section className="paper-card rounded-2xl border border-border-warm p-5 sm:p-6">
          <MonthlyFortuneFlow />
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink tracking-wide">常見問題</h2>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.question} className="rounded-xl border border-border-warm bg-paper p-4 group">
                <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                  {f.question}
                  <span className="text-vermillion text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-xs text-ink-3 leading-relaxed mt-2.5">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-ink-4 pt-2">
          想看完整命書？<Link href="/" className="text-vermillion hover:underline">測個人紫微命盤 →</Link>
        </p>
      </div>
    </main>
  );
}
