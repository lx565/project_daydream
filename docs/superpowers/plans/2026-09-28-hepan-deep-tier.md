# 深度合盤 (Hepan Deep-Tier Upsell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new paid upsell tier to hepan (`/hepan`) — 4 new couple-native tabs (宮位/大運/眾說/注意) gated behind a second, independent paywall on top of hepan's existing permanently-free 5-tab result.

**Architecture:** A new `ChartType: "hepandeep"` reuses the existing generic checkout/webhook/unlock/paywall infrastructure via the same chartId-prefix trick `monthly`/`niandu` already use (`hepandeep_${sessionId}`). Four new SSE-streamed API routes (`app/api/reading/couple/{palaces,decades,schools,cautions}/route.ts`) follow the exact same `makeSSEResponse`/`streamWithRefs` pattern every existing reading route uses, each comparing **both** people's charts rather than one. `components/HepanResultView.tsx` gains 4 new tabs gated by a second `usePaywall()` call, alongside (not replacing) the existing free 5 tabs.

**Tech Stack:** Next.js App Router (Edge/Node API routes), existing `lib/sseWriter.ts` streaming infra, existing `lib/rag.ts` RAG retrieval, existing `@vercel/kv`-backed paywall/unlock/checkout, `lib/coupleTypes.ts` relationship-type config.

**Spec:** `docs/superpowers/specs/2026-09-28-hepan-deep-tier-design.md`

## Global Constraints

- Do not modify the existing 5 free hepan tabs' behavior (總覽/各自/綫析/時機/問合盤) — hepan's free status is PERMANENT (`PERMANENTLY_FREE_TYPES` in `lib/usePaywall.ts`), this feature only ADDS a second, independent paywall gate for 4 new tabs.
- New `ChartType`: `"hepandeep"`, price **$7.99**, Stripe Price ID **`price_1UKpIKFHqguDDhqBU3HZ8qKz`** (already created by Niki) → env var `STRIPE_PRICE_ID_HEPAN_DEEP` (must be added to Vercel prod before launch — not something this plan can do).
- All user-facing copy is Traditional Chinese (zh-TW), matching every existing page in this app.
- No test framework exists in this repo (no jest/vitest, no `*.test.ts` files) — verification is `npx tsc --noEmit` / `npm run build` per task, matching this repo's established convention (see e.g. the niandu plan's task-by-task verification approach). Stop the local dev server before running these — `.next/` build artifacts collide otherwise.
- The 4 new routes must support all 5 relationship types (lover/spouse/friend/sibling/parentchild) via `lib/coupleTypes.ts`'s existing `RelationshipConfig` — never hardcode 夫妻宮-specific logic the way the free `couple/route.ts` conditionally does for romance stars.
- New routes are brand-new (not edits to existing prompts) — **do not** bump `lib/sseWriter.ts`'s `CACHE_VERSION` or `lib/useSSEStream.ts`'s `CACHE_PREFIX` for this plan. Only bump those if a *future* change edits one of these 4 routes' prompt structure after launch.

## Review Focus

