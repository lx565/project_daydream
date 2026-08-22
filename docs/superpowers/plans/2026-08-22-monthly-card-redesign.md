# 逐月詳細解讀 Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paid 逐月運勢 product's raw-AI-prose "逐月詳細解讀" section with a structured per-month card (rankings, 本月重點, 宜/忌, 幸運色/方位, 建議, per-card image download), fed by a JSON-mode AI batch call instead of SSE-streamed markdown.

**Architecture:** The paid route (`app/api/reading/monthly/route.ts`) switches from `makeSSEResponse`/`streamWithRefs` (streamed markdown prose) to a single non-streaming `callAI({..., jsonMode: true})` call per batch (same 3-batches-of-4-months split, same RAG grounding), returning structured per-month fields matched back to their flow month by `(year, month)` — never by trusting array position. A new deterministic `lib/monthlyLuck.ts` supplies 幸運色/方位 from the month's ganzhi stem element, with zero AI cost. A new `components/MonthCard.tsx` renders one month's full card, reusing the free preview route's already-computed rankings (`overall`/`career`/`romance`/`theme`) rather than recomputing them, and reuses the existing `html2canvas` pattern from `components/ExportReport.tsx` for a per-card "download as picture" button.

**Tech Stack:** Next.js 15 App Router, TypeScript, `html2canvas` (already a dependency), `callAI`'s existing `jsonMode` support (already used by `app/api/reading/flowyears-scores/route.ts`).

## Global Constraints

- **No AI call for rankings or colors/directions.** Rankings reuse the free preview route's existing `scoreMonth()` output; colors/directions come from a new deterministic lookup. Only 本月重點/宜/忌/建議 go through the AI.
- **Match AI response entries to flow months by `(year, month)`, never by array position.** The AI's JSON response must echo `year`/`month` per entry.
- **A malformed or missing AI entry for one month must never break the other months in its batch.** Missing `good`/`caution`/`advice` fall back to fixed placeholder strings (given below); missing `headline` falls back to the free preview's already-computed `theme` string for that month (client-side, since only the client has both pieces of data).
- **All 12 months render as full cards, stacked vertically.** No hero+compact-list split. Current month gets a visual highlight only.
- **Per-month image download only** — no "download all 12" button.
- **建議 drops classical-proverb citations** ("古訣云：...") — doesn't fit a compact card. Grounding is still enforced via the same mutagen/palace facts fed to the AI and the existing `SAFETY_GUARDRAIL`.
- **土 (Earth)'s direction (西南方) is one reasonable convention, not unambiguous fact** — classical texts vary. Frame it the same "僅供參考" way the rest of the app frames all divinatory content.
- **No test framework exists in this repo** (no test script in `package.json`, no `.test.` files). Verification throughout is `npx tsc --noEmit` (dev server stopped first — running both concurrently against the same `.next/` throws unrelated-looking prerender errors), scratch Node scripts for pure-computation code (deleted after use), and live dev-server/browser testing for routes and UI.
- Traditional Chinese throughout.

---

### Task 1: `lib/monthlyLuck.ts` — deterministic 幸運色/方位 lookup

**Files:**
- Create: `lib/monthlyLuck.ts`

**Interfaces:**
- Consumes: nothing (pure function, no imports from other tasks).
- Produces: `MonthlyLuck` interface (`{color: string, direction: string}`), `monthlyLuck(ganzhi: string): MonthlyLuck` — Task 3's `MonthCard.tsx` imports and calls this directly.

- [ ] **Step 1: Write `lib/monthlyLuck.ts`**

```ts
// Deterministic 幸運色/方位 lookup, keyed off a ganzhi string's heavenly-stem
// element (e.g. "丙申" → stem 丙 → 火). Classical five-element color/direction
// correspondence — 土's direction (西南方) is one reasonable convention among
// several used across different schools, not unambiguous fact. Framed the
// same "僅供參考" way the rest of this app frames all divinatory content.

export interface MonthlyLuck {
  color: string;
  direction: string;
}

const ELEMENT_BY_STEM: Record<string, string> = {
  "甲": "木", "乙": "木",
  "丙": "火", "丁": "火",
  "戊": "土", "己": "土",
  "庚": "金", "辛": "金",
  "壬": "水", "癸": "水",
};

const LUCK_BY_ELEMENT: Record<string, MonthlyLuck> = {
  "木": { color: "綠色", direction: "東方" },
  "火": { color: "紅色", direction: "南方" },
  "土": { color: "黃色", direction: "西南方" },
  "金": { color: "金色", direction: "西方" },
  "水": { color: "藍色", direction: "北方" },
};

/** Looks up 幸運色/方位 from a ganzhi string's first character (the stem).
 *  Falls back to 土's luck if the stem is somehow unrecognized (defensive —
 *  should never happen for a real iztro-produced ganzhi). */
export function monthlyLuck(ganzhi: string): MonthlyLuck {
  const stem = ganzhi.charAt(0);
  const element = ELEMENT_BY_STEM[stem] ?? "土";
  return LUCK_BY_ELEMENT[element];
}
```

