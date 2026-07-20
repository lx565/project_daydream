# Loading Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two theatrical loading overlays — one after birth form submit, one after payment — to make AI work feel real and trustworthy.

**Architecture:** Two new self-contained overlay components (`ChartLoadingOverlay`, `UnlockLoadingOverlay`) mounted inside `WizardFlow.tsx`, which already owns both the SSE stream state and paywall state they depend on. No new routes, no new hooks, no changes to `ReadingSession`.

**Tech Stack:** React, Tailwind CSS, inline SVG animation (CSS keyframes via `<style>` tag), Next.js `"use client"` components.

## Global Constraints

- All Chinese text must use correct 繁體字 throughout
- `丑` must always be U+4E11 (earthly branch), never U+919C (醜)
- Existing `bg-parchment`, `text-vermillion` (`#8B1A1A`), `text-jade`, `text-ink`, `text-ink-3`, `text-ink-4` Tailwind tokens must be used — no raw hex except for the SVG stroke which needs `#8B1A1A`
- `z-50` for all fixed overlays (matches existing modal z-index convention)
- No new npm packages

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/ChartLoadingOverlay.tsx` | Create | Birth loading: 命 ring + cycling subtitle, min 2s + first-chunk dismiss |
| `components/UnlockLoadingOverlay.tsx` | Create | Post-payment: sequential step reveal, fades when `unlocked` flips true |
| `components/WizardFlow.tsx` | Modify | Mount both overlays; pass `firstChunkArrived` and `unlocked` props |

---

## Task 1: ChartLoadingOverlay component

**Files:**
- Create: `components/ChartLoadingOverlay.tsx`

**Interfaces:**
- Props: `{ firstChunkArrived: boolean }`
- Self-manages visibility; no callbacks needed

- [ ] **Step 1: Create the file**

```tsx
// components/ChartLoadingOverlay.tsx
"use client";

import { useEffect, useState } from "react";

const SUBTITLES = ["排列星盤宮位…", "推算大限流年…", "對照典籍格局…", "整合八字命理…"];
const RING_R = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 326.73

interface Props {
  firstChunkArrived: boolean;
}

