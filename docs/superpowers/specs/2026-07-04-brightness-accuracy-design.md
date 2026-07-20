# Brightness Accuracy (紫微 readings) — Design

**Date:** 2026-07-04
**Status:** Approved (design), pending implementation plan
**Part of:** the "reading accuracy" initiative (A of A→B→C; B = validate all tabs, C = flow-year grounding — separate specs).

## Context

Niki wants 紫微 readings to be factually aligned with the deterministically-computed
chart and proofread for basic mistakes. Investigation showed most of the grounding +
validation already exists (`lib/validateReading.ts`: `buildChartFacts` injects stars +
四化 + palaces; a Gemini cross-check flags contradictions; 格局 anti-fabrication). The
specific gap this sub-project closes: **star brightness (庙旺得利平陷) is absent from the
authoritative facts**, so a reading can misstate a star's brightness (e.g. "太阳庙旺" when
it is 陷) and nothing catches it. Also, several assistant stars display no brightness.

## Decisions

- Do **A only**: brightness in facts + validation + the assistant-star brightness table.
  Not the other tabs (B) or flow-year (C).
- Keep #4 (assistant-star brightness table) — but source it, never invent it (see guardrail).

## Current state (verified)

- `ZiweiChart` already renders `<BrightnessBadge>` for **every** star type (major, minor).
  Minor stars with a brightness already show it. So the display needs **no change** — it
  lights up automatically once the data carries a value.
- iztro supplies brightness for the 14 major stars and for 文昌 文曲 火星 铃星 擎羊 陀罗.
- iztro returns **empty** brightness for: 左辅 右弼 天魁 天钺 禄存 天马 地空 地劫.
- `buildChartFacts` lists star names + 四化 but **not** brightness.

## Design

### 1. Assistant-star brightness table (#4) — sourced, not invented

- New `lib/starBrightness.ts`: a lookup for the stars iztro leaves blank, keyed by
  `(starName, 地支)` where a **genuine classical brightness table exists**, plus fixed
  values where classical texts assign one regardless of palace.
- **INTEGRITY GUARDRAIL (non-negotiable):** every value must come from a real classical
  source (the 《紫微斗数全书》诸星庙旺利陷表 or an equally authoritative table). Where a
  star genuinely has no classical brightness rating, **leave it blank** — do NOT fabricate
  a value. A fabricated brightness would corrupt the authoritative facts this whole
  initiative exists to strengthen. Known-safe starting point: 禄存 is 庙 in all palaces
  (classical: 禄存无失陷). All other blanks must be verified against a cited source during
  implementation; unverifiable ones stay blank.
- In `lib/ziwei.ts`, when a minor star's iztro brightness is empty, fill it from this
  table (only if the table has a value); otherwise keep it empty.

### 2. Brightness in the authoritative facts (#1)

- Extend `buildChartFacts` (`lib/validateReading.ts`) so each star renders with its
  brightness when present, e.g. `命宫：紫微(庙)、天府(得)｜辅：文昌(庙)、左辅(旺)`.
  Stars with no brightness render without the parenthetical.

### 3. Validator catches brightness contradictions (#1)

- Add one check to the `geminiLogicReview` prompt: flag a reading that states a star's
  brightness contradicting the authoritative facts (e.g. claims 庙旺 for a 陷 star).
  Keep the existing rule that 运限/流年 dynamics are out of scope for natal-fact checks.

## Files

- Create: `lib/starBrightness.ts` (sourced table + lookup fn).
- Modify: `lib/ziwei.ts` (fill empty minor-star brightness from the table).
- Modify: `lib/validateReading.ts` (`buildChartFacts` includes brightness; validator prompt gains the brightness check).
- No component changes (`ZiweiChart` already renders brightness badges).

## Out of scope (YAGNI)

- Validation wiring for other tabs (sub-project B).
- Flow-year grounding (sub-project C).
- 八字 fact validation (八字 has no stars/brightness).
- Any redesign of the chart UI.

## Verification

- Unit-check `lib/starBrightness.ts`: spot every filled value against the cited source;
  confirm unverifiable stars return blank (no fabrication).
- Render a known chart: confirm previously-blank assistant stars now show a badge only
  where the table has a real value; 禄存 shows 庙.
- Print `buildChartFacts(ziwei)` for a sample chart: confirm brightness appears per star.
- Feed the validator a deliberately-wrong reading ("太阳庙旺" for a 陷 太阳) and confirm it
  now flags it; confirm a correct reading still passes.
- `npm run build` clean. Cache bump if any reading-prompt facts change (server
  `CACHE_VERSION` + client `CACHE_PREFIX`), since grounding facts changed.

## Deployment

Auto-deploy to production after build passes (`npx vercel --prod --yes`).
