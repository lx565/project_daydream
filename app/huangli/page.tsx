import type { Metadata } from "next";
import Link from "next/link";
import { getAlmanac, chinaToday, ACTIVITIES } from "@/lib/huangli";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

// Recomputed hourly — the almanac changes at the China-time day boundary, and a
// stale "today" card is worse than a slightly cold one.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "今日黃曆 · 每日宜忌 · 農民曆查詢 — 命裡",
  description:
    "今日黃曆查詢：每日宜忌、沖煞、吉神凶煞、農曆干支與節氣一次看懂。依傳統通書編排，並提供結婚、開市、搬家、動土等擇日工具。",
  openGraph: {
    title: "今日黃曆 · 每日宜忌 — 命裡",
    description: "今日宜什麼、忌什麼、沖什麼生肖——傳統農民曆每日查詢。",
    url: "https://www.mingli.study/huangli",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/huangli" },
};

const FAQ = [
  {
    question: "黃曆的「宜」「忌」是怎麼來的？",
    answer:
      "傳統通書依當日的干支、建除十二神、二十八宿與神煞組合，推出當日適合與不適合進行的事項。它是一套流傳數百年的曆法規則，對所有人一體適用，並非依個人生辰計算。",
  },
  {
    question: "「沖」是什麼意思？沖到我的生肖怎麼辦？",
    answer:
      "每日的地支會與某一生肖相沖。傳統上，若當日沖到自己的生肖，重要事情會避開或另擇他日。這是一層通則性的提醒，並不代表當天一定不順——完整判斷仍需結合個人命盤與大運。",
  },
  {
    question: "黃曆宜忌和我的個人命盤有什麼不同？",
    answer:
      "黃曆講的是「這一天本身的性質」，對所有人相同；命盤講的是「你這個人的結構與運勢走向」。挑日子時兩者可以並用：先用黃曆篩出通則上合適的日子，再避開與自己生肖相沖的那幾天。",
  },
];

export default async function HuangliPage() {
  const a = await getAlmanac(chinaToday());
  const groups = [...new Set(ACTIVITIES.map((x) => x.group))];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "今日黃曆", path: "/huangli" },
        ]),
        faqSchema(FAQ),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="huangli" currentTitle="今日黃曆" />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-8">
          <div className="text-center pt-8 pb-2 space-y-2">
            <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 農民曆</p>
            <h1 className="text-3xl font-bold text-vermillion" style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}>
              今日黃曆
            </h1>
            <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
              今天宜什麼、忌什麼、沖什麼生肖——依傳統通書編排，每日更新。
            </p>
          </div>

          {/* Almanac card */}
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-ink tracking-wide">{a.solarStr}</span>
                  <span className="text-sm text-ink-3">{a.weekday}</span>
                </div>
                <p className="text-xs text-ink-3 mt-0.5">{a.lunarStr}</p>
              </div>
              <div className="text-right">
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-vermillion-l border border-vermillion/20 text-vermillion font-medium">
                  {a.shengxiao}年
                </span>
                {a.jieqi && <p className="text-[10px] text-gold font-semibold mt-1">{a.jieqi}</p>}
              </div>
            </div>

            <div className="text-[11px] text-ink-3 tracking-widest border-t border-border-light pt-3">
              {a.ganzhiStr}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1 h-3.5 bg-jade rounded-full" />
                  <span className="text-[11px] font-bold text-jade tracking-widest">宜</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.yi.slice(0, 10).map((item) => (
                    <span key={item} className="text-[11px] px-1.5 py-0.5 rounded bg-jade-l border border-jade/20 text-jade">{item}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1 h-3.5 bg-vermillion rounded-full" />
                  <span className="text-[11px] font-bold text-vermillion tracking-widest">忌</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.ji.slice(0, 10).map((item) => (
                    <span key={item} className="text-[11px] px-1.5 py-0.5 rounded bg-vermillion-l border border-vermillion/20 text-vermillion">{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-light pt-3 text-[11px] text-ink-3">
              <span>沖 <span className="text-ink font-medium">{a.chong}</span></span>
              <span>煞 <span className="text-ink font-medium">{a.sha}</span></span>
              {a.jishen.length > 0 && <span>吉神 <span className="text-jade font-medium">{a.jishen.slice(0, 4).join(" ")}</span></span>}
              {a.xiongsha.length > 0 && <span>凶煞 <span className="text-vermillion font-medium">{a.xiongsha.slice(0, 4).join(" ")}</span></span>}
            </div>
          </div>

          {/* 擇日 entry */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
              <div className="w-1.5 h-5 bg-vermillion rounded-full self-center" />
              <h2 className="text-lg font-bold text-vermillion tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
                擇日 · 挑一個好日子
              </h2>
            </div>
            <p className="text-xs text-ink-4 leading-relaxed">
              要辦事情、想挑日子？選一個項目，直接查未來三個月適合的日子。
            </p>
            {groups.map((g) => (
              <div key={g} className="space-y-1.5">
                <p className="text-[11px] text-ink-4 font-medium">{g}</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITIES.filter((x) => x.group === g).map((x) => (
                    <Link
                      key={x.slug}
                      href={`/zeri/${x.slug}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border-warm bg-paper text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
                    >
                      {x.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
              <div className="w-1.5 h-5 bg-vermillion rounded-full self-center" />
              <h2 className="text-lg font-bold text-vermillion tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
                常見問題
              </h2>
            </div>
            <div className="space-y-2">
              {FAQ.map((item) => (
                <details key={item.question} className="paper-card rounded-xl border border-border-warm px-4 py-3 group">
                  <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                    <span>{item.question}</span>
                    <span className="text-ink-4 text-xs transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <p className="text-xs text-ink-3 leading-relaxed pt-2.5">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <ToolCTA variant="card" label="排我的命盤" sub="黃曆看的是「這一天」，命盤看的是「你這個人」。兩者並用，挑日子更有把握。" />
        </div>
      </main>
    </>
  );
}
