import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MAJOR_STARS, PALACES } from "@/lib/starData";
import { ASSISTANT_STARS } from "@/lib/assistantStarData";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import LikeButton from "@/components/LikeButton";
import { articleSchema, breadcrumbSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return [
    ...MAJOR_STARS.map(s => ({ star: s.urlSlug })),
    ...ASSISTANT_STARS.map(s => ({ star: s.urlSlug })),
  ];
}

interface PageParams { star: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { star: raw } = await params;
  const slug = decodeURIComponent(raw);
  const starData =
    (MAJOR_STARS.find(s => s.urlSlug === slug || s.name === slug) as { name: string; brief: string; urlSlug: string; polarity?: string; element: string } | undefined) ??
    ASSISTANT_STARS.find(s => s.urlSlug === slug || s.name === slug);
  if (!starData) return {};

  const title = `${starData.name}在十二宮 · 紫微斗數詳解 — 命裡`;
  const description = `${starData.brief}。檢視${starData.name}落入命宮、財帛宮、夫妻宮等十二宮位時的詳細解讀，依據逾百部紫微斗數典籍。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/star/${starData.urlSlug}`,
      siteName: "命裡",
      locale: "zh_CN",
    },
    alternates: {
      canonical: `https://www.mingli.study/star/${starData.urlSlug}`,
    },
  };
}

export default async function StarOverviewPage(
  { params }: { params: Promise<PageParams> }
) {
  const { star: raw } = await params;
  const slug = decodeURIComponent(raw);
  const starData =
    (MAJOR_STARS.find(s => s.urlSlug === slug || s.name === slug) as { name: string; brief: string; urlSlug: string; polarity?: string; element: string; group?: string } | undefined) ??
    ASSISTANT_STARS.find(s => s.urlSlug === slug || s.name === slug);
  if (!starData) notFound();

  const path = `/star/${starData.urlSlug}`;

  // 相關閱讀: curated related stars (only major stars carry `related` slugs)
  const majorSelf = MAJOR_STARS.find(s => s.urlSlug === starData.urlSlug);
  const relatedStars = (majorSelf?.related ?? [])
    .map(rs => MAJOR_STARS.find(s => s.urlSlug === rs))
    .filter((s): s is (typeof MAJOR_STARS)[number] => Boolean(s));

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "星曜", path: "/star" },
          { name: starData.name, path },
        ]),
        articleSchema({
          headline: `${starData.name}在十二宮 · 紫微斗數詳解`,
          description: starData.brief,
          path,
          section: "星曜",
        }),
      ]} />
      <LibraryNav category="star" currentTitle={starData.name} />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

        {/* Hero */}
        <div className="text-center pt-8 pb-4 space-y-2">
          <h1
            className="text-4xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.15em" }}
          >
            {starData.name}
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">{"polarity" in starData ? starData.polarity : starData.group} · 五行屬{starData.element}</p>
          <div className="flex items-center gap-3 justify-center pt-1">
            <div className="h-px w-16 bg-vermillion/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
            <div className="h-px w-16 bg-vermillion/20" />
          </div>
        </div>

        {/* Star summary */}
        <div className="paper-card rounded-2xl border border-border-warm p-5">
          <p className="text-sm text-ink-2 leading-relaxed">{starData.brief}</p>
        </div>

        {/* Palace grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-vermillion rounded-full" />
            <h2 className="text-sm font-bold text-ink tracking-wide">
              {starData.name}在十二宮詳解
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PALACES.map(p => (
              <Link
                key={p.name}
                href={`/star/${starData.urlSlug}/${p.urlSlug}`}
                className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 space-y-1 block"
              >
                <p className="text-sm font-bold text-ink">{starData.name}在{p.name}</p>
                <p className="text-[11px] text-ink-4 leading-relaxed">{p.brief}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 相關閱讀 */}
        {relatedStars.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-vermillion rounded-full" />
              <h2 className="text-sm font-bold text-ink tracking-wide">相關閱讀</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {relatedStars.map(s => (
                <Link
                  key={s.name}
                  href={`/star/${s.urlSlug}`}
                  className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 block space-y-1"
                >
                  <p className="text-sm font-bold text-ink">{s.name}</p>
                  <p className="text-[11px] text-ink-4 leading-relaxed">{s.brief}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <LikeButton />
        <ToolCTA
          variant="card"
          sub={`想知道${starData.name}在你命盤中落於何宮、是吉是兇？AI 綜合三派典籍，為你詳批專屬命格。`}
          label="生成我的命盤詳批"
        />

        {/* Other stars */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">其他主星</p>
          <div className="flex flex-wrap gap-2">
            {MAJOR_STARS.filter(s => s.name !== starData.name).map(s => (
              <Link
                key={s.name}
                href={`/star/${s.urlSlug}`}
                className="text-xs px-3 py-1 rounded-full border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