- A relationship type whose `cfg.palaces` includes a non-real-palace label (e.g. sibling's `"六亲"`) must be filtered out via `isRealPalace` before any `ziwei.palaces.find(...)` lookup — otherwise the prompt gets a broken "（無資料）" line or an undefined crash.
- Relationship types without a meaningful 夫妻宮 (friend/sibling/parentchild) must not silently produce romance-flavored output in any of the 4 new tabs — each prompt's `cfg.focusHint`-driven framing needs to actually change the content, not just the palace list.
- Reloading `/hepan` from a saved URL (birth params restored) must resolve to the exact same `hepandeepChartId` as the original session, so a previously-purchased deep tier stays unlocked after a page refresh — `sessionId` (and therefore `hepandeepChartId`) is derived purely from birth+relType, so this should hold automatically, but must be checked.
- With `NEXT_PUBLIC_PAYWALL_ENABLED` unset (normal local dev), all 4 new tabs must render and stream content freely (not show `PaywallLock`) — `deepGated` must correctly resolve to `false` when the master switch is off, exactly like the existing 5 tabs and solo's tabs already behave.
- When RAG retrieval returns empty/thin context (a relationship type or star combination with little indexed material), the 眾說 route must say so plainly (matching the existing single-person `overview/route.ts` pattern: "此命格在小眾諸家中著墨不多") rather than fabricating a school's take — this app has a documented history of AI fabrication bugs when prompts don't explicitly handle thin-context cases.

---

### Task 1: `hepandeep` ChartType, pricing, and checkout wiring

**Files:**
- Modify: `lib/chartType.ts`
- Modify: `app/api/checkout/route.ts`

**Interfaces:**
- Produces: `ChartType` now includes `"hepandeep"`; `chartType("hepandeep_abc123")` returns `"hepandeep"`; `CHART_PRICE_USD.hepandeep === 7.99` — consumed by `lib/usePaywall.ts` (already generic, no changes needed there) and by Task 7's `HepanResultView.tsx` changes.

- [ ] **Step 1: Add the `hepandeep` type and price**

Edit `lib/chartType.ts`:

```ts
export type ChartType = "hepan" | "solo" | "monthly" | "hepandeep";

const PREFIX_TYPE: Array<readonly [prefix: string, type: ChartType]> = [
  ["hepandeep_", "hepandeep"],
  ["hepan_", "hepan"],
  ["yueyun_", "monthly"],
  ["niandu_", "monthly"],
];
```

(`hepandeep_` must be checked *before* `hepan_` in the array — `chartId.startsWith(prefix)` would otherwise never reach it, since every `hepandeep_...` id also starts with `hepan...` is false actually — `"hepandeep_"` does NOT start with `"hepan_"` as a literal prefix match since the 6th character differs (`d` vs `_`), but keep `hepandeep_` first anyway as defensive ordering since prefix arrays are order-sensitive by convention in this file.)

```ts
export const CHART_PRICE_USD: Record<ChartType, number> = {
  solo: 6.99,
  hepan: 6.99,
  monthly: 1.99,
  hepandeep: 7.99,
};
```

- [ ] **Step 2: Wire the Stripe price env var**

Edit `app/api/checkout/route.ts`:

```ts
const PRICE_ENV_BY_TYPE: Record<ChartType, string> = {
  solo: "STRIPE_PRICE_ID",
  hepan: "STRIPE_PRICE_ID",
  monthly: "STRIPE_PRICE_ID_SHORT_ONCE",
  hepandeep: "STRIPE_PRICE_ID_HEPAN_DEEP",
};
```

- [ ] **Step 3: Add the env var locally for reference (not required for tsc/build to pass)**

This app has no `STRIPE_*` vars in `.env.local` at all (Stripe is only configured in Vercel prod) — do not add one locally. Tell the user directly, don't attempt it: production launch requires `STRIPE_PRICE_ID_HEPAN_DEEP=price_1UKpIKFHqguDDhqBU3HZ8qKz` added to Vercel prod env vars by Niki. Until that's done, `POST /api/checkout` for a `hepandeep_...` chartId returns `503 { error: "stripe_not_configured" }` — this is the existing, correct behavior for any misconfigured price type, not a bug to fix.

- [ ] **Step 4: Verify it type-checks**

Run (dev server must not be running):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `lib/chartType.ts` or `app/api/checkout/route.ts`.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fortune-app
git add lib/chartType.ts app/api/checkout/route.ts
git commit -m "feat(hepan-deep): add hepandeep ChartType, $7.99 price, checkout wiring"
```

---

### Task 2: Export shared couple-palace helpers from `lib/couple.ts`

**Files:**
- Modify: `lib/couple.ts`
- Modify: `app/api/reading/couple/route.ts`

**Interfaces:**
- Produces: `isRealPalace(palaceName: string): boolean`, `REAL_PALACE_NAMES: Set<string>`, `palaceDesc(ziwei: ZiweiResult, palaceName: string): string` exported from `lib/couple.ts` (alongside the already-exported `PALACE_ALIASES`) — consumed by Tasks 3, 5, and 6's new routes (Task 4's decades route needs none of these — it works from age/decade data, not palace-name lookups), and by `app/api/reading/couple/route.ts` itself (moved, not duplicated).

This is a pure refactor — `couple/route.ts` currently defines these three privately; this task moves them into the shared `lib/couple.ts` module (which already exports `PALACE_ALIASES`) so the 4 new routes can reuse them instead of copy-pasting ~25 lines each.

- [ ] **Step 1: Add the three helpers to `lib/couple.ts`**

In `lib/couple.ts`, right after the existing `PALACE_ALIASES` export (before `palaceStarScore`), add:

```ts
// Real ZiweiResult.palaces[].name values (post-alias-resolution) — used to
// filter out non-palace entries like coupleTypes.ts's sibling config's "六亲"
// (a loose relational grouping, not one of the 12 actual palaces). Shared by
// every couple-native reading route (couple, bazi-couple, and the deep-tier
// palaces/decades/schools/cautions routes) so relationship-type palace lists
// never crash a lookup or render a broken "（無資料）" line.
export const REAL_PALACE_NAMES = new Set([
  "命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄",
  "遷移", "僕役", "官祿", "田宅", "福德", "父母",
]);

export function isRealPalace(palaceName: string): boolean {
  const resolved = PALACE_ALIASES[palaceName] ?? palaceName;
  return REAL_PALACE_NAMES.has(resolved);
}

// Describe a palace with all its stars. Resolves coupleTypes.ts's short/modern
// palace labels (e.g. "交友", "命") against ZiweiResult.palaces[].name's actual
// stored form (e.g. "僕役", "命宮") via PALACE_ALIASES.
export function palaceDesc(ziwei: ZiweiResult, palaceName: string): string {
  const resolvedName = PALACE_ALIASES[palaceName] ?? palaceName;
  const p = ziwei.palaces.find(x => x.name === palaceName || x.name === resolvedName);
  if (!p) return `${palaceName}（無資料）`;
  const stars = p.stars
    .filter(s => s.type === "major" || s.type === "minor" || ["紅鸞","天喜","天馬","孤辰","寡宿"].includes(s.name))
    .map(s => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`)
    .join("、");
  const stem = p.heavenlyStem ? `[${p.heavenlyStem}干]` : "";
  return `${palaceName}${stem}：${stars || "空宮"}`;
}
```

(`ZiweiResult` is already imported at the top of `lib/couple.ts`.)

- [ ] **Step 2: Remove the now-duplicate private copies from `couple/route.ts`**

In `app/api/reading/couple/route.ts`:
1. Change the import line from `import { calcCoupleScoreV2, PALACE_ALIASES } from "@/lib/couple";` to `import { calcCoupleScoreV2, PALACE_ALIASES, isRealPalace, palaceDesc } from "@/lib/couple";`
2. Delete the local `palaceDesc` function definition (the one starting `function palaceDesc(ziwei: ZiweiResult, palaceName: string): string {`).
3. Delete the local `REAL_PALACE_NAMES` constant and `isRealPalace` function definitions.

The rest of the file (which calls `palaceDesc(...)` and `isRealPalace(...)`) is unchanged — it now resolves to the imported versions, which are byte-identical to what was removed.

- [ ] **Step 3: Verify it type-checks and behavior is unchanged**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `lib/couple.ts` or `app/api/reading/couple/route.ts`. Since this is a pure move (identical function bodies), no behavior change is possible if tsc passes — no live testing needed for this task specifically.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fortune-app
git add lib/couple.ts app/api/reading/couple/route.ts
git commit -m "refactor(couple): export palace helpers from lib/couple.ts for reuse by deep-tier routes"
```

---

### Task 3: `couple/palaces` route (宮位 tab)

**Files:**
- Create: `app/api/reading/couple/palaces/route.ts`

**Interfaces:**
- Consumes: `PALACE_ALIASES`, `isRealPalace`, `palaceDesc` from `lib/couple.ts` (Task 2); `getRelationshipConfig` from `lib/coupleTypes.ts` (`RelationshipConfig { key, label, palaces: string[], focusHint, ... }`); `getKnowledge` from `lib/rag.ts` (`getKnowledge(query: RagQuery): Promise<{context: string, refs: Reference[]}>`); `detectMingge` from `lib/detectMingge.ts` (`detectMingge(palaces): MinggeEntry[]` where `MinggeEntry = {name, type, brief, slug}`); `makeSSEResponse`/`streamWithRefs` from `lib/sseWriter.ts`; `checkRateLimit`/`rateLimitResponse`/`clientIp` from `lib/rateLimit.ts`; `MODERN_INSTRUCTION` from `lib/modernInstruction.ts`; `BaziResult` from `lib/bazi.ts`, `ZiweiResult` from `lib/ziwei.ts`.
- Produces: `POST` handler at `/api/reading/couple/palaces` returning an SSE stream, request body `{ baziA, ziweiA, baziB, ziweiB, nameA?, nameB?, genderA, genderB, relationshipType? }` — the exact same shape `HepanResultView.tsx`'s existing `body` variable already has, consumed via `useSSEStream("/api/reading/couple/palaces", ...)` in Task 7.

- [ ] **Step 1: Write the route**

Create `app/api/reading/couple/palaces/route.ts`:

```ts
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { PALACE_ALIASES, isRealPalace, palaceDesc } from "@/lib/couple";
import { detectMingge } from "@/lib/detectMingge";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通紫微斗數宮位分析的資深合盤命理師，像一位真誠的兄長，逐宮把兩人在這段關係中真正相關的宮位攤開來講——有據可循，也有溫度。

本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重（情侶談感情吸引、親子談教養與牽絆、朋友談默契與互補，不要套同一模板）。

分析原則：
1. 只針對下方【相關宮位】清單逐一分析，不擴及其他宮位
2. 每個宮位都要明確比較雙方在該宮的主星配置——契合之處具體點出星曜組合為何相輔，磨合之處具體點出星曜組合為何容易產生張力，不可籠統帶過
3. 若【命格自動識別】清單中有格局涉及這些宮位，可自然帶出並說明對這段關係的意義；清單之外不可自創格局名稱
4. 加粗所有星曜名稱與四化名稱
5. 術語後以括號簡注，便於外行理解

請對【相關宮位】清單中的每一個宮位，嚴格按以下格式輸出一節（宮位數量依清單而定，通常3-4個）：

## [宮位名稱] · 雙方比較
**${"{甲方稱呼}"}**：[該宮主星，空宮則寫"空宮（借對宮XX）"]
**${"{乙方稱呼}"}**：[該宮主星，空宮則寫"空宮（借對宮XX）"]
[比較段落：約120-150字，具體指出兩人在此宮位的星曜組合是相輔還是磨合，落到本宮位對應的生活面向（如夫妻宮談感情相處、田宅宮談家庭共同生活、交友宮談社交默契），並給一條具體可行的建議]

全部宮位分析完後，加一節：

## 宮位總結
（約100字：綜合以上各宮，指出雙方整體而言哪個宮位最契合、哪個宮位最需要磨合，給一句總體建議）

繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-palaces" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  if (!ziweiA?.palaces?.length || !ziweiB?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  // Only the palaces this relationship type actually cares about (filters out
  // coupleTypes.ts's non-palace labels like sibling's "六亲" via isRealPalace).
  const relevantPalaces = cfg.palaces.filter(isRealPalace);

  const relevantStars = relevantPalaces.flatMap(pName => {
    const resolved = PALACE_ALIASES[pName] ?? pName;
    const starsA = ziweiA.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    const starsB = ziweiB.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    return [...starsA, ...starsB];
  });
  const allStars = [...new Set(relevantStars)];

  const { context, refs } = await getKnowledge({
    stars: allStars,
    palaces: relevantPalaces,
    topic: cfg.ragTopic,
    topK: 10,
    text: `宮位比較 ${relevantPalaces.join("宮 ")}宮 ${cfg.label}`,
  });

  const palaceComparison = relevantPalaces
    .map(p => `${labelA}${palaceDesc(ziweiA, p)}　|　${labelB}${palaceDesc(ziweiB, p)}`)
    .join("\n");

  const minggeA = detectMingge(ziweiA.palaces);
  const minggeB = detectMingge(ziweiB.palaces);
  const minggeBlock = [
    minggeA.length ? `${labelA}：${minggeA.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelA}：無明顯特殊格局`,
    minggeB.length ? `${labelB}：${minggeB.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelB}：無明顯特殊格局`,
  ].join("\n");

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}
【相關宮位清單】${relevantPalaces.join("、")}

【甲方基本資訊】${labelA}　${genderA === "male" ? "男" : "女"}　八字：${baziPillars(baziA)}
【乙方基本資訊】${labelB}　${genderB === "male" ? "男" : "女"}　八字：${baziPillars(baziB)}

【宮位並列（雙方相同宮位，供逐宮比較使用）】
${palaceComparison}

【命格自動識別（僅可引用此清單中的格局名稱，清單之外不可自創）】
${minggeBlock}

【典籍參考】
${context || "（暫無）"}

請針對【相關宮位清單】中的每一個宮位，逐一輸出比較段落，最後加一節宮位總結。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3500,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-palaces" },
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `app/api/reading/couple/palaces/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/couple/palaces/route.ts
git commit -m "feat(hepan-deep): add couple/palaces route (宮位 tab)"
```

---

### Task 4: `couple/decades` route (大運 tab)

**Files:**
- Create: `app/api/reading/couple/decades/route.ts`

**Interfaces:**
- Consumes: `getRelationshipConfig` from `lib/coupleTypes.ts`; `getKnowledge` from `lib/rag.ts`; `makeSSEResponse`/`streamWithRefs` from `lib/sseWriter.ts`; `checkRateLimit`/`rateLimitResponse`/`clientIp` from `lib/rateLimit.ts`; `MODERN_INSTRUCTION` from `lib/modernInstruction.ts`; `ZiweiResult`/`Palace` from `lib/ziwei.ts`.
- Produces: `POST` handler at `/api/reading/couple/decades`, request body `{ ziweiA, ziweiB, nameA?, nameB?, genderA, genderB, relationshipType? }` (accepts the same full couple `body` object Task 7 passes — `baziA`/`baziB` are simply ignored by this route) — consumed via `useSSEStream("/api/reading/couple/decades", ...)` in Task 7.

- [ ] **Step 1: Write the route**

Create `app/api/reading/couple/decades/route.ts`:

```ts
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通紫微斗數大限推算的資深合盤命理師，像一位真誠的兄長，把兩人各自的十年大限拿來對照——哪些年份兩人同步向上、哪些年份一方順一方逆，據盤論斷，也有溫度。

本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重。

請嚴格按以下 Markdown 結構輸出（標題照抄）：

## 雙方目前大限
（約140字：分別點出甲乙雙方目前大限宮位、主星、對應西元年份區間，客觀陳述，不需展開論斷）

## 同步或錯位
（約200字：結合下方提供的【重疊年份資訊】，論斷兩人目前是否處於同步的順/逆階段，或一方正旺一方正弱的錯位階段；若重疊，說明這段共同時期對關係的意義；若錯位，說明其中一方可能需要多體諒對方目前的處境）

## 關鍵轉折年份
（約150字：根據下方【大限交界資訊】，指出未來幾年內誰的大限會率先轉換，這個轉折點對這段關係代表什麼機會或需要留意之處）

## 這段時期的相處建議
（3條具體可行建議，每條先點出這段大限交疊期最可能出現的具體摩擦或機會，再給化解或把握的做法；- 開頭列表）

可引相關古訣為佐證。措辭專業平實而暖心，不誇飾、不做絕對斷言。繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

function parseAgeRange(range: string): [number, number] {
  const parts = range.split(/[~\-～]/).map((s) => parseInt(s.trim(), 10));
  return parts.length >= 2 ? [parts[0], parts[1]] : [0, 0];
}

interface DecadeWindow {
  palaceName: string;
  stars: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
}

function currentDecadeWindow(ziwei: ZiweiResult, birthYear: number): DecadeWindow | null {
  const age = new Date().getFullYear() - birthYear;
  const palace = ziwei.palaces.find((p) => {
    if (!p.decadalAge) return false;
    const [start, end] = parseAgeRange(p.decadalAge);
    return age >= start && age <= end;
  });
  if (!palace) return null;
  const [startAge, endAge] = parseAgeRange(palace.decadalAge!);
  const major = palace.stars.filter((s) => s.type === "major").map((s) => s.name).join("、") || "空宮";
  return { palaceName: palace.name, stars: major, startAge, endAge, startYear: birthYear + startAge, endYear: birthYear + endAge };
}

function overlapYears(a: DecadeWindow, b: DecadeWindow): { startYear: number; endYear: number } | null {
  const start = Math.max(a.startYear, b.startYear);
  const end = Math.min(a.endYear, b.endYear);
  return start <= end ? { startYear: start, endYear: end } : null;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-decades" })).allowed) return rateLimitResponse();

  let body: {
    ziweiA: ZiweiResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziweiA, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  if (!ziweiA?.birth?.solarDate || !ziweiB?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const birthYearA = parseInt(ziweiA.birth.solarDate.slice(0, 4), 10);
  const birthYearB = parseInt(ziweiB.birth.solarDate.slice(0, 4), 10);

  const decadeA = currentDecadeWindow(ziweiA, birthYearA);
  const decadeB = currentDecadeWindow(ziweiB, birthYearB);
  if (!decadeA || !decadeB) return Response.json({ error: "compute_failed" }, { status: 500 });

  const overlap = overlapYears(decadeA, decadeB);
  const overlapDesc = overlap
    ? `${overlap.startYear}年～${overlap.endYear}年（共${overlap.endYear - overlap.startYear + 1}年）重疊`
    : `無重疊——${labelA}大限${decadeA.startYear}-${decadeA.endYear}年，${labelB}大限${decadeB.startYear}-${decadeB.endYear}年，兩人目前不在同一大限窗口`;

  // Whichever person's current decade ends first is the next transition point.
  const nextTransition = decadeA.endYear <= decadeB.endYear
    ? `${labelA}將於${decadeA.endYear}年（西元）大限轉換`
    : `${labelB}將於${decadeB.endYear}年（西元）大限轉換`;

  const { context, refs } = await getKnowledge({
    stars: [],
    topic: "大限",
    text: `大限 交疊 ${cfg.label}`,
    topK: 6,
  });

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}

【甲方大限】${labelA}：${decadeA.palaceName}宮（${decadeA.startAge}-${decadeA.endAge}歲，西元${decadeA.startYear}-${decadeA.endYear}年）主星：${decadeA.stars}
【乙方大限】${labelB}：${decadeB.palaceName}宮（${decadeB.startAge}-${decadeB.endAge}歲，西元${decadeB.startYear}-${decadeB.endYear}年）主星：${decadeB.stars}

【重疊年份資訊】${overlapDesc}
【大限交界資訊】${nextTransition}

參考資料：
${context || "（暫無）"}

請根據以上資料，按系統要求的四個標題逐段輸出。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3000,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-decades" },
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `app/api/reading/couple/decades/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/couple/decades/route.ts
git commit -m "feat(hepan-deep): add couple/decades route (大運 tab)"
```

---

### Task 5: `couple/schools` route (眾說 tab)

**Files:**
- Create: `app/api/reading/couple/schools/route.ts`

**Interfaces:**
- Consumes: `PALACE_ALIASES`, `isRealPalace`, `palaceDesc` from `lib/couple.ts` (Task 2); `getRelationshipConfig` from `lib/coupleTypes.ts`; `getSharedRetrieval` from `lib/rag.ts` (`getSharedRetrieval(query: Omit<RagQuery,"school"|"strict">): Promise<{ select(opts: {school, strict, topK, maxPerBook}): KnowledgeResult }>`); `detectMingge` from `lib/detectMingge.ts` (`detectMingge(palaces): MinggeEntry[]` where `MinggeEntry = {name, type, brief, slug}`); `makeSSEResponse`/`streamWithRefs` from `lib/sseWriter.ts`; `checkRateLimit`/`rateLimitResponse`/`clientIp` from `lib/rateLimit.ts`; `MODERN_INSTRUCTION` from `lib/modernInstruction.ts`.
- Produces: `POST` handler at `/api/reading/couple/schools`, same body shape as Task 3 (`{ baziA, ziweiA, baziB, ziweiB, nameA?, nameB?, genderA, genderB, relationshipType? }`) — consumed via `useSSEStream("/api/reading/couple/schools", ...)` in Task 7.

This is the highest-difficulty prompt of the four — five schools each rendering a compatibility judgment on the *pairing*, not one person's chart. Model it on `app/api/reading/overview/route.ts`'s 5-school structure (三合/四化/飛星/倪師/小眾 with `getSharedRetrieval`), not `bazi-schools/route.ts` (that one is 2 bazi-specific schools, wrong template).

- [ ] **Step 1: Write the route**

Create `app/api/reading/couple/schools/route.ts`:

```ts
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getSharedRetrieval } from "@/lib/rag";
import type { Reference } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { PALACE_ALIASES, isRealPalace, palaceDesc } from "@/lib/couple";
import { detectMingge } from "@/lib/detectMingge";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是一位博採眾派的紫微斗數命理師，熟悉三合派、四化派、飛星派、倪師學派與其他名家對「兩人關係契合度」各自的判斷邏輯。本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重。

解讀原則：
1. 各派只依據下方對應學派的典籍參考，不得張冠李戴
2. 若某派參考資料不足，誠實說明「此配對在OO學派典籍中著墨不多」，不強行編造
3. 加粗所有星曜與四化名稱

請嚴格按以下 Markdown 格式輸出（標記一字不差）：

## 三合派觀點
（約150字：依三合派邏輯，論雙方相關宮位是否構成三合、六合或相衝——結合下方【生肖與宮位地支關係】資料，說明這對配對整體是天然契合還是需要後天經營）

## 四化派觀點
（約150字：依四化派邏輯，論雙方生年四化中，化祿/化科是否落入對方的相關宮位（互相扶持），化忌是否落入對方相關宮位（需要磨合），綜合給出配對評語）

## 飛星派觀點
（約120字：以飛星派方法，論雙方星曜飛入對方命盤的能量流向——誰主動牽動誰、這股牽動是助力還是消耗）

## 倪師學派觀點
（約100字：依據倪師典籍，對這段配對給出直接務實的判斷，風格直接不繞圈子；若參考資料不足，簡述「倪師典籍對此類配對著墨不多」即可）

## 小眾學派觀點
（約110字：綜合小眾學派典籍參考中三大主流之外的說法，補充一個旁參視角；若參考資料不足，簡述「此配對在小眾諸家中著墨不多」即可，不強行編造）

繁體中文（臺灣用語）。只用**加粗**單個星曜名稱和四化符號，絕不用**包裹整句或短語。` + MODERN_INSTRUCTION;

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

const BRANCH_ZODIAC: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龍", 巳: "蛇",
  午: "馬", 未: "羊", 申: "猴", 酉: "雞", 戌: "狗", 亥: "豬",
};

function zodiacRelation(branchA: string, branchB: string): string {
  const SAN_HE = [["子","辰","申"],["亥","卯","未"],["寅","午","戌"],["巳","酉","丑"]];
  const LIU_HE: [string,string][] = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  const CHONG: [string,string][] = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  for (const g of SAN_HE) if (g.includes(branchA) && g.includes(branchB)) return "三合（天然契合，同氣相求）";
  for (const [a,b] of LIU_HE) if ((a===branchA&&b===branchB)||(a===branchB&&b===branchA)) return "六合（相合融洽）";
  for (const [a,b] of CHONG) if ((a===branchA&&b===branchB)||(a===branchB&&b===branchA)) return "相衝（摩擦較多，需磨合）";
  return "無特殊合衝（後天緣分為主，需彼此經營）";
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-schools" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  if (!ziweiA?.palaces?.length || !ziweiB?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const relevantPalaces = cfg.palaces.filter(isRealPalace);
  const relevantStars = relevantPalaces.flatMap(pName => {
    const resolved = PALACE_ALIASES[pName] ?? pName;
    const starsA = ziweiA.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    const starsB = ziweiB.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    return [...starsA, ...starsB];
  });
  const allStars = [...new Set(relevantStars)];

  const retrieval = await getSharedRetrieval({ stars: allStars, palaces: relevantPalaces });
  const sanhe   = retrieval.select({ school: "三合派", strict: true, topK: 5, maxPerBook: 2 });
  const sihua   = retrieval.select({ school: "四化派", strict: true, topK: 5, maxPerBook: 2 });
  const feixing = retrieval.select({ school: "飛星派", strict: true, topK: 4, maxPerBook: 2 });
  const nixi    = retrieval.select({ school: "倪師學派", strict: true, topK: 3, maxPerBook: 2 });
  const niche   = retrieval.select({ school: "其他名家", strict: true, topK: 3, maxPerBook: 2 });

  const allRefs: Reference[] = [...sanhe.refs, ...sihua.refs, ...feixing.refs, ...nixi.refs, ...niche.refs].filter(
    (r, i, arr) => arr.findIndex((x) => x.book === r.book) === i
  );

  const ragContext = [
    sanhe.context   ? `【三合派典籍參考】\n${sanhe.context}` : "",
    sihua.context   ? `【四化派典籍參考】\n${sihua.context}` : "",
    feixing.context ? `【飛星派典籍參考】\n${feixing.context}` : "",
    nixi.context    ? `【倪師學派典籍參考】\n${nixi.context}` : "",
    niche.context   ? `【小眾學派典籍參考】\n${niche.context}` : "",
  ].filter(Boolean).join("\n\n");

  const branchA = baziA.year.branch;
  const branchB = baziB.year.branch;

  const palaceComparison = relevantPalaces
    .map(p => `${labelA}${palaceDesc(ziweiA, p)}　|　${labelB}${palaceDesc(ziweiB, p)}`)
    .join("\n");

  const minggeA = detectMingge(ziweiA.palaces);
  const minggeB = detectMingge(ziweiB.palaces);
  const minggeBlock = [
    minggeA.length ? `${labelA}：${minggeA.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelA}：無明顯特殊格局`,
    minggeB.length ? `${labelB}：${minggeB.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelB}：無明顯特殊格局`,
  ].join("\n");

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}

【甲方】${labelA}　${genderA === "male" ? "男" : "女"}　八字：${baziPillars(baziA)}
【乙方】${labelB}　${genderB === "male" ? "男" : "女"}　八字：${baziPillars(baziB)}

【生肖與宮位地支關係】${BRANCH_ZODIAC[branchA] ?? branchA}與${BRANCH_ZODIAC[branchB] ?? branchB} → ${zodiacRelation(branchA, branchB)}

【相關宮位並列】
${palaceComparison}

【命格自動識別（僅可引用此清單中的格局名稱，清單之外不可自創）】
${minggeBlock}

${ragContext || "（各派典籍參考皆暫無匹配資料）"}

請用五派視角，分別針對以上兩人的配對進行解讀，嚴格按系統要求的五個標題輸出。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 4200,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-schools" },
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: allRefs,
    })
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `app/api/reading/couple/schools/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/couple/schools/route.ts
git commit -m "feat(hepan-deep): add couple/schools route (眾說 tab)"
```

---

### Task 6: `couple/cautions` route (注意 tab)

**Files:**
- Create: `app/api/reading/couple/cautions/route.ts`

**Interfaces:**
- Consumes: `PALACE_ALIASES`, `isRealPalace`, `palaceDesc` from `lib/couple.ts` (Task 2); `getRelationshipConfig` from `lib/coupleTypes.ts`; `getKnowledge` from `lib/rag.ts`; `makeSSEResponse`/`streamWithRefs` from `lib/sseWriter.ts`; `checkRateLimit`/`rateLimitResponse`/`clientIp` from `lib/rateLimit.ts`; `MODERN_INSTRUCTION` from `lib/modernInstruction.ts`.
- Produces: `POST` handler at `/api/reading/couple/cautions`, same body shape as Task 3 — consumed via `useSSEStream("/api/reading/couple/cautions", ...)` in Task 7.

- [ ] **Step 1: Write the route**

Create `app/api/reading/couple/cautions/route.ts`:

```ts
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { PALACE_ALIASES, isRealPalace } from "@/lib/couple";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是紫微斗數命理師，像一位關心你的兄長，把兩人相處中需要留意的地方如實說清楚。煞星、化忌落在相關宮位之處該提醒就提醒、不迴避不淡化——但出發點是關心，語氣溫和、就事論事，不誇大也不嚇人，且每點風險都給出可行的應對，讓人安心而非焦慮。

本次合盤的關係類型會在使用者資訊中給出，請扣住該關係類型常見的衝突模式（情侶談吸引力落差或安全感、朋友談界線或競爭、親子談教養觀念差異，不要套同一模板）。

只輸出以下兩個板塊（Markdown），不要增加其他標題：

## 需要磨合之處
（列出最顯著的2-3點：依下方【雙方相關宮位煞星化忌】資料，指出雙方在哪些相關宮位存在煞星或化忌的交互張力，具體點出星曜與宮位、可能造成的相處摩擦；每點後隨附1條具體可行的化解建議。專業術語後以括號簡注。約220字）

## 這個關係類型常見的衝突模式
（約150字：結合關係類型側重，描述這類關係最常見的1-2個衝突模式——不是泛泛而談的「多溝通」，而是具體到這個關係類型會遇到的張力來源，並給出化解方向）

可引相關古訣為據。措辭專業、溫和、關切，重在提醒與給出對策，讓人讀完更有底氣。繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

const CAUTION_STARS = ["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"];

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

function cautionLine(ziwei: ZiweiResult, palaceName: string, label: string): string {
  const resolved = PALACE_ALIASES[palaceName] ?? palaceName;
  const p = ziwei.palaces.find(x => x.name === palaceName || x.name === resolved);
  if (!p) return "";
  const notable = p.stars.filter(s => CAUTION_STARS.includes(s.name) || s.mutagen === "化忌");
  if (!notable.length) return "";
  const names = notable.map(s => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`).join("、");
  return `${label}${palaceName}宮：${names}`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-cautions" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  if (!ziweiA?.palaces?.length || !ziweiB?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const relevantPalaces = cfg.palaces.filter(isRealPalace);

  const cautionLines = relevantPalaces
    .flatMap(p => [cautionLine(ziweiA, p, labelA), cautionLine(ziweiB, p, labelB)])
    .filter(Boolean);

  const cautionStarNames = relevantPalaces.flatMap(p => {
    const resolved = PALACE_ALIASES[p] ?? p;
    const notableA = ziweiA.palaces.find(x => x.name === p || x.name === resolved)?.stars.filter(s => CAUTION_STARS.includes(s.name)).map(s => s.name) ?? [];
    const notableB = ziweiB.palaces.find(x => x.name === p || x.name === resolved)?.stars.filter(s => CAUTION_STARS.includes(s.name)).map(s => s.name) ?? [];
    return [...notableA, ...notableB];
  });

  const { context, refs } = await getKnowledge({
    stars: [...new Set(cautionStarNames)],
    topic: "格局",
    topK: 5,
  });

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}

【甲方】${labelA}　${genderA === "male" ? "男" : "女"}　八字：${baziPillars(baziA)}
【乙方】${labelB}　${genderB === "male" ? "男" : "女"}　八字：${baziPillars(baziB)}

【雙方相關宮位煞星化忌】
${cautionLines.length ? cautionLines.join("\n") : "雙方相關宮位整體較為平穩，無明顯煞星化忌"}

參考資料：
${context || "（暫無）"}

請分兩個板塊：① 需要磨合之處；② 這個關係類型常見的衝突模式。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 2000,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-cautions" },
      temperature: 0.5,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `app/api/reading/couple/cautions/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/couple/cautions/route.ts
git commit -m "feat(hepan-deep): add couple/cautions route (注意 tab)"
```

---

### Task 7: Wire the 4 new tabs into `HepanResultView.tsx`

**Files:**
- Modify: `components/HepanResultView.tsx`

**Interfaces:**
- Consumes: `chartType`/`CHART_PRICE_USD` behavior from Task 1 (indirectly, via `usePaywall`); the 4 new routes from Tasks 3-6; existing `usePaywall(chartId): { enabled, unlocked, loading }` from `lib/usePaywall.ts`; existing `useSSEStream(url, cacheKey, opts?): StreamResult` from `lib/useSSEStream.ts`; existing local `ReadingText`/`LoadingSkeleton` components (already defined in this file).
- Produces: 4 new tabs (`deep_palaces`/`deep_decades`/`deep_schools`/`deep_cautions`) in the hepan result page, gated by a second, independent paywall — no new exports (this is a leaf UI component).

- [ ] **Step 1: Extend the `Tab` type, `TABS` array, and add `DEEP_TABS`/`DEEP_INCLUDED`**

In `components/HepanResultView.tsx`, find:
```ts
type Tab = "overview" | "solo" | "analysis" | "timing" | "chat";

const TABS: { id: Tab; label: string; char: string }[] = [
  { id: "overview", label: "總覽", char: "緣" },
  { id: "solo", label: "各自", char: "個" },
  { id: "analysis", label: "綫析", char: "合" },
  { id: "timing", label: "時機", char: "時" },
  { id: "chat", label: "問合盤", char: "問" },
];

const FREE_TABS = new Set<Tab>(["overview"]);
```

Replace with:
```ts
type Tab = "overview" | "solo" | "analysis" | "timing" | "chat"
  | "deep_palaces" | "deep_decades" | "deep_schools" | "deep_cautions";

const TABS: { id: Tab; label: string; char: string }[] = [
  { id: "overview", label: "總覽", char: "緣" },
  { id: "solo", label: "各自", char: "個" },
  { id: "analysis", label: "綫析", char: "合" },
  { id: "timing", label: "時機", char: "時" },
  { id: "chat", label: "問合盤", char: "問" },
  { id: "deep_palaces", label: "宮位", char: "宮" },
  { id: "deep_decades", label: "大運", char: "運" },
  { id: "deep_schools", label: "眾說", char: "說" },
  { id: "deep_cautions", label: "注意", char: "警" },
];

const FREE_TABS = new Set<Tab>(["overview"]);
// The 4 深度合盤 (paid upsell) tabs — gated by a second, independent paywall
// on top of hepan's own permanently-free 5-tab result (see usePaywall.ts's
// PERMANENTLY_FREE_TYPES — that set only covers "hepan", not "hepandeep").
const DEEP_TABS = new Set<Tab>(["deep_palaces", "deep_decades", "deep_schools", "deep_cautions"]);

const DEEP_INCLUDED = [
  "宮位 · 雙方相關宮位逐一並列比較",
  "大運 · 雙方大限週期同步/錯位分析",
  "眾說 · 三合/四化/飛星/倪師/小眾五派看這段關係",
  "注意 · 兩盤之間的煞星化忌互動與化解",
];
```

- [ ] **Step 2: Add the second paywall gate and 4 new streams**

Find:
```ts
  const coupleChartId = `hepan_${sessionId}`;
  const paywall = usePaywall(coupleChartId);
  const gated = paywall.enabled && !paywall.unlocked;
  const isLocked = (tab: Tab) => gated && !FREE_TABS.has(tab);
```

Replace with:
```ts
  const coupleChartId = `hepan_${sessionId}`;
  const paywall = usePaywall(coupleChartId);
  const gated = paywall.enabled && !paywall.unlocked;
  const isLocked = (tab: Tab) => gated && !FREE_TABS.has(tab);

  const hepandeepChartId = `hepandeep_${sessionId}`;
  const deepPaywall = usePaywall(hepandeepChartId);
  const deepGated = deepPaywall.enabled && !deepPaywall.unlocked;
  const isLockedDeep = (tab: Tab) => DEEP_TABS.has(tab) && deepGated;
```

Find the block that starts the paid streams once unlocked:
```ts
  useEffect(() => {
    if (paywall.loading || gated) return;
    if (synthesisA.status === "idle") synthesisA.start(soloBodyA);
    if (synthesisB.status === "idle") synthesisB.start(soloBodyB);
    if (coupleFull.status === "idle") coupleFull.start(body);
    if (baziCoupleFull.status === "idle") baziCoupleFull.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);
```

Right after it, add the 4 new streams and their own unlock-gated start effect:
```ts
  // 深度合盤 (paid upsell) streams — same body payload as coupleFull/baziCoupleFull,
  // gated by the separate hepandeep paywall above, not the free hepan one.
  const deepPalaces  = useSSEStream("/api/reading/couple/palaces",  `${hepandeepChartId}_palaces`);
  const deepDecades  = useSSEStream("/api/reading/couple/decades",  `${hepandeepChartId}_decades`);
  const deepSchools  = useSSEStream("/api/reading/couple/schools",  `${hepandeepChartId}_schools`);
  const deepCautions = useSSEStream("/api/reading/couple/cautions", `${hepandeepChartId}_cautions`);

  useEffect(() => {
    if (deepPaywall.loading || deepGated) return;
    if (deepPalaces.status === "idle") deepPalaces.start(body);
    if (deepDecades.status === "idle") deepDecades.start(body);
    if (deepSchools.status === "idle") deepSchools.start(body);
    if (deepCautions.status === "idle") deepCautions.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepPaywall.loading, deepGated]);
```

- [ ] **Step 3: Add the 4 new `renderContent()` cases**

Find the `case "chat":` block inside `renderContent()`'s `switch`, and insert the 4 new cases immediately **before** it (so `chat` — and the closing `}` of the switch — stay last):

```ts
      case "deep_palaces":
        return (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {(deepPalaces.status === "streaming" || deepPalaces.status === "idle") && <LoadingSkeleton />}
            {deepPalaces.status === "done" && <div className="animate-fade-in"><ReadingText text={deepPalaces.text} /></div>}
            {deepPalaces.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{deepPalaces.errorMsg}</p>
                <button onClick={() => deepPalaces.start(body)} className="text-xs text-gold underline">重試</button>
              </div>
            )}
          </div>
        );

      case "deep_decades":
        return (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {(deepDecades.status === "streaming" || deepDecades.status === "idle") && <LoadingSkeleton />}
            {deepDecades.status === "done" && <div className="animate-fade-in"><ReadingText text={deepDecades.text} /></div>}
            {deepDecades.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{deepDecades.errorMsg}</p>
                <button onClick={() => deepDecades.start(body)} className="text-xs text-gold underline">重試</button>
              </div>
            )}
          </div>
        );

      case "deep_schools":
        return (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {(deepSchools.status === "streaming" || deepSchools.status === "idle") && <LoadingSkeleton />}
            {deepSchools.status === "done" && <div className="animate-fade-in"><ReadingText text={deepSchools.text} /></div>}
            {deepSchools.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{deepSchools.errorMsg}</p>
                <button onClick={() => deepSchools.start(body)} className="text-xs text-gold underline">重試</button>
              </div>
            )}
          </div>
        );

      case "deep_cautions":
        return (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {(deepCautions.status === "streaming" || deepCautions.status === "idle") && <LoadingSkeleton />}
            {deepCautions.status === "done" && <div className="animate-fade-in"><ReadingText text={deepCautions.text} /></div>}
            {deepCautions.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{deepCautions.errorMsg}</p>
                <button onClick={() => deepCautions.start(body)} className="text-xs text-gold underline">重試</button>
              </div>
            )}
          </div>
        );

