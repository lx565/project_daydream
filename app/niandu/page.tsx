import type { Metadata } from "next";
import Link from "next/link";
import NianduFlow from "@/components/NianduFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微年度解讀 · 今年關鍵提醒 — 命裡",
  description:
    "紫微斗數年度解讀，輸入出生資訊，免費檢視今年的四化訊號總覽。付費解鎖完整年度關鍵提醒——感情、事業、財務、貴人逐一展開，只要 $1.99。",
  keywords: ["紫微年度解讀", "今年運勢", "流年四化", "紫微斗數流年", "2026年運勢", "年度運勢"],
  openGraph: {
    title: "紫微年度解讀 · 今年關鍵提醒 — 命裡",
    description:
      "輸入出生資訊，免費檢視今年四化訊號總覽，付費解鎖完整年度關鍵提醒，只要 $1.99。",
    url: "https://www.mingli.study/niandu",
    siteName: "命裡",
    locale: "zh_TW",
    type: "website",
  },
  alternates: { canonical: "https://www.mingli.study/niandu" },
};

const FAQ = [
  {
    question: "什麼是紫微年度解讀？",
    answer:
      "年度解讀把紫微斗數的流年四化推算套用在今年，找出化祿、化權、化科、化忌分別落在命盤的哪一宮，對應到感情、事業、財務、健康、貴人等具體生活領域，逐一說明機遇與需留意之處，並附可操作建議。比起泛泛而談的「今日運勢」，年度解讀的每一句提醒都能回推到命盤上一個具體的星曜落點。",
  },
  {
    question: "年度解讀需要提供什麼資訊？",
    answer: "只需要出生日期、出生時辰與性別。出生時辰越準確，命宮定位越精準。不需要姓名，稱呼可留空。資訊僅用於本次推算，不會被儲存。",
  },
  {
    question: "年度解讀免費嗎？",
    answer:
      "今年四化訊號總覽（列出所有落點與對應領域）與一句話免費短評完全免費，輸入出生資訊即可檢視。完整的年度關鍵提醒（逐一展開每個訊號，涵蓋落點、影響與具體建議）為付費內容，一次 $1.99 解鎖，永久保存可重複查閱。",
  },
  {
    question: "年度解讀跟命裡其他產品有什麼不同？",
    answer:
      "命裡的完整命書（$6.99）涵蓋十二宮位、大運流年、紫微＋八字雙系統與問命追問，是全面的命盤解讀。年度解讀（$1.99）是更聚焦、更輕量的獨立產品，只看今年的四化關鍵提醒，適合只想知道「今年要注意什麼」的人。兩者是完全獨立的購買，互不影響。",
  },
  {
    question: "年度解讀的推算依據是什麼？",
    answer:
      "四化訊號總覽由確定性演算法根據今年四化星是否落入命盤主星所在宮位計算，同一張命盤每次結果一致、不會隨機波動。付費的完整提醒則由AI根據真實的四化落點資料撰寫，並參考命理典籍，不會憑空杜撰星曜落宮。命理揭示的是運勢傾向，請理性看待，僅供學習參考與娛樂。",
  },
];

export default function NianduPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "紫微年度解讀", path: "/niandu" },
        ]),
        faqSchema(FAQ),
      ]} />

      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 返回首頁
        </Link>

        <header className="text-center space-y-3">
          <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 年度解讀</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-wide">紫微年度解讀</h1>
          <p className="text-sm text-ink-3 leading-relaxed max-w-xl mx-auto">
            輸入出生資訊，免費檢視<strong className="text-ink-2">今年四化訊號總覽</strong>與
            <strong className="text-ink-2">一句話免費短評</strong>，一眼看清今年真正需要留意的事。
          </p>
        </header>

        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink tracking-wide">年度解讀看什麼？</h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              命裡的年度解讀把紫微斗數的流年四化推算套用在今年，
              只講真正值得放在心上的幾件事，不是「本週水逆」那種通用文案。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "四化訊號總覽", d: "今年化祿、化權、化科、化忌分別落在命盤哪一宮，確定性演算法，結果穩定、完全免費。" },
              { t: "對應具體領域", d: "每個訊號對應到感情、事業、財務、健康、貴人等具體生活領域，不是空泛的吉凶論斷。" },
              { t: "逐一展開提醒", d: "每個訊號的具體影響與一條可操作建議，化忌如實提醒不迴避，化祿化權說明怎麼把握。" },
              { t: "命理典籍佐證", d: "AI 依據真實的四化落點資料與上百部命理典籍撰寫，不會憑空杜撰星曜落宮。" },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border-warm bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink mb-1">{c.t}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="paper-card rounded-2xl border border-border-warm p-5 sm:p-6">
          <NianduFlow />
        </section>

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
