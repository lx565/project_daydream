# Ziwei Chart Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Ziwei chart's palace grid in `ChartScreen.tsx` — vertical star layout, richer color coding (四化, brightness, star categories), 命宮/身宮 treatment, and per-palace 大運 age ranges — exactly as confirmed in the mockup round.

**Architecture:** One file (`app/screens/reading/ChartScreen.tsx`) is rewritten in two layers: first the star-content rendering (`MajorStar`, layout direction, colors), then the palace-cell chrome (borders, names, 命宮/身宮 treatment, age ranges) that wraps it. A new standalone data file (`app/lib/starCategories.ts`) supplies the star-category → color lookup Task 2 and 3 both depend on.

**Tech Stack:** React Native StyleSheet + inline conditional styles (existing pattern in this file — no new dependencies). `writing-mode` is NOT available in React Native's StyleSheet; vertical text must be built with `transform: [{ rotate: '90deg' }]` on a `Text` wrapped in a fixed-size `View` (the pattern already used nowhere else in this codebase yet — Task 2 introduces it, modeled on the mockup's CSS `writing-mode: vertical-rl` but adapted to RN's actual capabilities).

**Spec:** `docs/superpowers/specs/2026-10-02-ziwei-chart-redesign-design.md`

## Global Constraints

- Star name color is **always** `COLORS.ink` (#2C1A10), bold, regardless of brightness — never changes based on 廟/旺/得/利/平/陷.
- Brightness character styling only: 廟/旺/得/利 → bold, `#C9961C` (new bright festive gold, NOT `COLORS.gold`). 平/陷 → regular weight, `COLORS.ink4` (#B0A090). **No circular/ring badge** — plain colored text only, confirmed rejected in the mockup review.
- 四化 colors: 祿/權/科 all → jade green (fg `COLORS.jade` #1A5C3A, bg `COLORS.jadeL` #E8F5EE). 忌 → vermillion (fg `COLORS.vermillion` #8B1A1A, bg `COLORS.vermillionL` #F5E8E8). Applies to BOTH major-star and minor-star mutagens — minor-star mutagens currently have zero color treatment and must be fixed.
- 命宮: no permanent border. Palace name text in `COLORS.vermillion`, cell background `#F8EFEF` (new, add to `COLORS` in `theme.ts`), always. Border only via the existing `selectedCell`/`trineCell`/`oppositeCell` dynamic highlight mechanism — same as every other palace.
- 身宮: no left-border on its cell. Instead, a vertical seal-stamp badge (~20×40, vermillion border, vermillion bold "身宮" text read top-to-bottom) positioned top-right inside the center info block. Center block's text content gets reserved right padding so it can never collide with the stamp regardless of how many lines it has.
- Palace names: every name gets a "宮" suffix if it doesn't already have one (`name.endsWith("宮") ? name : name + "宮"` — do not assume which raw names already include it, check at render time). Font size increases from the current 10px to 12px. Color changes from `COLORS.ink2` to `COLORS.ink2` for non-命宮 palaces (already non-black — the actual fix is ensuring 命宮 specifically uses vermillion, per above) at a **larger** size than today.
- Palace name + age range render together, bottom-centered, **no divider line** separating them from the content above.
- 干支 (stem+branch) moves to its own small top-right line.
- Multiple major stars in one palace must render in a single flowing group (not one row per star) — this is a real existing bug fix, not just new styling.
- This repo has no test runner — `npx tsc --noEmit` is the verification bar, plus mandatory on-device/Simulator visual verification (this is an almost entirely visual change static typechecking cannot validate).

## Review Focus

- **Star name color must stay constant no matter what brightness follows it.** An earlier mockup iteration got this wrong (brightness context leaked into star name color) before being caught and corrected — the exact same mistake is easy to reintroduce in code. Task 2's tests pin this explicitly.
- **Multiple major stars in one palace must flow in a single group, not stack as separate rows.** This is the real bug the redesign is also fixing (confirmed in the current `majors.map((s) => <MajorStar key={s.name} star={s} />)`, each wrapped in its own block-level row). Task 2 must verify a two-major-star palace (e.g. 福德宮 in the real chart, 紫微+貪狼) renders as one flowing group.
- **命宮's border must only appear on select/trine/opposite, never permanently.** Easy to half-implement (remove the permanent border styling but forget that the red-text+pink-bg needs to apply unconditionally in all states, including when 命宮 happens to also be the selected/trine/opposite palace). Task 3 must verify 命宮 renders correctly in both locked (no selection) and selected states.
- **The 身宮 stamp must never visually collide with the center block's text**, regardless of which 4 lines of text are present (name/gender/date, 五行局, 命主, 身主) — this was flagged explicitly by Niki during the mockup round. Task 3's verification must check this with a profile that has a name (longest realistic content case).
- **Palace name "宮" suffix logic must not double up.** 命宮 already includes 宮 in the raw data; blindly concatenating would produce "命宮宮". The `endsWith("宮")` check in Global Constraints must be implemented exactly, not assumed-safe.

---

### Task 1: Star category color lookup

**Files:**
- Create: `app/lib/starCategories.ts`

**Interfaces:**
- Produces: `getStarCategoryColor(starName: string): string | null` — returns a hex color string for 六吉星/六煞星/桃花星, or `null` for any other star (including all 14 major stars, which must never be recategorized by this function — Task 2 calls this only for minor stars).

- [ ] **Step 1: Write the file**

```typescript
import { COLORS } from "../theme";

// 六吉星 — same membership as the existing `aux` array in lib/detectMingge.ts
// (kept as a separate list here rather than imported, since detectMingge.ts's
// array is a local const inside a function, not exported).
const AUSPICIOUS_STARS = new Set(["左輔", "右弼", "文昌", "文曲", "天魁", "天鉞"]);

// 六煞星 — not currently consolidated anywhere else in this codebase;
// detectMingge.ts references these individually inside mingge conditions,
// but no single exported list exists to reuse.
const MALEFIC_STARS = new Set(["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"]);

// 桃花星 — not currently referenced anywhere in this codebase at all.
const ROMANCE_STARS = new Set(["紅鸞", "天喜", "天姚"]);

const ROSE = "#B5527A";

/** Returns the category color for a minor star name, or null if it's not
 *  in any of the three categorized sets (including every major star —
 *  callers must only invoke this for minor stars, per the app's existing
 *  `type: 'major' | 'minor' | 'adjective'` distinction on StarInfo). */
export function getStarCategoryColor(starName: string): string | null {
  if (AUSPICIOUS_STARS.has(starName)) return COLORS.gold;
  if (MALEFIC_STARS.has(starName)) return COLORS.vermillion;
  if (ROMANCE_STARS.has(starName)) return ROSE;
  return null;
}
```

- [ ] **Step 2: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors. (No test runner in this repo — a reviewer should manually trace `getStarCategoryColor("文昌")` → `COLORS.gold`, `getStarCategoryColor("擎羊")` → `COLORS.vermillion`, `getStarCategoryColor("紅鸞")` → `"#B5527A"`, `getStarCategoryColor("紫微")` → `null` against the source, since there's no executable test to catch a mistake.)

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/mingli-app
git add app/lib/starCategories.ts
git commit -m "feat: add star-category color lookup for minor stars"
```

---

### Task 2: Rewrite star content rendering — vertical layout, colors, multi-star fix

**Files:**
- Modify: `app/theme.ts`
- Modify: `app/screens/reading/ChartScreen.tsx`

**Interfaces:**
- Consumes: `getStarCategoryColor(starName: string): string | null` from Task 1 (`app/lib/starCategories.ts`).
- Produces: a rewritten `MajorStar`-equivalent rendering that Task 3 builds on inside the same `PalaceCell` function — Task 3 does not change how stars render, only the cell chrome around them.

This task produces palace cells with the new star-content rules applied, but palace borders/names/age are UNCHANGED for now (still the old `soulCell`/`bodyCell` styles, old palace name rendering) — that's Task 3's job. Reviewing this task in isolation: do the stars themselves look right (vertical, correctly colored, single flowing group for multi-star palaces)?

- [ ] **Step 1: Add the new color token to `theme.ts`**

Read `app/theme.ts` first. Add one new color to the `COLORS` object (alongside the existing entries, e.g. near `gold`/`goldL`):

```typescript
  soulCellBg: "#F8EFEF",
```

(This is used by Task 3, not this task — adding it now keeps all new color tokens in one place. `tsc` will not complain about an unused export.)

- [ ] **Step 2: Read `ChartScreen.tsx` in full**, then replace the `MajorStar` function and the `majorRow`/`majorName`/`brightness`/`mutagenBadge`/`mutagenText`/`minorText` style entries.

Replace the existing `MajorStar` function:

```typescript
function MajorStar({ star }: { star: StarInfo }) {
  const mutagen = star.mutagen.replace("化", "");
  const mc = MUTAGEN_COLORS[mutagen];
  return (
    <View style={styles.majorRow}>
      <Text style={styles.majorName}>{star.name}</Text>
      {!!star.brightness && <Text style={styles.brightness}>{star.brightness}</Text>}
      {!!mutagen && (
        <View style={[styles.mutagenBadge, { backgroundColor: mc?.bg ?? COLORS.paper2 }]}>
          <Text style={[styles.mutagenText, { color: mc?.fg ?? COLORS.ink2 }]}>{mutagen}</Text>
        </View>
      )}
    </View>
  );
}
```

with:

```typescript
const GOOD_BRIGHTNESS = new Set(["廟", "旺", "得", "利"]);
const BRIGHT_GOLD = "#C9961C";

function MutagenBadge({ mutagen }: { mutagen: string }) {
  const mc = MUTAGEN_COLORS[mutagen];
  return (
    <View style={[styles.mutagenBadge, { backgroundColor: mc?.bg ?? COLORS.paper2 }]}>
      <Text style={[styles.mutagenText, { color: mc?.fg ?? COLORS.ink2 }]}>{mutagen}</Text>
    </View>
  );
}

// Renders one major star as a vertical column: name (always COLORS.ink,
// bold, never recolored by brightness), then its brightness character
// styled independently (bold bright gold for good placements, dim muted
// for weak ones — never a circle/badge, rejected in the mockup review),
// then its mutagen badge if present (stays horizontal, not rotated).
function MajorStarColumn({ star }: { star: StarInfo }) {
  const mutagen = star.mutagen.replace("化", "");
  const good = GOOD_BRIGHTNESS.has(star.brightness);
  return (
    <View style={styles.starColumn}>
      <View style={styles.starColumnRotate}>
        <Text style={styles.starName}>{star.name}</Text>
        {!!star.brightness && (
          <Text style={good ? styles.brightnessGood : styles.brightnessWeak}>{star.brightness}</Text>
        )}
      </View>
      {!!mutagen && <MutagenBadge mutagen={mutagen} />}
    </View>
  );
}
```

Replace the existing style entries `majorRow`, `majorName`, `brightness`, `mutagenBadge` (keep `mutagenBadge` and `mutagenText` as-is, they're reused), `minorText`:

Remove:
```typescript
  majorRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  majorName: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 11, color: COLORS.ink, lineHeight: 15 },
  brightness: { fontFamily: FONT_SERIF_TC, fontSize: 8, color: COLORS.ink3, marginLeft: 1 },
```

Add in their place:

```typescript
  starColumn: { alignItems: "center", gap: 2 },
  // RN's StyleSheet has no `writing-mode`; vertical text is built by
  // rotating a horizontally-laid-out Text 90deg inside a fixed-size box
  // sized for the rotated content (width/height swapped from what the
  // unrotated text would need).
  starColumnRotate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    transform: [{ rotate: "90deg" }],
  },
  starName: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 11, color: COLORS.ink },
  brightnessGood: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 9, color: BRIGHT_GOLD },
  brightnessWeak: { fontFamily: FONT_SERIF_TC, fontSize: 9, color: COLORS.ink4 },
