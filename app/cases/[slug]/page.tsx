import { getCaseBySlug, getCasesByRizi, loadCaseIndex } from "@/lib/casesData";
import { SOURCE_BOOKS } from "@/lib/sourcesData";
import { notFound } from "next/navigation";
import Link from "next/link";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import { articleSchema } from "@/lib/jsonld";
import type { Metadata } from "next";

export const dynamic = "force-static";

interface PageParams { slug: string }

export async function generateStaticParams() {
  const index = loadCaseIndex();
  return index.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug } = await params;
  const c = getCaseBySlug(slug);
  if (!c) return { title: "案例未找到" };
  return {
    title: `${c.rizi}${c.geju ? `·${c.geju}` : ""}命造案例 | 命里`,
    description: c.analysis.slice(0, 100),
    alternates: { canonical: `https://www.mingli.study/cases/${slug}` },
  };
}

export default async function CaseDetailPage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug } = await params;
  const c = getCaseBySlug(slug);
  if (!c) notFound();

  const related = getCasesByRizi(c.rizi)
    .filter((r) => r.slug !== c.slug)
    .slice(0, 3);

  // Look up the source book's pinyin urlSlug for the /sources link
  const sourceBook = SOURCE_BOOKS.find(
    (b) => b.slug === c.source || b.title === c.source
  );
  const sourceUrlSlug = sourceBook?.urlSlug ?? null;

  // JSON-LD: extract author name before 《 in sourceLabel, e.g. "韦千里" from "韦千里《千里命稿》"
  const authorName = c.sourceLabel.includes("《")
    ? c.sourceLabel.split("《")[0].trim()
    : "命理大师";
  const pageTitle = `${c.rizi}${c.geju ? `·${c.geju}` : ""}命造 | ${c.sourceLabel}`;
  const jsonld = articleSchema({
    headline: pageTitle,
    description: c.analysis.slice(0, 100),
    path: `/cases/${c.slug}`,
    section: "命造案例",
  });
  // Override author with the classical master's name
  const jsonldWithAuthor = {
    ...jsonld,
    author: { "@type": "Person", name: authorName },
    inLanguage: "zh-CN",
  };

  return (
    <>
      <LibraryNav category="cases" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-ink-4 mb-4">
          <Link href="/cases" className="hover:underline">命造案例</Link>
          {" › "}
          <span>{c.rizi}{c.geju ? ` · ${c.geju}` : ""}</span>
        </nav>

        {/* Header */}
        <h1 className="text-xl font-bold text-ink mb-1">
          {c.rizi}{c.geju ? `·${c.geju}` : ""}命造
        </h1>
        <p className="text-xs text-ink-4 mb-6">{c.sourceLabel} · {c.era || "年代不详"}</p>

        {/* 命理特征 chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {c.rizi && <Chip label="日主" value={c.rizi} />}
          {c.geju && <Chip label="格局" value={c.geju} />}
          {c.yongshen && <Chip label="用神" value={c.yongshen} />}
          {c.gender !== "unknown" && (
            <Chip label="性别" value={c.gender === "male" ? "男" : "女"} />
          )}
        </div>

        {/* 八字 */}
        {c.bazi_text && (
          <section className="mb-6 p-4 bg-amber-50/40 rounded-lg border border-amber-100">
            <p className="text-[10px] text-ink-4 font-medium uppercase tracking-wide mb-2">八字四柱</p>
            <p className="text-lg font-mono font-semibold text-ink tracking-widest">{c.bazi_text}</p>
          </section>
        )}

        {/* 大师批语 */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-ink mb-2">大师批语</h2>
          <blockquote className="border-l-2 border-vermillion pl-4 text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">
            {c.analysis}
          </blockquote>
          <p className="text-xs text-ink-4 mt-2">— {c.sourceLabel}</p>
        </section>

        {/* 预测 */}
        {c.prediction && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-ink mb-2">预测</h2>
            <p className="text-sm text-ink-2 leading-relaxed">{c.prediction}</p>
          </section>
        )}

        {/* 结局 */}
        {c.outcome && (
          <section className="mb-6 p-3 bg-green-50/40 rounded-lg border border-green-100">
            <h2 className="text-xs font-semibold text-green-700 mb-1">实际结局</h2>
            <p className="text-sm text-ink-2">{c.outcome}</p>
          </section>
        )}

        {/* 来源 */}
        <section className="mb-8">
          <p className="text-xs text-ink-4">
            来源：{c.sourceLabel}
            {sourceUrlSlug && (
              <>
                {" · "}
                <Link href={`/sources/${sourceUrlSlug}`} className="underline hover:text-ink">
                  查看原著
                </Link>
              </>
            )}
          </p>
        </section>

        {/* 相关案例 */}
        {related.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-ink mb-3">同为{c.rizi}的案例</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/cases/${r.slug}`}
                  className="bg-paper rounded-lg border border-border p-3 hover:shadow-sm transition-shadow"
                >
                  <p className="text-xs font-medium text-ink">{r.geju || r.rizi}</p>
                  <p className="text-[11px] text-ink-4 mt-1 truncate">{r.sourceLabel}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        <JsonLd data={jsonldWithAuthor} />
      </main>
    </>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-paper border border-border rounded-md text-xs">
      <span className="text-ink-4">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </span>
  );
}
