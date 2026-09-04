import type { MetadataRoute } from "next";
import { MAJOR_STARS, PALACES } from "@/lib/starData";
import { ASSISTANT_STARS } from "@/lib/assistantStarData";
import { GUIDE_TOPICS } from "@/lib/guideTopics";
import { BOOK_ARTICLES } from "@/lib/bookArticles";
import { MINGGE_LIST } from "@/lib/minggeData";
import { FAMOUS_PEOPLE } from "@/lib/famousData";
import { STAR_MBTI_LIST, MBTI_ZIWEI_LIST, STAR_ZODIAC_LIST, ZODIAC_ZIWEI_LIST } from "@/lib/personalityData";
import { SHISHEN } from "@/lib/baziShishen";
import { QINGGAN } from "@/lib/qingganData";
import { SIHUA } from "@/lib/sihuaData";
import { ACTIVITIES } from "@/lib/huangli";
import { SIHUA_PALACE } from "@/lib/sihuaPalaceData";
import { XIONG } from "@/lib/xiongData";
import { LIUNIAN } from "@/lib/liuNianData";
import { LIUNIAN_2026 } from "@/lib/liunian2026Data";
import { HUNYIN } from "@/lib/hunyinData";
import { SHIYE } from "@/lib/shiyeData";
import { CAIYUN } from "@/lib/caiyunData";
import { JIBING } from "@/lib/jibingData";
import { TIANGAN } from "@/lib/baziTiangan";
import { GEJU } from "@/lib/baziGeju";
import { BAZI_GUIDE } from "@/lib/baziGuide";
import { BAZI_HUNYIN } from "@/lib/baziHunyinData";
import { BAZI_SHIYE } from "@/lib/baziShiyeData";
import { BAZI_CAIYUN } from "@/lib/baziCaiyunData";
import { BAZI_JIBING } from "@/lib/baziJibingData";
import { SHENSHA } from "@/lib/shenshaData";
import { SOURCE_BOOKS } from "@/lib/sourcesData";
import { loadCaseIndex } from "@/lib/casesData";

const BASE = "https://www.mingli.study";

// Stable lastmod — bump this when content meaningfully changes. Using a fixed date
// (vs new Date()) keeps lastmod truthful; Google ignores always-"now" timestamps.
const LAST_CONTENT_UPDATE = new Date("2026-06-30");

// New cluster added 2026-07-25 (2026丙午年生肖運勢) — genuinely newer than the
// sitewide LAST_CONTENT_UPDATE above, so it gets its own lastmod rather than
// falsely claiming it existed as of 2026-06-30.
const LIUNIAN_2026_UPDATE = new Date("2026-07-25");

