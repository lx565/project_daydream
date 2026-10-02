# mingli-app Ziwei Chart Redesign

**Goal:** Redesign `ChartScreen.tsx`'s palace grid — richer, more legible color coding, a vertical/classical star layout, and per-palace 大運 age ranges — all confirmed via a mockup round before any code changes.

**Repo:** `~/Projects/mingli-app` (client-side only, no backend changes). Touches `app/screens/reading/ChartScreen.tsx` and introduces a new star-category lookup table.

**Status:** Design confirmed via interactive mockup (Artifact: https://claude.ai/artifact/9W3Sw1eMgzDdJgHe9qizAB). This spec is the source of truth going forward — the Artifact is a working record of the exploration, not the spec itself.

**Reference considered:** screenshots of 文墨天机 (a mainstream Zi Wei app) for star-category color conventions — informed the direction, not copied pixel-for-pixel (richer multi-color star categories, age-range-in-cell convention).

## Decisions

### 1. Palace grid layout: vertical (直書)
Replaces the current horizontal layout entirely. Each cell has three zones:
- **Top-right, small**: 天干地支 (stem+branch) only — a single small line, nothing else.
- **Middle (flex-grow)**: major stars rendered with `writing-mode: vertical-rl`, anchored to the **top-left** corner of the cell (not centered). Each star is its own vertical column (name + brightness character + any mutagen badge, which stays horizontal via `writing-mode: horizontal-tb` as an inline exception — badges don't rotate). **Multiple major stars in one palace flow side-by-side as additional columns, growing rightward from the left edge** — this also fixes a real existing bug where `PalaceCell`/`MajorStar` currently stacks each major star as its own full-width row (confirmed in `ChartScreen.tsx`'s `majors.map((s) => <MajorStar key={s.name} star={s} />)`, each wrapped in a block-level `View`).
- **Bottom, centered**: 宮位名稱 + 大運年齡區間 on one line together, horizontally centered, **no divider line** separating this from the star content above.

### 2. Palace name styling
- Every palace name gets a **"宮" suffix appended** for consistency (e.g. `官祿宮`, `財帛宮`, `兄弟宮` — currently most palace names from the data lack this suffix; only `命宮` already has it baked in).
- **Font size increased** from the current ~10px to ~12–12.5px.
- **Color changed from black/ink to a non-black tone** — `COLORS.ink2` (#4A3828) as the default. `命宮` specifically uses vermillion (#8B1A1A) instead, per decision 3.

### 3. 命宮 (soul palace): no permanent border
- Current behavior (`soulCell` style: permanent vermillion border + vermillionL background) is removed. 命宮 is now visually equal to any other palace for border purposes — a border only appears when it's **selected** or part of the **三方四正** of whatever palace is currently selected, via the exact same dynamic highlight mechanism every other palace already uses (`selectedCell`/`trineCell`/`oppositeCell`).
- Instead, 命宮 gets a **permanent, subtle identification**: its palace-name text renders in vermillion (not the default ink2), and the cell background gets a soft, low-saturation pink tint (`#F8EFEF`) at all times — enough to notice at a glance without a border competing with the selection-highlight system.

### 4. 身宮 (body palace): vertical seal-stamp badge
- Current behavior (`bodyCell` style: 3px gold left-border on the palace cell) is removed.
- Replaced with a small square badge resembling a traditional Chinese seal/stamp, positioned in the **top-right corner of the center info block** (not on the body palace's own cell — this matches how 身宮 is always coincident with one of the 12 palaces, but the stamp lives in the chart's center block as a fixed indicator since 身宮 itself is just data, not a separate cell): vermillion 1.5px border, ~22×44px, rounded corners, containing `writing-mode: vertical-rl` text reading "身宮" top-to-bottom, vermillion color, bold.
- The center info block's text content (name/gender/birthdate, 五行局, 命主, 身主 — 4 lines total) gets **reserved right-side padding** (`padding-right: 38px` or equivalent) so it can never flow underneath the stamp regardless of content length, and the stamp has an opaque background so it stays legible even if something did reach that corner.

### 5. 四化 (mutagens): recolored
- **祿/權/科 (all three) → green** (jade: fg `#1A5C3A`, bg `#E8F5EE`), replacing the current scheme where each had its own distinct color (祿=gold, 權=vermillion, 科=gray) and 科 in particular had poor contrast/readability.
- **忌 → red** (fg vermillion `#8B1A1A`, bg vermillionL `#F5E8E8`), replacing the current dark-gray-background/white-text treatment.
- This applies to major-star mutagens (already colored today) **and must be extended to minor-star mutagens**, which currently render with zero color treatment at all (`minorText` just concatenates name+mutagen as plain gray text) — this was flagged as a real inconsistency during the mockup review and is in scope for this redesign.

### 6. 星曜亮度 (brightness: 廟/旺/得/利/平/不/陷): recolored, decoupled from star name
- **The star name's color/weight never changes based on brightness** — always bold, always `COLORS.ink` (#2C1A10), full stop. (An earlier mockup iteration incorrectly let brightness context bleed into the star name's color; corrected and locked in during review — star name color must be visually constant no matter what brightness word follows it.)
- Only the **brightness character itself** changes style:
  - **廟/旺/得/利 (good) → bold, bright festive gold** `#C9961C` (not the existing muted `COLORS.gold` #7B5C00 — explicitly brighter/more "喜气" per review feedback).
  - **平/陷 (weak) → regular weight (not bold), muted** `COLORS.ink4` (#B0A090).
- **No circular/ring badge treatment** around the brightness character — compared directly against a ringed-badge alternative in the mockup and rejected: at real mobile cell sizes (~80-90px), a ring adds visual weight that crowds the mutagen badges sitting right next to it, especially in palaces with 2+ major stars. Plain colored text only.

### 7. 大運 (decade) age range: shown per palace
- Every palace cell shows its own 大運 age range (e.g. "25～34"), muted gray (`COLORS.ink4` #B0A090) by default.
- The **current/active decade** (the one matching the viewer's actual age today — same logic already used elsewhere in the app, e.g. `DecadesScreen.tsx`'s default-current-decade detection) is shown in **bold vermillion red** with a **★** marker appended, so it's unmistakable at a glance which decade is "now."

### 8. 星曜分類上色 (star-category coloring) — Variant A, warm/brand-consistent
Beyond the mutagen recoloring (decision 5), the 14 major stars' own names stay unchanged (always ink, decision 6), but **minor stars get categorized and colored for the first time** — currently every non-major star renders identically regardless of its nature:
- **六吉星** (文昌/文曲/左輔/右弼/天魁/天鉞) → `COLORS.gold` (#7B5C00) — reuses the existing gold already in the palette.
- **六煞星** (擎羊/陀羅/火星/鈴星/地空/地劫) → `COLORS.vermillion` (#8B1A1A) — reuses the existing vermillion.
- **桃花星** (紅鸞/天喜/天姚, and any other romance-category stars already recognized elsewhere in this codebase's domain logic — check `lib/detectMingge.ts`/`lib/minggeData.ts` for the established star-category lists before inventing a new one) → **new rose tone**, `#B5527A` — the one genuinely new color this redesign introduces.
- All other minor stars not in one of these three categories keep the current plain `COLORS.ink3` treatment — this is additive categorization, not a full recolor of every minor star.
- **Requires a new star-name → category lookup table** — this classification does not exist anywhere in the current codebase and is the main implementation cost of this decision, larger than the mutagen/brightness color changes.

## Explicitly out of scope (deferred to a separate future round)

- **流年 (flow-year) palace highlighting and 流年四化.** Confirmed feasible — the underlying `iztro` library (`astro.bySolar(...)` in `lib/ziwei.ts`) supports a `.horoscope(date)` call that returns flow-year data computed entirely on-device, no backend call needed, same pattern as how 大運 age ranges already work. Mockup direction already agreed: natal 四化 badges stay solid-filled, 流年四化 badges render as hollow/outlined versions in the same category colors (e.g. solid green-filled "權" vs. hollow green-outlined "流科"), so the two are visually distinguishable without inventing new colors. **Not building this now** — it needs its own scope decisions first (which year counts as "current," whether 流年命宮 gets a highlight treatment of its own) and is a meaningfully larger data-layer change than everything else in this spec combined.

## Testing

No test suite exists in this repo (consistent with the rest of the project — `tsc --noEmit` is the verification bar). Given this redesign touches a highly reviewed, visually dense component, the implementation plan should include an explicit on-device verification step (not just `tsc`) — this is almost entirely a visual change that static typechecking cannot validate.
