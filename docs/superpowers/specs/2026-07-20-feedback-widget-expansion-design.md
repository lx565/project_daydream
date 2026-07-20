# Feedback widget expansion — design

## Problem

Niki wants a way to collect general comments/suggestions from users, not just bug reports, and wants it available on every paid reading surface — not just `/result`.

## Current state

- `components/BugReportButton.tsx` — floating `⚑ 報錯` button + modal, categories `排盤有誤`/`解讀問題`/`功能異常`/`其他` + free-text description. Posts to `/api/feedback`, which forwards to a Google Apps Script webhook writing into a Google Sheet. Wired into `app/result/page.tsx` only, twice: `page="result"` (single reading) and `page="couple-result"` (couple reading rendered through the same page).
- `components/FeedbackWidget.tsx` — unused, unimported anywhere, and broken: posts `{sessionId, rating}` with no `description` field, which `/api/feedback` rejects (400 `missing_description`).
- `/hepan` and `/bazihepan` are separate standalone reading flows (`HepanFlow.tsx`, `BaziHepanFlow.tsx`) with no feedback mechanism at all.

## Decisions (confirmed with Niki)

1. One widget, not two — broaden `BugReportButton` rather than add a second entry point. Less UI clutter, same backend.
2. Add `使用建議` (suggestions) as a new category; keep existing bug categories as-is.
3. Roll it out to all four paid-reading surfaces: `/result` (single + couple, already covered), `/hepan`, `/bazihepan`.
4. Delete `FeedbackWidget.tsx` — dead and broken, nothing worth salvaging. The 👍/👎 accuracy-pulse idea can be revisited as its own feature later if wanted.

## Design

**`components/BugReportButton.tsx`**
- Floating button label: `⚑ 報錯` → `⚑ 意見反饋`
- Modal title: `報告問題` → `意見反饋`
- `TYPES` array: `["排盤有誤", "解讀問題", "功能異常", "其他"]` → `["排盤有誤", "解讀問題", "功能異常", "使用建議", "其他"]`
- No prop/interface changes — `sessionId` and `page` stay as-is.

**Backend** — no changes. `/api/feedback/route.ts` already accepts arbitrary `type` strings; `使用建議` just becomes a new value in the existing Google Sheet, same columns.

**Placement**
- `components/HepanFlow.tsx` — add `<BugReportButton sessionId={coupleChartId} page="hepan" />`
- `components/BaziHepanFlow.tsx` — add `<BugReportButton sessionId={chartId} page="bazihepan" />`
- `app/result/page.tsx` — unchanged, already has both instances.

**Cleanup** — delete `components/FeedbackWidget.tsx`.

## Testing

Run locally (`npm run dev`), manually exercise the widget on all four surfaces (`/result` single reading, `/result` couple reading, `/hepan`, `/bazihepan`): open it, pick a category (including the new 使用建議), submit free text, confirm success state renders and a row lands in the Google Sheet with the correct `page` value per surface.

No automated tests exist for this area of the codebase; this is a UI-only, low-risk change so manual verification is sufficient.
