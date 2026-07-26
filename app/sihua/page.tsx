import type { Metadata } from "next";
import Link from "next/link";
import { SIHUA_PILLARS, SIHUA_HUAJI, SIHUA_HUALU, SIHUA_HUAQUAN, SIHUA_HUAKE } from "@/lib/sihuaData";
import { SIHUA_PALACE_HUAJI, SIHUA_PALACE_HUALU, SIHUA_PALACE_HUAQUAN, SIHUA_PALACE_HUAKE } from "@/lib/sihuaPalaceData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "四化詳解 · 化祿化權化科化忌全解析 — 命裡",
  description:
    "紫微斗數四化（化祿、化權、化科、化忌）完整解析：什麼是化忌、化忌落命宮財帛官祿夫妻各代表什麼、甲乙丙丁戊己庚辛壬癸年生人的主星化忌詳解。命裡 AI 即時解盤。",
  openGraph: {
    title: "四化詳解 — 命裡",
    description: "化祿 · 化權 · 化科 · 化忌，紫微斗數最核心的變化系統全解析。",
    url: "https://www.mingli.study/sihua",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/sihua" },
};

const FAQ = [
  {
    question: "什麼是紫微斗數的四化？",
    answer:
      "四化是紫微斗數推命的核心機制之一。每個人的出生年幹（天干）決定了命盤裡哪四顆星會分別化祿、化權、化科、化忌。這四顆星所在的宮位，會在命主一生的對應領域產生顯著的能量變化——化祿帶來流通與機遇，化權帶來主導與強勢，化科帶來名聲與貴人，化忌帶來課題與執著。",
  },
  {
    question: "化忌一定是壞事嗎？",
    answer:
      "不是。化忌是命盤裡最受關注、也最容易被誤解的四化。它的核心含義是：這顆星所代表的領域會成為命主一生中需要特別用心、容易遇到阻礙或執著的地方——不是詛咒，而是課題。很多人有化忌的領域，反而因為重視與用心而做得出色，只是過程中會比別人多付出一些。",
  },
  {
    question: "怎麼找到自己命盤的生年四化？",
    answer:
      "根據你的出生年份找到對應的天干（甲乙丙丁戊己庚辛壬癸），然後對照十干四化表即可。例如：1984年（甲子年）→甲年→廉貞化祿、破軍化權、武曲化科、太陽化忌。命裡 AI 會在排盤後自動標註你的生年四化，並結合落宮給出解讀。",
  },
  {
    question: "流年四化和生年四化有什麼區別？",
    answer:
      "生年四化是一生的底色，由出生年幹決定，是相對固定的命盤特徵。流年四化是當年特別凸顯的能量變化——每一年都有新的四化組合，影響那一年各個宮位的運勢。當流年化忌觸碰到生年化忌所在的宮位或三方四正時，這個領域的課題會在當年特別明顯。",
  },
  {
    question: "化忌落在不同宮位分別代表什麼？",
    answer:
      "化忌落命宮→性格執著、自我要求高；落財帛→財務壓力大；落官祿→事業受阻或有壓力；落夫妻→感情課題多；落疾厄→健康需注意；落遷移→出行/外地有波折；落福德→精神壓力重、內心難以放鬆。具體含義還要結合化忌的星性以及三方四正整體來判斷。",
  },
];