export default function ChartLoadingOverlay({ firstChunkArrived }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);

  // 2 000 ms minimum
  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), 2000);
    return () => clearTimeout(id);
  }, []);

  // Rotate subtitle every 1 000 ms
  useEffect(() => {
    const id = setInterval(() => setSubtitleIdx((i) => (i + 1) % SUBTITLES.length), 1000);
    return () => clearInterval(id);
  }, []);

  // Dismiss when both conditions are met
  useEffect(() => {
    if (minElapsed && firstChunkArrived) {
      setFading(true);
      const id = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(id);
    }
  }, [minElapsed, firstChunkArrived]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-parchment"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 400ms ease-out" }}
    >
      {/* Ring + 命 character */}
      <div className="relative flex items-center justify-center mb-6" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
          {/* track ring */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none" stroke="#8B1A1A" strokeWidth="2" opacity="0.12"
          />
          {/* animated fill ring */}
          <circle
            cx="60" cy="60" r={RING_R}
            fill="none" stroke="#8B1A1A" strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{
              strokeDashoffset: CIRCUMFERENCE,
              animation: "chart-ring-fill 2.5s ease-in-out forwards",
            }}
          />
        </svg>
        <span style={{ fontFamily: "serif", fontSize: 48, color: "#8B1A1A", lineHeight: 1, position: "relative" }}>
          命
        </span>
      </div>

      <p className="text-sm tracking-widest text-ink-3 mb-2">正在推算命盤各部分</p>
      <p className="text-xs tracking-wider text-ink-4 h-4">{SUBTITLES[subtitleIdx]}</p>

      <style>{`
        @keyframes chart-ring-fill {
          from { stroke-dashoffset: ${CIRCUMFERENCE}; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file exists with no TypeScript errors**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | grep ChartLoading
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/ChartLoadingOverlay.tsx
git commit -m "feat(loading): add ChartLoadingOverlay — 命 ring + cycling subtitle"
```

---

## Task 2: UnlockLoadingOverlay component

**Files:**
- Create: `components/UnlockLoadingOverlay.tsx`

**Interfaces:**
- Props: `{ unlocked: boolean }`
- Internally advances `activeStep` 0→5 at 700ms intervals
- Fades out 800ms after step 5 is reached AND `unlocked` is true

- [ ] **Step 1: Create the file**

```tsx
// components/UnlockLoadingOverlay.tsx
"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { icon: "⟳", text: "正在解鎖完整命書…",      spin: true,  final: false },
  { icon: "✦", text: "掃描百部命理典籍資料庫",  spin: false, final: false },
  { icon: "✦", text: "深度推算大運流年",         spin: false, final: false },
  { icon: "✦", text: "以進階模型交叉審閱",       spin: false, final: false },
  { icon: "✦", text: "校驗各派論斷一致性",       spin: false, final: false },
  { icon: "✓", text: "命書已準備完成",           spin: false, final: true  },
];

const LAST = STEPS.length - 1;

interface Props {
  unlocked: boolean;
}

export default function UnlockLoadingOverlay({ unlocked }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  // Advance one step every 700 ms until the last step
  useEffect(() => {
    if (activeStep >= LAST) return;
    const id = setTimeout(() => setActiveStep((s) => s + 1), 700);
    return () => clearTimeout(id);
  }, [activeStep]);

  // Once last step AND unlocked: wait 800 ms then fade out
  useEffect(() => {
    if (activeStep < LAST || !unlocked) return;
    const id = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 400);
    }, 800);
    return () => clearTimeout(id);
  }, [activeStep, unlocked]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-parchment"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 400ms ease-out" }}
    >
      <p className="text-xs tracking-widest text-ink-4 mb-8">解鎖進行中</p>
      <div className="flex flex-col gap-4">
        {STEPS.map((step, i) => {
          const active = i <= activeStep;
          return (
            <div
              key={i}
              className="flex items-center gap-3 transition-opacity duration-300"
              style={{ opacity: active ? 1 : 0.2 }}
            >
              <span
                className={`w-4 text-center text-sm leading-none flex-shrink-0 ${
                  active
                    ? step.final ? "text-jade" : "text-vermillion"
                    : "text-ink-4"
                } ${step.spin && active ? "animate-spin" : ""}`}
              >
                {step.icon}
              </span>
              <span
                className={`text-sm ${
                  active
                    ? step.final ? "text-jade font-semibold" : "text-ink"
                    : "text-ink-4"
                }`}
              >
                {step.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | grep UnlockLoading
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/UnlockLoadingOverlay.tsx
git commit -m "feat(loading): add UnlockLoadingOverlay — post-payment step sequence"
```

---

## Task 3: Wire overlays into WizardFlow

**Files:**
- Modify: `components/WizardFlow.tsx`

**Interfaces:**
- Consumes from Task 1: `ChartLoadingOverlay` with prop `firstChunkArrived: boolean`
- Consumes from Task 2: `UnlockLoadingOverlay` with prop `unlocked: boolean`
- `firstChunkArrived` = `synthesis.status !== "idle"` (already in WizardFlow scope)
- `justPaid` = `?paid=1` in URL — detected via `useRef` on mount (safe in `"use client"`)

- [ ] **Step 1: Add imports at the top of WizardFlow.tsx**

Find the existing import block (around line 1–15) and add:

```tsx
import { useRef } from "react";
import ChartLoadingOverlay from "./ChartLoadingOverlay";
import UnlockLoadingOverlay from "./UnlockLoadingOverlay";
```

Note: `useRef` may already be imported — check first, add only if missing.

- [ ] **Step 2: Detect `?paid=1` in the URL**

Inside `WizardFlow` function body, immediately after the `paywall` line (around line 391), add:

```tsx
// Detect Stripe return — set once on mount, stable for the component's lifetime
const justPaidRef = useRef(
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("paid")
);
const justPaid = justPaidRef.current;
```

- [ ] **Step 3: Render both overlays**

Find the `return (` of `WizardFlow` (around line 480+). Add both overlays as the first children inside the outermost `<div>` or fragment:

```tsx
return (
  <>
    {/* Birth loading overlay — shown until first SSE chunk + 2s minimum */}
    <ChartLoadingOverlay firstChunkArrived={synthesis.status !== "idle"} />

    {/* Post-payment overlay — shown when returning from Stripe until unlock confirmed */}
    {justPaid && paywall.loading && (
      <UnlockLoadingOverlay unlocked={paywall.unlocked} />
    )}

    {/* ... rest of existing WizardFlow JSX unchanged ... */}
```

If WizardFlow already returns a single root `<div>`, wrap with `<>...</>` or add the overlays as the first two children of that `<div>`.

- [ ] **Step 4: Verify TypeScript — no errors across all three files**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (zero errors).

- [ ] **Step 5: Quick build check**

```bash
cd ~/Desktop/Projects/fortune-app && npm run build 2>&1 | tail -20
```
Expected: `✓ Generating static pages` and no TypeScript/compile errors.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add components/WizardFlow.tsx
git commit -m "feat(loading): wire ChartLoadingOverlay + UnlockLoadingOverlay into WizardFlow"
```

---

## Task 4: Deploy and manual verification

- [ ] **Step 1: Deploy to production**

```bash
cd ~/Desktop/Projects/fortune-app && npx vercel --prod --yes 2>&1 | tail -5
```
Expected: `Production https://www.mingli.study` aliased.

- [ ] **Step 2: Verify birth loading screen**

Open https://www.mingli.study in a browser (or dev: `npm run dev` → localhost:3000).

1. Fill in birth date + gender on the homepage
2. Click 開始推算
3. **Expect:** Full-screen parchment overlay appears with `命` character, red ring animating clockwise, rotating subtitle cycling through 4 phrases
4. **Expect:** Overlay fades out (400ms) and chart appears underneath — no earlier than 2s, no later than ~4s on a fresh load
5. **Expect:** On a repeat visit (cached), overlay disappears after exactly ~2s

- [ ] **Step 3: Verify post-payment overlay (staging only)**

To test without real payment: temporarily load the result page with `?paid=1` in the URL, e.g.:

```
https://www.mingli.study/result?date=1990-03-21&hour=11&gender=male&tz=8&name=示例&paid=1
```

1. **Expect:** Overlay appears with "解鎖進行中" header and 6 steps lighting up sequentially (~700ms each)
2. **Expect:** Step 6 "命書已準備完成" turns jade green
3. **Expect:** After `usePaywall` finishes polling (no webhook will fire in test — overlay stays on step 6 until unlocked, then fades)
4. In production with real Stripe payment: overlay fades as soon as webhook fires and `paywall.unlocked` becomes true
