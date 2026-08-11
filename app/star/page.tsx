import type { Metadata } from "next";
import Link from "next/link";
import { MAJOR_STARS, PALACES } from "@/lib/starData";
import { ASSISTANT_STARS } from "@/lib/assistantStarData";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import { faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

const FAQ = [
  {
    question: "紫微斗數十四主星是哪些？",
    answer:
      "十四主星為紫微、天機、太陽、武曲、天同、廉貞、天府、太陰、貪狼、巨門、天相、天梁、七殺、破軍。其中紫微、天機、太陽、武曲、天同、廉貞屬北斗，天府、太陰、貪狼、巨門、天相、天梁、七殺、破軍屬南斗系統，是命盤格局的主體。",
  },
  {
    question: "主星和輔星有什麼區別？",
    answer:
      "主星（十四正曜）決定命盤的主體性格與格局走向，落入命宮、官祿、財帛等宮位時影響最大；輔星（左輔右弼、文昌文曲、六煞星等）則起加分、減分或轉化作用——六吉星助力、六煞星制約、祿存天馬主財動，多與主星搭配後才顯出吉凶。",
  },
  {
    question: "命盤裡沒有主星的宮位怎麼看？",
    answer:
      "空宮（無主星）並非不好。看空宮要借對宮的主星與三方四正星曜來論斷，再結合落入該宮的輔星與四化。空宮往往代表此領域受外部環境牽動較多，需借力而非自主。",
  },
  {
    question: "同一顆主星，為什麼每個人表現不一樣？",
    answer:
      "主星的吉凶不是固定的。同一顆星，落入不同宮位、配不同輔星與四化（化祿、化權、化科、化忌）、處不同三方四正組合，表現可以天差地別。例如貪狼遇火星成「火貪格」主暴發，遇空劫則偏才藝修行，必須整盤合參。",
  },
  {
    question: "紫微星坐命就一定是好命嗎？",
    answer:
      "不一定。紫微為帝星主尊貴，但帝星也需「百官朝拱」——即左輔右弼、文昌文曲、天魁天鉞等輔星扶持才顯貴氣；若孤君無輔或逢煞，反主孤高、剛愎。論命看的是整體格局配置，不是單星定吉凶。",
  },
  {
    question: "怎麼知道我命盤裡有哪些星曜？",
    answer:
      "需要你的出生年月日與時辰（最好精確到時），排出紫微命盤後即可看到十四主星與輔星分別落在哪個宮位。命裡支援線上排盤，並由 AI 依據典籍詳批你各宮主星與輔星的組合格局。",
  },
];

export const metadata: Metadata = {
  title: "紫微斗數星曜詳解 · 主星與輔星 — 命裡",
  description: "命裡詳解紫微斗數二十八顆星曜，包括十四主星（紫微、天機、太陽、武曲等）與十四輔星（左輔、文昌、擎羊、地空等），涵蓋每顆星曜落入十二宮位的完整解讀。",
  openGraph: {
    title: "紫微斗數星曜詳解 · 主星與輔星 — 命裡",
    description: "二十八星曜 × 十二宮位，共 336 篇典籍文章。",
    url: "https://www.mingli.study/star",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/star" },
};

const GROUP_LABEL: Record<string, string> = {
  六吉星: "吉",
  祿存天馬: "祿",
  六煞星: "煞",
  空劫: "耗",
};

const GROUP_STYLE: Record<string, string> = {
  六吉星: "bg-jade/10 text-jade border-jade/30",
  祿存天馬: "bg-gold/10 text-gold border-gold/30",
  六煞星: "bg-vermillion-l text-vermillion border-vermillion/30",
  空劫: "bg-paper-2 text-ink-4 border-border-warm",
};

export default function StarHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={faqSchema(FAQ)} />
      <LibraryNav category="star" currentTitle="星曜詳解" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-10">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            星曜詳解
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 星曜知識庫</p>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            十四主星與十四輔星，每顆星曜落入十二宮位的深度解讀，共 336 篇典籍文章。
          </p>
        </div>

        <ToolCTA variant="slim" label="檢視你命盤中的星曜組合 →" />

        {/* Main stars */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-vermillion rounded-full" />
            <h2 className="text-sm font-bold text-ink tracking-wide">十四主星</h2>
            <span className="text-xs text-ink-4 font-normal">· 168 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {MAJOR_STARS.map(s => (
              <Link
                key={s.name}
                href={`/star/${s.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{s.name}</p>
                  <span className="text-[10px] bg-paper-2 border border-border-light text-ink-4 px-1.5 py-0.5 rounded shrink-0">
                    {s.polarity}
                  </span>
                </div>
                <p className="text-xs text-ink-4 leading-relaxed">{s.brief}</p>
                <p className="text-[10px] text-ink-4/70">五行屬{s.element} · {PALACES.length} 宮詳解</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Assistant stars */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gold rounded-full" />
            <h2 className="text-sm font-bold text-ink tracking-wide">十四輔星</h2>
            <span className="text-xs text-ink-4 font-normal">· 168 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {ASSISTANT_STARS.map(s => (
              <Link
                key={s.name}
                href={`/star/${s.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{s.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 border ${GROUP_STYLE[s.group] ?? "bg-paper-2 text-ink-4 border-border-warm"}`}>
                    {GROUP_LABEL[s.group] ?? s.group}
                  </span>
                </div>
                <p className="text-xs text-ink-4 leading-relaxed">{s.brief}</p>
                <p className="text-[10px] text-ink-4/70">五行屬{s.element} · {PALACES.length} 宮詳解</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
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

        <ToolCTA variant="card" label="排命盤 · 看你的星曜如何影響命運" sub="AI 依據逾百部典籍深度解讀你的主星與輔星格局" />
      </div>
    </main>
  );
}
