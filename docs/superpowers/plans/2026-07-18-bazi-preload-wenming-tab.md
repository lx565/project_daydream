# BaziDecades Preload + 問命 Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preload all 8 八字大運 streams on unlock, move ChatInterface into a new paid 問命 tab with a 10-question limit, simplify FlowYearDetail to a static grid, and fix dualschool missing from the post-unlock preload.

**Architecture:** Five targeted file changes; no new routes, no new npm packages. Tasks 1–3 are independent and can be reviewed in any order. Task 4 (WizardFlow) is the integration layer that consumes the new props from Tasks 1–2. Task 5 (ReadingSession) is the cleanup that removes ChatInterface from the free reading area.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, `useSSEStream` (localStorage-cached SSE hook at `lib/useSSEStream.ts`).

## Global Constraints

- All Chinese text must use correct **繁體字** throughout (e.g. 問命, 追問, 命盤, 解鎖, 總覽)
- `丑` must always be U+4E11 (earthly branch), never U+919C (醜)
- No new npm packages
- No new API routes
- Never auto-commit to git without being asked (but this plan's commit steps are explicit — follow them)
- TypeScript must compile clean (`npx tsc --noEmit` produces no output) after each task
- `npm run build` must succeed after the final task
- Existing Tailwind tokens (`bg-parchment`, `text-vermillion`, `text-jade`, `text-ink`, `text-ink-3`, `text-ink-4`, `text-gold`) — use these, no raw hex except in SVG strokes

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `components/ChatInterface.tsx` | Modify | Add `maxQuestions` prop; use it in `useState` init + limit-reached display |
| `components/BaziDecades.tsx` | Modify | Replace single `useSSEStream` with 8 fixed hooks; add `sessionId` + `preload` props |
| `components/FlowYearDetail.tsx` | Modify | Remove SSE drill-down; convert year rows from `<button>` to `<div>` |
| `components/WizardFlow.tsx` | Modify | Add `wenming` tab + ChatInterface; fix dualschool preload; pass preload props to BaziDecades; add `backgroundReadings` map; remove `onReadingComplete` |
| `components/ReadingSession.tsx` | Modify | Remove ChatInterface import + render + related state |

---

## Task 1: ChatInterface — maxQuestions prop

**Files:**
- Modify: `components/ChatInterface.tsx`

**Interfaces:**
- Produces: `maxQuestions?: number` prop — consumed by Task 4's WizardFlow `wenming` case

**Context:** `ChatInterface` currently has `const MAX_QUESTIONS = 3` (line 43) hardcoded. `remaining` is initialised with it (line 70). The limit-reached message displays it at line 240. We need to let callers override this to 10 for the paid 問命 tab.

- [ ] **Step 1: Add `maxQuestions` to the props interface and destructuring**

Open `components/ChatInterface.tsx`. The props interface (around line 52–59) currently is:
```tsx
{
  ziwei: ZiweiResult;
  partnerZiwei?: ZiweiResult;
  initialContext: string;
  placeholder?: string;
  backgroundReadings?: Record<string, string>;
  chartId?: string;
  name?: string;
}
```

Change to:
```tsx
{
  ziwei: ZiweiResult;
  partnerZiwei?: ZiweiResult;
  initialContext: string;
  placeholder?: string;
  backgroundReadings?: Record<string, string>;
  chartId?: string;
  name?: string;
  maxQuestions?: number;
}
```

In the destructuring line (around line 45–60), add `maxQuestions` to the destructured list.

- [ ] **Step 2: Use `maxQuestions` as the effective limit**

Directly after the destructuring (before the first `useState`), add:
```tsx
const limit = maxQuestions ?? MAX_QUESTIONS;
```

- [ ] **Step 3: Replace `MAX_QUESTIONS` in `useState` init**

Find line 70:
```tsx
const [remaining, setRemaining] = useState(MAX_QUESTIONS);
```
Change to:
```tsx
const [remaining, setRemaining] = useState(limit);
```

- [ ] **Step 4: Replace `MAX_QUESTIONS` in the limit-reached display**

Find line 240 (inside the `remaining <= 0` block):
```tsx
<p className="text-sm font-medium text-ink">{MAX_QUESTIONS} 次免費追問已用完</p>
```
Change to:
```tsx
<p className="text-sm font-medium text-ink">{limit} 次追問已用完</p>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | grep ChatInterface
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/ChatInterface.tsx
git commit -m "feat(chat): add maxQuestions prop, default 3, override to 10 for paid tab"
```

---

## Task 2: BaziDecades — 8-stream preload

**Files:**
- Modify: `components/BaziDecades.tsx`

**Interfaces:**
- Produces: `sessionId?: string` prop and `preload?: boolean` prop — consumed by Task 4's WizardFlow call site

**Context:** Current `BaziDecades` has one `const stream = useSSEStream("/api/reading/bazi-decade")` (no cache key) and starts/restarts it on each click. The mount effect auto-loads the current decade. We replace this with 8 fixed hooks (one per decade slot, React rules forbid hooks in loops) so all can preload on unlock, each cached individually in localStorage.

- [ ] **Step 1: Add new props to the interface**

In `components/BaziDecades.tsx`, the `Props` interface (around line 18–22) currently is:
```tsx
interface Props {
  bazi: BaziResult;
  name?: string;
  gender: "male" | "female";
}
```
Change to:
```tsx
interface Props {
  bazi: BaziResult;
  name?: string;
  gender: "male" | "female";
  sessionId?: string;
  preload?: boolean;
}
```

And update the function signature to destructure the new props:
```tsx
export default function BaziDecades({ bazi, name, gender, sessionId, preload }: Props) {
```

- [ ] **Step 2: Add the cache key helper**

Directly after the function signature opens (before `const { decades, luckStartAge } = bazi;`), add:
```tsx
const ck = (idx: number) => sessionId ? `${sessionId}_bd_${idx}` : undefined;
```

- [ ] **Step 3: Replace the single stream with 8 fixed hooks**

Remove this line:
```tsx
const stream = useSSEStream("/api/reading/bazi-decade");
```

Replace with:
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

- [ ] **Step 4: Add the preload effect**

After the `streams` array, add a new `useEffect`:
```tsx
// Preload all decades at once when `preload` first becomes true (post-unlock)
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

- [ ] **Step 5: Update the mount effect to use per-decade streams**

Find the existing mount `useEffect` (currently calls `stream.start`). Replace it entirely:
```tsx
// Auto-load the current decade on mount
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

- [ ] **Step 6: Update handleSelect to use per-decade streams**

Find the `handleSelect` function. Replace it:
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

- [ ] **Step 7: Update the selected-decade reading display**

Find the `{selectedIdx !== null && (` block (around line 103). Replace the inner content to read from `streams[selectedIdx]` instead of the removed `stream`:

```tsx
{selectedIdx !== null && (() => {
  const active = streams[selectedIdx];
  const d = decades[selectedIdx];
  const isCurrent = selectedIdx === currentDecadeIdx;
  return (
    <div className="px-3 sm:px-4 py-3 bg-paper/60">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-sm font-bold ${stemColor(d.ganZhi)}`}>
          {d.ganZhi}大運
        </span>
        <span className="text-[11px] text-ink-4">
          {d.startAge}–{d.endAge}歲
          · {d.startYear}–{d.endYear}年
        </span>
        {isCurrent && (
          <span className="text-[8px] px-1.5 py-px bg-amber-500 text-white font-bold rounded-sm leading-none">
            當前大運
          </span>
        )}
      </div>

      {active?.status === "streaming" && !active.text && (
        <p className="text-[11px] text-ink-4 animate-pulse">大運推演中…</p>
      )}
      {active?.status === "error" && (
        <p className="text-[11px] text-vermillion">推演失敗，請重試。</p>
      )}
      {(active?.text || active?.status === "done") && (
        <Md className={MD_PROSE}>{active?.text ?? ""}</Md>
      )}
    </div>
  );
})()}
```

Note: the `isCurrent` variable and the header block previously used `selectedIdx` and `decades[selectedIdx]` directly — the rewrite above collapses both into one IIFE for clarity.

- [ ] **Step 8: Verify TypeScript**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | grep BaziDecades
```
Expected: no output.

