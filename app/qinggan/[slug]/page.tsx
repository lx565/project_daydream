import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { QINGGAN, getQinggan } from "@/lib/qingganData";
import { getQingganContent } from "@/lib/seoContent";
import { seoDescription } from "@/lib/seoDescription";
import { seoFaqItems } from "@/lib/seoFaq";
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
  return QINGGAN.map(e => ({ slug: e.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getQinggan(urlSlug);
  if (!entry) return {};

  const title = `${entry.title} — 命裡`;
  const description = seoDescription(entry.oneLine, entry.intro);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/qinggan/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/qinggan/${entry.urlSlug}`,
    },
  };
}

export default async function QingganArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getQinggan(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getQingganContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(slug => getQinggan(slug))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const path = `/qinggan/${entry.urlSlug}`;
  const faq = seoFaqItems(entry);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "感情與桃花", path: "/qinggan" },
          { name: entry.name, path },
        ]),
        articleSchema({
          headline: entry.title,
          description: entry.subtitle,
          path,
          section: "感情命理",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="qinggan" currentTitle={entry.name} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-ink-4 tracking-widest">{entry.category}</p>
            <h1
              className="text-3xl font-bold text-rose-700 leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.08em" }}
            >
              {entry.name}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-rose-300/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400/50" />
              <div className="h-px w-16 bg-rose-300/40" />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label="排你的命盤 · AI 詳解你的感情運與桃花 →" />

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

          <ToolCTA variant="card" sub="感情格局、桃花運、流年夫妻宮……AI 依據逾百部典籍為你深度解讀。" label="生成我的感情命盤詳批" />

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
          {relatedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相關話題</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/qinggan/${e.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-rose-300 hover:text-rose-700 transition-colors"
                  >
                    <p className="font-medium">{e.name}</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{e.oneLine}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="紫微 + 八字雙系統 · AI 依據逾百部典籍為你詳批 →" />

        </div>
      </main>
    </>
  );
}
