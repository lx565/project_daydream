import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_TOPICS } from "@/lib/guideTopics";
import ToolCTA from "@/components/ToolCTA";
import JsonLd from "@/components/JsonLd";
import { faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

const FAQ = [
  {
    question: "什麼是紫微斗數？",
    answer:
      "紫微斗數是中國傳統命理學的一支，以出生年月日時排出命盤，將一百多顆星曜分佈於十二宮，再透過四化與三方四正會照，推斷一個人的性格、運勢、感情、事業與健康等人生面向。因以紫微星為諸星之首而得名。",
  },
  {
    question: "紫微斗數和八字有什麼區別？",
    answer:
      "兩者都以出生時間推命，但工具不同。八字（子平）用天干地支與五行生剋、十神格局論命，偏重五行旺衰與大運流年；紫微斗數用星曜落宮與四化飛星論命，宮位分工更細、畫面感更強。許多人會兩者合參，互為印證。",
  },
  {
    question: "紫微斗數有哪些流派？",
    answer:
      "主要分三大流派：三合派（重視星曜廟陷與三方四正組合，論格局）、四化派（以生年四化與飛星論事，重化祿化權化科化忌）、飛星派（欽天門一脈，以宮位互飛四化追因果）。命裡採三派合參，互相補充而非偏執一家。",
  },
  {
    question: "什麼是四化？",
    answer:
      "四化指化祿、化權、化科、化忌四種變化。每個天干會讓特定星曜產生四化，象徵機遇（祿）、權力（權）、名聲（科）與阻礙（忌）。四化是紫微斗數論「事情如何發生、走向如何」的關鍵，遠比單看星曜本身重要。",
  },
  {
    question: "什麼是大限和流年？",
    answer:
      "大限是每十年一步的大運，決定該十年的主軸運勢；流年則是具體某一年的運勢。論運時把大限、流年的命宮與四化疊加到本命盤上，看星曜與宮位的牽動，便能推斷各階段的吉凶起伏。",
  },
  {
    question: "新手該從哪裡開始學紫微斗數？",
    answer:
      "建議順序：先認識十二宮的含義，再記十四主星的基本性質，接著理解三方四正的會照原理，最後學四化。打好這四塊基礎後，再讀三大流派的論法會清晰很多。命裡學習指南按這個路徑整理了入門到進階的文章。",
  },
];

export const metadata: Metadata = {
  title: "紫微斗數學習指南 — 命裡",
  description:
    "從入門到進階，瞭解紫微斗數三合派、四化派、飛星派的核心理論，掌握十二宮、四化、大限流年等關鍵概念。",
  openGraph: {
    title: "紫微斗數學習指南 — 命裡",
    description: "從入門到進階，瞭解紫微斗數三合派、四化派、飛星派的核心理論。",
    url: "https://www.mingli.study/guide",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/guide" },
};

const SECTIONS = [
  {
    label: "入門基礎",
    slugs: ["紫微斗數入門", "十二宮", "主星總覽", "四化", "格局", "紫微八字區別"],
  },
  {
    label: "常見疑問",
    slugs: ["紫微斗數準嗎", "紫微八字選擇", "不知道出生時辰", "免費付費差別"],
  },
  {
    label: "三大流派",
    slugs: ["三合派", "四化派", "飛星派", "中州派", "三派比較"],
  },
  {
    label: "核心概念",
    slugs: ["三方四正", "廟旺利陷", "命宮身宮", "六煞星", "桃花星"],
  },
  {
    label: "運勢推算",
    slugs: ["大限", "流年"],
  },
  {
    label: "人生主題",
    slugs: ["感情婚姻", "合盤", "事業財運", "健康", "貴人運"],
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={faqSchema(FAQ)} />
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/library" className="hover:text-vermillion transition-colors">知識庫</Link>
          <span>/</span>
          <span className="text-ink-3">學習指南</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            紫微斗數學習指南
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 典籍知識庫</p>
        </div>

        {SECTIONS.map(section => {
          const topics = GUIDE_TOPICS.filter(t => section.slugs.includes(t.slug));
          return (
            <div key={section.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-vermillion rounded-full" />
                <h2 className="text-sm font-bold text-ink tracking-wide">{section.label}</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {topics.map(t => (
                  <Link
                    key={t.slug}
                    href={`/guide/${t.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{t.title}</p>
                    <p className="text-xs text-ink-4 leading-relaxed flex-1">{t.subtitle}</p>
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

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

        <ToolCTA variant="card" />
      </div>
    </main>
  );
}
