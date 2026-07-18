# BaziDecades Preload + 問命 Tab + FlowYearDetail Simplification Design

**Date:** 2026-07-17
**Status:** Approved

## Overview

Four changes to complete the paid reading experience after unlock:

1. **dualschool fix** — add to post-unlock preload (one-line)
2. **BaziDecades 8-stream preload** — replace single on-demand stream with 8 fixed hooks; all auto-start on unlock
3. **FlowYearDetail simplification** — remove per-year SSE drill-down; keep score grid as static display (eliminates race condition + unblocks export)
4. **問命 tab** — move ChatInterface from ReadingSession into WizardFlow as a new paid tab with `maxQuestions=10`

PaywallLock already updated (問命追問 added to DEFAULT_INCLUDED) — no spec needed for that.

---

## 1. dualschool Fix

**File:** `components/WizardFlow.tsx` (lines ~457–463, the post-unlock effect)

Currently the post-unlock effect starts `decades`, `cautions`, `baziDeep`, `baziSchools` but omits `dualschool`. Add one line inside the existing guard:

```tsx
if (dualschool.status === "idle") dualschool.start({ ziwei });
```

This ensures 眾說 tab is ready immediately after unlock alongside the other paid streams.

---

## 2. BaziDecades 8-Stream Preload

### Problem
Single `useSSEStream` → only one decade loads at a time, no localStorage cache, impossible to preload all 8 decades at unlock.

### Solution
8 fixed `useSSEStream` hooks — one per decade slot (React rules forbid hooks in loops; 8 is the max decade count iztro ever returns). Each has a per-decade cache key. When `preload=true`, all 8 start automatically on mount.

### New props
```tsx
interface Props {
  bazi: BaziResult;
  name?: string;
  gender: "male" | "female";
  sessionId?: string;   // for localStorage cache keys
  preload?: boolean;    // if true, all 8 streams start on mount
}
```

### Cache key helper (inside BaziDecades component)
```tsx
const ck = (idx: number) => sessionId ? `${sessionId}_bd_${idx}` : undefined;
```

### 8 fixed hooks (replace the current single `stream`)
```tsx
const s0 = useSSEStream("/api/reading/bazi-decade", ck(0));
const s1 = useSSEStream("/api/reading/bazi-decade", ck(1));
const s2 = useSSEStream("/api/reading/bazi-decade", ck(2));
const s3 = useSSEStream("/api/reading/bazi-decade", ck(3));
const s4 = useSSEStream("/api/reading/bazi-decade", ck(4));
const s5 = useSSEStream("/api/reading/bazi-decade", ck(5));
const s6 = useSSEStream("/api/reading/bazi-decade", ck(6));
const s7 = useSSEStream("/api/reading/bazi-decade", ck(7));
const streams = [s0, s1, s2, s3, s4, s5, s6, s7];
```

### Preload effect (new, runs once when `preload` first becomes true)
```tsx
useEffect(() => {
  if (!preload) return;
  decades.forEach((decade, i) => {
    if (streams[i] && streams[i].status === "idle") {
      streams[i].start({ bazi, decade, name, gender });
    }
  });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [preload]);
```

### Auto-load current decade on mount (replaces current mount effect)
```tsx
useEffect(() => {
  const decade = decades[autoLoadIdx];
  if (!decade) return;
  setSelectedIdx(autoLoadIdx);
  if (streams[autoLoadIdx] && streams[autoLoadIdx].status === "idle") {
    streams[autoLoadIdx].start({ bazi, decade, name, gender });
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Note: if `preload=true`, both effects fire on mount. The auto-load for `autoLoadIdx` is a no-op if preload already started it (the `status === "idle"` guard prevents double-start).

### Click handler (replaces current handleSelect)
```tsx
function handleSelect(idx: number) {
  const decade = decades[idx];
  if (!decade) return;
  if (selectedIdx === idx) { setSelectedIdx(null); return; }
  setSelectedIdx(idx);
  if (streams[idx] && streams[idx].status === "idle") {
    streams[idx].start({ bazi, decade, name, gender });
  }
}
```

### Display (replace `stream.status / stream.text` with `streams[selectedIdx]`)
```tsx
{selectedIdx !== null && (() => {
  const active = streams[selectedIdx];
  return (
    <div className="px-3 sm:px-4 py-3 bg-paper/60">
      {/* header line — unchanged */}
      {active?.status === "streaming" && !active.text && (
        <p className="text-[11px] text-ink-4 animate-pulse">大運推演中…</p>
      )}
      {active?.status === "error" && (
        <p className="text-[11px] text-vermillion">推演失敗，請重試。</p>
      )}
      {(active?.text || active?.status === "done") && (
        <Md className={MD_PROSE}>{active.text}</Md>
      )}
    </div>
  );
})()}
```

### WizardFlow call-site change
```tsx
// Before:
<BaziDecades bazi={bazi} name={name} gender={gender as "male" | "female"} />

