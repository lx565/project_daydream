# Free-overview split: cheap consensus for free, heavy 6-school for paid

**Date:** 2026-08-03
**Status:** Approved (design), pending implementation
**Context:** Incident tonight — the free 總覽 tab's 紫薇綜合 box was slow/timing-out
and burning rate-limit quota. Root cause: it renders the **綜合共識** slice of the
`/api/reading/overview` route, which is the single heaviest generation in the app
(6 sections, `maxTokens: 5000`, 6-school RAG) — yet a free visitor only sees its
~130-word conclusion. The other 5 school sections are only shown on the **眾說**
(perspectives) tab, which is **paid**. So every free visitor pays the cost of the
app's most expensive call to display a teaser.

## Goal

Make the free path light and fast. The free 紫薇綜合 conclusion gets its own small
route; the heavy 6-school overview only runs after unlock (for 眾說).

## Architecture

### New route — `POST /api/reading/consensus`

Generates **only** the holistic 綜合共識 conclusion.

- `export const maxDuration = 60;`
- Uses `makeSSEResponse` + `streamWithRefs` (same streaming contract as every other
  reading route).
- **Request payload:** `{ ziwei: ZiweiResult; gender: string; name?: string }`
  — identical to `ziweiPayload` in WizardFlow, so the frontend passes the same object.
- **Light RAG** (NOT the 6-school `getSharedRetrieval`): a single `getKnowledge`
  call keyed on `ziwei.mainStar` + 命宮 (soul palace) major stars + 命宮 三方四正
  会照 stars, `topK: 5`. One retrieval, not six.
- `streamWithRefs` opts:
  - `maxTokens: 900`
  - `temperature: 0.5`
  - `attemptTimeoutMs: 55_000`, `retryTimeoutMs: 20_000` (consistent with the other
    routes after tonight's timeout fix)
  - `rateLimit: { ip: clientIp(request), keyPrefix: "consensus" }`
  - `system`, `messages`, `refs`
- Rate limit: `checkRateLimit(request, { limit: 30, keyPrefix: "consensus" })` at the
  top, `rateLimitResponse()` on deny — same shape as `bazi/route.ts`.
- **No cross-model validation** (frontend consumes it without `{ validate: true }`) —
  it is a short teaser; favor speed and cost. (Accepted trade-off: one fewer
  fabrication check on the free conclusion.)

**Prompt / output contract:** emit a single standalone conclusion, **no `##`
heading**, ~130–150 字, 简体中文. Reuse the constraints already written for
overview's 綜合共識 section: point at the命主's核心星曜格局 / 最有動能的宮位 /
最值得關注的一個化忌或煞星落點; the paragraph must read standalone (must NOT open with
"綜上所述 / 綜合來看 / 三派共同認可"); only **加粗** single star names or 四化 symbols
(e.g. **武曲**, **化忌**), never whole phrases; no "付費/解鎖/完整版" wording.
Model provider is unchanged (DeepSeek via the app-wide `AI_PROVIDER`); do not
hardcode a model.

### Existing route — `POST /api/reading/overview` (trim)

- **Drop the `## 綜合共識` section** from its `SYSTEM` prompt. The 眾說 tab renders
  `mode="schools"` (which already excludes 綜合共識), and the free box now uses the
  consensus route, so this section is dead weight. Leave the 5 school sections and
  the intro untouched. `maxTokens` stays `5000`.
- No other route logic changes (it already got tonight's timeout + rateLimit wiring).

### Frontend — `components/WizardFlow.tsx`

1. **New stream:** `const consensus = useSSEStream("/api/reading/consensus", ck("consensus"));`
   (no `{ validate: true }`).
2. **Free auto-fire effect** (currently starts `synthesis`, `overview`, `bazi_`):
   swap `overview.start(ziweiPayload)` → `consensus.start(ziweiPayload)`.
   Free visitors now fire `synthesis + consensus + bazi_`.
3. **Post-unlock effect** (currently starts palaces/decades/cautions/baziDeep/
   baziSchools/dualschool): add `if (overview.status === "idle") overview.start(ziweiPayload);`
   so the heavy overview runs only after unlock (for 眾說).
4. **紫薇綜合 box** (the `case "overview"` render): render the `consensus` stream
   **plainly** — `ClassicalMd` + `RefList` + skeleton `"正在生成紫薇綜合…"` + error/重試 —
   mirroring the 混合解讀 box directly above it. It no longer goes through
   `OverviewDualView mode="consensus"`. (Keep `OverviewDualView`'s `consensus` mode in
   place; it's harmless, just unused by the free box now.)
5. **coreStreams** (progress/gating): free = `[synthesis, consensus, bazi_]`; ungated =
   `[synthesis, consensus, bazi_, overview, palaces, decades, cautions, baziDeep,
   baziSchools, dualschool]`.
6. **眾說 (perspectives) tab** render: unchanged — still `OverviewDualView
   mode="schools"` on `overview`. It is a locked tab, only reachable post-unlock, so
   overview will have started by then.
7. **Export/email:** map the 紫微綜合 conclusion to `consensus.text` (add `consensus`
   to the `readings` payload passed to `onExportReady`, and update `ExportReport.tsx`
   + `lib/emailTemplate.ts` so 紫微綜合 uses the consensus text; the overview schools
   remain available as the 三派詳解/眾說 section). Export only runs for paid users, who
   have both streams.

### Cache

Bump `CACHE_VERSION` in `lib/sseWriter.ts` (`v28 → v29`) because overview's prompt
changes (dropped section). The consensus route needs no special handling — it gets a
distinct cache key from its distinct system prompt automatically.

## Non-goals

- No change to synthesis (混合解讀) or bazi (八字綜合) free boxes.
- No paywall/gating rule changes beyond moving `overview.start` to the post-unlock
  effect.
- No provider/model change.

## Verification

- `npx tsc --noEmit` clean.
- `npm run build` exits 0.
- Manual (local, paywall disabled): free 總覽 loads 紫薇綜合 from `/api/reading/consensus`
  quickly; `/api/reading/overview` is NOT called until a (simulated) unlock; 眾說 tab
  still renders the 5 school cards.

## Fan-out plan (2 Sonnet subagents, disjoint files)

- **SA1 — backend:** create `app/api/reading/consensus/route.ts` per the contract
  above (model on `bazi/route.ts` for structure + light `getKnowledge` RAG).
- **SA2 — frontend + overview trim:** edit `components/WizardFlow.tsx` (steps 1–7),
  drop `## 綜合共識` from `app/api/reading/overview/route.ts`, bump `CACHE_VERSION`,
  update `ExportReport.tsx` + `lib/emailTemplate.ts`.

Files are disjoint (SA1 creates a new file; SA2 edits WizardFlow/overview/export/email),
so they run in parallel against this fixed contract. Parent integrates + runs
tsc/build before any push.
