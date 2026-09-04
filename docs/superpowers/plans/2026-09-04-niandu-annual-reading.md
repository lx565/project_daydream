# 年度解讀 (Niandu Annual Reading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new paid product, 年度解讀 ("annual critical-moments reading"), that replaces 逐月運勢 (`/yueyun`) as the featured $1.99 product on the homepage — reusing 逐月運勢's exact pricing/Stripe/paywall plumbing untouched, while `/yueyun` itself stays live at its own URL (not deleted).

**Architecture:** A new deterministic module (`lib/niandu.ts`) reuses the existing `getFlowYears()` (`lib/flowYears.ts`) to find, for the user's current age, which of this year's four 四化 (mutagen) stars land on which natal palace, and maps each palace to a plain-language life domain (感情/事業/財務/健康/貴人/etc.) — mirroring the palette→domain mapping `app/api/reading/monthly/preview/route.ts` already uses for 逐月運勢, just scoped to one year instead of twelve months. Two new API routes reuse this: a free deterministic-signals + one-line AI teaser (mirrors `monthly/preview`), and a paid RAG-grounded SSE-streamed full write-up (mirrors `app/api/reading/cautions/route.ts`). The paywall is wired by giving `lib/chartType.ts` a new `niandu_` chartId prefix that maps to the **existing** `"monthly"` `ChartType` — this is what makes it silently inherit the same $1.99 price, the same Stripe Price ID, and the same `NEXT_PUBLIC_PAYWALL_DISABLED_TYPES` free-promo behavior `逐月運勢` already has, with zero changes to `app/api/checkout/route.ts` or any pricing config.

