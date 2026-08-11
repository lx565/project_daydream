import { loadCaseIndex } from "@/lib/casesData";
import Link from "next/link";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema, faqSchema } from "@/lib/jsonld";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "歷史命造案例庫 | 命裡",
  description: "收錄韋千里、潘東光等命理大師真實批斷案例，按日主瀏覽歷史命造。",
  openGraph: {
    title: "歷史命造案例庫 | 命裡",
    description: "收錄韋千里、潘東光等命理大師真實批斷案例，按日主瀏覽歷史命造。",
    url: "https://www.mingli.study/cases",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/cases" },
};

const RIZI_ORDER = ["甲木","乙木","丙火","丁火","戊土","己土","庚金","辛金","壬水","癸水"];

const FAQ = [
  {
    question: "這些命造案例的分析可靠嗎？",
    answer: "這些案例出自歷代命理典籍中記載的真實批命紀錄，反映古代命理師的論斷方法與思路，可作為學習八字論命的參考範例，但命理判斷因師而異，不同流派解讀角度可能不同，僅供學習研究，不作為對任何人物的定論。",
  },
  {
    question: "為什麼要按日主分類瀏覽案例？",
    answer: "日主（出生日的天干）是八字論命的核心座標，同一日主的命局在論斷邏輯上有共通之處。按日主分類，方便對照同類命局在不同格局、大運下的實際批斷與結局，是學習八字的實用方式。",
  },
];

export default function CasesHubPage() {
  const index = loadCaseIndex();

  const byRizi: Record<string, typeof index> = {};
  for (const entry of index) {
    if (!byRizi[entry.rizi]) byRizi[entry.rizi] = [];
    byRizi[entry.rizi].push(entry);
  }

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "命造案例", path: "/cases" },
        ]),
        collectionPageSchema({
          name: "歷史命造案例庫",
          description: "收錄韋千里、潘東光等命理大師真實批斷案例，按日主瀏覽歷史命造。",
          path: "/cases",
        }),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="cases" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-2">歷史命造案例庫</h1>
        <p className="text-sm text-ink-3 mb-8">
          收錄 {index.length} 個真實命造，來自韋千里、潘東光等命理大師批斷原文。按日主分類瀏覽。
        </p>

        {RIZI_ORDER.map((rizi) => {
          const cases = byRizi[rizi] ?? [];
          if (cases.length === 0) return null;
          return (
            <section key={rizi} className="mb-8">
              <h2 className="text-base font-semibold text-ink mb-3 flex items-center gap-2">
                {rizi}
                <span className="text-xs font-normal text-ink-4">{cases.length} 例</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.slug}`}
                    className="bg-paper rounded-lg shadow-sm border border-border p-3 hover:shadow-md transition-shadow"
                  >
                    <p className="text-xs font-medium text-ink truncate">{c.geju || rizi}</p>
                    <p className="text-[11px] text-ink-4 mt-1 truncate">{c.source.split("-").pop()}</p>
                    {c.hasOutcome && (
                      <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-sm">有結局</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-ink mb-3">常見問題</h2>
          <div className="space-y-2">
            {FAQ.map(item => (
              <details
                key={item.question}
                className="bg-paper rounded-lg border border-border p-3 group"
              >
                <summary className="text-sm font-medium text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>{item.question}</span>
                  <span className="text-ink-4 text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-xs text-ink-3 leading-relaxed pt-2">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
