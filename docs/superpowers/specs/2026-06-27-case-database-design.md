# Phase 2 — 历史命造案例系统 Design Spec

**Date:** 2026-06-27  
**Status:** Approved for implementation

---

## Overview

Build a structured database of real 八字 命造 cases extracted from the 7 master case books already in the corpus. Use these cases for two purposes:

1. **SEO content pages** — `/cases/[slug]` pages publishing each case as a real historical 命理 analysis example
2. **Reading integration** — "历史类似命盘" section in the 八字 tab, shown only when the user's 日主/格局 matches a stored case

Scope: **八字 only**. 紫微 deferred — no dedicated case books exist in current corpus.

---

## Part 1 — Extraction Pipeline

### Script: `scripts/extractCases.mjs`

Processes the 7 case books from `knowledge/chunks.json` chunk by chunk.

**Source books:**
- 韦千里-千里命稿 (265 chunks, ~40–60 detailed cases)
- 四柱详批命例精解 (254 chunks, ~60–100 detailed cases)
- 潘东光-八字批论选集 (273 chunks, ~50–80 detailed cases)
- 人鉴命理存验五十例 (124 chunks, ~50 cases)
- 八字实例详解 (112 chunks, ~30–50 cases)
- 人鑒命理存驗 (42 chunks, ~20–30 cases)
- 李洪成-古今四柱6000例简析-丙丁年生命造1000例 (522 chunks, batch mode — multiple brief cases per chunk)

**Per-chunk LLM call (DeepSeek R1):**
- Step 1 (classify): "Does this chunk contain one or more 八字 命造 case analyses?" → yes/no
- Step 2 (extract, if yes): structured JSON extraction

**Extracted record schema:**

```ts
interface CaseRecord {
  id: string;           // e.g. "qianli-mingao-001"
  slug: string;         // pinyin-encoded for URL, e.g. "jiamu-shisheng-ge-qianli-001"
  source: string;       // book name from chunks.json
  rizi: string;         // 日主天干 e.g. "甲木" — primary matching key
  geju: string;         // 格局 e.g. "食神格" — secondary matching key (empty if unclear)
  yongshen: string;     // 用神 e.g. "丙火" (empty if not stated)
  bazi_text: string;    // 八字柱 e.g. "甲子 甲午 甲申 庚申" (empty if not given)
  gender: "male" | "female" | "unknown";
  era: string;          // e.g. "民国" "近代" "古代" (empty if unknown)
  analysis: string;     // master's analysis verbatim (simplified Chinese)
  prediction: string;   // predictions made (extracted from analysis if not separate)
  outcome: string;      // what actually happened (empty if not stated)
}
```

**Output:**
- `content/cases/{id}.json` — one file per case
- `content/cases/index.json` — flat array of `{ id, slug, source, rizi, geju }` for fast in-memory lookup at read time

**李洪成 batch mode:** Each chunk may contain 3–5 brief cases. The extraction prompt handles multiple cases per chunk and returns an array. These cases will have thin `analysis` fields but are still useful for matching.

**Skip logic:** If a chunk has no 八字 (no四柱), no master analysis, and no prediction — skip. Pure theory chunks (~60–70% of case book chunks) will be skipped.

**QA:** After extraction, run a quick review pass — flag records where `rizi` is empty (could not identify 日主) and discard those.

---

## Part 2 — SEO Pages

### Routes

- `/cases` — hub page
- `/cases/[slug]` — individual case page

### Hub page (`/cases`)

- Grouped by 日主 (甲木/乙木/丙火/丁火/戊土/己土/庚金/辛金/壬水/癸水) with case counts
- Secondary filter by 格局 within each 日主 group
- Shows total case count + source book breakdown
- LibraryNav: add "命造案例" tab under the 八字 section
- Free access (SEO content)

### Individual case page (`/cases/[slug]`)

Sections:
1. **八字柱** — rendered visually if `bazi_text` present, else text only
2. **命理特征** — 日主 / 格局 / 用神 chips
3. **大师批语** — `analysis` verbatim, formatted as blockquote with source attribution
4. **预测** — `prediction` field
5. **结局** — `outcome` field (hidden if empty)
6. **来源** — links to `/sources/[book-slug]`
7. **相关案例** — 3 other cases with same 日主

SEO metadata: title = `{日主}{格局}命理案例解析·{source}`, description generated from analysis excerpt.

Data loading: `lib/casesData.ts` — `getCaseBySlug(slug)`, `getCasesByRizi(rizi)`, `getAllCases()`. Reads from `content/cases/`.

JSON-LD: `Article` schema with author = master name (extracted from source book).

---

## Part 3 — Reading Integration

### Matching logic (`lib/caseMatch.ts`)

```ts
function findMatchingCases(rizi: string, geju: string, limit = 3): CaseRecord[]
```

1. Load `content/cases/index.json` (cached in module scope)
2. Filter: `rizi === userRizi` AND `geju === userGeju` → primary matches
3. If primary matches < 2: expand to `rizi === userRizi` only → fallback matches
4. If still 0 matches: return `[]` (section hidden)
5. Return up to `limit` cases (prefer cases with non-empty `outcome`)

### Input sources

- `rizi`: extracted from user's 八字 string (day stem — deterministic, no AI needed)
- `geju`: computed by a lightweight `detectGeju(bazi)` helper using 月令 + 天干透干 rules (deterministic). If the helper cannot determine a clean 格局, falls back to 日主-only matching. This avoids fragile parsing of B1 prose output.

### UI — `components/HistoricalCases.tsx`

- Placed in 八字 tab between B1 and B3 (replaces current B4 `bazi-cases` RAG section)
- Renders only when `findMatchingCases()` returns results
- Each case card shows: 八字柱 · 日主/格局 chips · analysis excerpt (first 80 chars) · outcome (if exists) · source · link to full `/cases/[slug]` page
- Header: "历史类似命盘"
- No streaming — all data is local JSON, renders instantly

### Replaces B4

The current `bazi-cases` route (unstructured RAG over same books) is replaced by this structured version. The new system is strictly better: structured fields, deterministic matching, instant render, links to full pages.

---

## Data Flow Summary

```
chunks.json (7 case books, 1,592 chunks)
    ↓ extractCases.mjs (LLM extraction)
content/cases/*.json (300–800 case records)
content/cases/index.json (flat index for matching)
    ↓
    ├── /cases/[slug] pages (SEO content)
    ├── /cases hub (LibraryNav tab)
    └── HistoricalCases.tsx (reading integration)
         ← rizi from user's 八字
         ← geju from detectGeju() helper (deterministic)
```

---

## Out of Scope (this phase)

- 紫微 cases (no dedicated books in corpus — add case books first)
- Paywalling the `/cases` hub or individual pages (free SEO content)
- Interactive chart rendering on case pages (text-only for now)
- Cross-case analytics or browsing by outcome type

---

## Open Questions Resolved

- **李洪成 简析 cases:** Include in both SEO pages and reading matching. Pages will be thin but indexed; matching uses them as fallback when detailed-book matches don't exist.
- **Cases per reading:** Show up to 3, prefer cases with `outcome` filled.
- **`/cases` hub:** Free (SEO), no paywall.
- **B4 replacement:** Yes, `HistoricalCases.tsx` replaces `bazi-cases` RAG section entirely.