**Tech Stack:** Next.js App Router, TypeScript, iztro (紫微斗數 engine, via `lib/ziwei.ts`/`lib/flowYears.ts`), SSE streaming (`lib/sseWriter.ts`), RAG retrieval (`lib/rag.ts`), Tailwind (project's existing `vermillion`/`gold`/`jade`/`paper`/`ink` tokens from `tailwind.config.ts`).

## Global Constraints

- Do not modify `app/api/checkout/route.ts`, `lib/chartType.ts`'s `CHART_PRICE_USD` values, or any Stripe env var — pricing/checkout is reused as-is per explicit instruction ("就直接用同一个price id").
- Do not delete or modify `app/yueyun/page.tsx`, `components/MonthlyFortuneFlow.tsx`, `components/MonthlyResultView.tsx`, or any `app/api/reading/monthly*` route — 逐月運勢 stays live and reachable by direct URL; only its homepage nav links move to `/niandu`.
- All user-facing copy is Traditional Chinese (zh-TW), matching every existing page in this app.
- No test framework exists in this repo (no jest/vitest, no `*.test.ts` files) — verification is done via one-off `npx tsx scripts/verify-*.mjs` scratch scripts (delete after confirming) for pure logic, and `npm run build` (TypeScript compilation) as the correctness gate for routes/components, matching this repo's established convention.
- Follow existing copy conventions: no "水逆"/"能量" vague-astrology language (see `SYSTEM` prompt in `app/api/reading/cautions/route.ts` for the house tone), always ground AI prompts in `MODERN_INSTRUCTION`/`ACCESSIBLE_LANGUAGE_INSTRUCTION`/`SAFETY_GUARDRAIL` from `lib/modernInstruction.ts` the same way every other reading route does.

---

### Task 1: Add the `niandu_` chartId prefix

**Files:**
- Modify: `lib/chartType.ts`

**Interfaces:**
- Produces: chartIds starting with `niandu_` now resolve to `ChartType = "monthly"` via `chartType(chartId)`, so `usePaywall()`, `CHART_PRICE_USD`, and GA purchase tracking all treat 年度解讀 charts identically to 逐月運勢 charts — this is the single change that makes pricing/Stripe reuse work.

- [ ] **Step 1: Edit the prefix table and doc comment**

Open `lib/chartType.ts`. Replace the whole file with:

```ts
// Solo readings use the raw sessionId as their chartId; the hepan (couple) flow
// prefixes it with "hepan_" (see components/HepanFlow.tsx), the monthly
// fortune flow prefixes it with "yueyun_" (see components/MonthlyFortuneFlow.tsx),
// and the annual reading flow prefixes it with "niandu_" (see
// components/NianduFlow.tsx). niandu_ intentionally maps to the SAME
// ChartType ("monthly") as yueyun_ — 年度解讀 reuses 逐月運勢's price, Stripe
// Price ID, and paywall-disabled-type behavior byte-for-byte; it is a content
// swap, not a new billing product.
// This is the single source of truth for turning a chartId back into its flow
// type, so purchase / checkout / paywall analytics can segment revenue and
// funnel by product without prefix-matching transaction_ids by hand.
export type ChartType = "hepan" | "solo" | "monthly";

const PREFIX_TYPE: Array<readonly [prefix: string, type: ChartType]> = [
  ["hepan_", "hepan"],
  ["yueyun_", "monthly"],
  ["niandu_", "monthly"],
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

- [ ] **Step 2: Verify it compiles and resolves correctly**

Run:
```bash
cd ~/Projects/fortune-app
npx tsx -e '
import { chartType, CHART_PRICE_USD } from "./lib/chartType";
console.log(chartType("niandu_20261101"), CHART_PRICE_USD[chartType("niandu_20261101")]);
console.log(chartType("yueyun_20261101"), CHART_PRICE_USD[chartType("yueyun_20261101")]);
console.log(chartType("hepan_abc"));
console.log(chartType("plainsession123"));
'
```
Expected output:
```
monthly 1.99
monthly 1.99
hepan
solo
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add lib/chartType.ts
git commit -m "feat(niandu): add niandu_ chartId prefix reusing the monthly price tier"
```

---

### Task 2: Deterministic domain-mapping module

**Files:**
- Create: `lib/niandu.ts`

**Interfaces:**
- Consumes: `getFlowYears(birth, fromAge, toAge)` from `lib/flowYears.ts` — returns `Promise<FlowYear[]>` where `FlowYear = { age, year, ganzhi, flowSoulPalace, natalStars, yearlyMutagen: string[] /* e.g. ["貪狼化祿",...] */, flowStars, sanFang }`. Consumes `ZiweiResult` from `lib/ziwei.ts` (has `.palaces: Palace[]` where each `Palace` has `.name`, `.stars: StarInfo[]` with `.name`/`.type`).
- Produces: `NianduSignal { star, mutagen, palace, domain, tone }`, `NianduYear { age, year, ganzhi, signals: NianduSignal[] }`, `getNianduYear(ziwei, targetAge): Promise<NianduYear | null>`, `nianduFactsFrom(ny): string` — consumed by both API routes in Tasks 3 and 4.

- [ ] **Step 1: Write the file**

Create `lib/niandu.ts`:

```ts
// Deterministic domain-mapping for 年度解讀 (annual critical-moments reading).
// For a single target year, finds where each of that year's four 四化 stars
// (化祿/化權/化科/化忌) sit natally, and maps that palace to a plain-language
// life domain — same idea as monthly/preview/route.ts's palace→area mapping,
// scoped to one full year (so every palace is covered, not just the four
// NOTABLE_PALACES a single month bothers with).

import { getFlowYears } from './flowYears';
import type { BirthInfo, ZiweiResult } from './ziwei';

export type MutagenType = "祿" | "權" | "科" | "忌";

export interface NianduSignal {
  star: string;
  mutagen: MutagenType;
  palace: string;   // natal palace name the star sits in, e.g. "夫妻"
  domain: string;   // plain-language life area, e.g. "感情"
  tone: "positive" | "caution" | "neutral";
}

export interface NianduYear {
  age: number;
  year: number;
  ganzhi: string;
  signals: NianduSignal[];
}

const DOMAIN_LABEL: Record<string, string> = {
  命宮: "整體運勢", 兄弟: "合夥與同輩", 夫妻: "感情", 子女: "子女與創作",
  財帛: "財務", 疾厄: "健康", 遷移: "外出與人際", 僕役: "人脈與合作",
  官祿: "事業", 田宅: "居住與置業", 福德: "心境與福澤", 父母: "長輩與貴人",
};

function toneOf(mutagen: MutagenType): NianduSignal["tone"] {
  if (mutagen === "忌") return "caution";
  if (mutagen === "祿" || mutagen === "權") return "positive";
  return "neutral"; // 科
}

function parseMutagenStar(entry: string): { star: string; mutagen: MutagenType } | null {
  const m = entry.match(/^(.+)化([祿權科忌])$/);
  if (!m) return null;
  return { star: m[1], mutagen: m[2] as MutagenType };
}

/** Which natal palace each major star sits in — same shape as
 *  monthly/preview/route.ts's buildStarPalaceMap. */
function buildStarPalaceMap(palaces: ZiweiResult["palaces"]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of palaces ?? []) {
    for (const s of p.stars) {
      if (s.type === "major") map[s.name] = p.name;
    }
  }
  return map;
}

/** Computes the four 四化 signals (natal palace + life domain) for exactly one
 *  target age/year — the "critical moments" a 年度解讀 reading is built from. */
export async function getNianduYear(ziwei: ZiweiResult, targetAge: number): Promise<NianduYear | null> {
  const birth: BirthInfo = ziwei.birth;
  const flows = await getFlowYears(birth, targetAge, targetAge);
  const flow = flows[0];
  if (!flow) return null;

  const starPalaceMap = buildStarPalaceMap(ziwei.palaces);
  const signals: NianduSignal[] = flow.yearlyMutagen
    .map(parseMutagenStar)
    .filter((s): s is { star: string; mutagen: MutagenType } => !!s)
    .map((s) => {
      const palace = starPalaceMap[s.star] ?? "";
      return { star: s.star, mutagen: s.mutagen, palace, domain: DOMAIN_LABEL[palace] ?? "整體運勢", tone: toneOf(s.mutagen) };
    })
    .filter((s) => s.palace); // drop a mutagen star iztro didn't place on a natal major-star palace (edge charts)

  return { age: flow.age, year: flow.year, ganzhi: flow.ganzhi, signals };
}

