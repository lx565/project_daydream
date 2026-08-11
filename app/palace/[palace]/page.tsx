import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PALACES } from "@/lib/starData";
import { getPalaceHubContent } from "@/lib/seoContent";
import PalaceHubView from "@/components/PalaceHubView";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return [];
}

interface PageParams { palace: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { palace: raw } = await params;
  const slug = decodeURIComponent(raw);
  const palaceData = PALACES.find(p => p.urlSlug === slug || p.name === slug);
  if (!palaceData) return {};

  const title = `${palaceData.name}詳解 · 紫微斗數十二宮 — 命裡`;
  const description = `${palaceData.name}代表什麼？${palaceData.brief}。命裡依據逾百部紫微斗數典籍，系統講解${palaceData.name}的看法，以及十四主星落入${palaceData.name}的不同表現。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/palace/${palaceData.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/palace/${palaceData.urlSlug}`,
    },
  };
}

export default async function PalaceHubPage(
  { params }: { params: Promise<PageParams> }
) {
  const { palace: raw } = await params;
  const slug = decodeURIComponent(raw);
  const palaceData = PALACES.find(p => p.urlSlug === slug || p.name === slug);
  if (!palaceData) notFound();

  const { markdown, refs } = await getPalaceHubContent(palaceData);
  const path = `/palace/${palaceData.urlSlug}`;

  // FAQ: entry-specific pair from palaceData.brief + a general 三方四正 concept
  // pair (reused verbatim from the star-palace page's live FAQ for consistency).
  const faq = [
    { question: `${palaceData.name}代表什麼？`, answer: `${palaceData.brief}。` },
    {
      question: "什麼是三方四正？",
      answer: "三方四正指任一宮位與其相互拱照的另外三宮所組成的格局。以命宮為例，「三方」是財帛宮、官祿宮、遷移宮，「四正」加上命宮本身。論任何一宮都不能孤立看，必須連同三方四正一起會照，才能準確判斷。",
    },
    {
      question: `${palaceData.name}由哪顆星坐守最好？`,
      answer: `沒有絕對的「最好」，要看星曜是否廟旺、有無四化加持、三方四正會照的組合。同一顆星在${palaceData.name}，落陷或逢煞與廟旺加吉，意義可以完全不同，必須整盤合參。`,
    },
  ];

  // 相關閱讀: curated related palaces
  const relatedPalaces = (("related" in palaceData ? palaceData.related : undefined) ?? [])
    .map(rs => PALACES.find(p => p.urlSlug === rs))
    .filter((p): p is (typeof PALACES)[number] => Boolean(p));

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "宮位", path: "/palace" },
          { name: palaceData.name, path },
        ]),
        articleSchema({
          headline: `${palaceData.name}詳解 · 紫微斗數十二宮`,
          description: palaceData.brief,
          path,
          section: "宮位",
        }),
        faqSchema(faq),
      ]} />
      <PalaceHubView palace={palaceData} markdown={markdown} refs={refs} faq={faq} />
      {relatedPalaces.length > 0 && (
        <section className="bg-parchment">
          <div className="max-w-2xl mx-auto px-4 pb-16 -mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-vermillion rounded-full" />
              <h2 className="text-sm font-bold text-ink tracking-wide">相關閱讀</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {relatedPalaces.map(p => (
                <Link
                  key={p.name}
                  href={`/palace/${p.urlSlug}`}
                  className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 block space-y-1"
                >
                  <p className="text-sm font-bold text-ink">{p.name}</p>
                  <p className="text-[11px] text-ink-4 leading-relaxed">{p.brief}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