```

Keep `mutagenBadge`/`mutagenText` exactly as they already are — unchanged by this task.

Remove the `minorText` style and its single usage inside `PalaceCell` (the `{minors.length > 0 && <Text style={styles.minorText}>...}</Text>` block) — replace with a version that applies Task 1's category coloring. Read the current `PalaceCell` function, then replace this block:

```typescript
      {minors.length > 0 && (
        <Text style={styles.minorText}>
          {minors.map((s) => s.name + (s.mutagen ? s.mutagen.replace("化", "") : "")).join(" ")}
        </Text>
      )}
```

with:

```typescript
      {minors.length > 0 && (
        <View style={styles.minorRow}>
          {minors.map((s) => {
            const mutagen = s.mutagen ? s.mutagen.replace("化", "") : "";
            const categoryColor = getStarCategoryColor(s.name);
            return (
              <View key={s.name} style={styles.minorStarGroup}>
                <Text style={[styles.minorStarName, categoryColor ? { color: categoryColor } : null]}>
                  {s.name}
                </Text>
                {!!mutagen && <MutagenBadge mutagen={mutagen} />}
              </View>
            );
          })}
        </View>
      )}
```

Add these new styles (replacing the removed `minorText`):

```typescript
  minorRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  minorStarGroup: { flexDirection: "row", alignItems: "center", gap: 2 },
  minorStarName: { fontFamily: FONT_SERIF_TC, fontSize: 8, color: COLORS.ink3 },