/** Deterministic facts string for grounding the paid AI generation (Task 4) —
 *  same role as lib/flowYears.ts's flowYearFactsFrom, scoped to just the
 *  domain-mapped signals a 年度解讀 reading covers. */
export function nianduFactsFrom(ny: NianduYear): string {
  const lines = ny.signals.map((s) => `${s.star}化${s.mutagen} → 落於本命${s.palace}宮（${s.domain}）`);
  return `流年：${ny.year}年 ${ny.ganzhi}（${ny.age}歲）\n四化落點：\n${lines.join('\n') || '（本命盤四化星未落入任何主星所在宮位）'}`;
}
```

- [ ] **Step 2: Write and run a verification script against a known chart**

Create a scratch file `scripts/_verify_niandu.mjs`:

```js
import { calculateZiwei } from '../lib/ziwei.ts';
import { getNianduYear, nianduFactsFrom } from '../lib/niandu.ts';

// Known chart from prior manual verification in this project: 1989-11-01,
// 辰時 (hour=7), female. Natal 命宮未宮天相(得); this chart's 2026 (丙午年,
// age 37) four transformations are known: 天同祿→父母, 天機權→僕役,
// 文昌科→兄弟, 廉貞忌→夫妻.
const z = await calculateZiwei(1989, 11, 1, 7, 'female');
const ny = await getNianduYear(z, 37);
console.log(JSON.stringify(ny, null, 2));
console.log('---');
console.log(nianduFactsFrom(ny));
```

Run:
```bash
cd ~/Projects/fortune-app
npx tsx scripts/_verify_niandu.mjs
```

Expected: `ny.year` is `2026`, `ny.ganzhi` is `"丙午"`, `ny.age` is `37`, and `ny.signals` contains exactly 4 entries matching:
- `{ star: "天同", mutagen: "祿", palace: "父母", domain: "長輩與貴人", tone: "positive" }`
- `{ star: "天機", mutagen: "權", palace: "僕役", domain: "人脈與合作", tone: "positive" }`
- `{ star: "文昌", mutagen: "科", palace: "兄弟", domain: "合夥與同輩", tone: "neutral" }`
- `{ star: "廉貞", mutagen: "忌", palace: "夫妻", domain: "感情", tone: "caution" }`

If any signal is missing or a palace/domain doesn't match, re-check `DOMAIN_LABEL` keys against the actual palace names iztro returns (traditional characters, no `宮` suffix — confirm via the printed JSON).

- [ ] **Step 3: Delete the scratch script**

```bash
cd ~/Projects/fortune-app
rm scripts/_verify_niandu.mjs
```

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fortune-app
git add lib/niandu.ts
git commit -m "feat(niandu): add deterministic four-mutagen domain-mapping module"
```

---

### Task 3: Free preview API route

**Files:**
- Create: `app/api/reading/niandu/preview/route.ts`

**Interfaces:**
- Consumes: `getNianduYear`, `nianduFactsFrom` from `lib/niandu.ts` (Task 2); `callAI` from `lib/callAI.ts` (`callAI({system, userMessage, maxTokens, temperature}): Promise<string>`); `checkRateLimit`/`rateLimitResponse` from `lib/rateLimit.ts`; `SAFETY_GUARDRAIL`/`ACCESSIBLE_LANGUAGE_INSTRUCTION` from `lib/modernInstruction.ts`.
- Produces: `POST` handler returning `NianduPreviewResult { year, ganzhi, age, signals: NianduSignal[], teaser: string }` — consumed by `components/NianduResultView.tsx` (Task 6).

- [ ] **Step 1: Write the route**

Create `app/api/reading/niandu/preview/route.ts`:

```ts
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getNianduYear, nianduFactsFrom, type NianduSignal } from "@/lib/niandu";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL, ACCESSIBLE_LANGUAGE_INSTRUCTION } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";

export interface NianduPreviewResult {
  year: number;
  ganzhi: string;
  age: number;
  signals: NianduSignal[];
  teaser: string;
}

const TEASER_SYSTEM = `你是紫微斗數流年推算專家。根據命主今年的四化落點資料，寫一句話的年度提醒短評，約50–70字，作為付費完整年度解讀的免費試閱。
從提供的四化落點中，挑「化忌」優先（最值得提醒），沒有化忌則挑「化祿」或「化權」。
語氣真誠專業，據盤論斷，不誇飾。結尾自然帶出還有完整年度解讀的期待感，但不要生硬推銷。
只輸出短評本文，不要標題、不要前綴。繁體中文。` + ACCESSIBLE_LANGUAGE_INSTRUCTION + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "niandu-preview" })).allowed) {
    return rateLimitResponse();
  }

  let body: { ziwei: ZiweiResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const targetAge = new Date().getFullYear() - birthYear;

  const ny = await getNianduYear(ziwei, targetAge);
  if (!ny) return Response.json({ error: "compute_failed" }, { status: 500 });

  let teaser = "";
  try {
    const nameStr = name ? `命主：${name}\n` : "";
    const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n${nianduFactsFrom(ny)}\n\n請寫今年的一句話年度提醒短評。`;
    teaser = await callAI({
      system: TEASER_SYSTEM,
      userMessage,
      maxTokens: 300,
      temperature: 0.7,
    });
  } catch {
    // Teaser is a nice-to-have — the signal list is the core free value, so a
    // failed teaser call shouldn't fail the whole preview response.
  }

  return Response.json({
    year: ny.year, ganzhi: ny.ganzhi, age: ny.age, signals: ny.signals, teaser: teaser.trim(),
  } satisfies NianduPreviewResult);
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `app/api/reading/niandu/preview/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/niandu/preview/route.ts
git commit -m "feat(niandu): add free preview API route (signals + AI teaser)"
```