// After:
<BaziDecades bazi={bazi} name={name} gender={gender as "male" | "female"} sessionId={sessionId} preload={!gated} />
```

---

## 3. FlowYearDetail Simplification

Remove all SSE-related code. The component becomes a pure static score grid.

### What's removed
- `useSSEStream` import and `drill` hook
- `selectedYear` state and `detailCache` state
- `selectYear` function
- Year-click stream cache effect (the `drill.status === "done"` effect)
- Year rows: `<button>` → `<div>` (non-interactive), no `onClick`
- `isSelected` variable
- Inline drill-down expansion JSX (the `{isSelected && ...}` block)

### What's kept
- `useState<ScoresData>` + `loading` + `fetchError`
- `useEffect` → `fetch("/api/reading/flowyears-scores", ...)`
- Year rows: year number, ganzhi, age, theme, badges, 3 `<Dots>` columns
- `computeHighlights` helper, `Dots` component, column headers, legend

### Year rows become static divs
```tsx
<div
  key={s.year}
  className={`grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-3 py-2 ${
    isCurrentYear ? "bg-rose-50/60" : ""
  }`}
>
  {/* same inner content — year label, ganzhi, age, badges, theme, Dots */}
</div>
```

No `button`, no `onClick`, no `isSelected`, no drill-down block.

---

## 4. 問命 Tab

### Tab type and TABS array

In `components/WizardFlow.tsx`:

```tsx
// Line 18 — extend Tab union:
type Tab = "overview" | "palaces" | "decades" | "bazi" | "dualschool" | "perspectives" | "cautions" | "wenming";

// TABS array — add after cautions entry:
{ id: "wenming", label: "問命", char: "問" },
```

`wenming` is NOT added to `FREE_TABS` — it is automatically gated.

### TAB_INTRO entry
```tsx
wenming: "向 AI 深度追問命盤細節——有疑必答，追根究柢。",
```

### backgroundReadings map (inside WizardFlow function body, after all useSSEStream hooks)
```tsx
const backgroundReadings: Record<string, string> = {};
if (synthesis.text) backgroundReadings.synthesis = synthesis.text;
if (overview.text)  backgroundReadings.overview  = overview.text;
if (bazi_.text)     backgroundReadings.bazi       = bazi_.text;
if (baziDeep.text)  backgroundReadings.baziDeep   = baziDeep.text;
if (palaces.text)   backgroundReadings.palaces    = palaces.text;
if (decades.text)   backgroundReadings.decades    = decades.text;
if (cautions.text)  backgroundReadings.cautions   = cautions.text;
```

### New tab case in the switch statement
```tsx
case "wenming": {
  const readingCount = Object.keys(backgroundReadings).length;
  const initCtx = readingCount > 0
    ? `你好！我已完整分析你的命盤（${readingCount} 個維度），包括總覽、宮位、大運等，有什麼想深入瞭解的？`
    : `你好，我已瞭解你的命盤（${ziwei.summary}）。可就性格、事業、感情、流年等追問，我會據盤而論、利弊並陳。`;
  return (
    <div className="space-y-3">
      <ChatInterface
        ziwei={ziwei}
        initialContext={initCtx}
        backgroundReadings={backgroundReadings}
        chartId={sessionId ?? ""}
        maxQuestions={10}
      />
    </div>
  );
}
```

### WizardFlow: remove onReadingComplete

Remove `onReadingComplete` from `WizardFlowProps` interface and from the destructured props and its effect. The effect (lines ~422–434) currently calls `onReadingComplete?.(key, stream.text)` for 5 streams — delete those calls. The effect can be removed entirely if `onReadingComplete` was its only purpose; otherwise keep the `onReadingComplete` prop removal and let the effect body become a no-op (TypeScript will catch dead calls).

Add import:
```tsx
import ChatInterface from "./ChatInterface";
```

### ChatInterface: add maxQuestions prop

In `components/ChatInterface.tsx`:

```tsx
// In the props interface — add:
maxQuestions?: number;

// In destructuring — add:
maxQuestions,

// Replace hardcoded use of MAX_QUESTIONS constant with:
const effectiveMax = maxQuestions ?? MAX_QUESTIONS;
```

Wherever `MAX_QUESTIONS` appears in the component body (the `remaining` initial value, the `<= 0` guard, the display counter), replace with `effectiveMax`. Keep `const MAX_QUESTIONS = 3` as the fallback constant.

### ReadingSession: remove ChatInterface

In `components/ReadingSession.tsx`:

- Remove `import ChatInterface from "./ChatInterface"`
- Remove `completedReadings` state and `handleReadingComplete` callback
- Remove `onReadingComplete={handleReadingComplete}` from the `<WizardFlow>` call
- Remove the entire "Q&A chat" `<div>` block (lines 58–78)
- Remove `initialContext` computation
- Keep: `exportData`, `handleExportReady`, `usePaywall`, `ReadingExport`

---

## Files Changed

| File | Change |
|------|--------|
| `components/WizardFlow.tsx` | dualschool fix + BaziDecades preload props + wenming tab + ChatInterface import + backgroundReadings map + remove onReadingComplete |
| `components/BaziDecades.tsx` | 8 fixed streams + preload + sessionId props |
| `components/FlowYearDetail.tsx` | Remove SSE drill-down, static score grid only |
| `components/ChatInterface.tsx` | Add `maxQuestions` prop |
| `components/ReadingSession.tsx` | Remove ChatInterface + completedReadings + onReadingComplete |

---

## Out of Scope

- BaziDecades texts in email/PDF export (follow-up)
- FlowYearDetail score-to-BaziDecades cross-linking (follow-up)
- `/api/reading/flowyears-scores` route changes (kept as-is)