```

Add the import at the top of the file:

```typescript
import { getStarCategoryColor } from "../../lib/starCategories";
```

- [ ] **Step 3: Replace the `majors` rendering inside `PalaceCell`** so multiple major stars flow as one group instead of one `MajorStar` per row. Find this block:

```typescript
      {majors.length === 0 ? (
        <Text style={styles.emptyMajor}>無主星</Text>
      ) : (
        majors.map((s) => <MajorStar key={s.name} star={s} />)
      )}
```

Replace with:

```typescript
      {majors.length === 0 ? (
        <Text style={styles.emptyMajor}>無主星</Text>
      ) : (
        <View style={styles.majorStarGroup}>
          {majors.map((s) => (
            <MajorStarColumn key={s.name} star={s} />
          ))}
        </View>
      )}
```

Add this style:

```typescript
  majorStarGroup: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: 4 },
```

- [ ] **Step 4: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors.

Manual on-device check (requires `npx expo start -c`, Expo Go or dev build): open a profile's Chart tab. Confirm: star names render rotated 90° (vertical). A palace with two major stars (e.g. 福德宮, 紫微+貪狼 in a typical chart) shows both as separate adjacent vertical columns, not stacked on top of each other as two full rows. A star with 廟/旺/得/利 brightness shows that character in bold bright gold; a star with 平/陷 shows it dim and not bold. The star NAME itself looks the same dark-ink bold color regardless of which brightness word follows it — specifically check this on two different stars, one good-brightness and one weak-brightness, side by side, and confirm the star names look identical in color/weight to each other. A minor star that's one of 文昌/文曲/左輔/右弼/天魁/天鉞 renders in gold; one of 擎羊/陀羅/火星/鈴星/地空/地劫 renders in vermillion; any other minor star renders in the existing plain gray. A minor star's own mutagen (if it has one) now shows a colored badge where previously it showed no color at all.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/mingli-app
git add app/theme.ts app/screens/reading/ChartScreen.tsx
git commit -m "feat: rewrite star rendering — vertical layout, brightness/mutagen colors, star categories, multi-star flow fix"
```

