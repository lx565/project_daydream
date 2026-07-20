import type { Metadata } from "next";
import Link from "next/link";
import { PALACES, MAJOR_STARS } from "@/lib/starData";
import ToolCTA from "@/components/ToolCTA";
import JsonLd from "@/components/JsonLd";
import { faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

const FAQ = [
  {
    question: "紫微斗數十二宮分別代表什麼？",
    answer:
      "十二宮依次為：命宮（整體格局與個性）、兄弟宮（手足與同輩）、夫妻宮（婚姻與伴侶）、子女宮（子女與創造力）、財帛宮（賺錢與理財）、疾厄宮（健康）、遷移宮（外出與社會形象）、交友宮（朋友與貴人）、官祿宮（事業成就）、田宅宮（不動產與家境）、福德宮（精神與福分）、父母宮（父母與長上）。",
  },
  {
    question: "命宮怎麼看？",
    answer:
      "命宮是整張命盤的核心，代表先天個性、人生格局與一生主體運勢。看命宮先看坐守的主星與輔星，再結合三方四正（財帛、官祿、遷移三宮）與四化，綜合判斷格局高低與性格傾向，而非只看命宮一宮。",
  },
  {
    question: "什麼是三方四正？",
    answer:
      "三方四正指任一宮位與其相互拱照的另外三宮所組成的格局。以命宮為例，「三方」是財帛宮、官祿宮、遷移宮，「四正」加上命宮本身。論任何一宮都不能孤立看，必須連同三方四正一起會照，才能準確判斷。",
  },
  {
    question: "夫妻宮能看出婚姻好壞嗎？",
    answer:
      "夫妻宮反映婚姻質量、伴侶特質與感情走向，是觀察感情的主宮，但不是唯一依據。還要看夫妻宮的三方四正、四化飛星，以及福德宮（情感價值觀）、命宮（自身性格）的配合，才能較完整地判斷感情格局。",
  },
  {
    question: "財帛宮和田宅宮有什麼不同？",
    answer:
      "財帛宮看的是「流動的財」——賺錢方式、現金流與理財能力；田宅宮看的是「固定的財」與家境——房產不動產、居住環境與祖業。兩宮互為對照，財帛主進出，田宅主積存，合看才知一個人的財富結構。",
  },
  {
    question: "怎麼知道我各宮位坐什麼星？",
    answer:
      "需要你的出生年月日與時辰排出紫微命盤，即可看到十四主星與輔星分別落入哪一宮。命裡支援線上排盤，並由 AI 依據逾百部典籍詳批你十二宮的星曜格局與四化牽動。",
  },
];

export const metadata: Metadata = {
  title: "紫微斗數十二宮詳解 — 命裡",
  description: "命裡詳解紫微斗數十二宮位，包括命宮、財帛宮、官祿宮、夫妻宮等，涵蓋各主星落入每個宮位的詳細解讀。",
  openGraph: {
    title: "紫微斗數十二宮詳解 — 命裡",
    description: "十二宮位 × 十四主星，依據逾百部典籍整理。",
    url: "https://www.mingli.study/palace",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/palace" },
};

export default function PalaceHubIndexPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={faqSchema(FAQ)} />
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/library" className="hover:text-vermillion transition-colors">知識庫</Link>
          <span>/</span>
          <span className="text-ink-3">十二宮詳解</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            十二宮詳解
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 宮位知識庫</p>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            命盤的十二個人生領域，點選宮位檢視各主星落入後的詳細解讀。
          </p>
        </div>

        <ToolCTA variant="slim" label="檢視你命盤各宮位的星曜 →" />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
          {PALACES.map(p => (
            <Link
              key={p.name}
              href={`/palace/${p.urlSlug}`}
              className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              style={{ borderTop: "2px solid var(--color-border-warm)" }}
            >
              <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{p.name}</p>
              <p className="text-xs text-ink-4 leading-relaxed">{p.brief}</p>
              <p className="text-[10px] text-ink-4/70">{MAJOR_STARS.length} 顆主星詳解</p>
              <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-vermillion rounded-full" />
            <h2 className="text-sm font-bold text-ink tracking-wide">常見問題</h2>
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

        <ToolCTA variant="card" label="排命盤 · 看你十二宮的星曜格局" sub="AI 依據逾百部典籍詳批命盤各宮位" />
      </div>
    </main>
  );
}
