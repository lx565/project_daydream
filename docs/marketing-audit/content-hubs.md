# Content hubs and SEO templates audit (2026-10-19)

Scope: library, guide, sources, cases (templates), star, palace, mingge, sihua, personality, famous, liunian*, qinggan, zodiac and the other topic routes, plus ToolCTA, LibraryNav, MinggeView and the lib/*Data.ts templates. Verified against a local `next start` crawl of all 2,698 sitemap URLs.

## Claim table

| File:line (pre-edit) | Text | Verdict | Action |
|---|---|---|---|
| app/library/page.tsx:11 | 「超過3萬個知識檢索塊」 | accurate but jargon | reworded 「3萬+段典籍片段」 |
| app/library/page.tsx:11,19,51,150,236 | 「百餘部」「逾百部」 | accurate (117 books) | kept |
| app/library/page.tsx:46 | guide count hard-coded 「19 篇指南」 | inaccurate (27 guide URLs) | now `GUIDE_TOPICS.length` |
| app/library/page.tsx:219-221 | 「33 位歷史名人」 hard-coded | inaccurate (43 people; includes living people) | computed from `FAMOUS_PEOPLE`, dropped 「歷史」 |
| app/library/page.tsx:220 | 「依據精確命盤計算…深度解讀格局如何塑造傳奇人生」 | overstated (causal + 「精確」) | 「依據命盤排算…解讀格局與人生軌跡的對照」 |
| app/library/page.tsx:240-241 | 「命裡 AI 讀過的全部典籍…共 78 部」 | inaccurate (KB has 117 books; page lists 78) | 「收錄百餘部…本頁精選 78 部」, badge 「部精選」 |
| app/library/page.tsx counts for star 336, sihua 91, mingge 31, zodiac 26, personality 14+16, hunyin/shiye/caiyun/jibing/xiong 14, bazi/hunyin 12, qinggan 15, liunian 11, liunian-2026 12, books 30, bazi 40 | | accurate (match content/seo and sitemap) | kept (hard-coded; will drift if content changes) |
| app/sources/page.tsx:13,16,62 | 「AI 讀過的全部命理典籍…共逾百部典籍、逾三萬條知識」 | unverifiable/overstated (page lists 78; its own chunk sum is 12,535) | 「知識庫收錄百餘部…3萬+段…本頁精選書目」 |
| app/sources/page.tsx:100-102 | 「AI 閱讀並學習了 {78} 部…共提煉 {12,535} 條…每一條解讀背後都有典籍依據」 | inconsistent with meta and with truth sheet; unsupportable | 「收錄百餘部，本頁精選介紹其中 78 部…依據典籍整理，並經 AI 輔助校驗」; removed chunk total |
| app/sources/page.tsx:35 (FAQ) | 「每一條解讀都基於…原文提煉而成」 | unsupportable | 「依據…整理而成，並經 AI 輔助校驗」 |
| app/sources/[slug]/page.tsx:50 | description always appended 「…」 even when not truncated (≈70 pages) | awkward | only when truncated |
| components/MinggeView.tsx:146-148 | 「Gemini · Claude · DeepSeek 三大模型多輪交叉稽核與驗證，確保命理準確性」 | unsupportable (Claude not in pipeline; 「確保準確性」) | 「依據典籍整理，並經 AI 輔助校驗，僅供學習參考」 |
| components/ToolCTA.tsx:28,36 | 「AI 依據 逾百部典籍」 stray space | typo | fixed |
| app/liunian/page.tsx:39 | 「如2025年為巳年」 | outdated | 「如2026年為午年」 |
| app/famous/page.tsx:13,60,78 | 「精確命盤資料」「歷史名人」 | overstated (FAQ on same page says birth hour is uncertain); living people | 「命盤排算」「名人」 |
| app/famous/[slug]/page.tsx:51,99,162 | `formations[0]` / `join` | inaccurate output: 4 people (張學友 etc.) have no formations -> title 「…命盤解析 · undefined」, FAQ 「具格局」, empty 格局 row | fallbacks 「紫微斗數」 / 「命盤無特定成格」 / 「無特定成格」 |
| lib/famousData.ts:278 | 張學友 brief 「歷經酗酒低谷後浴火重生」 | private-life claim about a living person, unsourced | removed |
| app/cases/[slug]/page.tsx:27-28,57 | meta description = first 100 chars of verbatim Simplified, OCR-garbled analysis; title identical for 80-185 pages (e.g. 「甲木命造案例 \| 命裡」 x182) | Simplified leftovers, duplicate titles, quoted passages in meta | description templated from displayed facts (source, 日主, 格局, 用神, 附應驗記錄); title gets case number 「#6」; JSON-LD description same. URLs unchanged, left indexable |
| app/star/[star]/page.tsx:34 (+ star/[star]/[palace], palace/[palace], mingge/[slug]) | `${brief}。` | awkward: 「。。」 on 14 star pages | trailing 。 stripped |
| lib/liunian2026Data.ts:95,99 | 「並非保證」 style hedges | accurate | kept |
| app/liunian-2026/** | all 2026-titled | accurate today; no 2027 sibling | see Decisions |
| lib/guideTopics.ts:334-351, app/palace, app/star FAQ | 「準確」 used in the sense of 「是否準」 or generic 「才能準確判斷」 | accurate (hedged, not a product claim) | kept |
| lib/sourcesData.ts:587 | 「驗證傳統命理的準確性」 (describing the book) | accurate (about the book) | kept |
| app/bazi/jibing/page.tsx:34,39; lib/baziJibingData.ts | 「絕不是預言疾病」 | fine (disclaimer, not a promise) | kept |
| app/personality/page.tsx:162 | 「命裡獨家研究」 | unverifiable-mild | kept; flag |
| app/famous/[slug] briefs (lib/famousData.ts) | 馬斯克「多次跌入破產邊緣」, 張學友「唱片銷量逾1億張」, 李連杰/成龍/王菲 etc. biographical statements | unverifiable, real people | flagged only (not edited beyond the 酗酒 line) |
| Simplified/醜/紫薇/綫/NEW/iOS-download greps over app, lib, components | none found in templates | accurate | none |

## SEO sanity (crawl of 2,698 sitemap URLs)

- Duplicate titles: none outside /cases. /cases had 1,700 pages with ~10 distinct titles; fixed by case number in the title (≈ distinct), descriptions now unique-per-facts but still similar per 日主/格局/source (expected).
- Empty/awkward output: famous `undefined` (fixed), 「。。」 (fixed), source 「…」 (fixed). No empty 「」 found.
- Titles >60 chars: 0. Descriptions >155 chars: 14 remain (qinggan x6, xiong x5, sihua x2, bazi/shensha/xianchi), all from data brief fields; Google will truncate, not fixed.
- Meta vs page: library guide/famous counts disagreed with listings (fixed); /sources meta vs body disagreed (fixed).
- Systemic, in content/seo and lib data (not edited): /cases bodies and case analysis are verbatim Simplified Chinese classical quotations; several source/zodiac descriptions are very formulaic (「…異曲同工」 repeated across 12 zodiac pages).
- Homepage (not my scope): app/page.tsx:131 badge 「33 位」 names famous people; actual 43.

## Decisions needed

1. 2027 丁未年 liunian sibling to /liunian-2026 (2026 series is in titles/URLs; ~10 weeks left).
2. /cases: bodies are Simplified verbatim quotations; convert display or noindex? (left indexable per instruction).
3. Hard-coded hub counts in library page will drift; compute all from data?
4. Living-person content on /famous (briefs with career/finance statements, 馬斯克/任正非/雷軍 etc.): review or trim.
5. Pricing/free-promo copy was not touched.
