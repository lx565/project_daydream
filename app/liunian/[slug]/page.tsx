import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { LIUNIAN, getLiuNian } from "@/lib/liuNianData";
import { getLiuNianContent } from "@/lib/seoContent";
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
  return LIUNIAN.map(e => ({ slug: e.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getLiuNian(urlSlug);
  if (!entry) return {};

  const title = `${entry.title} — 命裡`;
  const description = seoDescription(entry.oneLine, entry.intro);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/liunian/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/liunian/${entry.urlSlug}`,
    },
  };
}

const KIND_LABELS: Record<string, string> = {
  jichu: "基礎入門",
  gongwei: "宮位流年",
  sihua: "四化流年",
};

export default async function LiuNianArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getLiuNian(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getLiuNianContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(slug => getLiuNian(slug))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const pagePath = `/liunian/${entry.urlSlug}`;

  const faq = seoFaqItems(entry);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "流年運勢", path: "/liunian" },
          { name: entry.name, path: pagePath },
        ]),
        articleSchema({
          headline: entry.title,
          description: entry.subtitle,
          path: pagePath,
          section: "流年運勢",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="liunian" currentTitle={entry.name} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-amber-600 tracking-widest font-medium">
              {KIND_LABELS[entry.kind]}
            </p>
            <h1
              className="text-3xl font-bold text-amber-700 leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.08em" }}
            >
              {entry.name}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-amber-300/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
              <div className="h-px w-16 bg-amber-300/50" />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label="排你的命盤 · AI 解析你的流年運勢走向 →" />

          {/* Prominent bridge to the 2026丙午年生肖運勢 cluster — this is the
              actual fix for "2026年運勢屬鼠"-type searchers landing on theory
              pages instead of a direct answer (2026-07-25 SEO audit). Shown on
              the two highest-traffic entry points into this theory cluster. */}
          {(entry.urlSlug === "liunian-jieshao" || entry.urlSlug === "liunian-minggong") && (
            <Link
              href="/liunian-2026"
              className="block paper-card rounded-2xl border-2 border-amber-300/60 hover:border-amber-400 p-5 transition-colors bg-amber-50/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-amber-600 font-medium tracking-wide">2026丙午年 · 十二生肖流年運勢</p>
                  <p className="text-base font-bold text-ink mt-1" style={{ fontFamily: "var(--font-serif)" }}>
                    想知道你2026年整體運勢？先看你的生肖與太歲關係 →
                  </p>
                  <p className="text-xs text-ink-4 mt-1.5 leading-relaxed">
                    比起先學流年理論，不如先看屬於你生肖的2026年直接解讀——屬鼠、屬牛、屬虎……十二生肖逐一詳解。
                  </p>
                </div>
                <span className="text-amber-600 text-xl shrink-0">→</span>
              </div>
            </Link>
          )}

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

          <ToolCTA variant="card" sub="AI 依據逾百部典籍，結合你的命盤格局分析當年的重點宮位與四化變化，給出具體的流年判斷。" label="解析我的流年運勢" />

          {/* Related articles */}
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
              <p className="text-xs text-ink-4 font-medium">相關話題</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/liunian/${e.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-amber-300 hover:text-amber-700 transition-colors"
                  >
                    <p className="font-medium">{e.name}</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{e.oneLine}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="紫微斗數 AI · 依據逾百部典籍為你詳批流年運勢走向 →" />

        </div>
      </main>
    </>
  );
}
