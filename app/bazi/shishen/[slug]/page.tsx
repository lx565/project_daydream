import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SHISHEN, getShishen } from "@/lib/baziShishen";
import { getShishenContent } from "@/lib/seoContent";
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
  return SHISHEN.map(s => ({ slug: s.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getShishen(urlSlug);
  if (!entry) return {};

  const title = `${entry.name}是什麼意思？八字十神詳解 — 命裡`;
  const description = seoDescription(entry.oneLine, entry.intro);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/bazi/shishen/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/bazi/shishen/${entry.urlSlug}`,
    },
  };
}

export default async function ShishenPage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getShishen(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getShishenContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(slug => getShishen(slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const path = `/bazi/shishen/${entry.urlSlug}`;

  const faq = seoFaqItems(entry);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: entry.name, path },
        ]),
        articleSchema({
          headline: `${entry.name}詳解 · 八字十神`,
          description: entry.subtitle,
          path,
          section: "八字命理",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="bazi" currentTitle={`${entry.name}`} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-ink-4 tracking-widest">八字十神 · {entry.pair}</p>
            <h1
              className="text-4xl font-bold text-gold leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
            >
              {entry.name}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-gold/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
              <div className="h-px w-16 bg-gold/20" />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label="排你的八字 · AI 詳解你命中的十神與格局 →" />

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

          <LikeButton />
          <VoteWidget />

          <ToolCTA variant="card" sub="理論之外，更要看你自己的八字。日主旺衰、十神格局、調候用神，AI 為你逐項詳批。" label="生成我的八字詳批" />

          {/* Related 十神 */}
          {/* FAQ — definitional/評價 query intent + FAQPage rich results */}
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

          {relatedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相關十神</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(s => (
                  <Link
                    key={s.urlSlug}
                    href={`/bazi/shishen/${s.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-gold/40 hover:text-gold transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="八字 + 紫微雙系統 · AI 依據逾百部典籍為你詳批 →" />

        </div>
      </main>
    </>
  );
}
