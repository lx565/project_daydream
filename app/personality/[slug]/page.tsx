import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cleanMd } from "@/lib/cleanMd";
import { MD_REMARK, MD_REHYPE } from "@/lib/mdConfig";
import { STAR_MBTI_LIST, MBTI_ZIWEI_LIST } from "@/lib/personalityData";
import { getStarMbtiContent, getMbtiZiweiContent } from "@/lib/seoContent";
import ToolCTA from "@/components/ToolCTA";
import LikeButton from "@/components/LikeButton";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return [];
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug } = await params;

  const starEntry = STAR_MBTI_LIST.find(e => e.slug === slug);
  if (starEntry) {
    const title = `${starEntry.starName}星命宮 × ${starEntry.primaryMbti} ${starEntry.primaryMbtiName} · 紫微×MBTI — 命裡`;
    return {
      title,
      description: starEntry.brief,
      openGraph: { title, description: starEntry.brief, url: `https://www.mingli.study/personality/${slug}`, siteName: "命裡", locale: "zh_TW", type: "article" },
      alternates: { canonical: `https://www.mingli.study/personality/${slug}` },
    };
  }

  const mbtiEntry = MBTI_ZIWEI_LIST.find(e => e.slug === slug);
  if (mbtiEntry) {
    const title = `${mbtiEntry.mbtiCode} ${mbtiEntry.mbtiName} · 紫微斗數命盤畫像 — 命裡`;
    return {
      title,
      description: mbtiEntry.brief,
      openGraph: { title, description: mbtiEntry.brief, url: `https://www.mingli.study/personality/${slug}`, siteName: "命裡", locale: "zh_TW", type: "article" },
      alternates: { canonical: `https://www.mingli.study/personality/${slug}` },
    };
  }

  return {};
}

export default async function PersonalityArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug } = await params;

  const starEntry = STAR_MBTI_LIST.find(e => e.slug === slug);
  const mbtiEntry = !starEntry ? MBTI_ZIWEI_LIST.find(e => e.slug === slug) : null;
  if (!starEntry && !mbtiEntry) notFound();

  const { markdown } = starEntry
    ? await getStarMbtiContent(starEntry)
    : await getMbtiZiweiContent(mbtiEntry!);

  const isStarArticle = !!starEntry;
  const path = `/personality/${slug}`;
  const headline = starEntry
    ? `${starEntry.starName}星命宮 × ${starEntry.primaryMbti} ${starEntry.primaryMbtiName} · 紫微×MBTI`
    : `${mbtiEntry!.mbtiCode} ${mbtiEntry!.mbtiName} · 紫微斗數命盤畫像`;
  const desc = (starEntry ?? mbtiEntry!).brief;

  // FAQ: entry-specific pair from .brief (no invented copy) + a general concept
  // pair explaining the crossover isn't a literal equivalence — important framing
  // for this cluster since it maps a Western typology onto 紫微 star placements.
  const faq = starEntry
    ? [
        { question: `${starEntry.starName}星命宮的人是${starEntry.primaryMbti}嗎？`, answer: starEntry.brief },
        {
          question: "紫微星曜和 MBTI 是同一回事嗎？",
          answer: "不是。紫微斗數是命理系統，MBTI 是現代心理學的人格分類工具，兩者理論基礎完全不同。這個對照是借用大眾熟悉的 MBTI 語言，幫助理解星曜特質的一種類比，不是說某星曜「等於」某個 MBTI 類型，實際性格仍需綜合整張命盤判斷。",
        },
      ]
    : [
        { question: `${mbtiEntry!.mbtiCode} ${mbtiEntry!.mbtiName}對應紫微斗數哪個命盤特質？`, answer: mbtiEntry!.brief },
        {
          question: "MBTI 和紫微星曜對照準確嗎？",
          answer: "這個對照是借用大眾熟悉的 MBTI 語言，類比紫微星曜的特質傾向，供作趣味參考與理解命盤的切入點，並非嚴謹的一對一對應。真正的性格與命格，仍需以完整命盤的星曜組合、宮位與四化綜合判斷。",
        },
      ];

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "紫微 × MBTI", path: "/personality" },
          { name: headline, path },
        ]),
        articleSchema({ headline, description: desc, path, section: "紫微×MBTI" }),
        faqSchema(faq),
      ]} />
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/personality" className="hover:text-vermillion transition-colors">紫微×MBTI</Link>
          <span>/</span>
          <span className="text-ink-3 truncate">
            {isStarArticle ? `${starEntry!.starName}×${starEntry!.primaryMbti}` : mbtiEntry!.mbtiCode}
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
                  {starEntry!.primaryMbti} · {starEntry!.primaryMbtiName}
                </span>
                <span className="text-xs text-ink-4">命裡 · 紫微×MBTI</span>
              </div>
              <h1 className="text-2xl font-bold text-ink leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                {starEntry!.starName}星命宮<br />
                <span className="text-vermillion">= {starEntry!.primaryMbti} {starEntry!.primaryMbtiName}？</span>
              </h1>
              <p className="text-sm text-ink-3 leading-relaxed">{starEntry!.brief}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full bg-jade/10 text-jade border border-jade/30 font-mono font-bold">
                  {mbtiEntry!.mbtiCode}
                </span>
                <span className="text-xs text-ink-4">命裡 · 紫微×MBTI</span>
              </div>
              <h1 className="text-2xl font-bold text-ink leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                {mbtiEntry!.mbtiCode}·{mbtiEntry!.mbtiName}<br />
                <span className="text-jade">的紫微命盤畫像</span>
              </h1>
              <p className="text-sm text-ink-3 leading-relaxed">{mbtiEntry!.brief}</p>
            </>
          )}
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

        {/* Cross-link to related articles */}
        {isStarArticle && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
            <p className="text-xs font-medium text-ink-3">瞭解 {starEntry!.primaryMbti} 的命盤畫像</p>
            <Link
              href={`/personality/${starEntry!.primaryMbti.toLowerCase()}`}
              className="inline-flex items-center gap-2 text-sm text-jade hover:underline"
            >
              → {starEntry!.primaryMbti} {starEntry!.primaryMbtiName} · 紫微命盤深度解讀
            </Link>
          </div>
        )}
        {!isStarArticle && (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
            <p className="text-xs font-medium text-ink-3">瞭解對應星曜詳解</p>
            <Link
              href={`/personality/${mbtiEntry!.primaryStarSlug}-mbti`}
              className="inline-flex items-center gap-2 text-sm text-vermillion hover:underline"
            >
              → {mbtiEntry!.primaryStar}星命宮 × MBTI 對照深度解讀
            </Link>
          </div>
        )}

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

        <LikeButton />
        <ToolCTA variant="slim" label="排你的命盤，看命宮主星 →" />

        <Link href="/personality" className="block text-center text-xs text-ink-4 hover:text-vermillion transition-colors">
          ← 返回紫微×MBTI 全覽
        </Link>
      </div>
    </main>
  );
}
