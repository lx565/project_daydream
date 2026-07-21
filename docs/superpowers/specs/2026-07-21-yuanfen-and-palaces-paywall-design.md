# 宮位 paywall + 缘分指数 v3 — design

## Part 1 — 宮位 tab becomes paid (solo reading)

**Status: implemented, not deployed.** `components/WizardFlow.tsx`:
- `FREE_TABS` now only contains `"overview"` (was `{"overview", "palaces"}`)
- `palaces.start(...)` moved from the always-run mount effect into the
  unlock-gated effect (alongside `decades`/`cautions`/`baziDeep`/etc.) — this
  matters for cost: without it, 宮位 would still auto-generate (and get billed)
  for every visitor who never pays, even though the tab is now locked.
- `coreStreams` (drives the free-user loading bar) drops `palaces` when `gated`,
  so the free progress bar doesn't wait on a stream that no longer runs for it.

Net effect: only 總覽 is free now; 宮位/大運/八字/眾說/注意/問命 are all paid.

No further work needed here — this section documents what's already done so the
plan/implementation record is complete.

## Part 2 — 缘分指数 v3 (free couple-compatibility teaser)

### Problem with the current version

`lib/couple.ts` `calcCoupleScoreV2` has two real defects:

1. **False precision.** All 4 named dimensions (e.g. spouse: 稳定度/子嗣缘/家庭运/白头到老)
   are the *same three numbers* (`dayMasterAffinity`, `elementComplementarity`,
   `weddingPalaceScore`) reweighted per dimension. They cluster within a few
   points of each other and can't tell genuinely different stories — 子嗣缘 has
   no 子女宮 input despite the name implying one.
2. **Wrong palace for the relationship type.** `weddingPalaceScore` always reads
   夫妻宮 (marriage palace), even for friend/sibling/parent-child pairs, where
   夫妻宮 is semantically irrelevant. `RelationshipConfig.palaces[0]` in
   `lib/coupleTypes.ts` already has the *correct* primary palace per type
   (夫妻/夫妻/交友/兄弟/父母) but is never used for scoring — only for the AI
   prompt's `ragTopic`/`focusHint`.
3. Scores can clamp as low as 42, which reads as discouraging for what is meant
   to be an uplifting/relationship-affirming teaser.

### Decisions (confirmed with Niki, 2026-07-21)

1. Give each of the 4 dimensions genuinely distinct inputs so scores actually
   spread and mean what their labels say — not just reweighted combinations of
   the same 3 numbers.
2. Reframe toward **emotional/couple-facing** signals, psychology-flavored,
   blended with 八字 — not dry technical axis names. Add 生肖/年支合冲, 天干五合,
   日支合冲 as new real signals (currently the bazi side only does element 生克,
   missing the most-cited 八字合婚 signals).
3. **Raise the score floor** — nothing should read as "super low." Change the
   clamp from 42–98 to roughly **66–96**.
4. **前世缘分 (past-life) is narrative-only, not a 5th scored dimension.** Keep
   the existing 4-dim set per relationship type as scored numbers; surface
   前世缘分 as a short evocative line instead. This aligns with the *already
   existing* `hasPastLife` flag in `coupleTypes.ts` (true for lover/spouse/
   parentchild, false for friend/sibling) — no new flag needed, just use it.
5. **Free teaser gets a short taste, not the full depth.** The free 缘分指数
   preview adds one-line teasers for 相处之道 ("how you get along") and
   会遇到的矛盾 (framed gently, as 磨合/tension-to-navigate, not "conflict" —
   consistent with the high-floor, encouraging tone) plus the 前世缘分 flavor
   line, each ending in a hook toward the paid full reading. The **full**
   depth on all three — psychology-blended, 八字-grounded — stays in the paid
   `/api/reading/couple` (and `/api/reading/bazi-couple`) output. This is
   Phase 2, scoped separately below.
6. Fix the palace bug as part of "real inputs": use `cfg.palaces[0]` (the
   correct type-appropriate palace) instead of hardcoding 夫妻宮 for everyone.

### Phase 1 — real 4-dim scoring + high floor + free narrative teasers

**New deterministic signal functions in `lib/couple.ts`** (all pure, zero AI cost,
computed from data already in `BaziResult`/`ZiweiResult`):

- `yearBranchAffinity(branchA, branchB)` — 生肖/年支: 六合 (子丑/寅亥/卯戌/辰酉/巳申/午未),
  三合 (申子辰/亥卯未/寅午戌/巳酉丑 groups), 六冲 (子午/丑未/寅申/卯酉/辰戌/巳亥), 相刑
  (子卯/寅巳申/丑戌未/辰辰午午酉酉亥亥自刑). Returns `{score, desc}`.
