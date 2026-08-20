# 逐月運勢 (Monthly Fortune) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone $1.99 "逐月運勢" product — a solo, 紫微-only reading covering the next 12 calendar months in full detail, with a zero-AI-cost score-grid free preview, at its own `/yueyun` landing page.

**Architecture:** New `lib/flowMonths.ts` computes deterministic per-month flow data via iztro's `horoscope().monthly` (mirrors the existing `lib/flowYears.ts` pattern exactly, just calendar-month-indexed instead of age-indexed). A free preview route scores all 12 months deterministically (no AI) and generates one small AI teaser for the current month. A paid route streams the full 12-month reading in 3 SSE calls of 4 months each (avoiding the token-truncation risk seen earlier this session on unbudgeted content expansions). The existing Stripe checkout/webhook/unlock chain is prefix-driven (`chartType()` maps a chartId prefix to a product type) — this plan extends it with a third type, `"monthly"`, keyed off a new `yueyun_` chartId prefix and a new `STRIPE_PRICE_ID_SHORT_ONCE` env var (named generically — per Niki, this env var is meant to cover any future $1.99 one-time short report, not just this one).

**Tech Stack:** Next.js 15 App Router, TypeScript, iztro (紫微斗數 engine), SSE streaming via `lib/sseWriter.ts` / `lib/useSSEStream.ts`, Stripe Checkout, Vercel KV (unlock state).

## Global Constraints