---

### Task 3: Palace cell chrome — 命宮/身宮, names, 大運 age ranges

**Files:**
- Modify: `app/screens/reading/ChartScreen.tsx`

**Interfaces:**
- Consumes: Task 2's `MajorStarColumn`/`MutagenBadge`/minor-star rendering (unchanged by this task — this task only touches the cell wrapper, palace name, and center block around that content). `COLORS.soulCellBg` from Task 2's `theme.ts` addition.

- [ ] **Step 1: Read the current `ChartScreen.tsx`** (post-Task-2) in full before editing — this task touches the `PalaceCell` function's outer structure, the `styles.grid`/`cell`/`soulCell`/`bodyCell` styles, the `centerBlock` JSX, and adds a new age-range computation.

- [ ] **Step 2: Add the 大運 age-range helper.** Add this function near the top of the file, alongside the existing `normalizeBranch`/`getTriFang` helpers:

```typescript
// "3~12" -> [3, 12]. Mirrors the parsing convention already used elsewhere
// in this app (e.g. DecadesScreen.tsx's decadalStartAge) for this exact
// "X~Y" string format.
function parseAgeRange(decadalAge: string): [number, number] {
  const [startStr, endStr] = decadalAge.split("~");
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  return [Number.isNaN(start) ? -Infinity : start, Number.isNaN(end) ? Infinity : end];
}
```

