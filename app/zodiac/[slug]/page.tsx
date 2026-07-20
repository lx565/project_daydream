import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cleanMd } from "@/lib/cleanMd";
import { MD_REMARK, MD_REHYPE } from "@/lib/mdConfig";
import { STAR_ZODIAC_LIST, ZODIAC_ZIWEI_LIST } from "@/lib/personalityData";
import { getStarZodiacContent, getZodiacZiweiContent } from "@/lib/seoContent";
import ToolCTA from "@/components/ToolCTA";
import LikeButton from "@/components/LikeButton";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/jsonld";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return [
    ...STAR_ZODIAC_LIST.map(e => ({ slug: e.slug })),
    ...ZODIAC_ZIWEI_LIST.map(e => ({ slug: e.slug })),
  ];
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug } = await params;

  const starEntry = STAR_ZODIAC_LIST.find(e => e.slug === slug);
  if (starEntry) {
    const title = `${starEntry.starName}星命宮 × ${starEntry.primaryZodiac} · 紫微×星座 — 命裡`;
    return {
      title,
      description: starEntry.brief,
      openGraph: { title, description: starEntry.brief, url: `https://www.mingli.study/zodiac/${slug}`, siteName: "命裡", locale: "zh_CN", type: "article" },
      alternates: { canonical: `https://www.mingli.study/zodiac/${slug}` },
    };
  }

  const zodiacEntry = ZODIAC_ZIWEI_LIST.find(e => e.slug === slug);
  if (zodiacEntry) {
    const title = `${zodiacEntry.zodiacName} · 紫微斗數命盤原型對照 — 命裡`;
    return {
      title,
      description: zodiacEntry.brief,
      openGraph: { title, description: zodiacEntry.brief, url: `https://www.mingli.study/zodiac/${slug}`, siteName: "命裡", locale: "zh_CN", type: "article" },
      alternates: { canonical: `https://www.mingli.study/zodiac/${slug}` },
    };
  }

  return {};
}

export default async function ZodiacArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug } = await params;

  const starEntry = STAR_ZODIAC_LIST.find(e => e.slug === slug);
  const zodiacEntry = !starEntry ? ZODIAC_ZIWEI_LIST.find(e => e.slug === slug) : null;
  if (!starEntry && !zodiacEntry) notFound();

  const { markdown } = starEntry
    ? await getStarZodiacContent(starEntry)
    : await getZodiacZiweiContent(zodiacEntry!);

  const isStarArticle = !!starEntry;
  const path = `/zodiac/${slug}`;
  const headline = starEntry
    ? `${starEntry.starName}星命宮 × ${starEntry.primaryZodiac} · 紫微×星座`
    : `${zodiacEntry!.zodiacName} · 紫微斗數命盤原型`;
  const desc = (starEntry ?? zodiacEntry!).brief;

  // Cross-link: star article ↔ the matching 星座→紫微 article (and vice-versa).
  const reverseZodiac = starEntry
    ? ZODIAC_ZIWEI_LIST.find(z => z.zodiacSlug === starEntry.primaryZodiacSlug)
    : null;
  const reverseStar = zodiacEntry
    ? STAR_ZODIAC_LIST.find(s => s.starSlug === zodiacEntry.primaryStarSlug)
    : null;

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "紫微 × 星座", path: "/zodiac" },
          { name: headline, path },
        ]),
        articleSchema({ headline, description: desc, path, section: "紫微×星座" }),
      ]} />
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/zodiac" className="hover:text-vermillion transition-colors">紫微×星座</Link>
          <span>/</span>
          <span className="text-ink-3 truncate">
            {isStarArticle ? `${starEntry!.starName}×${starEntry!.primaryZodiac}` : zodiacEntry!.zodiacName}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {/* Header */}
        <div className="pt-6 space-y-3">
          {isStarArticle ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full bg-vermillion-l text-vermillion border border-vermillion/30 font-medium">
                  {starEntry!.primaryZodiac}
                </span>
                <span className="text-xs text-ink-4">命裡 · 紫微×星座</span>
              </div>
              <h1 className="text-2xl font-bold text-ink leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                {starEntry!.starName}星命宮<br />
                <span className="text-vermillion">原型像 {starEntry!.primaryZodiac}？</span>
              </h1>
              <p className="text-sm text-ink-3 leading-relaxed">{starEntry!.brief}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full bg-jade/10 text-jade border border-jade/30 font-bold">
                  {zodiacEntry!.zodiacName}
                </span>
                <span className="text-xs text-ink-4">命裡 · 紫微×星座</span>
              </div>
              <h1 className="text-2xl font-bold text-ink leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                {zodiacEntry!.zodiacName}<br />
                <span className="text-jade">的紫微命盤原型</span>
              </h1>
              <p className="text-sm text-ink-3 leading-relaxed">{zodiacEntry!.brief}</p>
            </>
          )}
        </div>

        {/* Framing note: 對照 not equivalence */}
        <div className="rounded-xl border border-border-light bg-paper-2/50 px-4 py-3">
          <p className="text-xs text-ink-4 leading-relaxed">
            提示：紫微主星與西方星座沒有天文或歷史淵源，本文是「性格原型類比」，
            不是說「紫微星=星座」。一東一西，異曲同工，結合著看更立體。
          </p>
        </div>

        {/* Article body */}
        <article className="paper-card rounded-2xl border border-border-warm p-5 sm:p-6 prose-custom">
          <ReactMarkdown
            remarkPlugins={MD_REMARK}
            rehypePlugins={MD_REHYPE}
            components={{
              h2: ({ children }) => (
                <h2 className="text-base font-bold text-ink mt-6 mb-2 pb-1 border-b border-border-light first:mt-0">{children}</h2>
              ),
              p: ({ children }) => <p className="text-sm text-ink-2 leading-relaxed mb-3">{children}</p>,
              ul: ({ children }) => <ul className="space-y-1.5 mb-3">{children}</ul>,
              li: ({ children }) => (
                <li className="text-sm text-ink-2 leading-relaxed flex gap-2">
                  <span className="text-vermillion shrink-0 mt-0.5">·</span>
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => <strong className="text-ink font-semibold">{children}</strong>,
            }}
          >
            {cleanMd(markdown)}
          </ReactMarkdown>
        </article>

        {/* Cross-link to related article */}
        {isStarArticle && reverseZodiac && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
            <p className="text-xs font-medium text-ink-3">瞭解 {starEntry!.primaryZodiac} 的命盤原型</p>
            <Link
              href={`/zodiac/${reverseZodiac.slug}`}
              className="inline-flex items-center gap-2 text-sm text-jade hover:underline"
            >
              → {starEntry!.primaryZodiac} · 紫微斗數命盤原型對照
            </Link>
          </div>
        )}
        {!isStarArticle && reverseStar && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
            <p className="text-xs font-medium text-ink-3">瞭解對應星曜詳解</p>
            <Link
              href={`/zodiac/${reverseStar.slug}`}
              className="inline-flex items-center gap-2 text-sm text-vermillion hover:underline"
            >
              → {zodiacEntry!.primaryStar}星命宮 × 星座 對照深度解讀
            </Link>
          </div>
        )}

        <LikeButton />
        <ToolCTA variant="slim" label="排你的命盤，看命宮主星 →" />

        <Link href="/zodiac" className="block text-center text-xs text-ink-4 hover:text-vermillion transition-colors">
          ← 返回紫微×星座 全覽
        </Link>
      </div>
    </main>
  );
}
