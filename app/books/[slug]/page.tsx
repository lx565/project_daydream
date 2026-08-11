import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BOOK_ARTICLES } from "@/lib/bookArticles";
import { getBookContent } from "@/lib/seoContent";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import SeoMarkdown from "@/components/SeoMarkdown";
import VoteWidget from "@/components/VoteWidget";
import LikeButton from "@/components/LikeButton";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return [];
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const article = BOOK_ARTICLES.find(a => a.urlSlug === urlSlug || a.slug === urlSlug);
  if (!article) return {};

  const title = `${article.title} · 命理典籍解讀 — 命裡`;
  const description = article.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/books/${article.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/books/${article.urlSlug}`,
    },
  };
}

export default async function BookPage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const article = BOOK_ARTICLES.find(a => a.urlSlug === urlSlug || a.slug === urlSlug);
  if (!article) notFound();

  const { markdown, refs } = await getBookContent(article);

  const allArticles = BOOK_ARTICLES.map(a => ({ slug: a.slug, urlSlug: a.urlSlug, title: a.title }));
  const relatedArticles = allArticles.filter(a => article.related.includes(a.slug));
  const hasContent = markdown.trim().length > 0;
  const path = `/books/${article.urlSlug}`;

  // FAQ: entry-specific pair from intro/subtitle (no invented copy).
  const faq = [
    { question: `${article.title}是什麼？`, answer: article.intro },
    { question: `${article.title}講的是什麼重點？`, answer: article.subtitle },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "命理書單", path: "/books" },
          { name: article.title, path },
        ]),
        articleSchema({
          headline: `${article.title} · 命理典籍解讀`,
          description: article.subtitle,
          path,
          section: "命理書單",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        {/* Library navigation bar */}
        <LibraryNav category="books" currentTitle={article.title} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-ink-4 tracking-widest">{article.category}</p>
            <h1
              className="text-3xl font-bold text-vermillion leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.05em" }}
            >
              {article.title}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{article.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-vermillion/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
              <div className="h-px w-16 bg-vermillion/20" />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{article.intro}</p>
          </div>

          {/* Early CTA */}
          <ToolCTA variant="slim" label="讀懂典籍 · 讓 AI 用三派典籍詳批你自己的命盤 →" />

          {/* Synthesized article */}
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

          {/* Helpfulness vote */}
          <LikeButton />
          <VoteWidget />

          {/* Main CTA */}
          <ToolCTA variant="card" sub="理論之外，更要看你自己的盤。三合、四化、飛星三派合參，AI 依據逾百部典籍為你詳批命格、大限與流年。" label="生成我的命盤詳批" />

          {/* FAQ */}
          <div className="space-y-3">
            <p className="text-xs text-ink-4 font-medium">常見問題</p>
            <div className="space-y-2">
              {faq.map(item => (
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

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相關內容</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedArticles.map(a => (
                  <Link
                    key={a.slug}
                    href={`/books/${a.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-vermillion/40 hover:text-vermillion transition-colors"
                  >
                    {a.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Final CTA */}
          <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />

        </div>
      </main>
    </>
  );
}