- [ ] **Step 2: Verify with a scratch script**

```bash
cat > /tmp/verify_monthlyluck.mjs << 'EOF'
// Quick manual check against all 10 stems — run with node after a `tsc` pass
// confirms the file compiles, since this is plain TS with no runtime deps.
const ELEMENT_BY_STEM = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
};
const LUCK_BY_ELEMENT = {
  "木":{color:"綠色",direction:"東方"},"火":{color:"紅色",direction:"南方"},
  "土":{color:"黃色",direction:"西南方"},"金":{color:"金色",direction:"西方"},"水":{color:"藍色",direction:"北方"},
};
function monthlyLuck(ganzhi) {
  const stem = ganzhi.charAt(0);
  const element = ELEMENT_BY_STEM[stem] ?? "土";
  return LUCK_BY_ELEMENT[element];
}
for (const stem of Object.keys(ELEMENT_BY_STEM)) {
  console.log(stem, "->", JSON.stringify(monthlyLuck(stem + "子")));
}
EOF
node /tmp/verify_monthlyluck.mjs
rm /tmp/verify_monthlyluck.mjs
```

Expected: 10 lines, one per stem, each with a plausible `{color, direction}` pair — 甲/乙→綠色/東方, 丙/丁→紅色/南方, 戊/己→黃色/西南方, 庚/辛→金色/西方, 壬/癸→藍色/北方.

- [ ] **Step 3: Run tsc**

```bash
npx tsc --noEmit
```

Expected: no new errors (dev server stopped first).

- [ ] **Step 4: Commit**

```bash
git add lib/monthlyLuck.ts
git commit -m "feat: add deterministic 幸運色/方位 lookup for monthly cards"
```

---

### Task 2: Rewrite `app/api/reading/monthly/route.ts` — SSE prose to JSON-mode structured fields

**Files:**
- Modify: `app/api/reading/monthly/route.ts` (full rewrite)

**Interfaces:**
- Consumes: `getFlowMonths`, `FlowMonth` from `@/lib/flowMonths` (unchanged); `getKnowledge` from `@/lib/rag` (unchanged); `callAI` from `@/lib/callAI` (new import, replaces `makeSSEResponse`/`streamWithRefs`).
- Produces: `MonthlyDetail` interface (`{year, month, headline, good, caution, advice}`), `MonthlyBatchResult` interface (`{months: MonthlyDetail[]}`) — both exported, consumed by Task 4's `components/MonthlyResultView.tsx` (which imports `MonthlyBatchResult` for its fetch response type) and Task 3's `components/MonthCard.tsx` (which imports `MonthlyDetail` for its `detail` prop type). `POST` now returns plain `Response.json(result satisfies MonthlyBatchResult)`, not an SSE stream.

- [ ] **Step 1: Rewrite `app/api/reading/monthly/route.ts`**

```ts
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowMonths, type FlowMonth } from "@/lib/flowMonths";

const MONTHS_AHEAD = 12;
const BATCH_SIZE = 4; // 3 calls of 4 months each — avoids the truncation risk of one 12-month call

export interface MonthlyDetail {
  year: number;
  month: number;
  headline: string; // "" if the AI omitted/malformed this month — client falls back to the free-preview theme
  good: string;
  caution: string;
  advice: string;
}

export interface MonthlyBatchResult {
  months: MonthlyDetail[];
}

const FALLBACK_GOOD = "（本次未取得，可稍後重新整理）";
const FALLBACK_CAUTION = "（本次未取得，可稍後重新整理）";
const FALLBACK_ADVICE = "（本次未取得詳細建議，其餘月份不受影響）";

const SYSTEM = `你是精通紫微斗數流月推斷的命理師，據盤論斷，用詞專業平實而有溫度。

