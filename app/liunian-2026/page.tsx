import type { Metadata } from "next";
import Link from "next/link";
import { LIUNIAN_2026 } from "@/lib/liunian2026Data";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema, collectionPageSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "2026年運勢 · 丙午年十二生肖流年運勢總覽 — 命裡",
  description:
    "2026年是丙午年，太歲屬馬。十二生肖與太歲的沖合害破關係一次看懂——屬鼠、屬牛、屬虎……點選你的生肖，查看2026年運勢重點與可操作建議。",
  openGraph: {
    title: "2026年運勢 · 丙午年十二生肖流年運勢總覽 — 命裡",
    description: "2026丙午年，太歲屬馬。十二生肖與太歲的沖合害破關係，逐一詳解。",
    url: "https://www.mingli.study/liunian-2026",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/liunian-2026" },
};

const FAQ = [
  {
    question: "2026年是什麼生肖年？",
    answer:
      "2026年是農曆丙午年，天干丙屬陽火，地支午屬馬、五行屬火，天干地支雙火疊加，民間習稱「火馬年」。這一年的太歲即為午（馬）。",
  },
  {
    question: "生肖沖太歲、合太歲是什麼意思？",
    answer:
      "每年的地支即當年「太歲」，十二生肖與太歲的關係由地支間固定的六合、三合、六沖、六害、六破規則決定——這是曆法規則，一體適用，不因個人命盤而不同。沖太歲代表牽動較大、宜謹慎；合太歲（三合／六合）代表較為助力；平順代表沒有特殊牽動。這只是流年判斷的其中一層，並非全部。",
  },
  {
    question: "生肖運勢準嗎？和命盤有什麼關係？",
    answer:
      "生肖對應的只是你出生那一年的地支，是流年判斷裡最粗略的一層——真正影響一整年吉凶的，是你完整的生辰八字或紫微斗數命盤，疊加當年的大運與流年四化才能判斷得更準確。生肖運勢適合作為快速了解「今年的大環境」的入口，若想知道具體到你個人的運勢走向，建議進一步排盤查看。",
  },
];

const RELATION_ORDER = ["值太歲", "沖太歲", "害太歲", "破太歲", "三合太歲", "六合太歲", "三會太歲", "平順"] as const;

const RELATION_BADGE: Record<string, string> = {
  沖太歲: "bg-red-50 text-red-600 border-red-200",
  害太歲: "bg-orange-50 text-orange-600 border-orange-200",
  破太歲: "bg-orange-50 text-orange-600 border-orange-200",
  值太歲: "bg-red-50 text-red-600 border-red-200",
  三合太歲: "bg-jade/10 text-jade border-jade/30",
  六合太歲: "bg-jade/10 text-jade border-jade/30",
  三會太歲: "bg-amber-50 text-amber-700 border-amber-200",
  平順: "bg-paper-2 text-ink-3 border-border-warm",
};

export default function Liunian2026HubPage() {
  const sorted = [...LIUNIAN_2026].sort(
    (a, b) => RELATION_ORDER.indexOf(a.relation as typeof RELATION_ORDER[number]) - RELATION_ORDER.indexOf(b.relation as typeof RELATION_ORDER[number])
  );

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "流年運勢", path: "/liunian" },
          { name: "2026丙午年生肖運勢", path: "/liunian-2026" },
        ]),
        collectionPageSchema({
          name: "2026年運勢 · 丙午年十二生肖流年運勢總覽",
          description: "2026丙午年，太歲屬馬，十二生肖與太歲的沖合害破關係逐一詳解。",
          path: "/liunian-2026",
        }),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="liunian" currentTitle="2026丙午年生肖運勢" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數 × 八字</p>
          <h1
            className="text-3xl font-bold text-amber-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            2026丙午年 · 十二生肖運勢
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            2026年為農曆丙午年，天干地支雙火疊加，太歲屬馬。點選你的生肖，看懂你和今年太歲之間的沖合害破關係，以及可以怎麼應對。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 結合完整命盤解析你的2026年運勢 →" />

        {/* Zodiac grid */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-600 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              十二生肖 × 太歲午
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{LIUNIAN_2026.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
            {sorted.map(e => (
              <Link
                key={e.urlSlug}
                href={`/liunian-2026/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-bold text-ink group-hover:text-vermillion transition-colors" style={{ fontFamily: "var(--font-serif)" }}>
                    屬{e.animal}
                  </p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${RELATION_BADGE[e.relation]}`}>
                    {e.relation}
                  </span>
                </div>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

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

        <div className="text-center">
          <Link href="/liunian" className="text-xs text-ink-4 hover:text-amber-700 underline underline-offset-2">
            ← 想先了解流年判斷的基礎邏輯？看「流年運勢」知識庫
          </Link>
        </div>

        <ToolCTA variant="card" label="解析我的2026年完整運勢" sub="AI 依據逾百部典籍，結合你的完整命盤格局與大運，給出真正屬於你的2026年流年判斷，而不只是生肖粗判。" />
      </div>
    </main>
  );
}