- [ ] **Step 3: Compute the current age and current-decade branch inside `ChartScreen`.** Find this line in the component body (added in an earlier session for a different feature, already present):

```typescript
  const palacesCacheKey = `${profile.id}_palaces`;
```

Add immediately after the `byBranch`/`mingge`/`triFang` block further down (where `ziwei` is already confirmed non-null) — find:

```typescript
  const byBranch = new Map<string, Palace>();
  for (const p of ziwei.palaces) byBranch.set(normalizeBranch(p.earthlyBranch), p);
  const mingge = detectMingge(ziwei.palaces);
  const triFang = selectedBranch ? getTriFang(selectedBranch) : { trine: new Set<string>(), opposite: "" };
```

and add after it:

```typescript
  const currentAge = new Date().getFullYear() - parseInt(profile.date.slice(0, 4), 10);
  const currentDecadeBranch = ziwei.palaces.find((p) => {
    const [start, end] = parseAgeRange(p.decadalAge);
    return currentAge >= start && currentAge <= end;
  })?.earthlyBranch;
```

- [ ] **Step 4: Rewrite `PalaceCell`'s signature and bottom section.** Find the current `PalaceCell` function signature:

```typescript
function PalaceCell({ palace, highlight }: { palace: Palace | undefined; highlight: Highlight }) {
```

Replace with:

```typescript
function PalaceCell({
  palace,
  highlight,
  isCurrentDecade,
}: {
  palace: Palace | undefined;
  highlight: Highlight;
  isCurrentDecade: boolean;
}) {
```

Find the soul-palace background-tint logic:

```typescript
  // 命宮 keeps its own background tint under any highlight so it stays recognizable.
  const tintBg = !palace.isSoulPalace;
```

Replace with (the tint logic for trine/opposite no longer needs a 命宮 exception, since 命宮 no longer has its own permanent background — it always shows `soulCellBg` regardless, and trine/opposite highlighting applies on top the same as any other palace now):

```typescript
  const tintBg = true;
```

Find the cell's outer `<View>` style array:

```typescript
    <View
      style={[
        styles.cellInner,
        palace.isSoulPalace && styles.soulCell,
        palace.isBodyPalace && styles.bodyCell,
        highlight === "trine" && [styles.trineCell, tintBg && styles.trineBg],
        highlight === "opposite" && [styles.oppositeCell, tintBg && styles.oppositeBg],
        highlight === "selected" && styles.selectedCell,
      ]}
    >
```

Replace with:

```typescript
    <View
      style={[
        styles.cellInner,
        palace.isSoulPalace && styles.soulCellBg,
        highlight === "trine" && [styles.trineCell, styles.trineBg],
        highlight === "opposite" && [styles.oppositeCell, styles.oppositeBg],
        highlight === "selected" && styles.selectedCell,
      ]}
    >
```