以下是命主連續數月的流月資料。請針對每一個月，輸出四個欄位：
- headline：本月最值得留意的一句話重點，需具體點出星曜或宮位（15–20字）
- good：一件本月適合做的具體事（10–15字，例如「洽談合作」「主動溝通」，避免空泛詞如「保持樂觀」）
- caution：一件本月需留意之處（10–15字，具體到情境，例如「文件契約需多確認」）
- advice：整合本月機遇與風險的1–2句可操作建議（40–60字），需結合流月命宮星曜、四化落點具體展開，不可空泛、不可只是重複headline

advice欄位中只用**加粗**單個星曜名稱或四化符號（1–6字），不得加粗片語或句子。繁體中文。

只輸出合法JSON（無程式碼區塊標記、無多餘文字）：
{
  "months": [
    {"year": 數字, "month": 數字, "headline": "...", "good": "...", "caution": "...", "advice": "..."}
  ]
}` + SAFETY_GUARDRAIL;

interface RawMonthEntry {
  year?: unknown;
  month?: unknown;
  headline?: unknown;
  good?: unknown;
  caution?: unknown;
  advice?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

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
  const { context } = await getKnowledge({ stars: ragStars, topic: "流年", topK: 8 });

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n本批流月資料：\n${monthLines}\n\n參考資料：\n${context || "（暫無）"}\n\n請針對上方每一個月輸出JSON欄位。`;

  // ~150–160 chars of JSON (content + structural overhead) per month × 4
  // months, generously budgeted — start here, bump if live testing shows
  // truncation (same methodology used to tune every other maxTokens in this
  // codebase: start from an estimate, verify against real output).
  let raw = "";
  try {
    raw = await callAI({
      system: SYSTEM,
      userMessage,
      maxTokens: 2200,
      temperature: 0.7,
      jsonMode: true,
    });
  } catch {
    raw = "";
  }

  let parsedMonths: RawMonthEntry[] = [];
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
    const parsed = JSON.parse(cleaned) as { months?: RawMonthEntry[] };
    if (Array.isArray(parsed.months)) parsedMonths = parsed.months;
  } catch {
    parsedMonths = [];
  }

  // Key by (year, month), never trust array position/order/count from the AI.
  const byKey = new Map<string, RawMonthEntry>();
  for (const m of parsedMonths) {
    if (typeof m.year === "number" && typeof m.month === "number") {
      byKey.set(`${m.year}-${m.month}`, m);
    }
  }

  const months: MonthlyDetail[] = batchFlows.map((f) => {
    const entry = byKey.get(`${f.year}-${f.month}`);
    return {
      year: f.year,
      month: f.month,
      headline: isNonEmptyString(entry?.headline) ? entry.headline : "",
      good: isNonEmptyString(entry?.good) ? entry.good : FALLBACK_GOOD,
      caution: isNonEmptyString(entry?.caution) ? entry.caution : FALLBACK_CAUTION,
      advice: isNonEmptyString(entry?.advice) ? entry.advice : FALLBACK_ADVICE,
    };
  });

  return Response.json({ months } satisfies MonthlyBatchResult);
}
```

- [ ] **Step 2: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: no new errors (dev server stopped first).

- [ ] **Step 3: Live verification against the dev server, all 3 batches**

Start `npm run dev` in one terminal. In another, from the project root (`~/Projects/fortune-app` — `tsx` needs to run from here so it picks up this project's `tsconfig.json` path aliases, which `lib/ziwei.ts` itself may rely on internally), generate a real `ZiweiResult` payload:

```bash
cat > /tmp/gen-ziwei.mjs << 'EOF'
import { calculateZiwei } from "./lib/ziwei.ts";
import { writeFileSync } from "fs";

const ziwei = await calculateZiwei(1990, 5, 15, 10, "male");
writeFileSync("/tmp/ziwei-payload.json", JSON.stringify({ ziwei, name: "測試" }));
console.log("wrote /tmp/ziwei-payload.json");
EOF
npx tsx /tmp/gen-ziwei.mjs
```

Expected: `wrote /tmp/ziwei-payload.json` with no errors. Then, for each `batch` in `1, 2, 3`:

```bash
python3 -c "
import json
p = json.load(open('/tmp/ziwei-payload.json'))
p['batch'] = 1
print(json.dumps(p))
" > /tmp/batch-payload.json