export default function SihuaHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "四化詳解", path: "/sihua" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="sihua" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 紫微斗數</p>
          <h1
            className="text-3xl font-bold text-amber-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            四化詳解
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            化祿、化權、化科、化忌——紫微斗數最核心的變化系統。由生年幹決定，影響命盤裡每個宮位的能量走向與人生重點課題。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的生年四化與落宮含義 →" />

        {/* Pillar articles */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              四化基礎
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{SIHUA_PILLARS.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {SIHUA_PILLARS.map(e => (
              <Link
                key={e.urlSlug}
                href={`/sihua/${e.urlSlug}`}
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

        {/* 化忌 per-star articles */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-amber-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              化忌詳解 · 十干主星
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{SIHUA_HUAJI.length} 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed">
            十干（甲至癸）各有一顆主星化忌，影響該年生人命盤的核心課題方向。
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {SIHUA_HUAJI.map(e => (
              <Link
                key={e.urlSlug}
                href={`/sihua/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                  {e.stems && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      {e.stems.join("、")}年生
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
          <div className="pt-1">
            <p className="text-[11px] text-ink-4 mb-2">更想知道化忌落在哪個宮位？逐宮詳解 →</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SIHUA_PALACE_HUAJI.map(p => (
                <Link
                  key={p.urlSlug}
                  href={`/sihua-palace/${p.urlSlug}`}
                  className="text-[11px] text-center py-1.5 px-1 rounded-lg border border-amber-200/60 bg-amber-50/40 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  {p.palace}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 化祿 per-star articles */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-emerald-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              化祿詳解 · 十干主星
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{SIHUA_HUALU.length} 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed">
            十干各有一顆星化祿，主財祿、機遇與人緣的流動，是該年生人命盤中最順遂的能量方向。
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {SIHUA_HUALU.map(e => (
              <Link
                key={e.urlSlug}
                href={`/sihua/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                  {e.stems && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {e.stems.join("、")}年生
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
          <div className="pt-1">
            <p className="text-[11px] text-ink-4 mb-2">更想知道化祿落在哪個宮位？逐宮詳解 →</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SIHUA_PALACE_HUALU.map(p => (
                <Link
                  key={p.urlSlug}
                  href={`/sihua-palace/${p.urlSlug}`}
                  className="text-[11px] text-center py-1.5 px-1 rounded-lg border border-emerald-200/60 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  {p.palace}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 化權 per-star articles */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-blue-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-blue-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              化權詳解 · 十干主星
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{SIHUA_HUAQUAN.length} 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed">
            十干各有一顆星化權，主掌控、主導與能力的放大，是該年生人最有主見與競爭力的領域。
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {SIHUA_HUAQUAN.map(e => (
              <Link
                key={e.urlSlug}
                href={`/sihua/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                  {e.stems && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      {e.stems.join("、")}年生
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
          <div className="pt-1">
            <p className="text-[11px] text-ink-4 mb-2">更想知道化權落在哪個宮位？逐宮詳解 →</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SIHUA_PALACE_HUAQUAN.map(p => (
                <Link
                  key={p.urlSlug}
                  href={`/sihua-palace/${p.urlSlug}`}
                  className="text-[11px] text-center py-1.5 px-1 rounded-lg border border-blue-200/60 bg-blue-50/40 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {p.palace}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 化科 per-star articles */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-violet-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-violet-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              化科詳解 · 主星與輔星
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{SIHUA_HUAKE.length} 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed">
            十干各引一顆星化科（含左輔、右弼兩顆輔星），主名聲、貴人與文書的加持，是最溫和的四化。
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {SIHUA_HUAKE.map(e => (
              <Link
                key={e.urlSlug}
                href={`/sihua/${e.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                  {e.stems && (
                    <span className="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                      {e.stems.join("、")}年生
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
          <div className="pt-1">
            <p className="text-[11px] text-ink-4 mb-2">更想知道化科落在哪個宮位？逐宮詳解 →</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SIHUA_PALACE_HUAKE.map(p => (
                <Link
                  key={p.urlSlug}
                  href={`/sihua-palace/${p.urlSlug}`}
                  className="text-[11px] text-center py-1.5 px-1 rounded-lg border border-violet-200/60 bg-violet-50/40 text-violet-700 hover:bg-violet-50 hover:border-violet-300 transition-colors"
                >
                  {p.palace}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-amber-500 rounded-full self-center" />
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

        <ToolCTA variant="card" label="解析我的生年四化" sub="AI 結合你的出生年幹，解析四化落宮與三方四正，給出專屬的命盤四化詳解。" />
      </div>
    </main>
  );
}
