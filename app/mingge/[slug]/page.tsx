import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MINGGE_LIST } from "@/lib/minggeData";
import { getMinggeContent } from "@/lib/seoContent";
import MinggeView from "@/components/MinggeView";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import type { ZiweiResult } from "@/lib/ziwei";
import minggeExamples from "@/lib/minggeExamples.json";

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
  const decoded = decodeURIComponent(slug);
  // Look up by urlSlug (pinyin), fall back to slug (Chinese) for backwards compat
  const entry = MINGGE_LIST.find(m => m.urlSlug === decoded || m.slug === decoded);
  if (!entry) return {};

  const title = `${entry.name} · 紫微斗數格局詳解 — 命裡`;
  const description = `${entry.name}是什麼？${entry.brief}。命裡依據逾百部紫微斗數典籍，深度解析${entry.name}的入格條件、命運特質與吉凶影響。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/mingge/${entry.urlSlug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/mingge/${entry.urlSlug}`,
    },
  };
}

export default async function MinggePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const entry = MINGGE_LIST.find(m => m.urlSlug === decoded || m.slug === decoded);
  if (!entry) notFound();

  const { markdown, refs } = await getMinggeContent(entry);

  // Find verified example birth data for this 命格 and compute chart
  type ExampleRow = { slug: string; year: number; month: number; day: number; hour: number; shichen: string; gender: string };
  const rawExample = (minggeExamples as ExampleRow[]).find(e => e.slug === decoded);

  let chartData: ZiweiResult | undefined;
  let chartGender: "male" | "female" | undefined;
  let chartLabel: string | undefined;

  if (rawExample) {
    const { calculateZiwei } = await import("@/lib/ziwei");
    chartGender = rawExample.gender === "男命" ? "male" : "female";
    chartData = await calculateZiwei(rawExample.year, rawExample.month, rawExample.day, rawExample.hour, chartGender);
    chartLabel = `${rawExample.year}年${rawExample.month}月${rawExample.day}日 ${rawExample.shichen}（${rawExample.gender}）`;
  }

  const path = `/mingge/${entry.urlSlug}`;

  // FAQ: entry-specific pair from brief + condition (no invented copy), plus one
  // general concept pair explaining 入格 for readers new to the term.
  const faq = [
    { question: `${entry.name}是什麼？`, answer: entry.brief },
    { question: `${entry.name}的入格條件是什麼？`, answer: entry.condition },
    {
      question: "命盤符合條件就一定成格嗎？",
      answer: "不一定。入格條件是基礎門檻，但格局的高低還要看是否會照煞星、有無四化加持、三方四正的整體組合，同樣的格局在不同命盤中層次可以差很多，必須整盤合參，不能只看單一條件。",
    },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "命格", path: "/mingge" },
          { name: entry.name, path },
        ]),
        articleSchema({
          headline: `${entry.name} · 紫微斗數格局詳解`,
          description: entry.brief,
          path,
          section: "命格格局",
        }),
        faqSchema(faq),
      ]} />
      <MinggeView entry={entry} markdown={markdown} refs={refs} faq={faq} chartData={chartData} chartGender={chartGender} chartLabel={chartLabel} />
    </>
  );
}
