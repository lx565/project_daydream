import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "八字雙人合盤 · 免費測兩人緣分契合度 — 命裡",
  description:
    "免費八字雙人合盤，輸入兩人出生資訊，測算日主五行生克、干支合衝刑害、五行互補結構與大運時機。純子平八字視角，深度解讀兩人緣分底色與相處之道。",
  keywords: ["八字合盤", "八字雙人合盤免費", "八字合盤緣分", "子平合盤", "日主合盤", "八字配對", "干支合衝"],
  openGraph: {
    title: "八字雙人合盤 · 免費測兩人緣分契合度 — 命裡",
    description:
      "輸入兩人出生資訊，從純八字視角測算日主生克、干支合衝、五行互補與大運時機，深度解讀緣分結構。",
    url: "https://www.mingli.study/bazihepan",
    siteName: "命裡",
    locale: "zh_TW",
    type: "website",
  },
  alternates: { canonical: "https://www.mingli.study/bazihepan" },
};

const FAQ = [
  {
    question: "八字雙人合盤和紫微合盤有什麼區別？",
    answer:
      "兩者都是雙人緣分分析，但視角完全不同。紫微合盤以宮位星曜為主，看夫妻宮飛化互入、命盤能量互動；八字合盤則完全在子平框架內，聚焦日主五行生克（你是木命、對方是火命這樣的生扶關係）、四柱天干合化（甲己合土等）、地支三合六沖三刑、以及雙方大運交匯的時機。兩者互補，八字看先天緣分底色，紫微看命盤能量互動。",
  },
  {
    question: "什麼是日主相見？為什麼重要？",
    answer:
      "日主是八字中日柱的天干，代表這個人的「本我」。兩人相遇，實質上是兩個日主的相遇。日主之間的五行生克關係（木生火、水克火等）決定了相處的底色：生扶關係帶來滋養與支持，比肩同氣帶來共鳴，克制關係帶來磨合與張力。這是最底層的緣分結構，紫微合盤較難直接揭示這一點。",
  },
  {
    question: "八字合盤免費嗎？",
    answer:
      "日主緣分指數與「緣分一瞥」免費預覽完全免費，輸入兩人資訊即可查看。完整的八字合盤解讀（含日主詳解、天干合化分析、地支合衝刑害、五行互補匹配、大運時機與可分享緣分卡片）為付費內容。",
  },
  {
    question: "八字合盤需要出生時辰嗎？",
    answer:
      "時辰決定八字的時柱，影響時干與時支的合衝分析，建議填寫。若確實不知，可選「未知時辰」，合盤仍可基於其餘三柱（年月日）給出大部分結果，只是時柱的干支分析會留白。",
  },
  {
    question: "八字合盤的指數準確嗎？",
    answer:
      "緣分指數由確定性演算法計算（日主五行生克、干支合衝統計、五行分布互補），同一對命盤每次結果一致。AI解讀則嚴格依據雙方實際四柱展開，參考百部命理典籍。合盤揭示的是先天緣分傾向，真正的關係仍取決於兩人的用心，請理性看待。",
  },
];

export default function BaziHepanPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "八字雙人合盤", path: "/bazihepan" },
        ]),
        faqSchema(FAQ),
      ]} />

      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 返回首頁
        </Link>

        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs text-vermillion tracking-[0.3em] uppercase">子平八字 · 合盤</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-wide">八字雙人合盤</h1>
          <p className="text-sm text-ink-3 leading-relaxed max-w-xl mx-auto">
            從純八字視角深度解讀兩人緣分——
            <strong className="text-ink-2">日主五行生克</strong>、
            <strong className="text-ink-2">干支合衝刑害</strong>、
            <strong className="text-ink-2">五行互補結構</strong>與大運時機，
            比緣分指數更貼近子平命理本義。
          </p>
          <p className="text-xs text-ink-4">
            測紫微合盤？→{" "}
            <Link href="/hepan" className="text-vermillion hover:underline">紫微雙人合盤</Link>
          </p>
        </header>

        {/* CTA into the unified /hepan flow — 八字合盤 is now part of the same
            5-tab experience there, this page keeps its SEO content only. */}
        <section className="paper-card rounded-2xl border border-border-warm p-6 sm:p-8 text-center space-y-4">
          <p className="text-sm text-ink-3 leading-relaxed max-w-md mx-auto">
            八字合盤已併入紫微雙人合盤——一次填寫，同時看到紫微與八字兩套系統的完整分析。
          </p>
          <Link href="/hepan"
            className="inline-flex items-center gap-2 rounded-full bg-vermillion px-6 py-3 text-sm font-semibold text-white hover:bg-vermillion-h transition-colors">
            開始合盤 →
          </Link>
        </section>

        {/* What it covers */}
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink tracking-wide">八字合盤看什麼？</h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              命裡的八字合盤完全在子平框架內展開，不借助紫微宮位。先分別看甲方與乙方在這段關係中的八字模式，
              再合觀兩盤的干支互動、五行互補，並結合雙方當前大運點出緣分高峰期與需留心的階段。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "日主相見 · 緣分底色", d: "兩人日主的五行生克是整段關係的底色：木生火的滋養、水克火的張力，從這裡開始，後面的一切都有了方向。" },
              { t: "天干合化 · 陰陽牽引", d: "四柱天干之間若有甲己合、乙庚合等天干合化，代表兩人在某個層面有天然的陰陽牽引，是緣分深厚的象徵之一。" },
              { t: "地支合衝刑害", d: "三合六合為緣，六沖三刑為磨合。逐柱分析兩人地支的相互關係，揭示先天緣分結構的穩定與衝突所在。" },
              { t: "大運時機", d: "結合雙方近十年的大運走向，點出最有利於這段關係深化的時間視窗，以及需要格外用心維護的階段。" },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border-warm bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink mb-1">{c.t}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Difference from hepan */}
        <section className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-amber-900">八字合盤 vs 紫微合盤</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-800">八字合盤（此頁）</p>
              <p className="text-amber-700 leading-relaxed">純子平框架 · 日主十神 · 干支合衝 · 五行生克 · 大運交匯</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-ink-2">紫微合盤</p>
              <p className="text-ink-3 leading-relaxed">紫微宮位 · 飛化互入 · 夫妻宮星曜 · 命盤能量互動</p>
            </div>
          </div>
          <p className="text-[10px] text-amber-700/80">建議兩者配合閱讀，各有側重，不互相取代。</p>
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
          想先看自己的命盤？<Link href="/" className="text-vermillion hover:underline">測個人八字命盤 →</Link>
        </p>
      </div>
    </main>
  );
}