- **Solo only** — one person, no couple/relationship logic. No `RelationshipType`, no partner fields.
- **紫微斗數 only** — no 八字 (bazi) content. Matches the existing solo 流年 rebuild (`app/api/reading/flowyear/route.ts`), which is also 紫微-only, and keeps scope aligned with the $1.99 price point (the $6.99 product owns the dual-system depth).
- **All 12 months covered** — not AI-filtered to "highlights" like `flowyear/route.ts`'s `HIGHLIGHT_COUNT = 3`. Every month gets full detail.
- **Paid content split into exactly 3 AI calls of 4 months each** (`BATCH_SIZE = 4`, months 1–4 / 5–8 / 9–12 by array index, not calendar quarter) — avoids the truncation risk from asking one call to cover 12 months of ~130字-each content.
- **Free preview is two parts:** (1) a 12-month score/theme grid computed by a **deterministic algorithm — zero AI cost** (mirrors `flowyears-scores`'s scoring *shape* but, unlike that route, does not call an LLM at all — see Task 3 rationale), and (2) **one small AI call** generating a short teaser paragraph for the current month only.
- **New chartId prefix:** `yueyun_` (parallel to `hepan_`). `chartType()` gains a third type: `"monthly"`.
- **New Stripe env var:** `STRIPE_PRICE_ID_SHORT_ONCE` (not `STRIPE_PRICE_ID_MONTHLY` — explicitly rejected by Niki; the chosen name is generic so it can cover future $1.99 one-time reports). Niki already has a real Stripe Price ID for this (`price_1U6NLSFHqguDDhqBdpXvLR0r`) to add to Vercel once this ships — not something this plan's tasks can do (no Vercel dashboard access).
- **URL slug:** `/yueyun` (spec flagged this as tentative; no correction given since, so it stands).
- **No test framework exists in this repo** (`package.json` has no test script, no `.test.` files anywhere). Verification throughout this plan follows the project's actual established practice: `npx tsc --noEmit` (with `npm run dev` stopped — running both against the same `.next/` throws unrelated-looking prerender errors), scratch Node scripts for pure-computation libs (deleted after use), and live dev-server testing for routes/UI.
- **Two-layer cache is N/A here** — `CACHE_VERSION`/`CACHE_PREFIX` gate *existing* reading cache keys; this feature's cache keys (`${chartId}_...`) are new and prefix-unique (`yueyun_...`), so no version bump is needed or should be made.
- Traditional Chinese throughout, matching the rest of the app's audience (Taiwan/HK/overseas Asians per the 2026-07-27 pivot).

---

### Task 1: Multi-price Stripe plumbing (chartType, checkout, paywall analytics, paywall UI)

**Files:**
- Modify: `lib/chartType.ts` (full rewrite)
- Modify: `app/api/checkout/route.ts:8,12-17`
- Modify: `lib/usePaywall.ts:5,24-29`
- Modify: `components/PaywallLock.tsx:1-6,35-45,80-120`

**Interfaces:**
- Consumes: nothing new — this task only extends existing generic infrastructure.
- Produces: `ChartType = "hepan" | "solo" | "monthly"`, `chartType(chartId): ChartType`, `CHART_PRICE_USD: Record<ChartType, number>` (both exported from `lib/chartType.ts`) — Tasks 5–6's UI components will pass `yueyun_`-prefixed chartIds through this and rely on `CHART_PRICE_USD` for accurate pricing display. `PaywallLock` gains two new optional props: `proofStrip?: {icon:string; stat:string; label:string}[]` (defaults to the existing 4-item hepan/solo strip) and no longer hardcodes `$6.99` — it derives the displayed price from `CHART_PRICE_USD[chartType(chartId)]`.

This task is foundational plumbing for a 3rd product type — bundled as one task because a reviewer can't meaningfully approve `chartType.ts`'s new type without also seeing every consumer of the old 2-type assumption fixed in the same diff (an unfixed consumer would silently mis-report analytics or mis-price the paywall for the new product).

- [ ] **Step 1: Rewrite `lib/chartType.ts`**

```ts
// Solo readings use the raw sessionId as their chartId; the hepan (couple) flow
// prefixes it with "hepan_" (see components/HepanFlow.tsx), and the monthly
// fortune flow prefixes it with "yueyun_" (see components/MonthlyFortuneFlow.tsx).
// This is the single source of truth for turning a chartId back into its flow
// type, so purchase / checkout / paywall analytics can segment revenue and
// funnel by product without prefix-matching transaction_ids by hand.
export type ChartType = "hepan" | "solo" | "monthly";

const PREFIX_TYPE: Array<readonly [prefix: string, type: ChartType]> = [
  ["hepan_", "hepan"],
  ["yueyun_", "monthly"],
];

export function chartType(chartId: string): ChartType {
  for (const [prefix, type] of PREFIX_TYPE) {
    if (chartId.startsWith(prefix)) return type;
  }
  return "solo";
}

// USD price per chart type — single source of truth for GA purchase-value
// tracking (lib/usePaywall.ts) and the displayed price in the paywall UI
// (components/PaywallLock.tsx), so a new product's price can't drift between
// the two the way a hardcoded "$6.99" string would.
export const CHART_PRICE_USD: Record<ChartType, number> = {
  solo: 6.99,
  hepan: 6.99,
  monthly: 1.99,
};
```

- [ ] **Step 2: Update `app/api/checkout/route.ts` to select the Price ID by chart type**

Replace the whole file with:

```ts
// Creates a Stripe Checkout session for unlocking a chart's premium reading.
// Server-authoritative: the chartId is passed in metadata, and the unlock is only
// granted by the Stripe webhook after payment completes (see webhook/stripe).

import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { chartType, type ChartType } from "@/lib/chartType";

export const runtime = "nodejs";

// Each product type unlocks against a different Stripe Price ID. "monthly" uses
// a generic env name (not e.g. STRIPE_PRICE_ID_MONTHLY) because it's meant to
// cover any future $1.99 one-time short report, not just this one.
const PRICE_ENV_BY_TYPE: Record<ChartType, string> = {
  solo: "STRIPE_PRICE_ID",
  hepan: "STRIPE_PRICE_ID",
  monthly: "STRIPE_PRICE_ID_SHORT_ONCE",
};

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 20, keyPrefix: "checkout" })).allowed) return rateLimitResponse();

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: "stripe_not_configured" }, { status: 503 });

  let body: { chartId?: string; returnPath?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const chartId = (body.chartId ?? "").slice(0, 100);
  if (!chartId) return Response.json({ error: "missing_chart" }, { status: 400 });

  const type = chartType(chartId);
  const price = process.env[PRICE_ENV_BY_TYPE[type]];
  if (!price) return Response.json({ error: "stripe_not_configured" }, { status: 503 });

  // Return to the exact chart the user was viewing (its URL carries birth params —
  // a bare /result would redirect home). Same-origin paths only.
  const returnPath = (body.returnPath ?? "/result").slice(0, 500);
  const safeReturn = returnPath.startsWith("/") ? returnPath : "/result";

  // Payment methods are env-configurable so Alipay/WeChat can be switched on
  // (after enabling them in the Stripe dashboard) without a code deploy.
  // e.g. STRIPE_PAYMENT_METHODS="card,alipay,wechat_pay". Default: card.
  const methods = (process.env.STRIPE_PAYMENT_METHODS ?? "card")
    .split(",").map((m) => m.trim()).filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];

  try {
    const StripeSDK = (await import("stripe")).default;
    const stripe = new StripeSDK(secret);
    const origin = request.headers.get("origin") ?? "https://www.mingli.study";
    const sep = safeReturn.includes("?") ? "&" : "?";
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      payment_method_types: methods,
      locale: "zh", // audience is Chinese-speaking; without this Checkout defaults to browser/English locale
      // webhook reads chartId to mark the chart unlocked; chart_type lets
      // Stripe/analytics segment revenue by product.
      metadata: { chartId, chart_type: type },
      success_url: `${origin}${safeReturn}${sep}paid=1`,
      cancel_url: `${origin}${safeReturn}`,
    };
    if (methods.includes("wechat_pay")) {
      params.payment_method_options = { wechat_pay: { client: "web" } };
    }
    const session = await stripe.checkout.sessions.create(params);
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return Response.json({ error: "checkout_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Make `lib/usePaywall.ts`'s purchase tracking type-aware**

In `lib/usePaywall.ts`, change the import on line 5 from:

```ts
import { chartType } from "@/lib/chartType";
```

to:

```ts
import { chartType, CHART_PRICE_USD } from "@/lib/chartType";
```

Then replace the `trackPurchaseOnce` function (lines 24–29) with:

```ts
function trackPurchaseOnce(chartId: string) {
  const key = `ga_purchase_tracked_${chartId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  const type = chartType(chartId);
  gtagEvent("purchase", { transaction_id: chartId, value: CHART_PRICE_USD[type], currency: "USD", chart_type: type });
}
```

- [ ] **Step 4: Make `components/PaywallLock.tsx`'s price and proof-strip content type-aware**

Change the import block at the top (lines 1–6) from:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { startCardCheckout } from "@/lib/checkout";
import { gtagEvent } from "@/lib/gtag";
import { chartType } from "@/lib/chartType";
```

to:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { startCardCheckout } from "@/lib/checkout";
import { gtagEvent } from "@/lib/gtag";
import { chartType, CHART_PRICE_USD } from "@/lib/chartType";
```

Replace the `Props` interface (originally lines 8–15) with:

```tsx
interface ProofItem { icon: string; stat: string; label: string }

interface Props {
  chartId: string;
  sectionLabel?: string;
  included?: string[];
  /** One dynamic line personalizing the pitch with data already on the client
   *  (e.g. the user's 命宮主星). Optional — omit to fall back to the generic pitch. */
  personalizedHint?: string;
  /** Quality-proof strip content. Defaults to the $6.99 dual-system pitch —
   *  pass a product-specific set for other chart types (e.g. monthly). */
  proofStrip?: ProofItem[];
}

const DEFAULT_PROOF_STRIP: ProofItem[] = [
  { icon: "📖", stat: "萬字以上", label: "深度解讀" },
  { icon: "🔄", stat: "多模型", label: "交叉校對" },
  { icon: "📚", stat: "上百部", label: "命理典籍加持" },
  { icon: "⚡", stat: "雙體系", label: "紫微×八字印證" },
];
```

`DEFAULT_INCLUDED` (the block right after this, listing 7 included-features strings) stays completely unchanged — leave it in place.

Then update the component signature and body. Change:

```tsx
export default function PaywallLock({ chartId, sectionLabel, included = DEFAULT_INCLUDED, personalizedHint }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const viewed = useRef(false);
```

to:

```tsx
export default function PaywallLock({ chartId, sectionLabel, included = DEFAULT_INCLUDED, personalizedHint, proofStrip }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const viewed = useRef(false);
  const price = CHART_PRICE_USD[chartType(chartId)];
  const strip = proofStrip ?? DEFAULT_PROOF_STRIP;
```

Change the proof-strip render block from:

```tsx
      {/* Quality proof strip */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { icon: "📖", stat: "萬字以上", label: "深度解讀" },
          { icon: "🔄", stat: "多模型", label: "交叉校對" },
          { icon: "📚", stat: "上百部", label: "命理典籍加持" },
          { icon: "⚡", stat: "雙體系", label: "紫微×八字印證" },
        ].map(({ icon, stat, label }) => (
```

to:

```tsx
      {/* Quality proof strip */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {strip.map(({ icon, stat, label }) => (
```

(the rest of that `.map()` body is unchanged — only the array literal moves out to `strip`).

Change the hardcoded price line from:

```tsx
        <span className="text-2xl font-bold text-ink">$6.99</span>
```

to:

```tsx
        <span className="text-2xl font-bold text-ink">${price.toFixed(2)}</span>
```

- [ ] **Step 5: Verify with tsc**

Stop `npm run dev` if it's running (shares `.next/` with `tsc`, causes unrelated prerender errors), then run:

```bash
npx tsc --noEmit
```

Expected: no new errors. (Pre-existing errors, if any, are out of scope for this task.)

- [ ] **Step 6: Commit**

```bash
git add lib/chartType.ts app/api/checkout/route.ts lib/usePaywall.ts components/PaywallLock.tsx
git commit -m "feat: add monthly chart type + type-aware Stripe pricing"
```

---

### Task 2: `lib/flowMonths.ts` — per-month 流月 computation

**Files:**
- Create: `lib/flowMonths.ts`

**Interfaces:**
- Consumes: `BirthInfo` from `@/lib/ziwei` (`{solarDate, timeIndex, gender}`).
- Produces: `FlowMonth` interface (`{year, month, ganzhi, flowSoulPalace, natalStars, monthlyMutagen, flowStars, sanFang}`), `getFlowMonths(birth, monthsAhead): Promise<FlowMonth[]>`, `flowMonthFactsFrom(month): string` — Task 3 (preview route) and Task 4 (paid route) both import all three of these directly.

This mirrors `lib/flowYears.ts` exactly in structure, but reads `horoscope().monthly` instead of `.yearly` and iterates calendar months starting from the current month (not birth-year-relative ages, which don't naturally apply to a month-granularity flow). Verified live against real iztro output before writing this task — `h.monthly` has the same shape as `h.yearly` (`index`/`heavenlyStem`/`earthlyBranch`/`mutagen`/`stars`), and `astrolabe.surroundedPalaces(idx)` works identically regardless of whether `idx` came from `.yearly.index` or `.monthly.index`.

- [ ] **Step 1: Write `lib/flowMonths.ts`**

```ts
// Per-month 流月 (monthly luck) computation via iztro's horoscope().
// Mirrors lib/flowYears.ts's pattern, but reads h.monthly instead of h.yearly
// and iterates calendar months (not birth-relative ages) — flow-month theory
// is keyed to a calendar date, not an age.

import type { BirthInfo } from './ziwei';

export interface FlowMonth {
  year: number;
  month: number;               // 1–12, calendar month
  ganzhi: string;               // 流月干支 e.g. "丙戌"
  flowSoulPalace: string;       // 流月命宮 落在本命哪個宮 (palace name)
  natalStars: string[];         // major+minor stars sitting in that natal palace
  monthlyMutagen: string[];     // e.g. ["貪狼化祿","太陰化權","右弼化科","天機化忌"]
  flowStars: string[];          // 流耀 in the 流月命宮
  sanFang: { opposite: string; wealth: string; career: string; stars: string[] };
}

const MUTAGEN_LABELS = ['化祿', '化權', '化科', '化忌'];

/* eslint-disable @typescript-eslint/no-explicit-any */
const starNamesOf = (pal: any): string[] =>
  [...(pal?.majorStars ?? []), ...(pal?.minorStars ?? [])]
    .map((s: any) => s?.name as string)
    .filter(Boolean);

/**
 * Compute 流月 data for the next `monthsAhead` calendar months starting from
 * the current month (index 0 = this month). Re-instantiates the astrolabe
 * from the stored birth info and queries iztro's horoscope() for the 15th of
 * each target month (a safe mid-month date for all 12 months).
 */
export async function getFlowMonths(
  birth: BirthInfo,
  monthsAhead: number
): Promise<FlowMonth[]> {
  if (!birth?.solarDate || monthsAhead < 1) return [];
  try {
    const { astro } = await import('iztro');
    const astrolabe: any = astro.bySolar(birth.solarDate, birth.timeIndex, birth.gender, true, "zh-TW");

    const now = new Date();
    const out: FlowMonth[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      try {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-15`;
        const h = astrolabe.horoscope(dateStr);
        const m = h.monthly;
        const idx: number = m.index;
        const natalPalace = astrolabe.palaces?.[idx];

        const monthlyMutagen: string[] = (m.mutagen ?? [])
          .map((s: string, mi: number) => (s ? `${s}${MUTAGEN_LABELS[mi] ?? ''}` : ''))
          .filter(Boolean);

        const flowStars: string[] = (m.stars?.[idx] ?? [])
          .map((s: any) => s?.name as string)
          .filter(Boolean);

        let sanFang = { opposite: '', wealth: '', career: '', stars: [] as string[] };
        try {
          const sp = astrolabe.surroundedPalaces(idx);
          sanFang = {
            opposite: sp?.opposite?.name ?? '',
            wealth: sp?.wealth?.name ?? '',
            career: sp?.career?.name ?? '',
            stars: [...new Set([
              ...starNamesOf(sp?.opposite),
              ...starNamesOf(sp?.wealth),
              ...starNamesOf(sp?.career),
            ])],
          };
        } catch { /* skip surround on edge charts */ }

        out.push({
          year,
          month,
          ganzhi: `${m.heavenlyStem ?? ''}${m.earthlyBranch ?? ''}`,
          flowSoulPalace: natalPalace?.name ?? '',
          natalStars: starNamesOf(natalPalace),
          monthlyMutagen,
          flowStars,
          sanFang,
        });
      } catch { /* skip a single bad month, keep going */ }
    }
    return out;
  } catch (err) {
    console.error('[getFlowMonths] iztro error:', err);
    return [];
  }
}