(`bodyCell`'s border is removed entirely — 身宮 no longer marks its own cell with a border, per the spec; the seal stamp in the center block is the only 身宮 indicator now, added in Step 6.)

Find the `cellHeader` JSX (currently shows palace name + branch together at top):

```typescript
      <View style={styles.cellHeader}>
        <Text style={[styles.palaceName, palace.isSoulPalace && styles.soulName]} numberOfLines={1}>
          {palace.name}
          {palace.isBodyPalace && <Text style={styles.bodyTag}> 身</Text>}
        </Text>
        <Text style={styles.branch}>{palace.heavenlyStem}{normalizeBranch(palace.earthlyBranch)}</Text>
      </View>
```

Replace with a top-right-only 干支 line (palace name moves to the bottom in Step 5):

```typescript
      <View style={styles.cellTop}>
        <Text style={styles.branch}>{palace.heavenlyStem}{normalizeBranch(palace.earthlyBranch)}</Text>
      </View>
```

- [ ] **Step 5: Add the bottom palace-name + age-range row.** Find the end of `PalaceCell`'s return statement — Task 2 left the minor-star block followed immediately by the function's closing tags:

```typescript
      )}
    </View>
  );
}
```

(the `)}` here is the closing of Task 2's `{minors.length > 0 && (...)}` block — do not touch anything above it, only insert a new `<View style={styles.palaceBottomRow}>` between that `)}` and the closing `</View>`)

Replace just that fragment with:

```typescript
      )}
      <View style={styles.palaceBottomRow}>
        <Text
          style={[styles.palaceNameBottom, palace.isSoulPalace && styles.soulNameBottom]}
          numberOfLines={1}
        >
          {palace.name.endsWith("宮") ? palace.name : `${palace.name}宮`}
        </Text>
        <Text style={[styles.ageRangeText, isCurrentDecade && styles.ageRangeCurrent]}>
          {palace.decadalAge.replace("~", "～")}
          {isCurrentDecade ? "★" : ""}
        </Text>
      </View>
    </View>
  );
}
```

If this exact 4-line fragment (`)}` / `</View>` / `);` / `}`) isn't unique in the file (it's a common closing pattern), locate it by context instead — it's the one immediately following the `minorStarGroup`/`MutagenBadge` content Task 2 added, inside `PalaceCell`, not any other function's closing.

- [ ] **Step 6: Add the 身宮 seal stamp to the center block, with collision-safe padding.** Find the `centerBlock` JSX in the main `ChartScreen` return:

```typescript
        <View style={styles.centerBlock}>
          {!!profile.name && <Text style={styles.centerName}>{profile.name}</Text>}
          <Text style={styles.centerLine}>
            {profile.gender === "male" ? "男" : "女"} · {profile.date}
          </Text>
          <View style={styles.centerDivider} />
          <Text style={styles.centerLine}>
            <Text style={styles.centerLabel}>五行局 </Text>
            {ziwei.fiveElementsClass}
          </Text>
          <Text style={styles.centerLine}>
            <Text style={styles.centerLabel}>命主 </Text>
            {ziwei.mainStar}
          </Text>
          <Text style={styles.centerLine}>
            <Text style={styles.centerLabel}>身主 </Text>
            {ziwei.bodyStar}
          </Text>
        </View>
```

Replace with (wrapping the existing content unchanged, adding the stamp as a sibling overlay):

```typescript
        <View style={styles.centerBlock}>
          {!!profile.name && <Text style={styles.centerName}>{profile.name}</Text>}
          <Text style={styles.centerLine}>
            {profile.gender === "male" ? "男" : "女"} · {profile.date}
          </Text>
          <View style={styles.centerDivider} />
          <Text style={styles.centerLine}>
            <Text style={styles.centerLabel}>五行局 </Text>
            {ziwei.fiveElementsClass}
          </Text>
          <Text style={styles.centerLine}>
            <Text style={styles.centerLabel}>命主 </Text>
            {ziwei.mainStar}
          </Text>
          <Text style={styles.centerLine}>
            <Text style={styles.centerLabel}>身主 </Text>
            {ziwei.bodyStar}
          </Text>
          <View style={styles.bodyPalaceStamp}>
            <View style={styles.bodyPalaceStampRotate}>
              <Text style={styles.bodyPalaceStampText}>身宮</Text>
            </View>
          </View>
        </View>
```

- [ ] **Step 7: Wire `isCurrentDecade` into the grid's `PalaceCell` calls.** Find the grid-rendering loop in the main return:

```typescript
          return (
            <Pressable
              key={branch}
              disabled={!palace}
              onPress={() => setSelectedBranch((cur) => (cur === branch ? null : branch))}
              style={[styles.cell, { top: `${row * 25}%`, left: `${col * 25}%` }]}
            >
              <PalaceCell palace={palace} highlight={highlight} />
            </Pressable>
          );
```

Replace the `<PalaceCell ... />` line with:

```typescript
              <PalaceCell palace={palace} highlight={highlight} isCurrentDecade={branch === currentDecadeBranch} />
```

- [ ] **Step 8: Update styles.** Find and remove the old `cellHeader`, `palaceName`, `soulName`, `bodyTag`, `soulCell`, `bodyCell` style entries:

```typescript
  cellHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 },
  palaceName: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 10, color: COLORS.ink2, flexShrink: 1 },
  soulName: { color: COLORS.vermillion },
  bodyTag: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 8, color: COLORS.gold },
```

and:

```typescript
  soulCell: { backgroundColor: COLORS.vermillionL, borderWidth: 1.5, borderColor: COLORS.vermillion },
  bodyCell: { borderLeftWidth: 3, borderLeftColor: COLORS.gold },
```

Replace with:

```typescript
  cellTop: { flexDirection: "row", justifyContent: "flex-end" },
  soulCellBg: { backgroundColor: COLORS.soulCellBg },
  palaceBottomRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
    marginTop: "auto",
  },
  palaceNameBottom: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 12, color: COLORS.ink2 },
  soulNameBottom: { color: COLORS.vermillion },
  ageRangeText: { fontFamily: FONT_SERIF_TC, fontSize: 8.5, color: COLORS.ink4 },
  ageRangeCurrent: { fontFamily: FONT_SERIF_TC_BOLD, color: COLORS.vermillion },
```

(`palaceBottomRow`'s `marginTop: "auto"` requires `cellInner` to be a flex column, which it already is via `cellInner: { flex: 1, padding: 3, overflow: "hidden" }` — View defaults to `flexDirection: "column"`, so this pushes the bottom row down regardless of how much star content is above it, without needing a divider line.)

Add the stamp styles (new, alongside the existing `centerBlock`/`centerName`/etc. styles):

```typescript
  bodyPalaceStamp: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 38,
    borderWidth: 1.5,
    borderColor: COLORS.vermillion,
    borderRadius: 3,
    backgroundColor: COLORS.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyPalaceStampRotate: { transform: [{ rotate: "90deg" }] },
  bodyPalaceStampText: { fontFamily: FONT_SERIF_TC_BOLD, fontSize: 11, color: COLORS.vermillion, letterSpacing: 1 },
```

Add reserved right padding to `centerBlock` so its text content can never reach under the stamp — find:

```typescript
  centerBlock: {
    position: "absolute",
    top: "25%",
    left: "25%",
    width: "50%",
    height: "50%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderWarm,
    backgroundColor: COLORS.parchment,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 3,
  },
```

Replace `padding: 8,` with `paddingVertical: 8, paddingLeft: 8, paddingRight: 32,` (keep every other property unchanged):

```typescript
  centerBlock: {
    position: "absolute",
    top: "25%",
    left: "25%",
    width: "50%",
    height: "50%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderWarm,
    backgroundColor: COLORS.parchment,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 32,
    gap: 3,
  },
```

- [ ] **Step 9: Verify**

Run: `cd ~/Projects/mingli-app && npx tsc --noEmit`
Expected: no errors.

Manual on-device check: open a profile's Chart tab.
1. Confirm 命宮's cell shows a soft pink background and its palace name (at the bottom, now reading e.g. "命宮" not "命") in vermillion — with **no border** around it in the default unselected state.
2. Tap 命宮's cell to select it — confirm a border now appears (the existing `selectedCell` style), and tap it again to deselect — confirm the border disappears but the pink background + red name remain (since those are unconditional, not tied to selection).
3. Tap a different palace that has 命宮 in its 三方四正 — confirm 命宮 gets the gold trine border/background on top of its permanent pink tint, without visual conflict.
4. Confirm every palace name now ends in "宮" and none show a doubled "宮宮".
5. Confirm the body-palace cell (wherever `isBodyPalace` is true) no longer has a gold left-border, and that the center block shows a small vertical "身宮" stamp in its top-right corner that does not overlap any of the 4 lines of center text (test specifically on a profile with a name, since that's the longest realistic content case per the Review Focus item).
6. Confirm one palace's age range shows in bold vermillion with a ★, and that it's the palace whose age range actually contains your test profile's current age (compute by hand: current year minus birth year, check against that palace's `decadalAge`) — every other palace's age range should be muted gray with no ★.
7. Confirm the palace name + age range sit together on one bottom line, centered, with no visible divider line separating them from the star content above.

- [ ] **Step 10: Commit**

```bash
cd ~/Projects/mingli-app
git add app/screens/reading/ChartScreen.tsx
git commit -m "feat: redesign palace cell chrome — 命宮/身宮 treatment, bottom palace names, 大運 age ranges"
```
