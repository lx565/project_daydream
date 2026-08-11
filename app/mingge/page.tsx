import type { Metadata } from "next";
import Link from "next/link";
import { MINGGE_LIST } from "@/lib/minggeData";
import ToolCTA from "@/components/ToolCTA";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微斗數格局大全 — 命裡",
  description: "收錄31個紫微斗數核心命格，包括石中隱玉格、君臣慶會格、殺破狼格、祿馬交馳格等吉凶格局，逐一詳解入格條件、命運特質與古籍依據。",
  openGraph: {
    title: "紫微斗數格局大全 — 命裡",
    description: "31個紫微斗數命格完整解讀，吉格兇格一目瞭然。",
    url: "https://www.mingli.study/mingge",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/mingge" },
};

const SECTIONS: { label: string; type: "吉格" | "兇格" | "特殊" }[] = [
  { label: "吉格 · 富貴格局", type: "吉格" },
  { label: "兇格 · 需留意格局", type: "兇格" },
  { label: "特殊格局", type: "特殊" },
];

const TYPE_BADGE: Record<string, string> = {
  吉格: "bg-jade/10 text-jade border-jade/30",
  兇格: "bg-vermillion-l text-vermillion border-vermillion/30",
  特殊: "bg-gold/10 text-gold border-gold/30",
};

const FAQ = [
  {
    question: "什麼是紫微斗數的格局（命格）？",
    answer: "命格（格局）是命盤中由特定星曜組合、宮位配置形成的特殊模式，是古人觀星斷命的核心工具之一，用來判斷命局的層次高低與人生主要走向，例如殺破狼格、祿馬交馳格等。",
  },
  {
    question: "命盤符合條件就一定成格嗎？",
    answer: "不一定。入格條件是基礎門檻，但格局的高低還要看是否會照煞星、有無四化加持、三方四正的整體組合，同樣的格局在不同命盤中層次可以差很多，必須整盤合參，不能只看單一條件。",
  },
];

export default function MinggePage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "格局大全", path: "/mingge" },
        ]),
        collectionPageSchema({
          name: "紫微斗數格局大全",
          description: "收錄31個紫微斗數核心命格，包括石中隱玉格、君臣慶會格、殺破狼格、祿馬交馳格等吉凶格局，逐一詳解入格條件、命運特質與古籍依據。",
          path: "/mingge",
        }),
        faqSchema(FAQ),
      ]} />
    <main className="min-h-screen bg-parchment">
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/library" className="hover:text-vermillion transition-colors">知識庫</Link>
          <span>/</span>
          <span className="text-ink-3">格局大全</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            紫微斗數格局大全
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 典籍知識庫</p>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            命格（格局）是命盤中由特定星曜組合形成的特殊模式，是古人觀星斷命的核心工具之一。
          </p>
        </div>

        <ToolCTA variant="slim" label="檢視你的命盤是否有特殊格局 →" />

        {SECTIONS.map(({ label, type }) => {
          const items = MINGGE_LIST.filter(m => m.type === type);
          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-vermillion rounded-full" />
                <h2 className="text-sm font-bold text-ink tracking-wide">{label}</h2>
                <span className="text-xs text-ink-4">（{items.length} 個）</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {items.map(m => (
                  <Link
                    key={m.slug}
                    href={`/mingge/${m.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{m.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${TYPE_BADGE[m.type]}`}>
                        {m.type}
                      </span>
                    </div>
                    <p className="text-xs text-ink-4 leading-relaxed flex-1">{m.brief}</p>
                    {m.stars.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.stars.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] bg-paper-2 border border-border-light text-ink-4 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                        {m.stars.length > 3 && (
                          <span className="text-[10px] text-ink-4">+{m.stars.length - 3}</span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

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

        <ToolCTA variant="card" label="排命盤 · 看你有哪些格局" sub="AI 解讀你的專屬命盤，識別格局並深度分析" />
      </div>
    </main>
    </>
  );
}