---

### Task 4: Paid SSE API route

**Files:**
- Create: `app/api/reading/niandu/route.ts`

**Interfaces:**
- Consumes: `getNianduYear`, `nianduFactsFrom` from `lib/niandu.ts` (Task 2); `getKnowledge` from `lib/rag.ts` (`getKnowledge(query: RagQuery): Promise<{context: string, refs: Reference[]}>` where `RagQuery = {stars?, palaces?, topic?, text?, topK?, ...}`); `makeSSEResponse`/`streamWithRefs` from `lib/sseWriter.ts`; `checkRateLimit`/`rateLimitResponse`/`clientIp` from `lib/rateLimit.ts`; `MODERN_INSTRUCTION` from `lib/modernInstruction.ts`.
- Produces: `POST` handler returning an SSE stream (`text/event-stream`) of `{text}`/`{refs}`/`{_done:true}` frames — consumed via `useSSEStream("/api/reading/niandu", ...)` in `components/NianduResultView.tsx` (Task 6), exactly the way `components/WizardFlow.tsx` consumes `/api/reading/cautions`.

- [ ] **Step 1: Write the route**

Create `app/api/reading/niandu/route.ts`:

```ts
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getNianduYear, nianduFactsFrom } from "@/lib/niandu";

const SYSTEM = `你是紫微斗數命理師，像一位關心你的朋友，把命主今年真正值得留意的幾件事說清楚——不是「本週水逆」那種通用文案，每一點都要能回推到命盤上一個具體的星曜落點。

只輸出以下板塊（Markdown），不要增加其他標題：

## 今年關鍵提醒
（根據提供的四化落點資料，逐一展開每個訊號——用 ### 小標題（格式：領域名稱，如「感情」「事業」「財務」），每點先點出對應的四化星曜與落宮，再具體說明這對命主今年的影響與一條可操作建議。化忌類訊號如實提醒不迴避，化祿化權化科類訊號說明可以怎麼把握。語氣溫和關切、據盤論斷，不誇大不嚇人，不使用「水逆」「能量」等空泛用語。每點約120字。）

可引相關古訣為據。措辭專業、溫和、關切。繁體中文。` + MODERN_INSTRUCTION;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "niandu" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const targetAge = new Date().getFullYear() - birthYear;

  const ny = await getNianduYear(ziwei, targetAge);
  if (!ny) return Response.json({ error: "compute_failed" }, { status: 500 });

  const { context, refs } = await getKnowledge({
    stars: ny.signals.map((s) => s.star),
    topic: "大限",
    topK: 5,
  });

  const nameStr = name ? `命主：${name} · ` : "";
  const userMessage = `${nameStr}命格：${ziwei.summary}
${nianduFactsFrom(ny)}

參考資料：\n${context || "（暫無）"}

請根據以上四化落點資料，寫今年關鍵提醒。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 1800,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "niandu" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `app/api/reading/niandu/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/niandu/route.ts
git commit -m "feat(niandu): add paid SSE-streamed full annual reading route"
```

---

### Task 5: Frontend birth-input flow

**Files:**
- Create: `components/NianduFlow.tsx`

**Interfaces:**
- Consumes: `BirthdayWheel` from `./WheelPicker` (props: `date`, `hour`, `onDateChange`, `onHourChange`); `calculateZiwei` from `@/lib/ziwei`; hands off to `NianduResultView` (Task 6).
- Produces: exported `NianduCharts` type (mirrors `MonthlyCharts`) and default-exported `NianduFlow` component — consumed by `app/niandu/page.tsx` (Task 7).

- [ ] **Step 1: Write the file**

Create `components/NianduFlow.tsx` (this is `components/MonthlyFortuneFlow.tsx` with every `Monthly`/`monthly`/逐月 identifier renamed to `Niandu`/`niandu`/年度, and the child component swapped):

