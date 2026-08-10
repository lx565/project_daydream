import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SIHUA_PALACE, getSihuaPalace, sihuaPalaceFaqItems, type SihuaPalaceHua } from "@/lib/sihuaPalaceData";
import { getSihua } from "@/lib/sihuaData";
import { getSihuaPalaceContent } from "@/lib/seoContent";
import { seoDescription } from "@/lib/seoDescription";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import SeoMarkdown from "@/components/SeoMarkdown";
import VoteWidget from "@/components/VoteWidget";
import LikeButton from "@/components/LikeButton";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";

export const maxDuration = 60;
export const revalidate = 604800;

// Per-化 theming so each palace article matches its own 化 type and the color
// coding on the /sihua hub (化忌 amber · 化祿 emerald · 化權 blue · 化科 violet).
// Full literal class strings — Tailwind can't extract dynamically-built names.
// `pillar` is the parent 化 pillar slug in lib/sihuaData.ts (SIHUA_PILLARS), so
// the breadcrumb points to the matching pillar, not always 化忌.
const HUA_THEME: Record<SihuaPalaceHua, {
  labelText: string; h1: string; line: string; dot: string; relatedHover: string; pillar: string;
}> = {
  "忌": { labelText: "text-amber-600",   h1: "text-amber-700",   line: "bg-amber-300/40",   dot: "bg-amber-400/50",   relatedHover: "hover:border-amber-300 hover:text-amber-700",     pillar: "hua-ji" },
  "祿": { labelText: "text-emerald-600", h1: "text-emerald-700", line: "bg-emerald-300/40", dot: "bg-emerald-400/50", relatedHover: "hover:border-emerald-300 hover:text-emerald-700", pillar: "hua-lu" },
  "權": { labelText: "text-blue-600",    h1: "text-blue-700",    line: "bg-blue-300/40",    dot: "bg-blue-400/50",    relatedHover: "hover:border-blue-300 hover:text-blue-700",       pillar: "hua-quan" },
  "科": { labelText: "text-violet-600",  h1: "text-violet-700",  line: "bg-violet-300/40",  dot: "bg-violet-400/50",  relatedHover: "hover:border-violet-300 hover:text-violet-700",   pillar: "hua-ke" },
};

export async function generateStaticParams() {
  return SIHUA_PALACE.map(e => ({ slug: e.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getSihuaPalace(urlSlug);
  if (!entry) return {};

  const title = `${entry.title} — 命裡`;
  const description = seoDescription(entry.oneLine, entry.intro);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/sihua-palace/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/sihua-palace/${entry.urlSlug}`,
    },
  };
}

// Related links can point either to a sibling 化×宮位 entry (this file's data)
// or back up to the parent 化 pillar page (e.g. "hua-ji" in lib/sihuaData.ts) —
// resolve against both sources so the `related` array in sihuaPalaceData.ts can
// mix the two without callers needing to know which source a slug lives in.
function resolveRelated(slug: string): { href: string; name: string; oneLine: string } | null {
  const palaceEntry = getSihuaPalace(slug);
  if (palaceEntry) {
    return { href: `/sihua-palace/${palaceEntry.urlSlug}`, name: palaceEntry.name, oneLine: palaceEntry.oneLine };
  }
  const sihuaEntry = getSihua(slug);
  if (sihuaEntry) {
    return { href: `/sihua/${sihuaEntry.urlSlug}`, name: sihuaEntry.name, oneLine: sihuaEntry.oneLine };
  }
  return null;
}

export default async function SihuaPalaceArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getSihuaPalace(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getSihuaPalaceContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(resolveRelated)
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const pagePath = `/sihua-palace/${entry.urlSlug}`;
  const theme = HUA_THEME[entry.hua];
  const parentPillar = getSihua(theme.pillar);
  const faq = sihuaPalaceFaqItems(entry);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "四化詳解", path: "/sihua" },
          ...(parentPillar ? [{ name: parentPillar.name, path: `/sihua/${parentPillar.urlSlug}` }] : []),
          { name: entry.name, path: pagePath },
        ]),
        articleSchema({
          headline: entry.title,
          description: entry.subtitle,
          path: pagePath,
          section: "四化詳解",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="sihua" currentTitle={entry.name} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className={`text-xs ${theme.labelText} tracking-widest font-medium`}>
              十二宮 · {entry.huaName}
            </p>
            <h1
              className={`text-3xl font-bold ${theme.h1} leading-snug`}
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.08em" }}
            >
              {entry.name}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className={`h-px w-16 ${theme.line}`} />
              <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
              <div className={`h-px w-16 ${theme.line}`} />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label={`排你的命盤 · AI 解析你的${entry.huaName}實際落在哪個宮位 →`} />

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

          <ToolCTA variant="card" sub={`AI 依據逾百部典籍，結合你的完整命盤判斷${entry.huaName}實際落在哪個宮位並給出專屬深度解讀。`} label="生成我的命盤四化詳批" />

          {/* FAQ — matches /sihua; targets the definitional / 化解 query intent + FAQPage rich results */}
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
                    key={e.href}
                    href={e.href}
                    className={`paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 ${theme.relatedHover} transition-colors`}
                  >
                    <p className="font-medium">{e.name}</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{e.oneLine}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="紫微斗數 AI · 依據逾百部典籍為你詳批四化落宮 →" />

        </div>
      </main>
    </>
  );
}