/** The deterministic 流月 facts a per-month reading must not contradict. */
export function flowMonthFactsFrom(flow: FlowMonth): string {
  const pn = (n: string) => (n && !n.endsWith('宮') ? `${n}宮` : n);
  const sf = `對宮${pn(flow.sanFang.opposite)}、財帛位${pn(flow.sanFang.wealth)}、官祿位${pn(flow.sanFang.career)}` +
    (flow.sanFang.stars.length ? `（會照星曜：${flow.sanFang.stars.join('、')}）` : '');
  return `流月：${flow.year}年${flow.month}月 ${flow.ganzhi}
流月命宮：落本命${pn(flow.flowSoulPalace)}（該宮星曜：${flow.natalStars.join('、') || '空宮'}）
流月四化：${flow.monthlyMutagen.join('、') || '—'}
流耀：${flow.flowStars.join('、') || '—'}
流月命宮三方四正：${sf}`;
}
```

- [ ] **Step 2: Verify against real iztro output with a scratch script**

```bash
cat > /tmp/verify_flowmonths.mjs << 'EOF'
import { astro } from "iztro";
const astrolabe = astro.bySolar("1990-6-15", 6, "male", true, "zh-TW");
const now = new Date();
for (let i = 0; i < 12; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-15`;
  const h = astrolabe.horoscope(dateStr);
  const m = h.monthly;
  console.log(`${dateStr}: idx=${m.index}, ganzhi=${m.heavenlyStem}${m.earthlyBranch}, natalPalace=${astrolabe.palaces?.[m.index]?.name}`);
}
EOF
node /tmp/verify_flowmonths.mjs
rm /tmp/verify_flowmonths.mjs
```

Expected: 12 lines, each with a distinct `dateStr`, a plausible `idx` (0–11), a 2-character `ganzhi`, and a real palace name for `natalPalace`. No two consecutive months should have the same `idx` (流月命宮 cycles through all 12 palaces over 12 months).

- [ ] **Step 3: Run tsc**

```bash
npx tsc --noEmit
```

Expected: no new errors (dev server must be stopped first).

- [ ] **Step 4: Commit**

```bash
git add lib/flowMonths.ts
git commit -m "feat: add lib/flowMonths.ts for per-month 流月 computation"
```

---

### Task 3: Free preview route — deterministic 12-month score grid + AI teaser

**Files:**
- Create: `app/api/reading/monthly/preview/route.ts`

**Interfaces:**
- Consumes: `getFlowMonths`, `flowMonthFactsFrom`, `FlowMonth` from `@/lib/flowMonths` (Task 2); `callAI` from `@/lib/callAI`; `SAFETY_GUARDRAIL` from `@/lib/modernInstruction`; `ZiweiResult` from `@/lib/ziwei`.
- Produces: `POST` handler returning `MonthlyPreviewResult` (`{months: MonthScore[], teaser: string}`) as plain JSON (not SSE) — Task 6's `MonthlyResultView.tsx` fetches this directly with a plain `fetch()`, matching how `components/FlowYearDetail.tsx` consumes `flowyears-scores`.

**Design note on "zero AI cost":** the committed spec says the grid is "確定性演算法，零AI成本，比照既有 `flowyears-scores` 的評分格模式" — but `flowyears-scores/route.ts` actually *does* call an LLM (one small JSON-mode call scoring all years). Read literally, "zero AI cost" and "mirrors flowyears-scores" are in tension. This task resolves it in favor of the literal "zero AI cost" instruction: the grid itself is scored by a genuinely deterministic function (`scoreMonth`, no LLM call), reusing `flowyear/route.ts`'s existing `NOTABLE_PALACES` bonus/penalty scoring approach (which is *also* deterministic — it's the same style of logic `flowyears-scores` could have used but didn't). The "mirrors flowyears-scores" part is honored in the *shape* of the output (same `{overall, career, romance, theme}` fields, same grid UI pattern) and by keeping the *one* AI call this route does make (the current-month teaser) small and cheap, matching that route's "small call" spirit.

- [ ] **Step 1: Write `app/api/reading/monthly/preview/route.ts`**

```ts
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getFlowMonths, flowMonthFactsFrom, type FlowMonth } from "@/lib/flowMonths";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";

const MONTHS_AHEAD = 12;

// Palaces where a 四化 landing genuinely matters — same set flowyear/route.ts
// uses for its deterministic year-ranking (NOTABLE_PALACES).
const NOTABLE_PALACES = new Set(["命宮", "財帛", "官祿", "夫妻", "疾厄"]);

export interface MonthScore {
  year: number;
  month: number;
  ganzhi: string;
  overall: number;  // 1–5
  career: number;   // 1–5
  romance: number;  // 1–5
  theme: string;
}

export interface MonthlyPreviewResult {
  months: MonthScore[];
  teaser: string;
}

// star name → natal palace name (major stars only)
function buildStarPalaceMap(palaces: ZiweiResult["palaces"]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of palaces ?? []) {
    for (const s of p.stars) {
      if (s.type === "major") map[s.name] = p.name;
    }
  }
  return map;
}

interface MonthSignal { star: string; type: "祿" | "權" | "科" | "忌"; palace: string }

function parseMutagen(m: string): { star: string; type: MonthSignal["type"] } | null {
  const match = m.match(/^(.+)化([祿權科忌])$/);
  if (!match) return null;
  return { star: match[1], type: match[2] as MonthSignal["type"] };
}

// Deterministic score/theme per month — no AI call, so the overview grid is
// free with zero AI cost. Only mutagen landing in a NOTABLE_PALACES natal
// palace moves the needle; 祿/權 are +1, 科 is +0.5, 忌 is -1.
function scoreMonth(f: FlowMonth, starPalaceMap: Record<string, string>): MonthScore {
  const signals: MonthSignal[] = f.monthlyMutagen
    .map(parseMutagen)
    .filter((s): s is { star: string; type: MonthSignal["type"] } => !!s)
    .map((s) => ({ ...s, palace: starPalaceMap[s.star] ?? "" }))
    .filter((s) => NOTABLE_PALACES.has(s.palace));

  let overall = 3, career = 3, romance = 3;
  for (const s of signals) {
    const delta = s.type === "忌" ? -1 : s.type === "祿" || s.type === "權" ? 1 : 0.5;
    overall += delta;
    if (s.palace === "財帛" || s.palace === "官祿") career += delta;
    if (s.palace === "夫妻") romance += delta;
  }

  // Theme: a 忌 in a notable palace takes priority (caution beats opportunity
  // for what's worth flagging to the user), else the best 祿/權, else neutral.
  const caution = signals.find((s) => s.type === "忌");
  const opportunity = signals.find((s) => s.type === "祿" || s.type === "權");
  let theme = "運勢平穩，按部就班";
  if (caution) theme = `${caution.palace}宮值${caution.star}化忌，宜謹慎`;
  else if (opportunity) theme = `${opportunity.palace}宮迎${opportunity.star}化${opportunity.type}，機會浮現`;

  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  return {
    year: f.year, month: f.month, ganzhi: f.ganzhi,
    overall: clamp(overall), career: clamp(career), romance: clamp(romance), theme,
  };
}

const TEASER_SYSTEM = `你是紫微斗數流月推算專家。根據命主本月的流月資料，寫一段簡短的本月運勢短評，約60–80字，作為付費完整逐月解讀的免費試閱。
語氣真誠專業，據盤論斷，不誇飾。結尾自然帶出還有完整12個月解讀的期待感，但不要生硬推銷。
只輸出短評本文，不要標題、不要前綴。繁體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "monthly-preview" })).allowed) {
    return rateLimitResponse();
  }

  let body: { ziwei: ZiweiResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const flows = await getFlowMonths(ziwei.birth, MONTHS_AHEAD);
  if (!flows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  const starPalaceMap = buildStarPalaceMap(ziwei.palaces);
  const months = flows.map((f) => scoreMonth(f, starPalaceMap));

  let teaser = "";
  try {
    const nameStr = name ? `命主：${name}\n` : "";
    const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n${flowMonthFactsFrom(flows[0])}\n\n請寫本月短評。`;
    teaser = await callAI({
      system: TEASER_SYSTEM,
      userMessage,
      maxTokens: 300,
      temperature: 0.7,
    });
  } catch {
    // Teaser is a nice-to-have — the score grid is the core free value, so a
    // failed teaser call shouldn't fail the whole preview response.
  }

  return Response.json({ months, teaser: teaser.trim() } satisfies MonthlyPreviewResult);
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: no new errors (dev server stopped).

- [ ] **Step 3: Live verification against the dev server**

Start `npm run dev`, then in another terminal, fetch a real chart's ziwei data via the browser devtools console on any existing result page (or reuse a known test payload), and hit the new route:

```bash
curl -s -X POST http://localhost:3000/api/reading/monthly/preview \
  -H "Content-Type: application/json" \
  -d '{"ziwei": <paste a real ZiweiResult JSON from a browser session>, "name": "測試"}' | head -c 2000
```

Expected: JSON with `months` (array of 12 objects, each with `year`/`month`/`ganzhi`/`overall`/`career`/`romance`/`theme`) and a non-empty `teaser` string. `overall`/`career`/`romance` must each be integers 1–5.

- [ ] **Step 4: Commit**

```bash
git add app/api/reading/monthly/preview/route.ts
git commit -m "feat: add free 逐月運勢 preview route (deterministic grid + AI teaser)"
```

---

### Task 4: Paid route — 3-batch SSE streaming of full 12-month reading

**Files:**
- Create: `app/api/reading/monthly/route.ts`

**Interfaces:**
- Consumes: `getFlowMonths`, `FlowMonth` from `@/lib/flowMonths` (Task 2); `getKnowledge` from `@/lib/rag`; `makeSSEResponse`, `streamWithRefs` from `@/lib/sseWriter`; `SAFETY_GUARDRAIL` from `@/lib/modernInstruction`; `ZiweiResult` from `@/lib/ziwei`.
- Produces: `POST` handler accepting `{ziwei, name?, batch: 1|2|3}`, returning an SSE stream (same wire format every other reading route uses) covering 4 months per call — Task 6's `MonthlyResultView.tsx` calls this 3 times via `useSSEStream`, once per batch, with distinct cache keys (`${chartId}_b1`/`_b2`/`_b3`).

- [ ] **Step 1: Write `app/api/reading/monthly/route.ts`**

```ts
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowMonths, type FlowMonth } from "@/lib/flowMonths";

const MONTHS_AHEAD = 12;
const BATCH_SIZE = 4; // 3 calls of 4 months each — avoids the truncation risk of one 12-month call

const SYSTEM = `你是精通紫微斗數流月推斷的命理師，像一位真誠的兄長為命主細說近未來每月運勢——據盤論斷，落到具體星曜宮位，有據也有溫度。

以下是命主連續數月的流月資料，請針對每一個月逐一詳批，依月份先後排列：

### YYYY年MM月 干支月
（結合流月命宮所落本命宮位的主星、流月四化落點、流耀、三方四正會照，具體點出該月的機遇或需留意的風險，並給出1條可操作的建議，整合為一段連貫文字，約130字）

行文可引相關古訣一句為據。措辭專業平實而暖心，不誇飾、不空泛、不做絕對斷言。
【加粗規則】只用**加粗**單個星曜名稱或四化符號（1–6字），不得加粗片語、句子或標題標籤。繁體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "monthly" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; name?: string; batch: 1 | 2 | 3 };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei, name, batch } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });
  if (![1, 2, 3].includes(batch)) return Response.json({ error: "invalid_batch" }, { status: 400 });

  const flows = await getFlowMonths(ziwei.birth, MONTHS_AHEAD);
  if (!flows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  const batchFlows = flows.slice((batch - 1) * BATCH_SIZE, batch * BATCH_SIZE);
  if (!batchFlows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  // star name → natal palace (for annotating which 化祿/化權/化科/化忌 lands where)
  const starPalaceMap: Record<string, string> = {};
  for (const p of ziwei.palaces ?? []) {
    for (const s of p.stars) if (s.type === "major") starPalaceMap[s.name] = p.name;
  }

  const monthLines = batchFlows.map((f: FlowMonth) => {
    const annotated = f.monthlyMutagen.map((m) => {
      const star = m.replace(/化[祿權科忌]$/, "");
      const pal = starPalaceMap[star];
      return pal ? `${m}（本命${pal}宮）` : m;
    });
    const isNow = flows[0] === f;
    return `${isNow ? "★本月★" : "      "} ${f.year}年${f.month}月 ${f.ganzhi}` +
      `｜流月命宮：本命${f.flowSoulPalace}宮` +
      `｜流月四化：${annotated.join("、") || "—"}` +
      `｜流耀：${f.flowStars.join("、") || "—"}` +
      (f.sanFang.career ? `｜流月官祿位：本命${f.sanFang.career}宮` : "") +
      (f.sanFang.wealth ? `｜流月財帛位：本命${f.sanFang.wealth}宮` : "");
  }).join("\n");

  // Classical texts are rarely indexed specifically by "流月" — 流年 is the
  // closest indexed topic and covers the same 四化-in-palace mechanics, so it
  // retrieves meaningfully more grounding than a literal 流月 tag would.
  const ragStars = [...new Set(batchFlows.flatMap((f) => [
    ...f.natalStars,
    ...f.monthlyMutagen.map((m) => m.replace(/化[祿權科忌]$/, "")),
  ]))].filter(Boolean).slice(0, 25);
  const { context, refs } = await getKnowledge({ stars: ragStars, topic: "流年", topK: 8 });

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n本批流月資料：\n${monthLines}\n\n參考資料：\n${context || "（暫無）"}\n\n請針對上方每一個月逐一詳批。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 4 months × ~130字 each — scaled up from flowyear/route.ts's 3×150字/2400 tokens.
      maxTokens: 3200,
      // DeepSeek was observed exceeding the 35s callAI default while still
      // legitimately streaming on other routes — same wider deadline here.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "monthly" },
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: no new errors (dev server stopped).

- [ ] **Step 3: Live verification against the dev server, all 3 batches**

Start `npm run dev`, then for `batch` in `1, 2, 3`:

```bash
curl -N -X POST http://localhost:3000/api/reading/monthly \
  -H "Content-Type: application/json" \
  -d '{"ziwei": <paste a real ZiweiResult JSON>, "name": "測試", "batch": 1}'
```

Expected for each batch: an SSE stream (`data: {...}` lines) that, once concatenated, contains exactly 4 `### YYYY年MM月` headings, none of which repeat across the 3 batches, and none of which are cut off mid-sentence (check the last heading's paragraph specifically — this is where the earlier `flowyear` truncation-at-1400-tokens bug showed up).

- [ ] **Step 4: Commit**

```bash
git add app/api/reading/monthly/route.ts
git commit -m "feat: add paid 逐月運勢 route (3-batch SSE, full 12-month coverage)"
```

---

### Task 5: `components/MonthlyFortuneFlow.tsx` — single-person input form

**Files:**
- Create: `components/MonthlyFortuneFlow.tsx`

**Interfaces:**
- Consumes: `BirthdayWheel` from `./WheelPicker`; `calculateZiwei` from `@/lib/ziwei` (dynamic import, matching `HepanFlow.tsx`'s pattern); `MonthlyResultView` (Task 6).
- Produces: `MonthlyCharts` interface (`{ziwei: ZiweiResult, name?: string, gender: "male"|"female", sessionId: string}`) and the default-exported `MonthlyFortuneFlow` component — Task 7's `/yueyun/page.tsx` mounts this directly, and it internally mounts `MonthlyResultView` once a chart is computed.

This is `components/HepanFlow.tsx`'s form half, reduced to one person (drop `PersonB`, the relationship-type selector, and `BaziResult`/`calculateBazi` — this product is 紫微-only, no bazi).

- [ ] **Step 1: Write `components/MonthlyFortuneFlow.tsx`**

```tsx
"use client";

// Standalone single-person 逐月運勢 (monthly fortune) flow for the /yueyun SEO
// landing page. Self-contained: collects ONE birth, computes the chart
// CLIENT-side (calculateZiwei), then hands off to MonthlyResultView, which
// owns the free score grid, free AI teaser, and paywall-gated 12-month
// full reading. Mirrors components/HepanFlow.tsx's form half, minus the
// second person, the relationship-type selector, and bazi (this product is
// 紫微-only).

import { useState } from "react";
import { BirthdayWheel } from "./WheelPicker";
import type { ZiweiResult } from "@/lib/ziwei";
import MonthlyResultView from "./MonthlyResultView";

interface PersonFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

export interface MonthlyCharts {
  ziwei: ZiweiResult;
  name?: string;
  gender: "male" | "female";
  sessionId: string;
}

function personKey(p: PersonFields) {
  return `${p.date.replace(/-/g, "")}${p.hour}${p.gender}`;
}

export default function MonthlyFortuneFlow() {
  const [person, setPerson] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<MonthlyCharts | null>(null);

  const ready = !!person.date && !!person.gender && person.hour !== "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!person.date) e.date = "請填寫出生日期";
    if (!person.gender) e.gender = "請選擇性別";
    if (!person.hour && person.hour !== "0") e.hour = "請選擇出生時辰";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || computing) return;
    setComputing(true);
    try {
      const { calculateZiwei } = await import("@/lib/ziwei");
      const [y, m, d] = person.date.split("-").map(Number);
      const h = parseInt(person.hour, 10);
      const gender = person.gender as "male" | "female";
      const ziwei = await calculateZiwei(y, m, d, h, gender);

      setCharts({
        ziwei,
        name: person.name || undefined,
        gender,
        sessionId: personKey(person),
      });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setComputing(false);
    }
  }

  if (charts) {
    return <MonthlyResultView charts={charts} onReset={() => setCharts(null)} />;
  }

  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
        <div>
          <label className={labelClass}>稱呼（可選）</label>
          <input
            value={person.name}
            onChange={(e) => setPerson((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="如：小美"
            className="w-full bg-parchment border border-border-warm rounded-lg px-4 py-2.5 text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/50 focus:ring-1 focus:ring-vermillion/20 transition-all text-sm"
          />
        </div>

        <div>
          <label className={labelClass}>出生日期 · 時辰 <span className="text-vermillion">*</span></label>
          <BirthdayWheel
            date={person.date}
            hour={person.hour}
            onDateChange={(d) => setPerson((prev) => ({ ...prev, date: d }))}
            onHourChange={(h) => setPerson((prev) => ({ ...prev, hour: h }))}
          />
          {(errors.date || errors.hour) && (
            <p className="text-xs text-vermillion mt-1">{errors.date || errors.hour}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>性別 <span className="text-vermillion">*</span></label>
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => (
              <button key={g} type="button"
                onClick={() => setPerson((prev) => ({ ...prev, gender: g }))}
                style={person.gender === g ? { background: "#8B1A1A", color: "#FDFCF8", borderColor: "#8B1A1A" } : {}}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                  person.gender === g ? "shadow-md" : "bg-parchment border-border-warm text-ink-2 hover:border-vermillion/60"
                }`}>
                {person.gender === g ? "✓ " : ""}{g === "male" ? "男命" : "女命"}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-xs text-vermillion mt-1">{errors.gender}</p>}
        </div>
      </div>

      <button type="submit" disabled={computing} style={{ color: "#FDFCF8" }}
        className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm ${
          ready && !computing
            ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
            : "bg-vermillion/60 cursor-pointer opacity-80"
        }`}>
        {computing ? "正在排盤…" : ready ? "檢視逐月運勢 →" : "請填寫出生資訊"}
      </button>

      <p className="text-center text-[11px] text-ink-4">
        出生時間預設按北京時間（UTC+8）排盤 · 資訊僅用於本次推算，不會儲存
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: this will report an error in `MonthlyResultView` not existing yet (Task 6) — expected at this point, note it and continue; re-run after Task 6.

- [ ] **Step 3: Commit**

```bash
git add components/MonthlyFortuneFlow.tsx
git commit -m "feat: add MonthlyFortuneFlow.tsx single-person input form"
```

---

### Task 6: `components/MonthlyResultView.tsx` — score grid, teaser, paywall-gated full reading

**Files:**
- Create: `components/MonthlyResultView.tsx`

**Interfaces:**
- Consumes: `MonthlyCharts` from `./MonthlyFortuneFlow` (Task 5); `useSSEStream` from `@/lib/useSSEStream`; `usePaywall` from `@/lib/usePaywall`; `PaywallLock` from `./PaywallLock` (Task 1's new `proofStrip` prop); `Md`, `ZiweiChart`, `BugReportButton` (existing, unmodified).
- Produces: default-exported `MonthlyResultView` component, consumed by `MonthlyFortuneFlow` (Task 5).

Structure: a single scrolling page (no tabs — this product is small enough that HepanResultView's 5-tab structure would be over-engineering). Free score grid (`components/FlowYearDetail.tsx`'s grid UI, adapted from years to months) + free AI teaser, both fed by Task 3's plain-JSON preview route (not SSE — matches how `FlowYearDetail.tsx` consumes `flowyears-scores`). Below that, either `PaywallLock` (gated) or the concatenated 3-batch full reading (unlocked), using Task 4's SSE route via 3 `useSSEStream` calls.

- [ ] **Step 1: Write `components/MonthlyResultView.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import ZiweiChart from "./ZiweiChart";
import type { MonthlyCharts } from "./MonthlyFortuneFlow";
import { useSSEStream, type StreamResult } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";

interface MonthScore {
  year: number;
  month: number;
  ganzhi: string;
  overall: number;
  career: number;
  romance: number;
  theme: string;
}

interface PreviewData {
  months: MonthScore[];
  teaser: string;
}

function Dots({ n, type }: { n: number; type: "overall" | "career" | "romance" }) {
  const colors = {
    overall: ["bg-vermillion", "bg-vermillion/12"],
    career:  ["bg-amber-500",  "bg-amber-100"],
    romance: ["bg-rose-400",   "bg-rose-100"],
  };
  const [filled, empty] = colors[type];
  return (
    <span className="flex gap-px items-center justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < n ? filled : empty}`} />
      ))}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 py-4 px-1">
      {[90, 75, 82, 65, 70].map((w, i) => (
        <div key={i} className="h-2.5 rounded-full bg-border-light overflow-hidden" style={{ width: `${w}%` }}>
          <div className="h-full bg-gradient-to-r from-transparent via-border-warm to-transparent animate-shimmer"
            style={{ animationDelay: `${i * 200}ms` }} />
        </div>
      ))}
    </div>
  );
}