```tsx
"use client";

// Standalone single-person 年度解讀 (annual critical-moments reading) flow
// for the /niandu SEO landing page. Self-contained: collects ONE birth,
// computes the chart CLIENT-side (calculateZiwei), then hands off to
// NianduResultView, which owns the free signal preview and paywall-gated
// full reading. Mirrors components/MonthlyFortuneFlow.tsx exactly (same
// form, same URL-restore-on-Stripe-return trick) — only the result view
// and chartId prefix differ, since 年度解讀 reuses 逐月運勢's pricing tier.

import { useEffect, useState } from "react";
import { BirthdayWheel } from "./WheelPicker";
import type { ZiweiResult } from "@/lib/ziwei";
import NianduResultView from "./NianduResultView";

interface PersonFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

export interface NianduCharts {
  ziwei: ZiweiResult;
  name?: string;
  gender: "male" | "female";
  date: string;
  hour: number;
  sessionId: string;
}

function personKey(p: PersonFields) {
  return `${p.date.replace(/-/g, "")}${p.hour}${p.gender}`;
}

function syncUrl(p: PersonFields) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set("date", p.date);
  params.set("hour", p.hour);
  params.set("gender", p.gender);
  if (p.name) params.set("name", p.name);
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}

function personFromUrl(): PersonFields | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const date = params.get("date") ?? "";
  const hour = params.get("hour") ?? "";
  const gender = params.get("gender");
  if (!date || hour === "" || (gender !== "male" && gender !== "female")) return null;
  return { name: params.get("name") ?? "", date, hour, gender };
}

async function computeCharts(p: PersonFields): Promise<NianduCharts> {
  const { calculateZiwei } = await import("@/lib/ziwei");
  const [y, m, d] = p.date.split("-").map(Number);
  const h = parseInt(p.hour, 10);
  const gender = p.gender as "male" | "female";
  const ziwei = await calculateZiwei(y, m, d, h, gender);
  return { ziwei, name: p.name || undefined, gender, date: p.date, hour: h, sessionId: personKey(p) };
}

export default function NianduFlow() {
  const [person, setPerson] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<NianduCharts | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const restored = personFromUrl();
    if (!restored) { setRestoring(false); return; }
    computeCharts(restored)
      .then((c) => { setPerson(restored); setCharts(c); })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);

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
      const c = await computeCharts(person);
      syncUrl(person);
      setCharts(c);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setComputing(false);
    }
  }

  if (restoring) return null;

  if (charts) {
    return (
      <NianduResultView
        charts={charts}
        onReset={() => {
          setCharts(null);
          if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
        }}
      />
    );
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
        {computing ? "正在排盤…" : ready ? "檢視年度解讀 →" : "請填寫出生資訊"}
      </button>

      <p className="text-center text-[11px] text-ink-4">
        出生時間預設按北京時間（UTC+8）排盤 · 資訊僅用於本次推算與網站使用統計，不會用於其他用途
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run (this will show errors until Task 6 creates `NianduResultView` — that's expected; confirm the *only* error is the missing module):
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: the only error touching this file is `Cannot find module './NianduResultView'` (resolved by Task 6).

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add components/NianduFlow.tsx
git commit -m "feat(niandu): add birth-input flow component"
```

---

### Task 6: Frontend result view (free preview + paywall + paid stream)

**Files:**
- Create: `components/NianduResultView.tsx`

**Interfaces:**
- Consumes: `NianduCharts` from `./NianduFlow` (Task 5); `NianduPreviewResult`/`NianduSignal` from `@/app/api/reading/niandu/preview/route` (Task 3); `usePaywall` from `@/lib/usePaywall` (`usePaywall(chartId): {enabled, unlocked, loading}`); `useSSEStream` from `@/lib/useSSEStream` (`useSSEStream(url, cacheKey?, opts?): {status, text, refs, errorMsg, start(body), reset, rerun}`); `PaywallLock` from `./PaywallLock` (props: `chartId`, `sectionLabel?`, `included?`, `proofStrip?`); `Md` from `./Md`; `EntryTracker`, `ToolCTA`, `ZiweiChart`, `BugReportButton` (same props as used in `MonthlyResultView.tsx`); `Reference` type from `@/lib/rag`.
- Produces: default-exported `NianduResultView({charts, onReset})` — consumed by `NianduFlow.tsx` (Task 5).

- [ ] **Step 1: Write the file**

