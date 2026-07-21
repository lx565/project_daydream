# Backlog — deferred ideas

Ideas investigated and intentionally parked, with enough context that we don't
re-derive them from scratch. Newest first.

---

## 问典 — "Ask-the-Classics" corpus-as-product (deferred 2026-07-21)

**Status:** Deferred. Not a feature problem right now — the platform has **zero
paying customers yet**, so the priority is conversion/traffic validation, not new
surface area. Revisit only after there's a real reading→paywall funnel with data.

**The idea:** Expose the 121-book / 31,689-chunk classical RAG corpus (today only
used invisibly as a backend for readings via `lib/rag.ts`) as something users can
directly see/ask — a "vertical Perplexity for 命理 classics" that answers concept
questions and **shows the real quoted classical text**, not just book names.

**Key finding that reframes it (don't forget this):** the corpus is *not* fully
invisible. `/guide/[topic]` already does cited RAG synthesis over the corpus
(`getGuideContent` → `getKnowledge`, topK 10) for **24 curated topics**, and
`GuideView.tsx:115` already renders citations — but only book+school *names*
(`三合派 · 千里命稿`), because `Reference` is just `{book, school}` and
`extractReferences` (`rag.ts:180`) **throws away the chunk `text`**.

So the real delta splits into two separable pieces:

- **Delta B — quoted passages (cheap):** surface the actual classical text that was
  retrieved (already in memory, just discarded). This is the true differentiator
  competitors lack. Could upgrade `/guide` + readings rather than be a new product.
- **Delta A — open-ended questions (big bet):** let users ask *anything* vs pick
  from 24 fixed topics; long-tail SEO + funnel capture. Bigger, more speculative.

**Decisions already made in the brainstorm (2026-07-21), so we can resume mid-stream:**
1. Sequence: **quotes first (Delta B), then open-ended questions (Delta A)** if B lands.
2. Quote surfaces: **paid readings + /guide** (readings = trust/conversion lever on
   the money product; /guide = free SEO).
3. Citation style: **passage-list under each section, NOT inline claim-level
   footnotes** (inline needs the LLM to map each sentence to a source → cost +
   fabrication risk; hold for later).

**Open question that was next (unresolved):** how to turn a messy ~480-char OCR'd
chunk into a clean displayed quote. Chunks start/end mid-sentence and mix concepts,
but contain clean already-delimited classical lines inside
(e.g. `《理愚歌》云："倒悬羊刃又同行…"`). Leading candidate: **pure-JS sentence-window**
(find the concept, expand to nearest 。；！ punctuation, cap ~60–120 chars) — zero
LLM cost, and stays **verbatim** (critical: the whole trust claim is "real classical
text," so no LLM paraphrasing). Alternatives considered: raw chunk (ugly), or
LLM-extracted (cleanest but risks rewording → undermines the claim).

**Cost context:** near-zero new data work; retrieval + streaming + KV cache infra
(`lib/rag.ts`, `lib/sseWriter.ts`) all already exist.
