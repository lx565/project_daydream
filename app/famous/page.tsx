import type { Metadata } from "next";
import Link from "next/link";
import { FAMOUS_PEOPLE } from "@/lib/famousData";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "名人命盤解析 · 紫微斗數 — 命裡",
  description: "從李小龍、莫札特到愛因斯坦，命裡依據紫微斗數典籍與精確命盤資料，深度解讀名人的命格格局與人生軌跡。",
  openGraph: {
    title: "名人命盤解析 · 紫微斗數 — 命裡",
    description: "李小龍、莫札特、愛因斯坦的紫微斗數命格解析。",
    url: "https://www.mingli.study/famous",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/famous" },
};

const DOMAIN_COLOR: Record<string, string> = {
  "武術·電影·哲學": "bg-vermillion-l text-vermillion border-vermillion/30",
  "武術·電影":       "bg-vermillion-l text-vermillion border-vermillion/30",
  "古典音樂":        "bg-gold/10 text-gold border-gold/30",
  "音樂·電影":       "bg-gold/10 text-gold border-gold/30",
  "物理學·哲學":     "bg-jade/10 text-jade border-jade/30",
  "科學·物理":       "bg-jade/10 text-jade border-jade/30",
  "武俠小說·新聞":   "bg-jade/10 text-jade border-jade/30",
  "企業家·科技":     "bg-jade/10 text-jade border-jade/30",
  "科技·企業家":     "bg-jade/10 text-jade border-jade/30",
  "科技·創業":       "bg-jade/10 text-jade border-jade/30",
  "軍事·政治":       "bg-vermillion-l text-vermillion border-vermillion/30",
};

const FAQ = [
  {
    question: "名人命盤解析的出生資料準確嗎？",
    answer: "名人的出生日期多可考證，但精確到「時辰」的資料較難完全確認，坊間流傳的時辰可能存在誤差。本欄目排盤僅供學習參考與命理研究，不作為對該人物的定論。",
  },
  {
    question: "為什麼要看名人的命盤？",
    answer: "透過已知人生軌跡的名人命盤，可以對照格局理論與實際成就，是學習紫微斗數格局判斷的好方式——先看懂別人的盤，再回頭看自己的命盤會更有感覺。",
  },
];

export default function FamousPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "名人命盤", path: "/famous" },
        ]),
        collectionPageSchema({
          name: "名人命盤解析 · 紫微斗數",
          description: "從李小龍、莫札特到愛因斯坦，命裡依據紫微斗數典籍與精確命盤資料，深度解讀名人的命格格局與人生軌跡。",
          path: "/famous",
        }),
        faqSchema(FAQ),
      ]} />
    <main className="min-h-screen bg-parchment">
      <LibraryNav category="famous" currentTitle="名人命盤" />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            名人命盤解析
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 典籍知識庫</p>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            依據精確命盤計算與紫微斗數典籍，解讀歷史名人的格局與人生軌跡。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你自己的命盤 · 看你有哪些格局 →" />

        <div className="space-y-4">
          {FAMOUS_PEOPLE.map(p => (
            <Link
              key={p.slug}
              href={`/famous/${p.slug}`}
              className="paper-card paper-card-hover block rounded-2xl border border-border-warm p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-ink">{p.name}</p>
                    <span className="text-xs text-ink-4">{p.nameEn}</span>
                  </div>
                  <p className="text-xs text-ink-4 mt-0.5">{p.era} · {p.domain}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border shrink-0 ${DOMAIN_COLOR[p.domain] ?? "bg-paper-2 text-ink-4 border-border-warm"}`}>
                  {p.fiveElements}
                </span>
              </div>
              <p className="text-sm text-ink-3 leading-relaxed">{p.brief}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.formations.map(f => (
                  <span key={f} className="text-[10px] bg-paper-2 border border-border-light text-ink-4 px-2 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
                <span className="text-[10px] text-ink-4">命宮{p.soulPalace}宮 · {p.mainStars}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">常見問題</p>
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

        <ToolCTA variant="card" label="看你的命盤格局" sub="AI 依據逾百部典籍詳批你的命格與運勢" />
      </div>
    </main>
    </>
  );
}
