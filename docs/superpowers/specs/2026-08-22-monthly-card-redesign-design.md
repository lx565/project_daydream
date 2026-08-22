# 逐月詳細解讀 card redesign — design spec

**日期:** 2026-08-22
**狀態:** 待實現（brainstorm approved, awaiting spec review before implementation plan）

## 背景與目標

The paid $1.99 逐月運勢 product (`/yueyun`, shipped 2026-08-20) currently renders its 12-month paid content as 3 batches of raw AI-generated markdown prose (`### YYYY年MM月` heading + ~130字 paragraph), streamed via SSE and concatenated. Niki's feedback after using the live product: "the monthly reading is horrible" — specifically (1) a real bug where returning from Stripe checkout lost all state and dropped the user on a blank form (already fixed separately, commit `6ec52e2`), and (2) the content itself is "a long paragraph with no layout design" with no rankings, warnings, good/bad parts, lucky colors, or lucky directions.

A live screenshot during this brainstorm also surfaced a concrete, visible instance of a known risk: the AI rendered months 8–11's headings as proper `### ` markdown (bold serif heading), but month 12 onward came back as plain text with no heading syntax — same prompt, inconsistent output. This confirms the redesign must not depend on the AI reliably formatting markdown; it must render structure from data, not from AI-authored text formatting.

**Goal:** Replace the raw-prose paid section with a structured per-month card component — rankings, 本月重點, 宜/忌, 幸運色/方位, 建議, and a per-month "download as picture" button — where every card's structure is rendered from data, never parsed out of AI-formatted text.

## 決策記錄（brainstormed with Niki, 2026-08-22）

1. **Card field set** (confirmed via mockup): 綜合/事業/感情 rankings (dot scale, matching the existing free-grid style) · 本月重點 (1-line headline) · 宜 (one short good-thing phrase) · 忌 (one short warning phrase) · 幸運色 · 幸運方位 · 建議 (1-2 sentence advice).
2. **Data source split** — only what needs real judgment goes through AI:
   - 綜合/事業/感情 rankings: **reused as-is** from the free preview route's existing deterministic `scoreMonth()` output (`app/api/reading/monthly/preview/route.ts`) — not recomputed.
   - 幸運色/方位: **new deterministic lookup**, keyed off the flow month's ganzhi stem element.
   - 本月重點/宜/忌/建議: **AI-generated**, JSON mode, grounded in the same `flowMonthFactsFrom()` data the current prose version already uses.
3. **Layout**: all 12 months render as full cards, stacked vertically. Current month gets a visual highlight (border/badge), not a different/expanded layout from the other 11 — simpler than a hero+compact-list split, still satisfies "this month should be focused" via emphasis rather than a second layout mode.
4. **Image export**: per-month download button only (no "download all 12" button). Reuses the existing `html2canvas` pattern already proven in `components/ExportReport.tsx` (off-screen fixed-width capture target, `scale: 2`, PNG download), applied per-card instead of to one long report.
5. **AI call architecture**: switch the paid route from SSE-streamed markdown prose to **non-streaming JSON-mode batch calls**, keeping the existing 3-batches-of-4-months split (same token/reliability boundary that was already deliberately built to avoid truncation). Rejected alternatives: (a) keep SSE + parse AI markdown client-side — rejected, this is the exact bug the screenshot showed, regex-parsing AI-formatted text is inherently fragile; (b) one JSON call for all 12 months — rejected, reintroduces the unbatched-truncation risk the 3-batch split exists to avoid; JSON being more compact than prose isn't proven safe enough to bet on.
6. **Match by (year, month), not array position.** The AI's JSON response must echo `year`/`month` per entry; the server matches each entry back to its `FlowMonth` by that key, not by trusting the AI preserved array order/count. (This mirrors the established codebase pattern in `flowyears-scores/route.ts`, which keys its score map by `year` rather than assuming positional alignment.)
7. **建議 drops the classical-proverb citation** the current prose sometimes includes ("古訣云：...") — doesn't fit a compact card. Grounding is still enforced via the same mutagen/palace facts fed to the AI and the existing `SAFETY_GUARDRAIL`; only the flowery citation styling is cut, not the factual grounding requirement.
8. **The free preview grid's `theme` field is unrelated and unchanged.** It's a separate, already-shipped, deterministic one-liner (e.g. "夫妻宮值巨門化忌，宜謹慎") used only in the free teaser grid. The new paid card's AI `headline` is a distinct, richer, AI-composed field — no overlap, no need to reconcile them.