- [ ] **Step 9: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/BaziDecades.tsx
git commit -m "feat(bazi): 8-stream preload for BaziDecades — per-decade cache + preload prop"
```

---

## Task 3: FlowYearDetail — static score grid

**Files:**
- Modify: `components/FlowYearDetail.tsx`

**Interfaces:**
- Produces: no interface change — props unchanged, `useSSEStream` import removed

**Context:** `FlowYearDetail` has a race condition: one shared `useSSEStream` means clicking year B while year A streams shows A's text under B. The per-year SSE drill-down also can't be preloaded or exported. We keep the year score grid (one JSON fetch to `/api/reading/flowyears-scores`) and remove all SSE code. Year rows become static `<div>` elements.

- [ ] **Step 1: Remove the `useSSEStream` import and hook**

At the top of `components/FlowYearDetail.tsx`, remove the import:
```tsx
import { useSSEStream } from "@/lib/useSSEStream";
```

Inside the component function, remove this line:
```tsx
const drill = useSSEStream("/api/reading/flowyear", undefined, { validate: true });
```

- [ ] **Step 2: Remove selected year state and detail cache**

Remove these two `useState` declarations:
```tsx
const [selectedYear, setSelectedYear] = useState<number | null>(null);
const [detailCache, setDetailCache] = useState<Record<number, string>>({});
```

Remove the `selectYear` function:
```tsx
// Open a year's detail: show cached text instantly, else stream it.
function selectYear(year: number | null) { ... }
```

- [ ] **Step 3: Remove the two drill-related effects**

Remove the auto-expand effect (the one that calls `selectYear(currentYear)`):
```tsx
useEffect(() => {
  if (!data) return;
  if (!data.scores.some(s => s.year === currentYear)) return;
  selectYear(currentYear);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [data]);
```

Remove the cache-on-stream-done effect:
```tsx
useEffect(() => {
  if (drill.status === "done" && selectedYear !== null && drill.text) { ... }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [drill.status, drill.text, selectedYear]);
```

- [ ] **Step 4: Convert year rows from button to div**

Find the `data.scores.map(s => { ... })` block. The outer element is currently a `<button onClick={() => selectYear(...)} className="w-full grid ...">`. 

Replace the entire per-score render with this static version (no `selectedYear`, no `isSelected`, no drill-down expansion block):

```tsx
{data.scores.map(s => {
  const isCurrentYear = s.year === currentYear;
  const rowBadges = highlights[s.year] ?? [];

  return (
    <div
      key={s.year}
      className={`grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-x-3 px-3 py-2 ${
        isCurrentYear ? "bg-rose-50/60" : ""
      }`}
    >
      {/* Year + ganzhi + badges */}
      <div className="min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-xs tabular-nums ${isCurrentYear ? "font-bold text-vermillion" : "font-medium text-ink-2"}`}>
            {s.year} {s.ganzhi}
          </span>
          {isCurrentYear && (
            <span className="text-[8px] px-1 py-px bg-vermillion text-white font-bold rounded-sm leading-none whitespace-nowrap">今年</span>
          )}
          {!isCurrentYear && (
            <span className="text-[9px] text-ink-4">{s.age}歲</span>
          )}
          {rowBadges.map(b => (
            <span key={b} className="text-[8px] px-1 py-px bg-purple-100 text-purple-700 font-bold rounded-sm leading-none">{b}</span>
          ))}
        </div>
        <p className={`text-[11px] mt-0.5 truncate ${isCurrentYear ? "text-ink font-medium" : "text-ink-3"}`}>
          {s.theme}
        </p>
      </div>

      <Dots n={s.overall} type="overall" />
      <Dots n={s.career}  type="career"  />
      <Dots n={s.romance} type="romance" />
    </div>
  );
})}
```

Note: the wrapping `<div key={s.year}>` from the original (which contained both the button and the drill-down div) is now just the single row `<div>` above — no nested structure needed.

- [ ] **Step 5: Verify TypeScript**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | grep FlowYearDetail
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/FlowYearDetail.tsx
git commit -m "refactor(flowyear): remove per-year SSE drill-down, keep static score grid"
```

---

## Task 4: WizardFlow — integration

**Files:**
- Modify: `components/WizardFlow.tsx`

**Interfaces:**
- Consumes from Task 1: `ChatInterface` with `maxQuestions?: number` prop
- Consumes from Task 2: `BaziDecades` with `sessionId?: string` and `preload?: boolean` props
- Produces: no new exports; removes `onReadingComplete` from `WizardFlowProps` (consumed by Task 5's ReadingSession cleanup)

**Context:** This task makes five changes to WizardFlow:
1. Fix dualschool missing from the post-unlock effect (one line)
2. Add `backgroundReadings` map derived from stream texts (for ChatInterface)
3. Add `"wenming"` tab with `ChatInterface` inside it
4. Pass `sessionId` + `preload={!gated}` to `BaziDecades`
5. Remove `onReadingComplete` from props + its effect

- [ ] **Step 1: Add `ChatInterface` import**

At line 9 (after the `FlowYearDetail` import), add:
```tsx
import ChatInterface from "./ChatInterface";
```

- [ ] **Step 2: Extend the `Tab` type**

Line 18 currently:
```tsx
type Tab = "overview" | "palaces" | "decades" | "bazi" | "dualschool" | "perspectives" | "cautions";
```
Change to:
```tsx
type Tab = "overview" | "palaces" | "decades" | "bazi" | "dualschool" | "perspectives" | "cautions" | "wenming";
```

- [ ] **Step 3: Add `wenming` to the TABS array**

Lines 23–30 define `TABS`. After the `cautions` entry, add:
```tsx
{ id: "wenming",      label: "問命", char: "問" },
```

Do NOT add it to `FREE_TABS` — it is automatically gated.

- [ ] **Step 4: Add `wenming` to TAB_INTRO**

Lines 38–45 define `TAB_INTRO`. Add one entry after `cautions`:
```tsx
wenming: "向 AI 深度追問命盤細節——有疑必答，追根究柢。",
```

- [ ] **Step 5: Remove `onReadingComplete` from the function destructuring only**

Line 389:
```tsx
export default function WizardFlow({ ziwei, bazi, gender, birthYear, sessionId, name, dateLabel, timeLabel, onReadingComplete, onExportReady }: WizardFlowProps) {
```
Change to:
```tsx
export default function WizardFlow({ ziwei, bazi, gender, birthYear, sessionId, name, dateLabel, timeLabel, onExportReady }: WizardFlowProps) {
```

Do NOT remove `onReadingComplete` from `WizardFlowProps` yet — `ReadingSession` still passes it until Task 5. Removing it from the interface now would produce a TypeScript error in ReadingSession before Task 5 cleans it up. The interface removal happens in Task 5.

- [ ] **Step 7: Remove the `onReadingComplete` effect**

Lines 419–434 contain an effect that calls `onReadingComplete?.(key, stream.text)`. Delete the entire effect including the `notified` ref:
```tsx
// Notify parent when each core reading completes so the chat can use it as background context
const notified = useRef<Set<string>>(new Set());
useEffect(() => {
  // The chat expects the "overview" key as background context — feed it from the
  // FREE synthesis (always runs), so chat works even while the paid 紫微深解 is locked.
  const pairs: [string, typeof overview][] = [
    ["overview", synthesis], ["palaces", palaces], ["decades", decades],
    ["bazi", bazi_], ["cautions", cautions],
  ];
  for (const [key, stream] of pairs) {
    if (stream.status === "done" && stream.text && !notified.current.has(key)) {
      notified.current.add(key);
      onReadingComplete?.(key, stream.text);
      if (key === "overview") gtagEvent("reading_completed");
    }
  }
}, [synthesis.status, palaces.status, decades.status, bazi_.status, cautions.status, onReadingComplete, synthesis, palaces, decades, bazi_, cautions]);
```

Keep the `gtagEvent("reading_completed")` call — move it into the free mount effect below where synthesis starts, or fire it in the existing `allSettled` effect. Actually: the simplest fix is to call `gtagEvent("reading_completed")` in the `allSettled` effect that already exists (lines 474–494). Add it there:
```tsx
useEffect(() => {
  if (allSettled && !gated && onExportReady && !exportFired.current) {
    exportFired.current = true;
    gtagEvent("reading_completed");  // ← add this line
    onExportReady({ ... });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [allSettled, gated]);
```

- [ ] **Step 8: Fix dualschool missing from post-unlock effect**

Lines 456–463 contain the paid post-unlock effect:
```tsx
useEffect(() => {
  if (paywall.loading || gated) return;
  if (decades.status === "idle")      decades.start(ziweiWithBirth);
  if (cautions.status === "idle")     cautions.start(ziweiWithBirth);
  if (baziDeep.status === "idle")     baziDeep.start(baziPayload);
  if (baziSchools.status === "idle")  baziSchools.start({ bazi, gender });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [paywall.loading, gated]);
```

Add one line after `baziSchools`:
```tsx
if (dualschool.status === "idle")   dualschool.start({ ziwei });
```

- [ ] **Step 9: Add the `backgroundReadings` map**

After all `useSSEStream` hook declarations (after line 416, before the payload constants on line 436), add:
```tsx
// Background context for 問命 ChatInterface — built live from stream texts
const backgroundReadings: Record<string, string> = {};
if (synthesis.text) backgroundReadings.synthesis = synthesis.text;
if (overview.text)  backgroundReadings.overview  = overview.text;
if (bazi_.text)     backgroundReadings.bazi       = bazi_.text;
if (baziDeep.text)  backgroundReadings.baziDeep   = baziDeep.text;
if (palaces.text)   backgroundReadings.palaces    = palaces.text;
if (decades.text)   backgroundReadings.decades    = decades.text;
if (cautions.text)  backgroundReadings.cautions   = cautions.text;
```

- [ ] **Step 10: Update the BaziDecades call site**

Find line 630:
```tsx
<BaziDecades bazi={bazi} name={name} gender={gender as "male" | "female"} />
```
Change to:
```tsx
<BaziDecades bazi={bazi} name={name} gender={gender as "male" | "female"} sessionId={sessionId} preload={!gated} />
```

- [ ] **Step 11: Add the `wenming` case to the renderContent switch**

The switch statement currently ends with `case "cautions":` (around line 673). Add a new case after `cautions` and before the closing `default` or the end of the switch:

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

- [ ] **Step 12: Verify TypeScript — no errors across all changed files**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (zero errors).

- [ ] **Step 13: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/WizardFlow.tsx
git commit -m "feat(wizard): add 問命 tab (paid, 10q), fix dualschool preload, BaziDecades preload props"
```

---

## Task 5: ReadingSession — remove free ChatInterface

**Files:**
- Modify: `components/ReadingSession.tsx`

**Interfaces:**
- Consumes from Task 4: `WizardFlow` no longer has `onReadingComplete` prop (must remove from call site)

**Context:** With ChatInterface now inside WizardFlow's paid 問命 tab, the free chat section in ReadingSession is removed entirely. `completedReadings` and `onReadingComplete` are no longer needed.

- [ ] **Step 1: Remove the `ChatInterface` import**

In `components/ReadingSession.tsx` line 5:
```tsx
import ChatInterface from "./ChatInterface";
```
Delete this line.

- [ ] **Step 2: Remove `completedReadings` state and `handleReadingComplete`**

Remove these two declarations (around lines 24 and 30–32):
```tsx
const [completedReadings, setCompletedReadings] = useState<Record<string, string>>({});
```
```tsx
const handleReadingComplete = useCallback((key: string, text: string) => {
  setCompletedReadings((prev) => ({ ...prev, [key]: text }));
}, []);
```

- [ ] **Step 3: Remove `readingCount` and `initialContext`**

Remove these lines (around lines 38–41):
```tsx
const readingCount = Object.keys(completedReadings).length;
const initialContext = readingCount > 0
  ? `你好！我已完整分析你的命盤（${readingCount} 個維度），包括總覽、宮位、大運等，有什麼想深入瞭解的？`
  : `你好，我已瞭解你的命盤（${props.ziwei.summary}）。可就性格、事業、感情、流年等追問，我會據盤而論、利弊並陳。`;
```

- [ ] **Step 4: Remove `onReadingComplete` from the WizardFlow call**

Find the `<WizardFlow ... />` JSX (around lines 45–56). Remove the prop:
```tsx
onReadingComplete={handleReadingComplete}
```

- [ ] **Step 5: Remove the "Q&A chat" div block**

Remove the entire section from `{/* Q&A chat */}` through its closing `</div>` (approximately lines 58–78):
```tsx
{/* Q&A chat */}
<div>
  <div className="mb-2 px-1">
    <p className="text-xs text-ink-4 tracking-widest uppercase flex items-center gap-2">
      <span className="w-px h-3 bg-vermillion inline-block" />
      <span className="text-vermillion">問命 · 追問解讀</span>
    </p>
    <p className="text-[10px] text-ink-4/70 mt-0.5 pl-3.5">
      結合 Gemini · Claude · DeepSeek 三模型審校的逾百部典籍知識庫，多輪驗證，力求準確
    </p>
  </div>
  <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
    <ChatInterface
      ziwei={props.ziwei}
      initialContext={initialContext}
      backgroundReadings={completedReadings}
      chartId={props.sessionId}
      name={props.name}
    />
  </div>
</div>
```

- [ ] **Step 6: Remove `onReadingComplete` from `WizardFlowProps` interface**

Open `components/WizardFlow.tsx`. Around line 369, find and delete:
```tsx
onReadingComplete?: (key: string, text: string) => void;
```
Now that ReadingSession no longer passes this prop, removing it from the interface is safe.

- [ ] **Step 7: Remove unused `useCallback` import in ReadingSession if no longer needed**

Check if `useCallback` is still used anywhere in `components/ReadingSession.tsx` after the above removal. If not, remove it from the React import line. It was used only in `handleReadingComplete`.

- [ ] **Step 8: Verify TypeScript**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 9: Full build check**

```bash
cd ~/Desktop/Projects/fortune-app && npm run build 2>&1 | tail -20
```
Expected: `✓ Generating static pages` with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/ReadingSession.tsx components/WizardFlow.tsx
git commit -m "refactor(session): remove free chat — 問命 now lives in paid WizardFlow tab"
```
