import { loadCaseIndex } from "@/lib/casesData";
import Link from "next/link";
import LibraryNav from "@/components/LibraryNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "历史命造案例库 | 命里",
  description: "收录韦千里、潘东光等命理大师真实批断案例，按日主浏览历史命造。",
};

const RIZI_ORDER = ["甲木","乙木","丙火","丁火","戊土","己土","庚金","辛金","壬水","癸水"];

export default function CasesHubPage() {
  const index = loadCaseIndex();

  const byRizi: Record<string, typeof index> = {};
  for (const entry of index) {
    if (!byRizi[entry.rizi]) byRizi[entry.rizi] = [];
    byRizi[entry.rizi].push(entry);
  }

  return (
    <>
      <LibraryNav category="cases" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-2">历史命造案例库</h1>
        <p className="text-sm text-ink-3 mb-8">
          收录 {index.length} 个真实命造，来自韦千里、潘东光等命理大师批断原文。按日主分类浏览。
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
                      <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-sm">有结局</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
