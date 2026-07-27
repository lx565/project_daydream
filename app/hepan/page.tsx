import type { Metadata } from "next";
import Link from "next/link";
import HepanFlow from "@/components/HepanFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微雙人合盤 · 免費測兩人緣分契合度 — 命裡",
  description:
    "免費紫微斗數雙人合盤，輸入兩人出生資訊，即刻測算緣分指數、夫妻宮契合度、八字五行互補與相處之道。支援情侶、夫妻、朋友、親子、兄弟姐妹五種關係合盤。",
  keywords: ["紫微雙人合盤", "雙人合盤免費", "紫微斗數合盤", "情侶合盤", "八字合盤", "緣分測試", "夫妻宮合盤"],
  openGraph: {
    title: "紫微雙人合盤 · 免費測兩人緣分契合度 — 命裡",
    description:
      "輸入兩人出生資訊，免費測算緣分指數、夫妻宮契合度與相處之道。情侶 · 夫妻 · 朋友 · 親子 · 兄弟姐妹五種關係合盤。",
    url: "https://www.mingli.study/hepan",
    siteName: "命裡",
    locale: "zh_CN",
    type: "website",
  },
  alternates: { canonical: "https://www.mingli.study/hepan" },
};

const FAQ = [
  {
    question: "什麼是紫微雙人合盤？",
    answer:
      "雙人合盤是把兩個人的紫微斗數命盤與八字放在一起對照，分析彼此的緣分深淺、性情契合、感情模式與相處之道。命裡通過雙方的夫妻宮星曜、日主生克、五行互補結構與地支合衝，給出一個可量化的緣分指數與逐項解讀，幫助你理解這段關係的底色與經營方向。",
  },
  {
    question: "雙人合盤需要提供什麼資訊？",
    answer:
      "只需要兩個人的出生日期、出生時辰與性別。出生時辰越準確，夫妻宮與命宮的定位越精準，合盤結果也越可靠。不需要姓名，稱呼可留空。雙方資訊僅用於本次推算，不會被儲存。",
  },
  {
    question: "紫微雙人合盤免費嗎？",
    answer:
      "緣分指數四維得分與「緣分一瞥」免費預覽完全免費，輸入兩人資訊即可檢視。更深入的完整合盤解讀（含飛化互入、合盤三方四正、緣分時機、相處之道與可分享緣分卡片）為付費內容。",
  },
  {
    question: "合盤可以測哪些關係？",
    answer:
      "支援五種關係型別：情侶戀人、夫妻、朋友閨蜜、兄弟姐妹、親子。每種關係的分析側重不同——情侶談吸引力與穩定度，夫妻談家庭運與白頭到老，朋友談默契與互補，親子談親緣深度與教養契合，不會套用同一套模板。",
  },
  {
    question: "合盤結果準確嗎？依據是什麼？",
    answer:
      "緣分指數由確定性演算法根據雙方命盤資料計算（日主生克、五行互補、夫妻宮星曜、生肖與地支合衝），同一對命盤每次結果一致、不會隨機波動。AI 解讀則嚴格基於兩張真實排盤展開，並參考逾百部命理典籍，不會憑空杜撰星曜落宮。合盤揭示的是緣分的傾向與經營方向，最終關係仍取決於兩人的用心，請理性看待。",
  },
];

export default function HepanPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "紫微雙人合盤", path: "/hepan" },
        ]),
        faqSchema(FAQ),
      ]} />

      {/* max-w-3xl (not 2xl) so the two side-by-side birth forms in HepanFlow get
          ~370px each — about phone width — instead of a cramped ~328px. */}
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 返回首頁
        </Link>

        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 合盤</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-wide">紫微雙人合盤</h1>
          <p className="text-sm text-ink-3 leading-relaxed max-w-xl mx-auto">
            輸入兩人出生資訊，免費測算<strong className="text-ink-2">緣分指數</strong>與
            <strong className="text-ink-2">夫妻宮契合度</strong>，一眼看清你們的相處底色。
            支援情侶、夫妻、朋友、親子、兄弟姐妹五種關係合盤。
          </p>
        </header>

        {/* SEO content — above the form: entering TWO people's birth details is a
            heavy ask, so the value has to be clear before the input burden. */}
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink tracking-wide">雙人合盤看什麼？</h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              命裡的紫微雙人合盤從三個層次解讀一段關係：先獨立看甲方在這段關係中的模式，再獨立看乙方，
              最後兩盤合觀，找出彼此的契合點、張力所在與相處之道，並結合雙方當前大運點出緣分的高峰期與考驗階段。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "緣分指數四維", d: "根據關係型別量身計算吸引力、默契度、穩定度、成長潛力等四個維度，確定性演算法，結果穩定可分享。" },
              { t: "夫妻宮對照", d: "解析雙方夫妻宮主星與四化、感情星強弱，看你們容易被彼此哪一面吸引、相處模式如何。" },
              { t: "八字緣分結構", d: "日主生克、五行互補、天干合化、地支合衝、生肖三合六合，揭示先天緣分的深淺。" },
              { t: "飛化互入與時機", d: "一方的星曜落入對方命盤哪個宮、彼此牽動哪些領域，並結合大運給出經營這段關係的時間視窗。" },
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
          <HepanFlow />
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
          想先看自己的命盤？<Link href="/" className="text-vermillion hover:underline">測個人紫微命盤 →</Link>
        </p>
      </div>
    </main>
  );
}
