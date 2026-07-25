import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { GUIDE_TOPICS, guideFaqItems } from "@/lib/guideTopics";
import { getGuideContent } from "@/lib/seoContent";
import GuideView from "@/components/GuideView";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const maxDuration = 60; // deep R1 synthesis needs headroom
export const revalidate = 604800;

// Render on-demand and cache (see star page note); keeps the build fast.
export async function generateStaticParams() {
  return [];
}

interface PageParams { topic: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { topic: rawTopic } = await params;
  const urlSlug = decodeURIComponent(rawTopic);
  // Look up by urlSlug (pinyin), fall back to slug (Chinese) for backwards compat
  const topicData = GUIDE_TOPICS.find(t => t.urlSlug === urlSlug || t.slug === urlSlug);
  if (!topicData) return {};

  const title = `${topicData.title} · 紫微斗數詳解 — 命裡`;
  const description = topicData.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/guide/${topicData.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/guide/${topicData.urlSlug}`,
    },
  };
}

export default async function GuidePage(
  { params }: { params: Promise<PageParams> }
) {
  const { topic: rawTopic } = await params;
  const urlSlug = decodeURIComponent(rawTopic);
  const topicData = GUIDE_TOPICS.find(t => t.urlSlug === urlSlug || t.slug === urlSlug);
  if (!topicData) notFound();
  // Reached via the legacy Chinese slug (e.g. /guide/紫微斗數入門)? 308-redirect to the
  // pinyin canonical so Google consolidates the duplicate instead of holding it as an
  // "Alternate page with proper canonical tag". Stronger signal than the canonical tag.
  if (urlSlug !== topicData.urlSlug) permanentRedirect(`/guide/${topicData.urlSlug}`);

  const { markdown, refs } = await getGuideContent(topicData);

  const allTopics = GUIDE_TOPICS.map(t => ({ slug: t.slug, urlSlug: t.urlSlug, title: t.title }));
  const path = `/guide/${topicData.urlSlug}`;
  const faq = guideFaqItems(topicData);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "學習指南", path: "/guide" },
          { name: topicData.title, path },
        ]),
        articleSchema({
          headline: `${topicData.title} · 紫微斗數詳解`,
          description: topicData.subtitle,
          path,
          section: "學習指南",
        }),
        faqSchema(faq),
      ]} />
      <GuideView
        topic={topicData}
        markdown={markdown}
        refs={refs}
        allTopics={allTopics}
        faq={faq}
      />
    </>
  );
}
