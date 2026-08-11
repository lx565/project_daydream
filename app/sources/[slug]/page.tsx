import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { SOURCE_BOOKS, SCHOOL_LABELS } from "@/lib/sourcesData";
import { getSourceContent } from "@/lib/seoContent";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import SeoMarkdown from "@/components/SeoMarkdown";
import VoteWidget from "@/components/VoteWidget";
import LikeButton from "@/components/LikeButton";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";

export const maxDuration = 60;
export const revalidate = 604800;

// Build a Set of all JSON filenames in content/seo/sources/ at module load time,
// so we can match books whose slug changed case/script since the files were generated.
const SOURCES_DIR = path.join(process.cwd(), "content", "seo", "sources");
const PREGENERATED_FILES = new Set(
  fs.existsSync(SOURCES_DIR) ? fs.readdirSync(SOURCES_DIR).map(f => f.replace(/\.json$/, "")) : []
);

function hasPregenerated(book: import("@/lib/sourcesData").SourceBook): boolean {
  return PREGENERATED_FILES.has(book.slug) || PREGENERATED_FILES.has(book.urlSlug);
}

export async function generateStaticParams() {
  // Pre-render every source page that has pre-generated content under
  // content/seo/sources/ — checks both slug (Chinese name) and urlSlug (pinyin)
  // because the generation script may have used either naming convention.
  return SOURCE_BOOKS
    .filter(hasPregenerated)
    .map(b => ({ slug: b.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const book = SOURCE_BOOKS.find(b => b.urlSlug === urlSlug || b.slug === urlSlug);
  if (!book) return {};

  const title = `${book.title} · ${SCHOOL_LABELS[book.school]}典籍介紹 — 命裡`;
  const description = book.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/sources/${book.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/sources/${book.urlSlug}`,
    },
  };
}

function loadExcerpt(slug: string): string | undefined {
  // Try to load a short excerpt from the extracted text for richer generation.
  // NOTE: knowledge/extracted is excluded from the Vercel deploy (.vercelignore),
  // so these fs reads throw ENOENT at runtime. Must be guarded — an unhandled throw
  // here 500s the whole page (this was the cause of GSC's "Server error (5xx)").
  try {
  const extractDir = path.join(process.cwd(), "knowledge", "extracted");
  const schoolDirs = fs.readdirSync(extractDir).filter(d =>
    fs.statSync(path.join(extractDir, d)).isDirectory()
  );

  for (const school of schoolDirs) {
    const dir = path.join(extractDir, school);
    const files = fs.readdirSync(dir);
    // Try to match by slug (removing leading author- prefix and common suffixes)
    const normalised = slug.replace(/^[^-]+-/, "").replace(/[()（）]/g, "").toLowerCase();
    const match = files.find(f => {
      const fn = f.replace(".txt", "").replace(/[()（）]/g, "").toLowerCase();
      return fn.includes(normalised.slice(0, 6)) || normalised.includes(fn.slice(0, 6));
    });
    if (match) {
      const content = fs.readFileSync(path.join(dir, match), "utf-8");
      // Return first 1500 chars of actual content (skip page headers)
      return content.replace(/\[第\d+頁\]\n?/g, "").slice(0, 1500);
    }
  }
  return undefined;
  } catch {
    return undefined;
  }
}

export default async function SourcePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const book = SOURCE_BOOKS.find(b => b.urlSlug === urlSlug || b.slug === urlSlug);
  if (!book) notFound();

  const excerpt = loadExcerpt(book.slug);
  let markdown = "", refs: import("@/lib/rag").Reference[] = [];
  try {
    ({ markdown, refs } = await getSourceContent(book, excerpt));
  } catch {
    // Synthesis failed (timeout / API error) — render basic page without AI body
  }

  const hasContent = markdown.trim().length > 0;
  const pagePath = `/sources/${book.urlSlug}`;

  // Related books: same school, up to 4
  const related = SOURCE_BOOKS
    .filter(b => b.school === book.school && b.urlSlug !== book.urlSlug)
    .slice(0, 4);

  // FAQ: entry-specific pair from facts already displayed (intro/school/era/author).
  const faq = [
    { question: `《${book.title}》是什麼？`, answer: book.intro },
    {
      question: `《${book.title}》屬於哪個流派？`,
      answer: `${book.title}屬於${SCHOOL_LABELS[book.school]}${book.era ? `，成書於${book.era}` : ""}${book.author ? `，作者${book.author}` : ""}。命裡 AI 已收錄此書，讀命時會自動引用其中相關內容。`,
    },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "典籍書目", path: "/sources" },
          { name: book.title, path: pagePath },
        ]),
        articleSchema({
          headline: `${book.title} · ${SCHOOL_LABELS[book.school]}典籍介紹`,
          description: book.intro,
          path: pagePath,
          section: "典籍知識庫",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="sources" currentTitle={book.title} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-ink-4 tracking-widest">{SCHOOL_LABELS[book.school]} · {book.era}</p>
            <h1
              className="text-3xl font-bold text-vermillion leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.05em" }}
            >
              {book.title}
            </h1>
            {book.author && (
              <p className="text-xs text-ink-4 tracking-widest">作者：{book.author}</p>
            )}
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-vermillion/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
              <div className="h-px w-16 bg-vermillion/20" />
            </div>
          </div>

          {/* Meta card */}
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
            <p className="text-sm text-ink-2 leading-[1.9]">{book.intro}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {book.tags.map(tag => (
                <span key={tag} className="text-[11px] text-ink-4 bg-paper-2 border border-border-light px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              <span className="text-[11px] text-ink-4 bg-paper-2 border border-border-light px-2 py-0.5 rounded ml-auto">
                ~{book.chunks} 條知識
              </span>
            </div>
            <div className="text-xs text-ink-4 pt-1 border-t border-border-light">
              命裡 AI 已收錄此書，讀命時會自動引用其中相關內容。
            </div>
          </div>

          <ToolCTA variant="slim" label="讓 AI 用這些典籍為你詳批命盤 →" />

          {/* Article body */}
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

          <ToolCTA variant="card" sub="這些典籍是命裡 AI 的知識底座。三合、四化、飛星三派合參，AI 依據逾百部典籍為你詳批命格、大限與流年。" label="生成我的命盤詳批" />

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

          {/* Same-school books */}
          {related.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">同流派典籍</p>
              <div className="grid grid-cols-2 gap-2">
                {related.map(b => (
                  <Link
                    key={b.slug}
                    href={`/sources/${b.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-vermillion/40 hover:text-vermillion transition-colors"
                  >
                    <p className="font-medium leading-snug">{b.title}</p>
                    <p className="text-[11px] text-ink-4 mt-1">{b.author || "佚名"}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="三派合參 · AI 依據逾百部典籍為你詳批命盤 →" />

        </div>
      </main>
    </>
  );
}