Create `components/NianduResultView.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import EntryTracker from "./EntryTracker";
import ToolCTA from "./ToolCTA";
import ZiweiChart from "./ZiweiChart";
import Md from "./Md";
import type { NianduCharts } from "./NianduFlow";
import { usePaywall } from "@/lib/usePaywall";
import { useSSEStream } from "@/lib/useSSEStream";
import type { Reference } from "@/lib/rag";
import type { NianduPreviewResult, NianduSignal } from "@/app/api/reading/niandu/preview/route";

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

const SCHOOL_LABELS: Record<string, string> = {
  "三合派": "三合", "四化派": "四化", "飛星派": "飛星",
  "北派河洛": "北派", "古籍經典": "古籍", "其他名家": "名家", "倪師學派": "倪師",
};

function RefList({ refs }: { refs: Reference[] }) {
  const [open, setOpen] = useState(false);
  if (refs.length === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-border-light">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-4 hover:text-ink-3 transition-colors">
        <span className="text-gold">📚</span>
        <span>參考典籍（{refs.length}部）</span>
        <span className={`text-ink-4 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {refs.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-ink-4">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-paper-2 border border-border-light text-ink-3 flex-shrink-0">
                {SCHOOL_LABELS[r.school] ?? r.school}
              </span>
              <span>{r.book.replace(/-/g, " · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_h3]:text-gold [&_h3]:font-semibold [&_h3]:text-xs [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:leading-relaxed [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0 [&_li]:before:text-vermillion [&_li]:before:font-bold [&_li>p]:inline [&_li>p]:m-0";

const NIANDU_INCLUDED = [
  "今年每個四化落點的完整展開",
  "對應到感情、事業、財務、健康等具體領域",
  "每點附一條可操作建議",
  "AI 依據上百部命理典籍撰寫",
];

const NIANDU_PROOF_STRIP = [
  { icon: "🔮", stat: "紫微斗數", label: "流年四化分析" },
  { icon: "🎯", stat: "只講", label: "今年真正關鍵" },
  { icon: "📚", stat: "上百部", label: "命理典籍加持" },
  { icon: "⚡", stat: "$1.99", label: "一次解鎖全年" },
];

const TONE_STYLE: Record<NianduSignal["tone"], string> = {
  positive: "bg-jade-l text-jade",
  caution: "bg-vermillion-l text-vermillion",
  neutral: "bg-gold-l text-gold",
};

export default function NianduResultView({ charts, onReset }: { charts: NianduCharts; onReset: () => void }) {
  const { ziwei, name, gender, date, hour, sessionId } = charts;
  const label = name || (gender === "male" ? "命主（男）" : "命主（女）");

  const chartId = `niandu_${sessionId}`;
  const paywall = usePaywall(chartId);
  const gated = paywall.enabled && !paywall.unlocked;

  const [preview, setPreview] = useState<NianduPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const previewRequestRef = useRef(0);

  const fetchPreview = () => {
    const requestId = ++previewRequestRef.current;
    setPreviewLoading(true);
    setPreviewError(false);
    fetch("/api/reading/niandu/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: NianduPreviewResult) => { if (previewRequestRef.current === requestId) setPreview(d); })
      .catch(() => { if (previewRequestRef.current === requestId) setPreviewError(true); })
      .finally(() => { if (previewRequestRef.current === requestId) setPreviewLoading(false); });
  };

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const full = useSSEStream("/api/reading/niandu", `${chartId}_full`, { validate: true });
  const fullStarted = useRef(false);
  useEffect(() => {
    if (!gated && !paywall.loading && !fullStarted.current) {
      fullStarted.current = true;
      if (full.status === "idle") full.start({ ziwei, name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, paywall.loading]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <EntryTracker date={date} hour={hour} gender={gender} name={name} method="niandu" dedupeKey="niandu_birth" />

      <button onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      <div className="paper-card rounded-2xl border border-border-warm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-vermillion rounded-full" />
          <h2 className="text-base font-bold text-ink tracking-wide">
            {label} · {preview ? `${preview.year}年` : "今年"}關鍵訊號
          </h2>
        </div>

        {previewLoading && <LoadingSkeleton />}
        {previewError && !previewLoading && (
          <div className="space-y-1.5">
            <p className="text-sm text-vermillion">推算失敗，請重新整理重試。</p>
            <button onClick={fetchPreview} className="text-xs text-gold underline">重試</button>
          </div>
        )}

        {preview && !previewLoading && (
          <>
            <div className="flex flex-wrap gap-2">
              {preview.signals.map((s) => (
                <span key={`${s.star}${s.mutagen}`} className={`text-xs px-2.5 py-1 rounded-full ${TONE_STYLE[s.tone]}`}>
                  {s.domain} · {s.star}化{s.mutagen}
                </span>
              ))}
              {preview.signals.length === 0 && (
                <span className="text-xs text-ink-3">今年命盤整體平穩，無明顯四化牽動。</span>
              )}
            </div>

            {preview.teaser && (
              <div className="mt-4 pt-4 border-t border-border-warm">
                <p className="text-xs text-vermillion font-semibold mb-1.5">免費短評</p>
                <p className="text-sm text-ink-2 leading-relaxed">{preview.teaser}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <p className="text-xs text-ink-4 tracking-widest uppercase flex items-center gap-2 mb-2 px-1">
          <span className="w-px h-3 bg-vermillion inline-block" />
          <span className="text-vermillion">年度解讀</span>
        </p>
        {gated ? (
          <PaywallLock chartId={chartId} sectionLabel="年度解讀" included={NIANDU_INCLUDED} proofStrip={NIANDU_PROOF_STRIP} />
        ) : (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            {full.status === "error" && (
              <div className="space-y-2">
                <p className="text-sm text-vermillion">{full.errorMsg}</p>
                <button onClick={() => { fullStarted.current = false; full.reset(); }} className="text-xs text-gold underline">重試</button>
              </div>
            )}
            {full.status === "streaming" && !full.text && <LoadingSkeleton />}
            {(full.status === "streaming" || full.status === "done") && full.text && (
              <div className="animate-fade-in space-y-1">
                <Md className={MD_PROSE}>{full.text}</Md>
                <RefList refs={full.refs} />
              </div>
            )}
            {full.status === "idle" && <LoadingSkeleton />}
          </div>
        )}
      </div>

      <div className="mb-6">
        <ToolCTA
          source="niandu"
          sub="看完年度關鍵提醒，也來看看你的完整命盤吧——三合、四化、飛星三派合參，AI 依據逾百部典籍，為你逐宮詳批命格、大限與流年。"
          label="生成我的個人命盤詳批"
        />
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

      <BugReportButton sessionId={chartId} page="niandu" />
    </div>
  );
}
```

- [ ] **Step 2: Verify the full pair type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors referencing `components/NianduFlow.tsx` or `components/NianduResultView.tsx`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add components/NianduResultView.tsx
git commit -m "feat(niandu): add result view with free preview, paywall gate, and SSE full reading"
```

---

### Task 7: Landing page

**Files:**
- Create: `app/niandu/page.tsx`

**Interfaces:**
- Consumes: `NianduFlow` from `@/components/NianduFlow` (Task 5); `JsonLd`, `breadcrumbSchema`, `faqSchema` from existing `@/lib/jsonld` (same imports `app/yueyun/page.tsx` uses).
- Produces: the `/niandu` route — linked from `app/page.tsx` (Task 8).

- [ ] **Step 1: Write the file**

Create `app/niandu/page.tsx` (mirrors `app/yueyun/page.tsx`'s structure — metadata, FAQ schema, hero, value-prop cards, interactive flow, FAQ accordion — with copy rewritten for 年度解讀):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import NianduFlow from "@/components/NianduFlow";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微年度解讀 · 今年關鍵提醒 — 命裡",
  description:
    "紫微斗數年度解讀，輸入出生資訊，免費檢視今年的四化訊號總覽。付費解鎖完整年度關鍵提醒——感情、事業、財務、貴人逐一展開，只要 $1.99。",
  keywords: ["紫微年度解讀", "今年運勢", "流年四化", "紫微斗數流年", "2026年運勢", "年度運勢"],
  openGraph: {
    title: "紫微年度解讀 · 今年關鍵提醒 — 命裡",
    description:
      "輸入出生資訊，免費檢視今年四化訊號總覽，付費解鎖完整年度關鍵提醒，只要 $1.99。",
    url: "https://www.mingli.study/niandu",
    siteName: "命裡",
    locale: "zh_TW",
    type: "website",
  },
  alternates: { canonical: "https://www.mingli.study/niandu" },
};

const FAQ = [
  {
    question: "什麼是紫微年度解讀？",
    answer:
      "年度解讀把紫微斗數的流年四化推算套用在今年，找出化祿、化權、化科、化忌分別落在命盤的哪一宮，對應到感情、事業、財務、健康、貴人等具體生活領域，逐一說明機遇與需留意之處，並附可操作建議。比起泛泛而談的「今日運勢」，年度解讀的每一句提醒都能回推到命盤上一個具體的星曜落點。",
  },
  {
    question: "年度解讀需要提供什麼資訊？",
    answer: "只需要出生日期、出生時辰與性別。出生時辰越準確，命宮定位越精準。不需要姓名，稱呼可留空。資訊僅用於本次推算，不會被儲存。",
  },
  {
    question: "年度解讀免費嗎？",
    answer:
      "今年四化訊號總覽（列出所有落點與對應領域）與一句話免費短評完全免費，輸入出生資訊即可檢視。完整的年度關鍵提醒（逐一展開每個訊號，涵蓋落點、影響與具體建議）為付費內容，一次 $1.99 解鎖，永久保存可重複查閱。",
  },
  {
    question: "年度解讀跟命裡其他產品有什麼不同？",
    answer:
      "命裡的完整命書（$6.99）涵蓋十二宮位、大運流年、紫微＋八字雙系統與問命追問，是全面的命盤解讀。年度解讀（$1.99）是更聚焦、更輕量的獨立產品，只看今年的四化關鍵提醒，適合只想知道「今年要注意什麼」的人。兩者是完全獨立的購買，互不影響。",
  },
  {
    question: "年度解讀的推算依據是什麼？",
    answer:
      "四化訊號總覽由確定性演算法根據今年四化星是否落入命盤主星所在宮位計算，同一張命盤每次結果一致、不會隨機波動。付費的完整提醒則由AI根據真實的四化落點資料撰寫，並參考命理典籍，不會憑空杜撰星曜落宮。命理揭示的是運勢傾向，請理性看待，僅供學習參考與娛樂。",
  },
];

export default function NianduPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "紫微年度解讀", path: "/niandu" },
        ]),
        faqSchema(FAQ),
      ]} />

      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 返回首頁
        </Link>

        <header className="text-center space-y-3">
          <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 年度解讀</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-wide">紫微年度解讀</h1>
          <p className="text-sm text-ink-3 leading-relaxed max-w-xl mx-auto">
            輸入出生資訊，免費檢視<strong className="text-ink-2">今年四化訊號總覽</strong>與
            <strong className="text-ink-2">一句話免費短評</strong>，一眼看清今年真正需要留意的事。
          </p>
        </header>

        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-ink tracking-wide">年度解讀看什麼？</h2>
            <p className="text-sm text-ink-3 leading-relaxed">
              命裡的年度解讀把紫微斗數的流年四化推算套用在今年，
              只講真正值得放在心上的幾件事，不是「本週水逆」那種通用文案。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "四化訊號總覽", d: "今年化祿、化權、化科、化忌分別落在命盤哪一宮，確定性演算法，結果穩定、完全免費。" },
              { t: "對應具體領域", d: "每個訊號對應到感情、事業、財務、健康、貴人等具體生活領域，不是空泛的吉凶論斷。" },
              { t: "逐一展開提醒", d: "每個訊號的具體影響與一條可操作建議，化忌如實提醒不迴避，化祿化權說明怎麼把握。" },
              { t: "命理典籍佐證", d: "AI 依據真實的四化落點資料與上百部命理典籍撰寫，不會憑空杜撰星曜落宮。" },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-border-warm bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink mb-1">{c.t}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="paper-card rounded-2xl border border-border-warm p-5 sm:p-6">
          <NianduFlow />
        </section>

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

- [ ] **Step 2: Build the app to verify the route compiles and statically generates**

Run:
```bash
cd ~/Projects/fortune-app
npm run build
```
Expected: build succeeds, output lists `/niandu` as a generated static route with no type or lint errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/niandu/page.tsx
git commit -m "feat(niandu): add /niandu landing page"
```

---

### Task 8: Repoint homepage navigation from 逐月運勢 to 年度解讀

**Files:**
- Modify: `app/page.tsx:181-217` (sticky nav link and promo banner link)

**Interfaces:**
- Consumes: nothing new. Produces: the homepage's featured product slot now points at `/niandu` instead of `/yueyun`; `/yueyun` remains live at its own URL (Global Constraints) but is no longer linked from the homepage.

- [ ] **Step 1: Update the sticky nav link**

In `app/page.tsx`, find (around line 188-194):

```tsx
            <Link
              href="/yueyun"
              className="hidden sm:flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors"
            >
              逐月運勢
              <span className="text-[10px] font-bold text-white bg-vermillion px-1.5 py-0.5 rounded-full leading-none">免費</span>
            </Link>
```

Replace with:

```tsx
            <Link
              href="/niandu"
              className="hidden sm:flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors"
            >
              年度解讀
              <span className="text-[10px] font-bold text-white bg-vermillion px-1.5 py-0.5 rounded-full leading-none">免費</span>
            </Link>
```

- [ ] **Step 2: Update the promo banner link**

In the same file, find (around line 211-218):

```tsx
      {/* ── 1.5 限時免費 Promo Banner ── */}
      <div className="bg-vermillion text-paper text-center py-2 px-4 text-xs sm:text-sm">
        🎉 限時免費：
        <Link href="/hepan" className="underline underline-offset-2 hover:opacity-80 transition-opacity">雙人合盤</Link>
        {" "}與{" "}
        <Link href="/yueyun" className="underline underline-offset-2 hover:opacity-80 transition-opacity">逐月運勢</Link>
        {" "}現正完全免費，把握機會體驗完整解讀！
      </div>
```

Replace with:

```tsx
      {/* ── 1.5 限時免費 Promo Banner ── */}
      <div className="bg-vermillion text-paper text-center py-2 px-4 text-xs sm:text-sm">
        🎉 限時免費：
        <Link href="/hepan" className="underline underline-offset-2 hover:opacity-80 transition-opacity">雙人合盤</Link>
        {" "}與{" "}
        <Link href="/niandu" className="underline underline-offset-2 hover:opacity-80 transition-opacity">年度解讀</Link>
        {" "}現正完全免費，把握機會體驗完整解讀！
      </div>
```

Note: this banner's "免費" claim stays true automatically — `niandu_` resolves to `ChartType = "monthly"` (Task 1), and `NEXT_PUBLIC_PAYWALL_DISABLED_TYPES` already includes `monthly` in production (per project memory), so 年度解讀 inherits the same temporarily-free status 逐月運勢 had, with no env var change needed.

- [ ] **Step 3: Verify the build and grep for any remaining stray reference**

Run:
```bash
cd ~/Projects/fortune-app
npm run build
grep -n '"/yueyun"' app/page.tsx
```
Expected: build succeeds; the `grep` returns **no matches** (both links now point to `/niandu`).

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fortune-app
git add app/page.tsx
git commit -m "feat(niandu): feature 年度解讀 on the homepage in place of 逐月運勢"
```

---

## Post-plan manual check (not a task — do this yourself in a browser before calling it done)

1. `npm run dev`, visit `/niandu`, fill in a real birth date/hour/gender, submit.
2. Confirm the free signal chips + teaser render.
3. If `NEXT_PUBLIC_PAYWALL_ENABLED` is `"true"` locally, confirm the `PaywallLock` card renders with 年度解讀-specific copy; if disabled (default), confirm the full SSE reading streams in and renders as markdown with a references list.
4. Visit `/` and confirm both the sticky nav and the promo banner now say 年度解讀 and link to `/niandu`.
5. Visit `/yueyun` directly and confirm 逐月運勢 still works exactly as before (untouched).