```

- [ ] **Step 4: Gate the tab bar's lock icon and the content area on both paywalls**

Find:
```tsx
            {isLocked(tab.id) && (
              <span className={`absolute top-1 right-1 text-[10px] leading-none ${activeTab === tab.id ? "opacity-90" : "opacity-80"}`}>🔒</span>
            )}
```

Replace with:
```tsx
            {(isLocked(tab.id) || isLockedDeep(tab.id)) && (
              <span className={`absolute top-1 right-1 text-[10px] leading-none ${activeTab === tab.id ? "opacity-90" : "opacity-80"}`}>🔒</span>
            )}
```

Find:
```tsx
        {isLocked(activeTab) ? (
          <PaywallLock chartId={coupleChartId} sectionLabel={TABS.find((t) => t.id === activeTab)?.label} included={COUPLE_INCLUDED} />
        ) : renderContent()}
```

Replace with:
```tsx
        {isLocked(activeTab) ? (
          <PaywallLock chartId={coupleChartId} sectionLabel={TABS.find((t) => t.id === activeTab)?.label} included={COUPLE_INCLUDED} />
        ) : isLockedDeep(activeTab) ? (
          <PaywallLock chartId={hepandeepChartId} sectionLabel={TABS.find((t) => t.id === activeTab)?.label} included={DEEP_INCLUDED} />
        ) : renderContent()}