curl -s -X POST http://localhost:3000/api/reading/monthly \
  -H "Content-Type: application/json" \
  -d @/tmp/batch-payload.json \
  | python3 -m json.tool
```

(Change `p['batch'] = 1` to `2` and then `3` for the other two calls — re-run both the `python3` payload-build command and the `curl` command each time.)

When done, clean up the scratch files:

```bash
rm -f /tmp/gen-ziwei.mjs /tmp/ziwei-payload.json /tmp/batch-payload.json
```

Expected for each batch: HTTP 200, `{"months": [...]}` with exactly 4 entries. For each entry: `year`/`month` match one of that batch's 4 real flow months (batch 1 = the 4 nearest months starting this month, batch 2 = the next 4, batch 3 = the last 4) — confirm this by cross-referencing against the `year`/`month` values a manual `getFlowMonths` call would produce for that index range. `headline`/`good`/`caution`/`advice` are all non-empty, non-placeholder strings (i.e. the AI call succeeded and every month matched by key — if any entry shows the `FALLBACK_*` placeholder text, that specific month's AI JSON entry failed to key-match, which is worth investigating but does not fail the whole batch, per the global constraint).

- [ ] **Step 4: Commit**

```bash
git add app/api/reading/monthly/route.ts
git commit -m "feat: switch paid 逐月運勢 route from SSE prose to JSON-mode structured fields"
```

---

### Task 3: `components/Dots.tsx` (extracted) + `components/MonthCard.tsx`

**Files:**
- Create: `components/Dots.tsx`
- Modify: `components/MonthlyResultView.tsx:14-28` (delete the local `Dots` function, replace with an import — the rest of the file is untouched by this task; Task 4 handles the batch-rendering changes)
- Create: `components/MonthCard.tsx`

**Interfaces:**
- Consumes: `MonthScore` from `@/app/api/reading/monthly/preview/route` (existing, unchanged — `{year, month, ganzhi, overall, career, romance, theme}`); `MonthlyDetail` from `@/app/api/reading/monthly/route` (Task 2 — `{year, month, headline, good, caution, advice}`); `monthlyLuck` from `@/lib/monthlyLuck` (Task 1).
- Produces: default-exported `Dots` component (`{n: number, type: "overall"|"career"|"romance"}`) — used by both `MonthlyResultView.tsx`'s existing free-preview grid and `MonthCard.tsx`. Default-exported `MonthCard` component (`{score: MonthScore, detail: MonthlyDetail, isCurrentMonth: boolean}`) — consumed by Task 4's `MonthlyResultView.tsx`.

`MonthlyResultView.tsx`'s free-preview grid (lines 129-166 as currently written) already uses `Dots` — extracting it to a shared file and updating that one import is the only change this task makes to that file; the grid's own rendering logic is untouched.

- [ ] **Step 1: Extract `components/Dots.tsx`**

```tsx
"use client";

export type DotsType = "overall" | "career" | "romance";

const DOTS_COLORS: Record<DotsType, [string, string]> = {
  overall: ["bg-vermillion", "bg-vermillion/12"],
  career:  ["bg-amber-500",  "bg-amber-100"],
  romance: ["bg-rose-400",   "bg-rose-100"],
};