export default function sitemap(): MetadataRoute.Sitemap {
  const starOverviews = MAJOR_STARS.map(s => ({
    url: `${BASE}/star/${s.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const palaceHubs = PALACES.map(p => ({
    url: `${BASE}/palace/${p.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const combinations = MAJOR_STARS.flatMap(s =>
    PALACES.map(p => ({
      url: `${BASE}/star/${s.urlSlug}/${p.urlSlug}`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
  );

  const zeriPages = ACTIVITIES.map(a => ({
    url: `${BASE}/zeri/${a.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
    lastModified: new Date(),
  }));

  const guidePages = GUIDE_TOPICS.map(t => ({
    url: `${BASE}/guide/${t.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const bookPages = BOOK_ARTICLES.map(a => ({
    url: `${BASE}/books/${a.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const casePages = loadCaseIndex().map((c) => ({
    url: `${BASE}/cases/${c.slug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const shenshaArticles = SHENSHA.map(s => ({
    url: `${BASE}/bazi/shensha/${s.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const sourcePages = SOURCE_BOOKS.map(b => ({
    url: `${BASE}/sources/${b.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const minggePages = MINGGE_LIST.map(m => ({
    url: `${BASE}/mingge/${m.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const famousPages = FAMOUS_PEOPLE.map(p => ({
    url: `${BASE}/famous/${p.slug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const shishenPages = SHISHEN.map(s => ({
    url: `${BASE}/bazi/shishen/${s.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const tianganPages = TIANGAN.map(t => ({
    url: `${BASE}/bazi/tiangan/${t.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const gejuPages = GEJU.map(g => ({
    url: `${BASE}/bazi/geju/${g.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const baziGuidePages = BAZI_GUIDE.map(g => ({
    url: `${BASE}/bazi/guide/${g.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const baziHunyinPages = BAZI_HUNYIN.map(e => ({
    url: `${BASE}/bazi/hunyin/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const baziShiyePages = BAZI_SHIYE.map(e => ({
    url: `${BASE}/bazi/shiye/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const baziCaiyunPages = BAZI_CAIYUN.map(e => ({
    url: `${BASE}/bazi/caiyun/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const baziJibingPages = BAZI_JIBING.map(e => ({
    url: `${BASE}/bazi/jibing/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const xiongPages = XIONG.map(e => ({
    url: `${BASE}/xiong/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const liuNianPages = LIUNIAN.map(e => ({
    url: `${BASE}/liunian/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // 2026丙午年生肖運勢 — seasonal, high-intent cluster (P2 SEO audit fix for
  // "2026年運勢屬鼠"-type queries bouncing off the theory-only /liunian pages).
  // Priority set above the theory cluster since this is the actual search-intent match.
  const liunian2026Pages = LIUNIAN_2026.map(e => ({
    url: `${BASE}/liunian-2026/${e.urlSlug}`,
    lastModified: LIUNIAN_2026_UPDATE,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const hunyinPages = HUNYIN.map(e => ({
    url: `${BASE}/hunyin/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const shiyePages = SHIYE.map(e => ({
    url: `${BASE}/shiye/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const caiyunPages = CAIYUN.map(e => ({
    url: `${BASE}/caiyun/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const jibingPages = JIBING.map(e => ({
    url: `${BASE}/jibing/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const sihuaPages = SIHUA.map(e => ({
    url: `${BASE}/sihua/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const sihuaPalacePages = SIHUA_PALACE.map(e => ({
    url: `${BASE}/sihua-palace/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const qingganPages = QINGGAN.map(e => ({
    url: `${BASE}/qinggan/${e.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const assistantStarOverviews = ASSISTANT_STARS.map(s => ({
    url: `${BASE}/star/${s.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const assistantStarCombinations = ASSISTANT_STARS.flatMap(s =>
    PALACES.map(p => ({
      url: `${BASE}/star/${s.urlSlug}/${p.urlSlug}`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }))
  );

  const personalityPages = [
    ...STAR_MBTI_LIST.map(e => ({ url: `${BASE}/personality/${e.slug}`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...MBTI_ZIWEI_LIST.map(e => ({ url: `${BASE}/personality/${e.slug}`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: "monthly" as const, priority: 0.75 })),
  ];

  const zodiacPages = [
    ...STAR_ZODIAC_LIST.map(e => ({ url: `${BASE}/zodiac/${e.slug}`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...ZODIAC_ZIWEI_LIST.map(e => ({ url: `${BASE}/zodiac/${e.slug}`, lastModified: LAST_CONTENT_UPDATE, changeFrequency: "monthly" as const, priority: 0.75 })),
  ];

  return [
    { url: BASE, changeFrequency: "weekly" as const, priority: 1.0, lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/library`,     changeFrequency: "monthly" as const, priority: 0.9,  lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/personality`, changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...personalityPages,
    { url: `${BASE}/zodiac`, changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...zodiacPages,
    { url: `${BASE}/famous`,   changeFrequency: "monthly" as const, priority: 0.8, lastModified: LAST_CONTENT_UPDATE },
    ...famousPages,
    { url: `${BASE}/mingge`,   changeFrequency: "monthly" as const, priority: 0.8, lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/guide`,    changeFrequency: "monthly" as const, priority: 0.8, lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/books`,    changeFrequency: "monthly" as const, priority: 0.8, lastModified: LAST_CONTENT_UPDATE },
    ...bookPages,
    { url: `${BASE}/sources`,  changeFrequency: "monthly" as const, priority: 0.8, lastModified: LAST_CONTENT_UPDATE },
    ...sourcePages,
    { url: `${BASE}/cases`, changeFrequency: "weekly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...casePages,
    { url: `${BASE}/qinggan`,  changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...qingganPages,
    { url: `${BASE}/sihua`,    changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...sihuaPages,
    ...sihuaPalacePages,
    { url: `${BASE}/xiong`,    changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...xiongPages,
    { url: `${BASE}/liunian`, changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...liuNianPages,
    { url: `${BASE}/liunian-2026`, changeFrequency: "weekly" as const, priority: 0.95, lastModified: LIUNIAN_2026_UPDATE },
    ...liunian2026Pages,
    { url: `${BASE}/huangli`, changeFrequency: "daily" as const, priority: 0.9, lastModified: new Date() },
    ...zeriPages,
    { url: `${BASE}/hunyin`, changeFrequency: "monthly" as const, priority: 0.9, lastModified: LAST_CONTENT_UPDATE },
    ...hunyinPages,
    { url: `${BASE}/shiye`,  changeFrequency: "monthly" as const, priority: 0.9, lastModified: LAST_CONTENT_UPDATE },
    ...shiyePages,
    { url: `${BASE}/caiyun`, changeFrequency: "monthly" as const, priority: 0.9, lastModified: LAST_CONTENT_UPDATE },
    ...caiyunPages,
    { url: `${BASE}/jibing`, changeFrequency: "monthly" as const, priority: 0.9, lastModified: LAST_CONTENT_UPDATE },
    ...jibingPages,
    { url: `${BASE}/bazi`,     changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...shishenPages,
    ...tianganPages,
    ...gejuPages,
    ...baziGuidePages,
    { url: `${BASE}/bazi/hunyin`, changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...baziHunyinPages,
    { url: `${BASE}/bazi/shiye`,  changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...baziShiyePages,
    { url: `${BASE}/bazi/caiyun`, changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...baziCaiyunPages,
    { url: `${BASE}/bazi/jibing`, changeFrequency: "monthly" as const, priority: 0.85, lastModified: LAST_CONTENT_UPDATE },
    ...baziJibingPages,
    ...shenshaArticles,
    { url: `${BASE}/star`,     changeFrequency: "monthly" as const, priority: 0.8, lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/palace`,     changeFrequency: "monthly" as const, priority: 0.8,  lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/hepan`,      changeFrequency: "monthly" as const, priority: 0.9,  lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/bazihepan`,  changeFrequency: "monthly" as const, priority: 0.9,  lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/yueyun`,     changeFrequency: "monthly" as const, priority: 0.9,  lastModified: LAST_CONTENT_UPDATE },
    { url: `${BASE}/niandu`,     changeFrequency: "monthly" as const, priority: 0.9,  lastModified: LAST_CONTENT_UPDATE },
    ...guidePages,
    ...minggePages,
    ...palaceHubs,
    ...starOverviews,
    ...combinations,
    ...assistantStarOverviews,
    ...assistantStarCombinations,
  ];
}
