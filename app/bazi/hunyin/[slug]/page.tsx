import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BAZI_HUNYIN, getBaziHunyin } from "@/lib/baziHunyinData";
import { getBaziHunyinContent } from "@/lib/seoContent";
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
  return BAZI_HUNYIN.map(e => ({ slug: e.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getBaziHunyin(urlSlug);
  if (!entry) return {};

  const title = `${entry.title} — 命裡`;
  const description = entry.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/bazi/hunyin/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_CN",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/bazi/hunyin/${entry.urlSlug}`,
    },
  };
}

export default async function BaziHunyinArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getBaziHunyin(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getBaziHunyinContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(slug => getBaziHunyin(slug))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const pagePath = `/bazi/hunyin/${entry.urlSlug}`;

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: "八字看婚姻", path: "/bazi/hunyin" },
          { name: entry.name, path: pagePath },
        ]),
        articleSchema({
          headline: entry.title,
          description: entry.subtitle,
          path: pagePath,
          section: "八字命理",
        }),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="bazi" currentTitle={entry.title} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-fuchsia-600 tracking-widest font-medium">八字看婚姻</p>
            <h1
              className="text-3xl font-bold text-fuchsia-700 leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.06em" }}
            >
              {entry.title}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-fuchsia-300/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/50" />
              <div className="h-px w-16 bg-fuchsia-300/50" />
            </div>
          </div>

          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label="排你的八字 · AI 解析你的配偶星、夫妻宮與正緣時機 →" />

          {hasContent && (
            <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
              <SeoMarkdown>{markdown}</SeoMarkdown>
            </div>
          )}

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

          <ToolCTA variant="card" sub="AI 依據子平命理典籍，結合你的配偶星、日支夫妻宮與大運流年，分析配偶特質、感情模式與正緣時機。" label="解析我的八字婚姻" />

          {relatedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相關話題</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/bazi/hunyin/${e.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-fuchsia-300 hover:text-fuchsia-700 transition-colors"
                  >
                    <p className="font-medium">{e.name}</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{e.oneLine}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="八字 + 紫微雙系統 · AI 依據逾百部典籍為你詳批婚姻 →" />

        </div>
      </main>
    </>
  );
}