export default function Dots({ n, type }: { n: number; type: DotsType }) {
  const [filled, empty] = DOTS_COLORS[type];
  return (
    <span className="flex gap-px items-center justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < n ? filled : empty}`} />
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Update `components/MonthlyResultView.tsx` to use the extracted `Dots`**

Delete this block (currently lines 14-28):

```tsx
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
```

Add this import alongside the file's existing imports (near the top, e.g. right after the `Md` import):

```tsx
import Dots from "./Dots";
```

- [ ] **Step 3: Write `components/MonthCard.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import Dots from "./Dots";
import { monthlyLuck } from "@/lib/monthlyLuck";
import type { MonthScore } from "@/app/api/reading/monthly/preview/route";
import type { MonthlyDetail } from "@/app/api/reading/monthly/route";

interface MonthCardProps {
  score: MonthScore;
  detail: MonthlyDetail;
  isCurrentMonth: boolean;
}

export default function MonthCard({ score, detail, isCurrentMonth }: MonthCardProps) {
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const luck = monthlyLuck(score.ganzhi);
  const headline = detail.headline || score.theme;

  async function handleDownload() {
    if (!captureRef.current || capturing) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = captureRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#faf7f2",
        logging: false,
        width: el.offsetWidth,
        height: el.scrollHeight,
        windowHeight: el.scrollHeight,
        scrollY: 0,
        scrollX: 0,
      });
      const link = document.createElement("a");
      link.download = `命裡-逐月-${score.year}${score.month}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setCapturing(false);
    }
  }

  const CardBody = ({ forCapture = false }: { forCapture?: boolean }) => (
    <div
      ref={forCapture ? captureRef : undefined}
      className={`rounded-xl border p-4 bg-paper ${isCurrentMonth ? "border-vermillion/50 ring-1 ring-vermillion/20" : "border-border-warm"}`}
      style={forCapture ? { width: 360 } : undefined}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-sm font-bold tabular-nums ${isCurrentMonth ? "text-vermillion" : "text-ink"}`}>
          {score.year}年{score.month}月 {score.ganzhi}
        </span>
        {isCurrentMonth && (
          <span className="text-[9px] px-1.5 py-px bg-vermillion text-white font-bold rounded-sm leading-none">本月</span>
        )}
      </div>
      <p className="text-sm text-ink-2 font-medium mb-3">{headline}</p>

      <div className="flex items-center gap-4 mb-3 text-[11px] text-ink-4">
        <span className="flex items-center gap-1">綜合<Dots n={score.overall} type="overall" /></span>
        <span className="flex items-center gap-1">事業<Dots n={score.career} type="career" /></span>
        <span className="flex items-center gap-1">感情<Dots n={score.romance} type="romance" /></span>
      </div>

      <div className="space-y-1 mb-3 text-xs">
        <p className="text-emerald-700"><span className="font-semibold">✓ 宜：</span>{detail.good}</p>
        <p className="text-amber-700"><span className="font-semibold">⚠ 忌：</span>{detail.caution}</p>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-ink-3">
        <span>幸運色：{luck.color}</span>
        <span>方位：{luck.direction}</span>
      </div>

      <p className="text-xs text-ink-2 leading-relaxed border-t border-border-light pt-2.5">
        <span className="font-semibold text-ink">建議：</span>{detail.advice}
      </p>
    </div>
  );

  return (
    <div className="relative">
      <CardBody />
      <button
        onClick={handleDownload}
        disabled={capturing}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border-warm bg-paper-2 hover:bg-paper text-[11px] text-ink-3 hover:text-ink transition-all disabled:opacity-60"
      >
        {capturing ? (
          <>
            <div className="w-3 h-3 border-2 border-ink-3/30 border-t-ink-3 rounded-full animate-spin" />
            正在生成圖片…
          </>
        ) : (
          <>↓ 下載本月圖卡</>
        )}
      </button>
      {/* Hidden capture target — fixed off-screen, matches ExportReport.tsx's
          established pattern for html2canvas exports in this codebase. */}
      <div style={{ position: "fixed", top: 0, left: "-9999px", zIndex: -1, pointerEvents: "none" }}>
        <CardBody forCapture />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: no new errors (dev server stopped first). Note: this may report an error if `MonthlyDetail` isn't yet exported the way Task 2 left it — Task 2 must be complete before this step can pass cleanly; if executing tasks out of order, note the expected failure and move on.

- [ ] **Step 5: Visual verification via a throwaway test route**

Since `MonthCard` isn't mounted anywhere yet (that's Task 4), create a temporary scratch page to render it standing alone, e.g. `app/scratch-monthcard/page.tsx`:

```tsx
"use client";
import MonthCard from "@/components/MonthCard";

const mockScore = { year: 2026, month: 8, ganzhi: "丙申", overall: 4, career: 3, romance: 2, theme: "測試主題" };
const mockDetail = { year: 2026, month: 8, headline: "官祿宮迎太陽化權，機會浮現", good: "洽談合作、主動溝通", caution: "文件契約需多確認", advice: "把握這段時間主動推進工作上的重要計畫，**太陽**化權有利掌握主導權，但協議細節需多方確認，避免因疏忽產生誤會。" };

export default function ScratchPage() {
  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <MonthCard score={mockScore} detail={mockDetail} isCurrentMonth={true} />
      <MonthCard score={{ ...mockScore, month: 9 }} detail={{ ...mockDetail, month: 9, headline: "" }} isCurrentMonth={false} />
    </div>
  );
}
```

Start `npm run dev`, navigate to `http://localhost:3000/scratch-monthcard`. Confirm: both cards render with correct layout (heading, headline, 3 ranking rows with dots, 宜/忌, 幸運色/方位, 建議 with the bolded 太陽 rendering correctly — note this card renders plain text via JSX, not markdown, so `**太陽**` will show literally as double-asterisks; if that looks wrong, this confirms `advice` text should NOT contain markdown bold syntax going forward — flag this to the controller rather than fixing the prompt yourself, since Task 2's SYSTEM prompt is out of this task's scope). Confirm the second card (month 9, empty `headline`) falls back to displaying `"測試主題"` (the mock `score.theme`) instead of blank. Click "↓ 下載本月圖卡" on the first card and confirm a PNG downloads.

