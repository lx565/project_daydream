// JSON-LD structured-data builders. Each returns a plain schema.org object;
// render with <JsonLd data={...} /> (components/JsonLd.tsx). Additive only —
// these never change page content, they just help search engines understand it.

export const SITE = "https://www.mingli.study";
const SITE_NAME = "命裡";

/** Site-wide identity. Emit once (root layout). */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "命裡 紫微斗數",
    url: SITE,
    inLanguage: "zh-CN",
    description: "紫微斗數線上排盤與 AI 詳批，三合·四化·飛星三派合參，依據84部命理典籍。",
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE,
    logo: `${SITE}/icon.png`,
  };
}

/** Breadcrumb trail. `items` are ordered root → current; pass paths or absolute URLs. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.path.startsWith("http") ? it.path : `${SITE}${it.path}`,
    })),
  };
}

/** An article/explainer page (star, palace, 格局, guide, personality). */
export function articleSchema(opts: {
  headline: string;
  description: string;
  path: string;
  section?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    inLanguage: "zh-CN",
    mainEntityOfPage: `${SITE}${opts.path}`,
    ...(opts.section ? { articleSection: opts.section } : {}),
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE}/icon.png` },
    },
  };
}

/** An FAQ section (hub pages). Mirror the visible <details> Q&A on the page. */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

function birthDateISO(birthLabel: string): string | undefined {
  const m = birthLabel.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : undefined;
}
function deathYear(era: string): string | undefined {
  const m = era.match(/[–\-—](\d{4})/);
  return m ? m[1] : undefined;
}

/** A real notable person (famous-people pages). */
export function personSchema(person: {
  name: string; nameEn: string; era: string; domain: string; brief: string; birthLabel: string;
}, path: string) {
  const birth = birthDateISO(person.birthLabel);
  const death = deathYear(person.era);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    alternateName: person.nameEn,
    description: person.brief,
    url: `${SITE}${path}`,
    knowsAbout: person.domain.split(/[·、,，]/).map((s) => s.trim()).filter(Boolean),
    ...(birth ? { birthDate: birth } : {}),
    ...(death ? { deathDate: death } : {}),
  };
}
