import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { LIUNIAN_2026, getLiunian2026 } from "@/lib/liunian2026Data";
import { getLiuNian } from "@/lib/liuNianData";
import { getLiunian2026Content } from "@/lib/seoContent";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/jsonld";
import SeoMarkdown from "@/components/SeoMarkdown";
import VoteWidget from "@/components/VoteWidget";
import LikeButton from "@/components/LikeButton";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return LIUNIAN_2026.map(e => ({ slug: e.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getLiunian2026(urlSlug);
  if (!entry) return {};

  const title = `${entry.title} — 命裡`;
  const description = entry.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/liunian-2026/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/liunian-2026/${entry.urlSlug}`,
    },
  };
}

// Related links can point either to a sibling 生肖 entry (this file's data)
// or back to a theory article in lib/liuNianData.ts (resolved as /liunian/<slug>)
// — mirrors the resolveRelated pattern in app/sihua-palace/[slug]/page.tsx.
function resolveRelated(slug: string): { href: string; name: string; oneLine: string } | null {
  const own = getLiunian2026(slug);
  if (own) {
    return { href: `/liunian-2026/${own.urlSlug}`, name: own.name, oneLine: own.oneLine };
  }
  const theory = getLiuNian(slug);
  if (theory) {
    return { href: `/liunian/${theory.urlSlug}`, name: theory.name, oneLine: theory.oneLine };
  }
  return null;
}

const RELATION_BADGE: Record<string, string> = {
  沖太歲: "bg-red-50 text-red-600 border-red-200",
  害太歲: "bg-orange-50 text-orange-600 border-orange-200",
  破太歲: "bg-orange-50 text-orange-600 border-orange-200",
  值太歲: "bg-red-50 text-red-600 border-red-200",
  三合太歲: "bg-jade/10 text-jade border-jade/30",
  六合太歲: "bg-jade/10 text-jade border-jade/30",
  三會太歲: "bg-amber-50 text-amber-700 border-amber-200",
  平順: "bg-paper-2 text-ink-3 border-border-warm",
};

export default async function Liunian2026ArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getLiunian2026(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getLiunian2026Content(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(resolveRelated)
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const pagePath = `/liunian-2026/${entry.urlSlug}`;
  const badgeClass = RELATION_BADGE[entry.relation] ?? RELATION_BADGE["平順"];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "流年運勢", path: "/liunian" },
          { name: "2026丙午年生肖運勢", path: "/liunian-2026" },
          { name: entry.name, path: pagePath },
        ]),
        articleSchema({
          headline: entry.title,
          description: entry.subtitle,
          path: pagePath,
          section: "2026丙午年生肖運勢",
        }),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="liunian" currentTitle={entry.name} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-amber-600 tracking-widest font-medium">
              2026丙午年 · 生肖運勢
            </p>
            <h1
              className="text-3xl font-bold text-amber-700 leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.08em" }}
            >
              {entry.name}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center justify-center pt-2">
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${badgeClass}`}>
                與太歲午 · {entry.relation}{entry.relationNote ? ` (${entry.relationNote})` : ""}
              </span>
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label="排你的命盤 · AI 結合完整命盤解析你的2026年運勢 →" />

          {/* Article content */}
          {hasContent && (
            <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
              <SeoMarkdown>{markdown}</SeoMarkdown>
            </div>
          )}

          {/* Refs */}
          {refs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-ink-4 font-medium">參考典籍</p>
              <div className="flex flex-wrap gap-2">
                {refs.map((ref, i) => (
                  <span
                    key={i}
                    className="text-[11px] text-ink-4 bg-paper-2 border border-border-light px-2 py-0.5 rounded"
                  >
                    {ref.school} · {ref.book}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-ink-4/80 leading-relaxed">
                本文由命裡 AI 綜合典籍整理，僅供學習參考。
              </p>
            </div>
          )}

          <LikeButton />
          <VoteWidget />

          <ToolCTA variant="card" sub="生肖只是流年判斷的其中一層——AI 依據逾百部典籍，結合你的完整命盤與大運，給出2026年真正屬於你的深度解讀。" label="生成我的2026年命盤運勢" />

          {/* Related articles */}
          {relatedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相關話題</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(e => (
                  <Link
                    key={e.href}
                    href={e.href}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-amber-300 hover:text-amber-700 transition-colors"
                  >
                    <p className="font-medium">{e.name}</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{e.oneLine}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <Link href="/liunian-2026" className="text-xs text-ink-4 hover:text-amber-700 underline underline-offset-2">
              ← 查看全部十二生肖 2026 年運勢
            </Link>
          </div>

          <ToolCTA variant="slim" label="紫微斗數 AI · 依據逾百部典籍為你詳批2026年整體運勢 →" />

        </div>
      </main>
    </>
  );
}
