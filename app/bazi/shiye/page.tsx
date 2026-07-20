import type { Metadata } from "next";
import Link from "next/link";
import { BAZI_SHIYE } from "@/lib/baziShiyeData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";
import BaziCaseExamples from "@/components/BaziCaseExamples";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "八字看事業 · 行業方向 · 官殺格 · 食傷生財 — 命裡",
  description:
    "從八字看事業：用神五行定適合的行業，官殺格定事業格局，食傷生財靠才華吃飯，創業還是上班，升職高峰與轉型期，職業天賦。7篇八字論事業科普。",
  openGraph: {
    title: "八字看事業 · 行業方向 · 官殺格 · 食傷生財 — 命裡",
    description: "五行喜用定行業 · 官殺格 · 食傷生財 · 創業或上班 · 事業高峰，從八字看你的事業。",
    url: "https://www.mingli.study/bazi/shiye",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/bazi/shiye" },
};

const FAQ = [
  {
    question: "八字怎麼看適合做什麼行業？",
    answer:
      "核心是先定出命局最需要的「用神」是哪個五行，再對應行業：木主教育文化木業醫藥，火主能源餐飲電子網際網路營銷，土主房地產建築農業保險，金主金融機械軍警法律，水主貿易物流傳媒諮詢。喜用神所屬行業走得順，忌神所屬行業宜避。再結合十神（食傷宜創作技術、財星宜經商、官殺宜管理公職）一起看更準。",
  },
  {
    question: "八字裡官殺代表什麼？和事業有什麼關係？",
    answer:
      "官殺（正官、七殺）是八字裡事業與權力的核心訊號，代表你能承擔的責任與駕馭的權力。正官主名分與體制內的穩定發展，七殺主魄力與開創性事業。關鍵在「有制有化」且「身能任官」——成格有制者掌權成器，官殺混雜或身弱不勝則壓力大、易奔波。",
  },
  {
    question: "我適合創業還是上班？八字能看嗎？",
    answer:
      "能看出傾向。正官正印旺、身弱喜印比、性穩重規範者，在組織里穩步發展更得力；財星旺而身能任、食傷生財、偏財格、比劫旺、傷官旺、七殺有制者，自立創業更能發揮。關鍵還看「身能否任財官」——身旺承受力強，身弱宜先依託平臺。這是傾向參考，最終須結合個人意願與現實條件。",
  },
  {
    question: "八字能看出事業的高峰期嗎？",
    answer:
      "能大致定位。行到補命局用神的大運、引動官星財星且身能承擔的時段，往往是升職、擴張、攀向高峰的「黃金十年」。反之行忌神運、傷官見官、比劫奪財之運多為瓶頸期，宜守成或轉型。高峰是趨勢最旺的視窗，仍需個人把握。",
  },
];

export default function BaziShiyeHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: "八字看事業", path: "/bazi/shiye" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="bazi" currentTitle="八字看事業" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 八字命理</p>
          <h1
            className="text-3xl font-bold text-sky-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            八字看事業
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            從八字讀事業：用神五行定行業，官殺格定格局，食傷生財靠才華，創業還是上班，升職高峰與轉型——子平命理眼中你的事業路。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的八字 · AI 解析你的事業格局、行業方向與高峰大運 →" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-sky-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-sky-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字論事業 · {BAZI_SHIYE.length} 篇
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">五行喜用 · 官殺 · 食傷生財</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {BAZI_SHIYE.map(e => (
              <Link
                key={e.urlSlug}
                href={`/bazi/shiye/${e.urlSlug}`}
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

        <BaziCaseExamples domain="shiye" />

        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-sky-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-sky-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的八字事業" sub="AI 依據子平典籍，從你的用神五行、官殺格與大運流年，分析適合的行業、事業格局與高峰時段。" />
      </div>
    </main>
  );
}