const MONTHLY_INCLUDED = [
  "未來 12 個月 · 逐月詳細解讀",
  "每月流月命宮 · 星曜與四化落點",
  "每月機遇與需留意之處",
  "每月一句可操作建議",
];

const MONTHLY_PROOF_STRIP = [
  { icon: "📅", stat: "12 個月", label: "逐月詳解" },
  { icon: "🔮", stat: "紫微斗數", label: "流月命宮分析" },
  { icon: "📚", stat: "上百部", label: "命理典籍加持" },
  { icon: "⚡", stat: "$1.99", label: "一次解鎖全年" },
];

export default function MonthlyResultView({ charts, onReset }: { charts: MonthlyCharts; onReset: () => void }) {
  const { ziwei, name, gender, sessionId } = charts;
  const label = name || (gender === "male" ? "命主（男）" : "命主（女）");

  const chartId = `yueyun_${sessionId}`;
  const paywall = usePaywall(chartId);
  const gated = paywall.enabled && !paywall.unlocked;

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(false);
    fetch("/api/reading/monthly/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PreviewData) => { if (!cancelled) setPreview(d); })
      .catch(() => { if (!cancelled) setPreviewError(true); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const body = { ziwei, name };
  const batch1 = useSSEStream("/api/reading/monthly", `${chartId}_b1`);
  const batch2 = useSSEStream("/api/reading/monthly", `${chartId}_b2`);
  const batch3 = useSSEStream("/api/reading/monthly", `${chartId}_b3`);

  useEffect(() => {
    if (paywall.loading || gated) return;
    if (batch1.status === "idle") batch1.start({ ...body, batch: 1 });
    if (batch2.status === "idle") batch2.start({ ...body, batch: 2 });
    if (batch3.status === "idle") batch3.start({ ...body, batch: 3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  const batches: [StreamResult, StreamResult, StreamResult] = [batch1, batch2, batch3];
  const allDone = batches.every((b) => b.status === "done");
  const anyLoading = batches.some((b) => b.status === "idle" || b.status === "streaming");
  const firstError = batches.find((b) => b.status === "error");
  const firstErrorBatchNum = firstError ? batches.indexOf(firstError) + 1 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      <div className="paper-card rounded-2xl border border-border-warm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-vermillion rounded-full" />
          <h2 className="text-base font-bold text-ink tracking-wide">{label} · 未來 12 個月總覽</h2>
        </div>

        {previewLoading && <LoadingSkeleton />}
        {previewError && !previewLoading && (
          <p className="text-sm text-vermillion">推算失敗，請重新整理重試。</p>
        )}

        {preview && !previewLoading && (
          <>
            <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-1 py-1.5 border-b border-border-warm text-[9px] text-ink-4 font-medium uppercase tracking-wider">
              <span>月份 · 主題</span>
              <span className="text-center">綜合</span>
              <span className="text-center">事業</span>
              <span className="text-center">感情</span>
            </div>
            <div className="divide-y divide-border-light">
              {preview.months.map((m, i) => (
                <div key={`${m.year}-${m.month}`}
                  className={`grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-1 py-2 ${i === 0 ? "bg-vermillion-l/40" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-xs tabular-nums ${i === 0 ? "font-bold text-vermillion" : "font-medium text-ink-2"}`}>
                        {m.year}年{m.month}月 {m.ganzhi}
                      </span>
                      {i === 0 && (
                        <span className="text-[8px] px-1 py-px bg-vermillion text-white font-bold rounded-sm leading-none whitespace-nowrap">本月</span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 truncate ${i === 0 ? "text-ink font-medium" : "text-ink-3"}`}>{m.theme}</p>
                  </div>
                  <Dots n={m.overall} type="overall" />
                  <Dots n={m.career} type="career" />
                  <Dots n={m.romance} type="romance" />
                </div>
              ))}
            </div>

            {preview.teaser && (
              <div className="mt-4 pt-4 border-t border-border-warm">
                <p className="text-xs text-vermillion font-semibold mb-1.5">本月免費短評</p>
                <p className="text-sm text-ink-2 leading-relaxed">{preview.teaser}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">逐月詳細解讀</span>
        </p>
        {gated ? (
          <PaywallLock chartId={chartId} sectionLabel="逐月詳細解讀" included={MONTHLY_INCLUDED} proofStrip={MONTHLY_PROOF_STRIP} />
        ) : (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5 space-y-4">
            {anyLoading && <LoadingSkeleton />}
            {firstError && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{firstError.errorMsg}</p>
                <button onClick={() => firstError.start({ ...body, batch: firstErrorBatchNum })} className="text-xs text-gold underline">重試</button>
              </div>
            )}
            {allDone && (
              <div className="animate-fade-in prose max-w-none text-sm [&_h3]:text-vermillion [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold">
                <Md>{batch1.text}</Md>
                <Md>{batch2.text}</Md>
                <Md>{batch3.text}</Md>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1">命盤</p>
        <ZiweiChart
          palaces={ziwei.palaces} soulPalace={ziwei.soulPalace} bodyPalace={ziwei.bodyPalace}
          fiveElementsClass={ziwei.fiveElementsClass} mainStar={ziwei.mainStar} bodyStar={ziwei.bodyStar}
          name={name} gender={gender}
        />
      </div>

      <p className="text-center text-xs text-ink-4 pb-4">
        僅供學習參考與娛樂，請理性看待，切勿迷信 ·{" "}
        <Link href="/" className="text-vermillion hover:underline">測完整命盤 →</Link>
      </p>

      <BugReportButton sessionId={chartId} page="yueyun" />
    </div>
  );
}
```

- [ ] **Step 2: Confirm `StreamResult` is exported from `lib/useSSEStream.ts`**

Check:

```bash
grep -n "export interface StreamResult" lib/useSSEStream.ts
```

Expected: it's already exported (confirmed present in the file as of this plan's writing). If this ever changes, add `export` to the interface declaration.

- [ ] **Step 3: Verify with tsc (both Task 5 and Task 6 files now exist)**

```bash
npx tsc --noEmit
```

Expected: no errors (dev server stopped). This also retroactively confirms Task 5's `MonthlyFortuneFlow.tsx` import of `MonthlyResultView` resolves cleanly.

- [ ] **Step 4: Commit**

```bash
git add components/MonthlyResultView.tsx
git commit -m "feat: add MonthlyResultView.tsx (score grid, teaser, paywall-gated reading)"
```

---

### Task 7: `/yueyun` SEO landing page

**Files:**
- Create: `app/yueyun/page.tsx`

**Interfaces:**
- Consumes: `MonthlyFortuneFlow` (Task 5); `JsonLd` from `@/components/JsonLd`; `breadcrumbSchema`, `faqSchema` from `@/lib/jsonld` (existing, unmodified).
- Produces: the `/yueyun` route — nothing downstream consumes this.

Mirrors `app/hepan/page.tsx`'s structure (metadata, JSON-LD, hero, SEO content section, interactive flow, FAQ) adapted for a solo, 12-month, $1.99 product.

- [ ] **Step 1: Write `app/yueyun/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import MonthlyFortuneFlow from "@/components/MonthlyFortuneFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微逐月運勢 · 未來12個月每月詳批 — 命裡",
  description:
    "紫微斗數逐月運勢，輸入出生資訊，免費檢視未來12個月運勢總覽與本月短評。付費解鎖每月流月命宮、四化落點與可操作建議的完整逐月詳批，只要 $1.99。",
  keywords: ["紫微逐月運勢", "每月運勢預測", "流月運勢", "紫微斗數流月", "2026年運勢逐月", "月運勢"],
  openGraph: {
    title: "紫微逐月運勢 · 未來12個月每月詳批 — 命裡",
    description:
      "輸入出生資訊，免費檢視未來12個月運勢總覽，付費解鎖每月完整詳批，只要 $1.99。",
    url: "https://www.mingli.study/yueyun",
    siteName: "命裡",
    locale: "zh_TW",
    type: "website",
  },
  alternates: { canonical: "https://www.mingli.study/yueyun" },
};

const FAQ = [
  {
    question: "什麼是紫微逐月運勢？",
    answer:
      "逐月運勢是把紫微斗數的流月推算，逐一套用在接下來12個月的每一個月上，分析每個月的流月命宮落在本命哪個宮位、當月四化落點、流耀與三方四正會照，給出該月的機遇、需留意之處與一條可操作建議。比起只看年度大方向的流年運勢，逐月運勢更聚焦在「這個月」與「下個月」具體會發生什麼。",
  },
  {
    question: "逐月運勢需要提供什麼資訊？",
    answer:
      "只需要出生日期、出生時辰與性別。出生時辰越準確，流月命宮的定位越精準。不需要姓名，稱呼可留空。資訊僅用於本次推算，不會被儲存。",
  },
  {
    question: "逐月運勢免費嗎？",
    answer:
      "未來12個月的運勢總覽格（綜合運、事業財、感情緣三項評分與主題）與本月的免費短評完全免費，輸入出生資訊即可檢視。完整的12個月逐月詳批（每月約130字，涵蓋流月命宮星曜、四化落點與具體建議）為付費內容，一次 $1.99 解鎖全部12個月，永久保存可重複查閱。",
  },
  {
    question: "逐月運勢跟命裡其他產品有什麼不同？",
    answer:
      "命裡的完整命書（$6.99）涵蓋十二宮位、大運流年、紫微＋八字雙系統與問命追問，是全面的命盤解讀。逐月運勢（$1.99）是更聚焦、更輕量的獨立產品，只看紫微斗數的未來12個月逐月細節，適合只想知道「接下來這一年每個月會發生什麼」的人。兩者是完全獨立的購買，互不影響。",
  },
  {
    question: "逐月運勢的推算依據是什麼？",
    answer:
      "運勢總覽格由確定性演算法根據流月四化是否落入命宮、財帛、官祿、夫妻、疾厄等關鍵宮位計算，同一張命盤每次結果一致、不會隨機波動。付費的逐月詳批則由AI根據每月真實的流月命宮、四化與三方四正資料撰寫，並參考命理典籍，不會憑空杜撰星曜落宮。命理揭示的是運勢傾向，請理性看待，僅供學習參考與娛樂。",
  },
];

export default function YueYunPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "紫微逐月運勢", path: "/yueyun" },
        ]),
        faqSchema(FAQ),
      ]} />

      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 返回首頁
        </Link>

        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 逐月運勢</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-wide">紫微逐月運勢</h1>
          <p className="text-sm text-ink-3 leading-relaxed max-w-xl mx-auto">
            輸入出生資訊，免費檢視<strong className="text-ink-2">未來12個月運勢總覽</strong>與
            <strong className="text-ink-2">本月免費短評</strong>，一眼看清接下來每個月的機遇與需留意之處。
          </p>
        </header>

        {/* SEO content — above the form: the value (12 months, this specific) has
            to be clear before asking for birth details. */}
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink tracking-wide">逐月運勢看什麼？</h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              命裡的逐月運勢把紫微斗數的流月推算逐一套用在接下來12個月的每一個月，
              聚焦「這個月」與「下個月」具體會發生什麼，而不只是年度大方向。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "12個月運勢總覽", d: "每月綜合運、事業財、感情緣三項評分與一句主題，確定性演算法，結果穩定、完全免費。" },
              { t: "流月命宮", d: "解析每個月流月命宮落在本命哪個宮位、該宮星曜組合，看這個月的重心落在哪裡。" },
              { t: "流月四化", d: "每月化祿、化權、化科、化忌各自的落點，具體點出機遇所在與需留意之處。" },
              { t: "三方四正會照", d: "每月流月命宮的對宮、財帛位、官祿位與會照星曜，完整還原當月的運勢結構。" },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border-warm bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink mb-1">{c.t}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive flow */}
        <section className="paper-card rounded-2xl border border-border-warm p-5 sm:p-6">
          <MonthlyFortuneFlow />
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink tracking-wide">常見問題</h2>
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.question} className="rounded-xl border border-border-warm bg-paper p-4 group">
                <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                  {f.question}
                  <span className="text-vermillion text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-xs text-ink-3 leading-relaxed mt-2.5">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-ink-4 pt-2">
          想看完整命書？<Link href="/" className="text-vermillion hover:underline">測個人紫微命盤 →</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify `breadcrumbSchema`/`faqSchema` signatures match usage**

```bash
grep -n "export function breadcrumbSchema\|export function faqSchema" lib/jsonld.ts
```

Expected: both exist with signatures matching the call in Step 1 (`breadcrumbSchema(items: {name, path}[])`, `faqSchema(items: {question, answer}[])`) — already confirmed via `app/hepan/page.tsx`'s identical usage.

- [ ] **Step 3: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: no errors (dev server stopped).

- [ ] **Step 4: Live browser verification**

Start `npm run dev`, navigate to `http://localhost:3000/yueyun`:
1. Fill in a birth date, hour, and gender; submit.
2. Confirm the 12-month score grid renders with distinct months, plausible dots, and a theme string per row.
3. Confirm the free teaser paragraph renders below the grid.
4. Since `NEXT_PUBLIC_PAYWALL_ENABLED="false"` in `.env.local`, confirm the full 12-month reading streams in directly (no paywall lock shown) — all 3 batches should complete and render 12 total `###` headings with no truncation.
5. Confirm the chart section and footer render correctly.

- [ ] **Step 5: Commit**

```bash
git add app/yueyun/page.tsx
git commit -m "feat: add /yueyun SEO landing page"
```

---

## Post-plan: external dependency (not actionable by this plan)

Niki needs to add `STRIPE_PRICE_ID_SHORT_ONCE=price_1U6NLSFHqguDDhqBdpXvLR0r` to Vercel's production environment before the paid tier can be tested end-to-end in production. Local dev doesn't need it — `NEXT_PUBLIC_PAYWALL_ENABLED="false"` bypasses the paywall entirely, so Task 7's live verification exercises the full reading without Stripe involved.
