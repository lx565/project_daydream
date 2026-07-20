# 真实命例 (Real Case Examples) on 八字 Hub Pages — Design

**Date:** 2026-07-03
**Status:** Approved (design), pending implementation plan

## Context

The 1,711 historical 八字 cases (`content/cases/*.json`) were removed from the AI
reading on 2026-07-03 because the raw classical text is fatalistic and jargon-dense
("horrible" — near-death crashes, failed marriages, mid-sentence fragments). But the
cases have real learning value: authentic charts with real outcomes.

Niki wants to resurface them as **learning material on the SEO/blog pages** — a reader
studying a life-domain can see real examples of what a chart meant for that domain.
Key constraint he raised: a life has many elements, so on the marriage page we should
**only discuss the marriage angle** of each case, not the whole life story.

## Constraints (established during brainstorming)

- **Cases are 八字-only.** Each carries `rizi` (日主), `geju`, `bazi_text` (four pillars),
  `analysis`, `prediction`, `outcome`, `gender`, `era`. There is **no 紫微 chart** — no
  stars/palaces. So cases cannot be shown on 紫微 star/palace pages, only 八字 pages.
- **Static SEO pages have no reader chart** to match against (unlike the reading, which
  used `caseMatch.ts` on the user's 日主/格局). Selection must be content-driven.
- **Raw case text is the problem we're solving**, so it must not be shown verbatim.
- Many cases are sparse (empty `geju`/`outcome`); cases without an outcome are weak
  learning examples.

## Decisions

1. **Scope:** the 4 八字 applied-cluster **hub pages** only — `/bazi/hunyin` (marriage),
   `/bazi/shiye` (career), `/bazi/caiyun` (wealth), `/bazi/jibing` (health). Not the 28
   sub-topic article pages (can extend later), not 紫微 pages.
2. **Processing:** LLM pre-processes cases offline (one-time, cached to JSON) to both
   select domain-relevant cases and rewrite a clean, plain-language, domain-scoped blurb.
3. **Presentation:** ~8–10 case cards per hub. Shown text is the LLM-rewritten blurb, not
   raw case text.

## What the reader sees

New section **"真实命例 · [婚姻/事业/财运/健康]"** on each hub page, ~8–10 cards. Each card:

- **四柱** (`bazi_text`) + **日主/格局** badge
- **Domain-scoped blurb**: "命主…，八字中[what the chart showed *for this domain only*]
  → **结局**：[what actually happened]" — warm, educational, no fatalism
- Link to the full case: `/cases/[slug]` ("看完整命例 →")
- One-line section intro framing it as study material

## Data pipeline (offline, one-time)

Because placement is hub-only, we need ~10 good cases per domain (~40 total), **not** all
1,711 processed — this bounds LLM cost.

1. **Keyword pre-filter (free):** per domain, select candidate cases that (a) mention the
   domain (marriage: 婚/妻/夫/配偶/离/桃花; career: 官/事业/职/升; wealth: 财/富/破财;
   health: 病/灾/伤/亡/寿) AND (b) have a non-empty `outcome`.
2. **LLM scope + rewrite (~20–30 candidates/domain, ~100 calls total):** DeepSeek confirms
   the case meaningfully illustrates the domain and writes the scoped blurb; discards weak
   or off-domain candidates. Uses `ANTI_CLICHE` rules.
3. **Curate:** keep top ~10/domain → `content/cases-domains/{hunyin,shiye,caiyun,jibing}.json`.
   Each entry: `{ caseId, slug, bazi_text, rizi, geju, blurb }`.

### Quality guardrails (prompt-enforced)
Plain language; strictly the one domain; no doom/fatalism; framed as learning; outcome
required; length-capped per blurb. Same anti-templated-prose rules as the SEO generators.

## New / changed pieces

- `scripts/genCaseDomains.mjs` — the offline pipeline (keyword filter → LLM → curate).
  Flags mirroring existing gen scripts (`--domain`, `--limit`, `--dry-run`, `--force`).
- `content/cases-domains/{hunyin,shiye,caiyun,jibing}.json` — curated output (committed).
- `lib/caseDomains.ts` — tiny loader that reads a domain's JSON (server-side).
- `components/BaziCaseExamples.tsx` — server component (static, NO "use client"), renders
  the card section from the domain JSON.
- Wire `<BaziCaseExamples domain="hunyin" />` etc. into the 4 hub page components
  (`app/bazi/{hunyin,shiye,caiyun,jibing}/page.tsx`).

## SEO synergy

These cards give the strongest ~40 case pages **internal links from high-value hub pages**.
Since cases were just removed from the sitemap (2026-07-03), this is the better indexing
path: Google discovers the *good* cases contextually via the hubs, instead of drowning in
1,711 sitemap entries. Also adds unique, real-example content to the hub pages themselves.

## Out of scope (YAGNI)

- Sub-topic article pages (the 28 `[slug]` pages) — hub-first; revisit if it lands.
- 紫微 star/palace case matching — needs chart computation the cases can't support.
- Processing all 1,711 cases — only ~40 curated are needed for hubs.
- Any change to the reading UI (cases stay removed there).

## Verification

- Run `scripts/genCaseDomains.mjs --dry-run` → inspect candidate counts per domain.
- Run for real → confirm `content/cases-domains/*.json` has ~8–10 quality entries each,
  blurbs are plain-language + domain-scoped + non-fatalistic, and each links a real slug.
- `npm run build` clean; confirm the section renders in built HTML of the 4 hub pages
  (server component → present in static HTML).
- Spot-check live: cards show, blurbs read well, "看完整命例" links resolve (200).

## Deployment

Auto-deploy to production at the end of implementation (`npx vercel --prod --yes`), after
`npm run build` passes locally. Verify the 4 hub pages render the section live.