**Delete the scratch page before committing:**

```bash
rm -rf app/scratch-monthcard
```

- [ ] **Step 6: Commit**

```bash
git add components/Dots.tsx components/MonthCard.tsx components/MonthlyResultView.tsx
git commit -m "feat: add MonthCard component + extract shared Dots component"
```

---

### Task 4: Wire `MonthCard` into `components/MonthlyResultView.tsx`

**Files:**
- Modify: `components/MonthlyResultView.tsx` (the imports block, and the entire `逐月詳細解讀` section — everything from the `useSSEStream` batch declarations through the closing of that section's JSX; the free-preview grid section above it is untouched)

**Interfaces:**
- Consumes: `MonthCard` from `./MonthCard` (Task 3); `MonthlyBatchResult` from `@/app/api/reading/monthly/route` (Task 2).
- Produces: nothing new — this is the final integration point.

- [ ] **Step 1: Update the imports block**

Change:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import ZiweiChart from "./ZiweiChart";
import type { MonthlyCharts } from "./MonthlyFortuneFlow";
import { useSSEStream, type StreamResult } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";
import type { MonthScore, MonthlyPreviewResult } from "@/app/api/reading/monthly/preview/route";
```

to:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Dots from "./Dots";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import ZiweiChart from "./ZiweiChart";
import MonthCard from "./MonthCard";
import type { MonthlyCharts } from "./MonthlyFortuneFlow";
import { usePaywall } from "@/lib/usePaywall";
import type { MonthScore, MonthlyPreviewResult } from "@/app/api/reading/monthly/preview/route";
import type { MonthlyDetail, MonthlyBatchResult } from "@/app/api/reading/monthly/route";
import type { ZiweiResult } from "@/lib/ziwei";
```

(`Md` is dropped — nothing in this file renders raw markdown anymore once this task is done. `useSSEStream`/`StreamResult` are dropped — the paid batches are now plain `fetch()` calls, not SSE streams.)

- [ ] **Step 2: Add the batch-fetching hook, right after the `Dots` import's former location — specifically, insert this new function between the existing `LoadingSkeleton` function and the `MONTHLY_INCLUDED` constant**

```tsx
interface BatchState {
  data: MonthlyDetail[] | null;
  loading: boolean;
  error: boolean;
}

/** Fetches one paid batch (4 months of structured fields) from
 *  /api/reading/monthly. Mirrors this file's existing fetchPreview
 *  stale-response-guard pattern (a request-id ref, not just a boolean),
 *  so a retry firing after this component has moved on doesn't clobber
 *  newer state. */
function useMonthlyBatch(ziwei: ZiweiResult, name: string | undefined, batch: 1 | 2 | 3, enabled: boolean) {
  const [state, setState] = useState<BatchState>({ data: null, loading: false, error: false });
  const requestRef = useRef(0);

  const fetchBatch = useCallback(() => {
    const requestId = ++requestRef.current;
    setState({ data: null, loading: true, error: false });
    fetch("/api/reading/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ziwei, name, batch }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MonthlyBatchResult) => { if (requestRef.current === requestId) setState({ data: d.months, loading: false, error: false }); })
      .catch(() => { if (requestRef.current === requestId) setState({ data: null, loading: false, error: true }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  useEffect(() => {
    if (!enabled || state.data || state.loading) return;
    fetchBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchBatch]);

  return { ...state, retry: fetchBatch };
}
```

- [ ] **Step 3: Replace the batch declarations and effect**

Change (currently around lines 93-106):

```tsx
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
```

to:

```tsx
  const batchEnabled = !paywall.loading && !gated;
  const batch1 = useMonthlyBatch(ziwei, name, 1, batchEnabled);
  const batch2 = useMonthlyBatch(ziwei, name, 2, batchEnabled);
  const batch3 = useMonthlyBatch(ziwei, name, 3, batchEnabled);
  const batches = [batch1, batch2, batch3];
```

- [ ] **Step 4: Replace the 逐月詳細解讀 section's paid-content rendering**

Change (currently around lines 174-195, the `逐月詳細解讀` block's paid-content branch):

```tsx
        {gated ? (
          <PaywallLock chartId={chartId} sectionLabel="逐月詳細解讀" included={MONTHLY_INCLUDED} proofStrip={MONTHLY_PROOF_STRIP} />
        ) : (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5 space-y-4">
            {batches.map((b, i) => (
              <div key={i}>
                {(b.status === "idle" || b.status === "streaming") && <LoadingSkeleton />}
                {b.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{b.errorMsg}</p>
                    <button onClick={() => b.start({ ...body, batch: i + 1 })} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
                {b.status === "done" && (
                  <div className="animate-fade-in prose max-w-none text-sm [&_h3]:text-vermillion [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold">
                    <Md>{b.text}</Md>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
```

to:

```tsx
        {gated ? (
          <PaywallLock chartId={chartId} sectionLabel="逐月詳細解讀" included={MONTHLY_INCLUDED} proofStrip={MONTHLY_PROOF_STRIP} />
        ) : (
          <div className="space-y-4">
            {batches.map((b, i) => {
              // Each batch covers a fixed 4-month slice of the same 12-month
              // window the free preview already computed — pairing by index
              // is safe because both this route and the preview route derive
              // their ordering from the same getFlowMonths() call, and the
              // paid route's own (year,month) matching (Task 2) guarantees
              // its 4 returned entries are in that same flow order.
              const scoreSlice = preview?.months.slice(i * 4, i * 4 + 4) ?? [];
              return (
                <div key={i} className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                  {(b.loading || (!b.data && !b.error)) && <LoadingSkeleton />}
                  {b.error && (
                    <div className="space-y-2">
                      <p className="text-sm text-vermillion">推算失敗，請重新整理重試。</p>
                      <button onClick={b.retry} className="text-xs text-gold underline">重試</button>
                    </div>
                  )}
                  {b.data && scoreSlice.length === b.data.length && (
                    <div className="space-y-4 animate-fade-in">
                      {b.data.map((detail, j) => (
                        <MonthCard
                          key={`${detail.year}-${detail.month}`}
                          score={scoreSlice[j]}
                          detail={detail}
                          isCurrentMonth={i === 0 && j === 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
```

- [ ] **Step 5: Verify with tsc**

```bash
npx tsc --noEmit
```

Expected: no errors (dev server stopped first). This confirms `MonthlyDetail`/`MonthlyBatchResult` imports from Task 2 and `MonthCard`'s prop shape from Task 3 all line up.

- [ ] **Step 6: Live browser verification**

Start `npm run dev`, navigate to `http://localhost:3000/yueyun`:
1. Submit the form with a real birthday/hour/gender.
2. Confirm the free 12-month score grid at the top renders exactly as before (untouched by this task).
3. Confirm the free teaser paragraph still renders below the grid.
4. Confirm the `逐月詳細解讀` section now shows 3 sub-cards (one per batch), each initially showing a loading skeleton, then resolving into 4 `MonthCard`s each — 12 total.
5. Confirm the very first card (this month) shows the vermillion highlight + "本月" badge; confirm no other card does.
6. Confirm every card shows: heading (year/month/ganzhi), a headline, 3 ranking rows with dots, 宜/忌, 幸運色/方位, and 建議 — no raw markdown syntax (no stray `#`, `**`) visible anywhere.
7. Click "↓ 下載本月圖卡" on at least 2 different cards (including the highlighted current month) and confirm each produces a distinct downloaded PNG.
8. Check the browser console for errors (`read_console_messages` with `pattern: "error|Error"`, `onlyErrors: true`).

- [ ] **Step 7: Commit**

```bash
git add components/MonthlyResultView.tsx
git commit -m "feat: wire MonthCard into MonthlyResultView, replacing raw-prose rendering"
```
