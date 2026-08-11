import type { Metadata } from "next";
import Link from "next/link";
import { XIONG } from "@/lib/xiongData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "兇象與空亡 · 命盤難點解析 — 命裡",
  description:
    "命宮空亡是什麼意思、擎羊坐命好不好、地空地劫有什麼影響、羊陀夾忌格怎麼看……紫微斗數煞星與空亡宮位完整解析，用現代視角講清命盤裡的難點課題。",
  openGraph: {
    title: "兇象與空亡 · 命盤難點解析 — 命裡",
    description: "空宮 · 煞星 · 兇格，命理師教你正確讀懂命盤裡的挑戰訊號。",
    url: "https://www.mingli.study/xiong",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/xiong" },
};

const FAQ = [
  {
    question: "命盤有兇象是不是代表命不好？",
    answer:
      "不是。兇象（煞星、化忌、空亡）代表的是命盤某些領域的能量特別強烈或有明顯課題，並不等於\"命不好\"或註定不幸。很多成就卓越的人，命盤裡都有強烈的煞星——關鍵是這股能量用對了方向還是內耗。命理的目的不是預言災難，而是幫你認識自己的能量特質、提前瞭解課題所在。",
  },
  {
    question: "空宮（空亡）和兇星有什麼區別？",
    answer:
      "空宮指某個宮位沒有主星入駐（需借對宮來看），不代表該宮事項缺失，而是該領域的能量來源需要借用外部。兇星（擎羊、陀羅、火星、鈴星、地空、地劫）則是實實在在有星曜存在，主導該宮位的能量偏向煞氣。空宮偏向\"虛\"，兇星偏向\"實\"，兩者性質不同，讀法也不同。",
  },
  {
    question: "擎羊坐命一定是不好的嗎？",
    answer:
      "不一定。擎羊代表強烈的衝勁、競爭意識與意志力，坐命時人生確實容易有磨礪與競爭，但也給了命主極強的抗壓力和衝勁。很多軍警、創業者、運動員命盤裡都有擎羊——關鍵是把這股能量用在該用的地方。入廟（旺宮）的擎羊，格局遠比落陷時正面。",
  },
  {
    question: "命盤有地空地劫會怎樣？",
    answer:
      "地空地劫被稱為\"空耗雙星\"，主無形的損耗與非常規的思維路徑。入命宮→思維跳脫、異於常人；入財帛→財來財去難積累；入官祿→事業走法不走尋常路。地空地劫單獨入某宮，未必全兇——很多藝術家、思想家有此組合。關鍵看是否與化忌或其他煞星疊加。",
  },
  {
    question: "怎麼知道自己命盤有沒有這些兇象？",
    answer:
      "排出紫微斗數命盤後，逐一對照十四主星與六煞（擎羊/陀羅/火星/鈴星/地空/地劫）的宮位。命裡 AI 會在排盤後自動標註命盤裡的特殊格局與兇象，並結合生年四化給出具體的分析——不需要自己逐一對照星表。",
  },
];

const KIND_LABELS: Record<string, string> = {
  kongwang: "空亡宮位",
  shaxing: "煞星詳解",
  geju: "特殊格局",
};

const KINDS = ["kongwang", "shaxing", "geju"] as const;

export default function XiongHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "兇象與空亡", path: "/xiong" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="xiong" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-slate-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            兇象與空亡
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            命盤裡的煞星、空宮與兇格，不是詛咒而是課題——讀懂它，才能真正瞭解自己的命盤難點與應對方向。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的命盤難點與兇象格局 →" />

        {/* Articles by kind */}
        {KINDS.map(kind => {
          const items = XIONG.filter(e => e.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind} className="space-y-3">
              <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
                <div className="w-1.5 h-5 bg-slate-500 rounded-full self-center" />
                <h2 className="text-lg font-bold text-slate-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
                  {KIND_LABELS[kind]}
                </h2>
                <span className="ml-auto text-[11px] text-ink-4">{items.length} 篇</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {items.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/xiong/${e.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                    <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-slate-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-slate-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="解析我的命盤難點" sub="AI 依據逾百部典籍，結合你的命盤格局分析煞星、空亡與特殊格局的具體影響。" />
      </div>
    </main>
  );
}