## 架構

### New files

**`lib/monthlyLuck.ts`** — deterministic 幸運色/方位 lookup, keyed off a ganzhi stem's element. Reuses the stem→element mapping already established in `lib/bazi-affinity.ts` (`STEM_ELEM`). Classical five-element color/direction correspondence:
- 木 → 綠色 · 東方
- 火 → 紅色 · 南方
- 土 → 黃色 · 西南方
- 金 → 金色 · 西方
- 水 → 藍色 · 北方

(土's direction is one reasonable convention — classical texts vary on Earth's directional assignment. Framed the same "僅供參考" way the rest of the app already frames all divinatory content — not presented as unambiguous fact.)

### Modified files

**`app/api/reading/monthly/route.ts`** — rewritten from SSE (`makeSSEResponse`/`streamWithRefs`) to a single non-streaming `callAI({..., jsonMode: true})` call per batch (mirrors `flowyears-scores/route.ts`'s existing pattern), same `checkRateLimit`, same RAG (`getKnowledge`) grounding, same `SAFETY_GUARDRAIL`, same 3-batches-of-4-months split. Response shape:
```json
{
  "months": [
    { "year": 2026, "month": 8, "headline": "...", "good": "...", "caution": "...", "advice": "..." },
    ...
  ]
}
```
Server matches each returned entry back to its `FlowMonth` by `(year, month)`; any month missing from the AI's response (or with malformed fields) falls back to a generic placeholder for the AI-generated fields only — rankings and colors never depend on this call succeeding, since they're computed separately.

**`components/MonthlyResultView.tsx`** — the `逐月詳細解讀` section's rendering is replaced. The three batch fetches become plain JSON `fetch()` calls (still 3, still independent loading/error/retry per batch — the behavior fixed in the prior review round is preserved, just via `fetch` instead of `useSSEStream`). Each of the 12 months renders as a new `MonthCard`, fed by: the matching entry from the already-fetched free-preview `months` array (rankings, ganzhi, year/month — no duplicate computation), a `lib/monthlyLuck.ts` lookup (color/direction), and the matching AI batch entry (headline/good/caution/advice).

**New `components/MonthCard.tsx`** (kept separate from `MonthlyResultView.tsx` to keep both files focused): renders one month's full card — heading (year/month/ganzhi, current-month highlight), 3 ranking rows (reusing the existing `Dots` pattern), 宜/忌, 幸運色/方位, 建議, and a download-as-picture button following `ExportReport.tsx`'s existing `html2canvas` pattern (off-screen fixed-width capture target per card, PNG download named `命裡-逐月-{year}{month}.png`, e.g. `命裡-逐月-20268.png`).

**Fallback text when a month's AI fields are missing/malformed:** `headline` → the deterministic free-preview `theme` string for that month (already computed, always available, never empty); `good`/`caution` → `"（本次未取得，可稍後重新整理）"`; `advice` → `"（本次未取得詳細建議，其餘月份不受影響）"`. Rankings and 幸運色/方位 are unaffected either way, since they never depend on this AI call.

## 測試

- Confirm the JSON-mode batch route never emits unparseable JSON under live testing (same rigor as the original plan: real curl tests against real birth data, not just tsc).
- Confirm `(year, month)` matching correctly handles a partial/malformed AI response (simulate by testing with a deliberately short mock response) — verify only the affected month(s) fall back to placeholder text, not the whole batch.
- Live-test the per-card download button produces a real PNG for at least 2 different months (including the highlighted current month).
- Confirm the free preview grid is visually and functionally untouched by this change.