- `stemCombination(stemA, stemB)` — 天干五合: 甲己/乙庚/丙辛/丁壬/戊癸 合. Returns `{score, desc}`.
- `dayBranchAffinity` — reuses the same branch-relation table as
  `yearBranchAffinity` (extract a shared `branchRelation(a, b)` helper), applied
  to day branches instead of year branches.
- `palaceStarScore(ziwei, palaceName)` — generalizes the existing
  `weddingPalaceScore` to take any palace name, not just 夫妻. Existing
  favorable/challenging star sets and 化祿/化科/化忌 logic unchanged, just
  parameterized. `weddingPalaceScore` becomes a thin wrapper calling
  `palaceStarScore(ziwei, "夫妻")` for backward compat where still needed (share
  card may still want to show 夫妻宮 specifically — check `CoupleResultView.tsx`
  usage before removing).

**Per-type dimension composition** — each dimension gets a distinct weighted mix
of `dayMasterAffinity`, `elementComplementarity`, `yearBranchAffinity`,
`stemCombination`, `dayBranchAffinity`, and `palaceStarScore(ziwei, cfg.palaces[0])`
(+ `palaceStarScore(ziwei, "子女")` for 子嗣缘/亲缘-flavored dimensions, where 子女
is already listed in `palaces[1]` or `[2]` for lover/spouse/parentchild). Exact
per-type weight tables are an implementation-plan-level detail, not spec-level —
the constraint is: **no two dimensions within a type may share an identical
weight vector** (the bug being fixed), and every dimension's weight vector uses
at least 3 of the 6 signals.

**Floor/ceiling:** change `clamp` in `calcCoupleScoreV2` from
`Math.min(98, Math.max(42, ...))` to `Math.min(96, Math.max(66, ...))`. Apply
the same raised floor to the legacy `calcCoupleScore` (v1) if still reachable
anywhere (check for live callers; if v1 is dead, leave it alone rather than
touching unused code).

**Free narrative teasers** (new, templated — not AI-generated, so no cost and no
latency added to the free preview):
- New function `narrativeTeasers(type, dims, signals)` in `lib/couple.ts`
  returning `{ getAlong: string; friction: string; pastLife?: string }`.
  - `getAlong` — 1 line, templated from the dimension names + which signal
    scored highest (e.g. "两人日支相合，相处起来很自然，像是老朋友般默契").
  - `friction` — 1 line, gently framed from whichever signal scored lowest,
    always paired with a soft reframe (e.g. "偶尔会因为脚步不一致而需要多沟通，但
    这也是让彼此更了解的机会"). Never uses words like "冲突"/"危险"/"不合" —
    consistent with the high-floor, non-alarming tone.
  - `pastLife` — only populated when `cfg.hasPastLife` is true, 1 line flavor
    text from `yearBranchAffinity`/`stemCombination` (e.g. "两人生肖三合，古人说
    这是宿世的缘分牵引").
  - All three end with (rendered by the UI, not baked into the string) a CTA
    linking to the paid full reading.
- Surfaced in `components/CoupleResultView.tsx` (need to confirm this is the
  free-preview component vs. paid — verify at implementation time) alongside
  the existing 4-dim display.

### Phase 2 — paid reading enrichment (deferred, separate follow-up)

Lean the `/api/reading/couple` and `/api/reading/bazi-couple` prompts harder
into full-depth 前世缘分 framing, 相处之道, and 会遇到的矛盾, blending 八字
grounding with light psychology-style language (attachment/communication-style
framing, not clinical). This is a prompt-engineering change to the paid routes,
not a new deterministic signal — out of scope for this spec; revisit after
Phase 1 ships and (per [[feedback-validate-before-building]]) after there's
some real conversion signal to justify prioritizing it over other work.

### Testing

- Local dev, run through `/hepan` and `/bazihepan` for all 5 relationship types
  (lover/spouse/friend/sibling/parentchild) with a few different birth-data
  pairs, confirm:
  - The 4 dimension scores are no longer near-identical within a type
  - No score below 66 appears
  - Friend/sibling never show a 前世缘分 line; lover/spouse/parentchild do
  - Teaser lines read naturally in Chinese, no template artifacts, no
    discouraging language
- No automated tests exist for this scoring logic; manual verification is the
  bar, consistent with the rest of this codebase's testing approach.
