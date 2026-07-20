import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MAJOR_STARS, PALACES } from "@/lib/starData";
import { ASSISTANT_STARS } from "@/lib/assistantStarData";
import { getStarPalaceContent, getAssistantStarPalaceContent } from "@/lib/seoContent";
import StarPalaceView from "@/components/StarPalaceView";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/jsonld";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return [];
}

interface PageParams { star: string; palace: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const raw = await params;
  const starSlug = decodeURIComponent(raw.star);
  const palaceSlug = decodeURIComponent(raw.palace);
  const starData =
    MAJOR_STARS.find(s => s.urlSlug === starSlug || s.name === starSlug) ??
    ASSISTANT_STARS.find(s => s.urlSlug === starSlug || s.name === starSlug);
  const palaceData = PALACES.find(p => p.urlSlug === palaceSlug || p.name === palaceSlug);
  if (!starData || !palaceData) return {};

  const title = `${starData.name}在${palaceData.name} · 紫微斗數詳解 — 命裡`;
  const description = `${starData.name}落於${palaceData.name}代表什麼？${palaceData.brief}。命裡依據逾百部紫微斗數典籍，深度解讀${starData.name}在${palaceData.name}的影響、與主星互動及實用建議。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/star/${starData.urlSlug}/${palaceData.urlSlug}`,
      siteName: "命裡",
      locale: "zh_CN",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/star/${starData.urlSlug}/${palaceData.urlSlug}`,
    },
  };
}

export default async function StarPalacePage(
  { params }: { params: Promise<PageParams> }
) {
  const raw = await params;
  const starSlug = decodeURIComponent(raw.star);
  const palaceSlug = decodeURIComponent(raw.palace);

  const majorStar = MAJOR_STARS.find(s => s.urlSlug === starSlug || s.name === starSlug);
  const assistantStar = majorStar ? undefined : ASSISTANT_STARS.find(s => s.urlSlug === starSlug || s.name === starSlug);
  const palaceData = PALACES.find(p => p.urlSlug === palaceSlug || p.name === palaceSlug);
  if ((!majorStar && !assistantStar) || !palaceData) notFound();

  const { markdown, refs } = majorStar
    ? await getStarPalaceContent(majorStar, palaceData)
    : await getAssistantStarPalaceContent(assistantStar!, palaceData);

  const starData = majorStar ?? assistantStar!;
  const path = `/star/${starData.urlSlug}/${palaceData.urlSlug}`;

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "星曜", path: "/star" },
          { name: starData.name, path: `/star/${starData.urlSlug}` },
          { name: `${starData.name}在${palaceData.name}`, path },
        ]),
        articleSchema({
          headline: `${starData.name}在${palaceData.name} · 紫微斗數詳解`,
          description: `${starData.name}落於${palaceData.name}的詳細解讀。${palaceData.brief}`,
          path,
          section: "星曜宮位",
        }),
      ]} />
      <StarPalaceView
        star={{ name: starData.name, urlSlug: starData.urlSlug, element: starData.element, brief: starData.brief, polarity: "polarity" in starData ? starData.polarity : starData.group }}
        palace={palaceData}
        markdown={markdown}
        refs={refs}
      />
    </>
  );
}