```

- [ ] **Step 5: Verify it type-checks**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `components/HepanResultView.tsx`.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/fortune-app
git add components/HepanResultView.tsx
git commit -m "feat(hepan-deep): wire 4 deep-tier tabs into HepanResultView with second paywall gate"
```

---

### Task 8: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:** none — this task exercises Tasks 1-7 together.

- [ ] **Step 1: Full project build**

Run (dev server stopped):
```bash
cd ~/Projects/fortune-app
npm run build
```
Expected: build succeeds with no errors.

- [ ] **Step 2: Local paywall-on smoke test across all 5 relationship types**

Temporarily set `NEXT_PUBLIC_PAYWALL_ENABLED=true` in `.env.local`, start the dev server, and for each of the 5 relationship types (情侶/夫妻/朋友/兄弟姐妹/親子) on `/hepan`:
1. Fill in both people's birth data, submit.
2. Confirm the 5 free tabs render exactly as before (unaffected).
3. Click each of the 4 new tabs (宮位/大運/眾說/注意) — confirm each shows `PaywallLock` with the `DEEP_INCLUDED` list, and that clicking the free tabs' lock icon does NOT appear on them.
4. Confirm no console errors, and that a sibling/parentchild submission doesn't crash any of the 4 new tabs' `PaywallLock` render (this only requires the tab to render the lock, not stream content, so it's a light check).

Revert `NEXT_PUBLIC_PAYWALL_ENABLED` in `.env.local` back to its original value (unset) when done — **do not leave the paywall enabled locally**.

- [ ] **Step 3: Local paywall-off content smoke test (one relationship type is enough)**

With `NEXT_PUBLIC_PAYWALL_ENABLED` unset (normal local dev state), submit one `/hepan` reading (any relationship type) and click through all 4 new tabs. Confirm each streams real content (not a lock), matches the relationship type's `focusHint` framing (e.g. a lover reading's 眾說 tab should talk about romantic compatibility, not generic pairing language), and that the 眾說 tab's five sections all render without literal placeholder text like "（暫無）" filling every section (a small amount of "（暫無）" in the raw RAG-context debug string is fine — that's only ever in the prompt, not the model's rendered output).

- [ ] **Step 4: Confirm chartId stability across a reload**

While viewing a `/hepan` result (from Step 3), copy the URL, open it in a new tab, and confirm the 4 new tabs' `useSSEStream` cache keys are identical (check via browser devtools' Application → Local Storage → look for `ziwei_rd_v23_hepandeep_...` keys matching between the two tabs) — this confirms `hepandeepChartId` is stable across reloads, which is what will make a real purchase stay unlocked after a refresh.

- [ ] **Step 5: Commit (only if Steps 1-4 required any fixes)**

If any of the above steps surfaced a bug requiring a code change, fix it, re-run the relevant step, then:
```bash
cd ~/Projects/fortune-app
git add -A
git commit -m "fix(hepan-deep): <describe the specific fix>"
```

If no fixes were needed, this task ends with no commit — Task 7's commit is already the final state.
