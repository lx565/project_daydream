# Loading Screens Design
**Date:** 2026-07-17  
**Status:** Approved

## Overview

Two theatrical loading screens to make AI work feel tangible and trustworthy:
1. **Birth Loading** — shown on `/result` after birth form submit, before readings appear
2. **Payment Loading** — shown in `PaywallLock` after successful payment, before page reload

---

## Screen 1 — Birth Loading Overlay

### Trigger & Placement
- Full-screen fixed overlay (`fixed inset-0 z-50`) rendered at the top of `ReadingSession` (the client component inside `/result`)
- Shown immediately on mount, before any SSE streams start

### Dismissal Logic (Option C)
- Minimum display time: **2000ms**
- Also waits for: first SSE chunk received from the overview stream (`/api/reading/synthesis` or equivalent first-to-fire stream)
- Dismissed when **both** conditions are true
- Fade-out transition: 400ms opacity, then unmounted

### Visual Design
- Background: parchment (`bg-parchment`) — matches the app's existing aesthetic
- **Centre piece:** `命` character (~72px, vermillion, serif/classical font matching existing headings)
- **Ring:** SVG circle (~120px diameter) around the `命` character, thin stroke (2px), vermillion, animated from 0→100% stroke-dashoffset over 2500ms (CSS animation, ease-in-out)
- **Primary label:** `正在推算命盤各部分` — small (`text-sm`), `tracking-widest`, `text-ink-3`, ~16px below the ring
- **Cycling subtitle:** rotates every 1000ms through 4 phrases (CSS opacity cross-fade):
  1. `排列星盤宮位…`
  2. `推算大限流年…`
  3. `對照典籍格局…`
  4. `整合八字命理…`
  - Style: `text-xs`, `text-ink-4`, `tracking-wider`

### Implementation Notes
- New component: `components/ChartLoadingOverlay.tsx`
- Uses `useState(overlayVisible)` + `useEffect` to coordinate the 2s timer and SSE first-chunk signal
- SSE first-chunk signal: `useSSEStream` already exposes streaming state; pass a callback or shared ref down to signal "first chunk received"
- The overlay sits above everything; the chart and tabs render normally underneath (no conditional rendering gating)
- No `suspense` or route change needed — purely a client-side overlay

---

## Screen 2 — Post-Payment Loading Overlay

### Trigger & Placement
- Lives in `WizardFlow.tsx` (which already calls `usePaywall`)
- Triggered when **both**: (a) `?paid=1` is in the URL (set by Stripe success_url via `startCardCheckout`) AND (b) `paywallState.loading === true` (still polling for webhook)
- Dismissed when `paywallState.unlocked === true`, subject to minimum display of the step sequence (~4.5s)
- `usePaywall` already handles polling up to 9s (6× 1.5s intervals) — the overlay runs concurrently and disappears as soon as the webhook lands and `unlocked` flips true

### Sequence
7 steps, each activating ~700ms apart. Total duration ~4.5s before `window.location.reload()`.

| # | Icon | Text | State on activate |
|---|------|------|-------------------|
| 1 | ⟳ | 正在解鎖完整命書… | spinning, vermillion |
| 2 | ✦ | 掃描百部命理典籍資料庫 | lit up, ink |
| 3 | ✦ | 深度推算大運流年 | lit up, ink |
| 4 | ✦ | 以進階模型交叉審閱 | lit up, ink |
| 5 | ✦ | 校驗各派論斷一致性 | lit up, ink |
| 6 | ✓ | 命書已準備完成 | jade green, bold |

### Visual Design
- Full-screen fixed overlay (`fixed inset-0 z-50`), parchment background
- Items start dim (`text-ink-4`, icon in `text-ink-4/40`)
- Each item "lights up" as its turn arrives: text → `text-ink`, icon → `text-vermillion`
- Final item (#6): text → `text-jade font-semibold`, icon → `text-jade`
- Centre-aligned, vertically centred, ~`space-y-4` between items
- Small heading above the list: `解鎖進行中` in `text-xs tracking-widest text-ink-4`
- After step 6 completes + 800ms pause → `window.location.reload()`

### Implementation Notes
- New component: `components/UnlockLoadingOverlay.tsx`
- `WizardFlow` detects `justPaid` via `new URLSearchParams(window.location.search).has("paid")` and passes it + `paywallState` as props
- Overlay renders when `justPaid && paywallState.loading`
- Uses `useEffect` with a series of `setTimeout` calls to advance `activeStep` state (0→6)
- On `activeStep === 6`, overlay stays visible until `paywallState.unlocked === true`, then fades out (the tab content is now unlocked underneath)
- No `window.location.reload()` needed — `usePaywall` already calls `setUnlocked(true)` which re-renders `WizardFlow` to show the unlocked tabs

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `components/ChartLoadingOverlay.tsx` | Create — birth loading overlay |
| `components/UnlockLoadingOverlay.tsx` | Create — post-payment loading overlay |
| `components/ReadingSession.tsx` | Modify — mount `ChartLoadingOverlay`, wire first-chunk signal |
| `components/WizardFlow.tsx` | Modify — detect `?paid=1` + render `UnlockLoadingOverlay` when paying |

---

## Out of Scope
- Loading screen for couple reading (can be added later, same pattern)
