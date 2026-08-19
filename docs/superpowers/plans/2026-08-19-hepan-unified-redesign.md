# Hepan Unified Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the two separate hepan products (`/hepan` = 紫微-only, `/bazihepan` = 八字-only) into one 5-tab unified experience at `/hepan`, one $6.99 unlock covering both systems.

**Architecture:** A new `components/HepanResultView.tsx` owns a tab state machine (緣分總覽/各自解讀/合盤綫析/緣分時機/問合盤) mirroring solo's `WizardFlow.tsx` pattern, driven by 1 free + 4 paid `useSSEStream` calls. `components/HepanFlow.tsx` keeps only its input-collection responsibility and delegates rendering to the new component. `/bazihepan` keeps its SEO content but its interactive flow is replaced with a CTA into `/hepan`.

**Tech Stack:** Next.js 15 App Router, TypeScript, `lib/useSSEStream.ts` (SSE streaming + client cache), `lib/usePaywall.ts` + `components/PaywallLock.tsx` (Stripe paywall gating), DeepSeek via `lib/sseWriter.ts`.

## Global Constraints

- No automated test suite exists in this codebase for reading/UI logic (confirmed: `2026-07-21-yuanfen-and-palaces-paywall-design.md`'s own Testing section states manual verification is the established bar). Every task below verifies via `npx tsc --noEmit`, `npm run build`, and live browser testing — not unit tests — matching existing project convention. `lib/extractSection.ts` (Task 1) is the one pure-function exception and gets a real automated check since it's trivially testable in isolation.
- 繁體中文（臺灣用語）for all user-facing strings — this codebase's established locale (see any existing route's SYSTEM prompt).
- Never run `npm run build` while `npm run dev` is also running against the same `.next/` directory — stop the dev server first, or the build throws unrelated-looking prerender errors (hit and confirmed earlier this session).
- `NEXT_PUBLIC_PAYWALL_ENABLED="false"` in local `.env.local` — the paywall is bypassed locally by design. To visually verify any `PaywallLock`/`gated` behavior, temporarily flip it to `"true"`, restart the dev server, test, then **immediately revert** (`cp` a backup first, `diff` after reverting to confirm).
- Follow the existing safety-net pattern for AI-authored Traditional Chinese: this plan does not touch opencc conversion, but if any new hardcoded UI string is typed in Simplified by mistake, catch it in the browser-verification step, not just by reading the diff.

---

## Task 1: `lib/extractSection.ts`

**Files:**
- Create: `lib/extractSection.ts`
- Test: none (manual, see Step 2 — this is a pure function with no framework dependency, verified with a throwaway Node script rather than a permanent test file, matching the codebase's no-test-suite convention)

**Interfaces:**
- Produces: `extractSection(text: string, heading: string): string` — returns the body of the first `## {heading}...` section (up to but not including the next `##` or `###` heading), or `""` if not found.
- Produces: `removeSection(text: string, heading: string): string` — returns `text` with that same section (heading + body) cut out, everything else preserved.

- [ ] **Step 1: Write the file**

```ts
// Pulls one "## Heading" markdown section out of a larger AI-generated couple
// reading, or removes one. Used so 緣分時機 can be its own tab without a new AI
// call — couple/route.ts and bazi-couple/route.ts already produce a timing
// section ("## 緣分時機" / "## 大運時機 · ...") as part of their existing output;
// this just slices it out client-side once the stream is done.
export function extractSection(text: string, heading: string): string {
  const headingRe = new RegExp(`^##\\s*${heading}.*$`, "m");
  const match = headingRe.exec(text);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const nextHeadingIdx = rest.search(/^#{2,3}\s/m);
  return (nextHeadingIdx >= 0 ? rest.slice(0, nextHeadingIdx) : rest).trim();
}

export function removeSection(text: string, heading: string): string {
  const headingRe = new RegExp(`^##\\s*${heading}.*$`, "m");
  const match = headingRe.exec(text);
  if (!match) return text;
  const before = text.slice(0, match.index);
  const rest = text.slice(match.index + match[0].length);
  const nextHeadingIdx = rest.search(/^#{2,3}\s/m);
  const after = nextHeadingIdx >= 0 ? rest.slice(nextHeadingIdx) : "";
  return (before + after).trim();
}
```

- [ ] **Step 2: Verify with a throwaway script**

Run:
```bash
cd ~/Projects/fortune-app && node -e '
const { extractSection, removeSection } = require("./lib/extractSection.ts");
' 2>&1 | head -3
```
This will fail (TS not runnable directly by node) — instead verify via `npx tsx`:
```bash
cd ~/Projects/fortune-app && npx tsx -e '
import { extractSection, removeSection } from "./lib/extractSection";
const sample = `## 甲方在這段關係中\n內容A\n\n## 緣分時機\n這是時機內容，約120字。\n\n## 相處之道\n- 建議一\n- 建議二\n\n### 分享卡片\n卡片內容`;
console.log("extract:", JSON.stringify(extractSection(sample, "緣分時機")));
console.log("remove has timing?", removeSection(sample, "緣分時機").includes("這是時機內容"));
console.log("remove keeps others?", removeSection(sample, "緣分時機").includes("建議一") && removeSection(sample, "緣分時機").includes("甲方在這段關係中"));
'
```
Expected output:
```
extract: "這是時機內容，約120字。"
remove has timing? false
remove keeps others? true
```

- [ ] **Step 3: Typecheck**

Run: `cd ~/Projects/fortune-app && npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fortune-app
git add lib/extractSection.ts
git commit -m "feat(hepan): add extractSection/removeSection markdown helpers"
```

---

## Task 2: Enrich `couple/route.ts` prompt depth

**Files:**
- Modify: `app/api/reading/couple/route.ts`

**Interfaces:**
- No signature changes — SYSTEM prompt text only, same request/response shape.

- [ ] **Step 1: Edit the 前世緣分 section text**

In `app/api/reading/couple/route.ts`, find:
```ts
  const pastLifeSection = cfg.hasPastLife
    ? "\n## 前世緣分（命理故事）\n（約120字：以來因宮/夫妻宮星曜組合為依據，寫一段富畫面感的「前世今生」小敘事，開頭註明這是命理意象、非史實；溫暖動人，適合分享）"
    : "";
```
Replace with:
```ts
  const pastLifeSection = cfg.hasPastLife
    ? "\n## 前世緣分（命理故事）\n（約120字：以來因宮/夫妻宮星曜組合為依據，寫一段富畫面感的「前世今生」小敘事，開頭註明這是命理意象、非史實；可自然帶出兩人相處中「似曾相識」的情感連結（如彼此吸引或彼此磨合的模式），但不用心理學術語，維持故事感；溫暖動人，適合分享）"
    : "";
```

- [ ] **Step 2: Edit the 相處之道 section text in SYSTEM**

Find (inside the `SYSTEM` template string):
```
## 相處之道
（針對兩人命盤，3-5條具體可操作建議；- 開頭列表）
```
Replace with:
```
## 相處之道
（針對兩人命盤，3-5條具體可操作建議；每條先用一句話點出兩人在這方面最可能遇到的具體摩擦或誤解——依附風格、溝通習慣或情緒表達方式的差異，而非籠統的「多溝通」——再給出可操作的化解方式；- 開頭列表）
```

- [ ] **Step 3: Typecheck**

Run: `cd ~/Projects/fortune-app && npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 4: Manual verification — generate a live reading**

This route's output can't be verified without a live call. Defer live verification to Task 8's full browser pass (generating a real reading is expensive/slow to do per-task; batching it avoids redundant AI calls). For now, confirm the string is syntactically valid by checking the file compiles and the template literal isn't broken:

Run: `cd ~/Projects/fortune-app && node -e "require('fs').readFileSync('app/api/reading/couple/route.ts','utf8').includes('依附風格') ? console.log('OK') : process.exit(1)"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/couple/route.ts
git commit -m "feat(hepan): deepen couple/route.ts prompt (attachment/communication framing)"
```

---

## Task 3: Enrich `bazi-couple/route.ts` prompt depth

**Files:**
- Modify: `app/api/reading/bazi-couple/route.ts`

**Interfaces:**
- No signature changes — SYSTEM prompt text only.

- [ ] **Step 1: Edit the 相處之道 section text**

In `app/api/reading/bazi-couple/route.ts`, find (inside the `SYSTEM` template string):
```
## 相處之道
（針對兩人八字特點，給出4條具體、可操作的建議；- 開頭列表；每條一句）
```
Replace with:
```
## 相處之道
（針對兩人八字特點，給出4條具體、可操作的建議；每條先用一句話點出兩人最可能遇到的具體摩擦——十神互動或五行失衡帶來的溝通/情緒模式差異，而非籠統建議——再給出化解方式；- 開頭列表）
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/Projects/fortune-app && npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 3: Verify string landed**

Run: `cd ~/Projects/fortune-app && node -e "require('fs').readFileSync('app/api/reading/bazi-couple/route.ts','utf8').includes('十神互動或五行失衡') ? console.log('OK') : process.exit(1)"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/reading/bazi-couple/route.ts
git commit -m "feat(hepan): deepen bazi-couple/route.ts prompt (ten-god friction framing)"
```

---

## Task 4: Create `components/HepanResultView.tsx`

**Files:**
- Create: `components/HepanResultView.tsx`

**Interfaces:**
- Consumes: `extractSection`/`removeSection` from `lib/extractSection.ts` (Task 1); `calcCoupleScoreV2` from `lib/couple.ts` (existing, unchanged); `getRelationshipConfig` from `lib/coupleTypes.ts` (existing); `useSSEStream(url, cacheKey?, opts?)` from `lib/useSSEStream.ts`; `usePaywall(chartId)` from `lib/usePaywall.ts`; `PaywallLock` props `{chartId, sectionLabel?, included?}`; `ChatInterface` props `{ziwei, partnerZiwei?, initialContext, placeholder?, chartId?, maxQuestions?}`.
- Produces: `export interface HepanCharts { baziA, ziweiA, baziB, ziweiB, nameA?, nameB?, genderA, genderB, sessionId, relType }` and `export default function HepanResultView({ charts: HepanCharts, onReset: () => void })` — this exact export is what Task 5 imports into `HepanFlow.tsx`.

- [ ] **Step 1: Write the full file**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Md from "./Md";
import ZiweiChart from "./ZiweiChart";
import PaywallLock from "./PaywallLock";
import ChatInterface from "./ChatInterface";
import BugReportButton from "./BugReportButton";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { getRelationshipConfig, type RelationshipType } from "@/lib/coupleTypes";
import { useSSEStream } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";
import { parseModernBlocks } from "@/lib/modernBlocks";
import { extractSection, removeSection } from "@/lib/extractSection";

export interface HepanCharts {
  baziA: BaziResult; ziweiA: ZiweiResult;
  baziB: BaziResult; ziweiB: ZiweiResult;
  nameA?: string; nameB?: string;
  genderA: "male" | "female"; genderB: "male" | "female";
  sessionId: string;
  relType: RelationshipType;
}

const COUPLE_INCLUDED = [
  "各自解讀 · 雙方獨立命盤解讀",
  "合盤綫析 · 紫微＋八字雙系統",
  "飛化互入 · 彼此牽動的領域",
  "緣分時機 · 高峰與考驗階段",
  "相處之道 · 具體可行建議",
  "問合盤 · 追問深入分析",
  "可分享緣分卡片 · 一鍵複製分享",
];

// ── Score card ──────────────────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e0d6" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
      <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{score}</text>
      <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#8a7a6a">/ 100</text>
    </svg>
  );
}

function DimRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 65 ? "#d97706" : "#6b7280";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-ink-3">{label}</span>
        <span className="font-semibold" style={{ color }}>{score}分</span>
      </div>
      <div className="h-1.5 rounded-full bg-border-warm overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Reading renderers ─────────────────────────────────────────────────────────

const MD_PROSE = "prose max-w-none text-sm [&_h2]:text-vermillion [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-wide [&_p]:text-ink-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-sm [&_strong]:text-ink [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:space-y-1.5 [&_li]:text-ink-2 [&_li]:text-sm [&_li]:relative [&_li]:pl-4 [&_li]:list-none [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-vermillion [&_li]:before:font-bold";

function ModernBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-xl border border-sky-200/80 overflow-hidden bg-sky-50/40">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left gap-2 hover:bg-sky-50/60 transition-colors">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />現代視角
        </span>
        <span className={`text-sky-400 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-sky-900/80 leading-relaxed border-t border-sky-100">
          <Md>{content}</Md>
        </div>
      )}
    </div>
  );
}

function ReadingText({ text }: { text: string }) {
  const parts = parseModernBlocks(text);
  return (
    <div>
      {parts.map((part, i) =>
        part.type === "modern"
          ? <ModernBlock key={i} content={part.content} />
          : <Md key={i} className={MD_PROSE}>{part.content}</Md>
      )}
    </div>
  );
}

function ShareCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className="rounded-xl border-2 border-gold/40 bg-gradient-to-b from-gold-l/30 to-paper p-4">
      <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed text-center">{text}</pre>
      <button onClick={copy}
        className="mt-3 w-full rounded-full bg-vermillion px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
        {copied ? "已複製 ✓" : "複製 · 分享給朋友"}
      </button>
    </div>
  );
}

// Splits off the "### 分享卡片" block; stripHeading additionally removes a named
// section (already surfaced in its own tab, e.g. "緣分時機") from the body.
function FullReading({ text, stripHeading }: { text: string; stripHeading?: string }) {
  const marker = "### 分享卡片";
  const idx = text.indexOf(marker);
  let body = idx >= 0 ? text.slice(0, idx) : text;
  if (stripHeading) body = removeSection(body, stripHeading);
  const card = idx >= 0 ? text.slice(idx + marker.length).trim() : "";
  return (
    <div className="space-y-4">
      <ReadingText text={body} />
      {card && <ShareCard text={card} />}
    </div>
  );
}

const LOADING_STEPS = ["正在讀取雙方夫妻宮星曜…", "檢索典籍參考…", "分析八字緣分結構…", "生成合盤解讀…"];

function LoadingSkeleton() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % LOADING_STEPS.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3">
        <div className="relative w-6 h-6 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-vermillion/20" />
          <div className="absolute inset-0 rounded-full border-2 border-vermillion border-t-transparent animate-spin" />
        </div>
        <span className="text-sm text-ink-3">{LOADING_STEPS[step]}</span>
      </div>
      <div className="space-y-2.5 pl-9">
        {[90, 75, 82, 65, 70].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full bg-border-light overflow-hidden" style={{ width: `${w}%` }}>
            <div className="h-full bg-gradient-to-r from-transparent via-border-warm to-transparent animate-shimmer"
              style={{ animationDelay: `${i * 200}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "solo" | "analysis" | "timing" | "chat";

const TABS: { id: Tab; label: string; char: string }[] = [
  { id: "overview", label: "總覽", char: "緣" },
  { id: "solo", label: "各自", char: "個" },
  { id: "analysis", label: "綫析", char: "合" },
  { id: "timing", label: "時機", char: "時" },
  { id: "chat", label: "問合盤", char: "問" },
];

const FREE_TABS = new Set<Tab>(["overview"]);

// ── Main component ───────────────────────────────────────────────────────────

export default function HepanResultView({ charts, onReset }: { charts: HepanCharts; onReset: () => void }) {
  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, sessionId, relType } = charts;
  const cfg = getRelationshipConfig(relType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const coupleChartId = `hepan_${sessionId}`;
  const paywall = usePaywall(coupleChartId);
  const gated = paywall.enabled && !paywall.unlocked;
  const isLocked = (tab: Tab) => gated && !FREE_TABS.has(tab);

  const body = { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType: cfg.key };
  const soloBodyA = { ziwei: ziweiA, bazi: baziA, gender: genderA, name: nameA };
  const soloBodyB = { ziwei: ziweiB, bazi: baziB, gender: genderB, name: nameB };

  // Free teaser — always runs.
  const preview = useSSEStream("/api/reading/couple/preview", `${coupleChartId}_preview`);
  useEffect(() => {
    if (preview.status === "idle") preview.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paid streams — only start once unlocked. synthesisA/B reuse the exact solo
  // route+payload shape WizardFlow.tsx uses (validate:true matches solo's own
  // usage of this route, so "reuse existing solo logic" is faithful, not partial).
  const synthesisA = useSSEStream("/api/reading/synthesis", `${coupleChartId}_synthesisA`, { validate: true });
  const synthesisB = useSSEStream("/api/reading/synthesis", `${coupleChartId}_synthesisB`, { validate: true });
  const coupleFull = useSSEStream("/api/reading/couple", `${coupleChartId}_full`);
  const baziCoupleFull = useSSEStream("/api/reading/bazi-couple", `${coupleChartId}_bazifull`);

  useEffect(() => {
    if (paywall.loading || gated) return;
    if (synthesisA.status === "idle") synthesisA.start(soloBodyA);
    if (synthesisB.status === "idle") synthesisB.start(soloBodyB);
    if (coupleFull.status === "idle") coupleFull.start(body);
    if (baziCoupleFull.status === "idle") baziCoupleFull.start(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paywall.loading, gated]);

  const coupleContext = `合盤追問 — ${labelA}（${baziA.summary}）與 ${labelB}（${baziB.summary}）。請專注於兩人之間的感情互動、相處模式與具體建議。`;

  function renderContent() {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="paper-card rounded-2xl border border-border-warm p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 bg-vermillion rounded-full" />
                <h2 className="text-base font-bold text-ink tracking-wide">合盤緣分指數</h2>
              </div>
              <p className="text-xs text-ink-4 mb-4 pl-3">
                {cfg.label} · {cfg.shareLabel}：<span className="text-vermillion font-medium">{score.label}</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <ScoreRing score={score.total} color={score.color} />
                  <span className="text-sm font-bold tracking-widest mt-1" style={{ color: score.color }}>{score.label}</span>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {score.dims.map((d) => <DimRow key={d.name} label={d.name} score={d.score} />)}
                </div>
              </div>
              <p className="text-[10px] text-ink-4 mt-4 text-center leading-relaxed">
                合盤指數基於五行結構、日主關係與{cfg.palaces[0] ?? "夫妻"}宮星曜，僅供參考，緣分深淺因人而異
              </p>
            </div>

            <div>
              <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
                <span className="w-px h-3 bg-vermillion inline-block" />
                <span className="text-vermillion">緣分一瞥 · 免費預覽</span>
              </p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(preview.status === "streaming" || preview.status === "idle") && <LoadingSkeleton />}
                {preview.status === "done" && <div className="animate-fade-in"><ReadingText text={preview.text} /></div>}
                {preview.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{preview.errorMsg}</p>
                    <button onClick={() => preview.start(body)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "solo":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelA}</p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(synthesisA.status === "streaming" || synthesisA.status === "idle") && <LoadingSkeleton />}
                {synthesisA.status === "done" && <div className="animate-fade-in"><ReadingText text={synthesisA.text} /></div>}
                {synthesisA.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{synthesisA.errorMsg}</p>
                    <button onClick={() => synthesisA.start(soloBodyA)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelB}</p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(synthesisB.status === "streaming" || synthesisB.status === "idle") && <LoadingSkeleton />}
                {synthesisB.status === "done" && <div className="animate-fade-in"><ReadingText text={synthesisB.text} /></div>}
                {synthesisB.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{synthesisB.errorMsg}</p>
                    <button onClick={() => synthesisB.start(soloBodyB)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "analysis":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
                <span className="w-px h-3 bg-vermillion inline-block" />
                <span className="text-vermillion">紫微合盤</span>
              </p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(coupleFull.status === "streaming" || coupleFull.status === "idle") && <LoadingSkeleton />}
                {coupleFull.status === "done" && <div className="animate-fade-in"><FullReading text={coupleFull.text} stripHeading="緣分時機" /></div>}
                {coupleFull.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{coupleFull.errorMsg}</p>
                    <button onClick={() => coupleFull.start(body)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
                <span className="w-px h-3 bg-vermillion inline-block" />
                <span className="text-vermillion">八字合盤</span>
              </p>
              <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
                {(baziCoupleFull.status === "streaming" || baziCoupleFull.status === "idle") && <LoadingSkeleton />}
                {baziCoupleFull.status === "done" && <div className="animate-fade-in"><FullReading text={baziCoupleFull.text} stripHeading="大運時機" /></div>}
                {baziCoupleFull.status === "error" && (
                  <div className="space-y-2">
                    <p className="text-sm text-vermillion">{baziCoupleFull.errorMsg}</p>
                    <button onClick={() => baziCoupleFull.start(body)} className="text-xs text-gold underline">重試</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "timing": {
        const ziweiTiming = coupleFull.status === "done" ? extractSection(coupleFull.text, "緣分時機") : "";
        const baziTiming = baziCoupleFull.status === "done" ? extractSection(baziCoupleFull.text, "大運時機") : "";
        const stillLoading = coupleFull.status !== "done" || baziCoupleFull.status !== "done";
        return (
          <div className="space-y-4">
            <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
              <span className="w-px h-3 bg-vermillion inline-block" />
              <span className="text-vermillion">緣分時機</span>
            </p>
            <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5 space-y-4">
              {stillLoading && <LoadingSkeleton />}
              {!stillLoading && (
                <>
                  {ziweiTiming && (
                    <div>
                      <p className="text-xs font-semibold text-ink-2 mb-1.5">紫微視角</p>
                      <ReadingText text={ziweiTiming} />
                    </div>
                  )}
                  {baziTiming && (
                    <div className="pt-2 border-t border-border-light">
                      <p className="text-xs font-semibold text-ink-2 mb-1.5 mt-2">八字視角</p>
                      <ReadingText text={baziTiming} />
                    </div>
                  )}
                  {!ziweiTiming && !baziTiming && (
                    <p className="text-sm text-ink-4">尚未取得時機分析，請稍後重新整理。</p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }

      case "chat":
        return (
          <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5">
            <ChatInterface
              ziwei={ziweiA}
              partnerZiwei={ziweiB}
              initialContext={coupleContext}
              placeholder="問關於兩人的問題，如：我們的相處難點是什麼？如何化解？"
              chartId={coupleChartId}
              maxQuestions={10}
            />
          </div>
        );
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      <button onClick={onReset}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
        ← 重新填寫
      </button>

      <div className="flex border border-border-warm overflow-hidden bg-paper-2 rounded-t-xl">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 min-w-0 flex flex-col items-center py-2.5 px-0.5 border-r last:border-r-0 border-border-light transition-all duration-200 ${
              activeTab === tab.id ? "bg-vermillion text-paper" : "text-ink-3 hover:bg-paper hover:text-ink"
            }`}>
            {isLocked(tab.id) && (
              <span className={`absolute top-1 right-1 text-[10px] leading-none ${activeTab === tab.id ? "opacity-90" : "opacity-80"}`}>🔒</span>
            )}
            <span className={`text-xs font-bold leading-none ${activeTab === tab.id ? "text-paper/70" : "text-ink-4"}`}>{tab.char}</span>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="border border-t-0 border-border-warm rounded-b-xl bg-paper p-4 sm:p-5 min-h-[200px] mb-6">
        {isLocked(activeTab) ? (
          <PaywallLock chartId={coupleChartId} sectionLabel={TABS.find((t) => t.id === activeTab)?.label} included={COUPLE_INCLUDED} />
        ) : renderContent()}
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-xs text-ink-4 tracking-widest uppercase px-1 flex items-center gap-2">
          <span className="w-px h-3 bg-ink-4 inline-block" />雙方命盤
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelA}</p>
            <ZiweiChart
              palaces={ziweiA.palaces} soulPalace={ziweiA.soulPalace} bodyPalace={ziweiA.bodyPalace}
              fiveElementsClass={ziweiA.fiveElementsClass} mainStar={ziweiA.mainStar} bodyStar={ziweiA.bodyStar}
              name={nameA} gender={genderA}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-2 mb-2 px-1">{labelB}</p>
            <ZiweiChart
              palaces={ziweiB.palaces} soulPalace={ziweiB.soulPalace} bodyPalace={ziweiB.bodyPalace}
              fiveElementsClass={ziweiB.fiveElementsClass} mainStar={ziweiB.mainStar} bodyStar={ziweiB.bodyStar}
              name={nameB} gender={genderB}
            />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-ink-4 pb-4">
        僅供學習參考與娛樂，請理性看待，切勿迷信 ·{" "}
        <Link href="/" className="text-vermillion hover:underline">測個人命盤 →</Link>
      </p>

      <BugReportButton sessionId={coupleChartId} page="hepan" />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/Projects/fortune-app && npx tsc --noEmit`
Expected: no output (clean). If `useSSEStream`'s options type doesn't accept `{ validate: true }` as written, check `lib/useSSEStream.ts`'s `StreamOpts` type definition and match its exact shape.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add components/HepanResultView.tsx
git commit -m "feat(hepan): add HepanResultView with 5-tab structure"
```

---

## Task 5: Wire `HepanFlow.tsx` to delegate to `HepanResultView`

**Files:**
- Modify: `components/HepanFlow.tsx`

**Interfaces:**
- Consumes: `HepanResultView`, `HepanCharts` from `components/HepanResultView.tsx` (Task 4).
- `HepanFlow.tsx`'s existing `Charts` interface (currently `{baziA, ziweiA, baziB, ziweiB, nameA?, nameB?, genderA, genderB, sessionId, relType}`) is already structurally identical to `HepanCharts` — no data transformation needed, just pass `charts` straight through.

- [ ] **Step 1: Remove the now-unused result-rendering imports and helpers**

In `components/HepanFlow.tsx`, remove these imports (now owned by `HepanResultView.tsx`):
```ts
import Md from "./Md";
import ZiweiChart from "./ZiweiChart";
import PaywallLock from "./PaywallLock";
import BugReportButton from "./BugReportButton";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { useSSEStream } from "@/lib/useSSEStream";
import { usePaywall } from "@/lib/usePaywall";
import { parseModernBlocks } from "@/lib/modernBlocks";
```
Add:
```ts
import HepanResultView from "./HepanResultView";
```

Keep: `useEffect, useState` from React, `Link`, `BirthdayWheel`, `calculateBazi`/`BaziResult`, `ZiweiResult`, `RELATIONSHIP_TYPES`/`getRelationshipConfig`/`RelationshipType`.

- [ ] **Step 2: Delete the now-unused helper components**

Delete these function definitions entirely from `HepanFlow.tsx` (all moved into `HepanResultView.tsx` in Task 4): `COUPLE_INCLUDED` constant, `ScoreRing`, `DimRow`, `MD_PROSE` constant, `ModernBlock`, `ReadingText`, `ShareCard`, `FullReading`, `LOADING_STEPS` constant, `LoadingSkeleton`.

Keep: `PersonFields` interface, `Charts` interface, `personKey`, `PersonForm`.

- [ ] **Step 3: Replace the `HepanResult` function**

Find the existing `HepanResult` function (currently ~130 lines implementing the score card + free preview + gated full reading + charts + BugReportButton inline). Replace its entire body with:

```tsx
function HepanResult({ charts, onReset }: { charts: Charts; onReset: () => void }) {
  return <HepanResultView charts={charts} onReset={onReset} />;
}
```

- [ ] **Step 4: Typecheck**

Run: `cd ~/Projects/fortune-app && npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 5: Manual verification — full click-through on `/hepan`**

This is the first point where the new tab structure is actually reachable. Temporarily enable the paywall to see real gating:

```bash
cd ~/Projects/fortune-app
cp .env.local /tmp/env.local.backup.$(date +%s)
sed -i.bak 's/NEXT_PUBLIC_PAYWALL_ENABLED="false"/NEXT_PUBLIC_PAYWALL_ENABLED="true"/' .env.local
rm .env.local.bak
pkill -f "next dev" 2>/dev/null; sleep 1
npm run dev > /tmp/mingli-dev.log 2>&1 &
disown
sleep 3
```

Then in the browser: navigate to `http://localhost:3000/hepan`, fill in both people's birth data (any valid dates), submit, and confirm:
- 緣分總覽 tab shows immediately, score card + free preview, no lock icon.
- 各自解讀/合盤綫析/緣分時機/問合盤 tabs show a 🔒 icon and render `PaywallLock` when clicked.
- After confirming the lock renders, revert the paywall flag immediately:

```bash
cd ~/Projects/fortune-app
cp /tmp/env.local.backup.* .env.local
grep PAYWALL .env.local
pkill -f "next dev" 2>/dev/null
```
Expected: `NEXT_PUBLIC_PAYWALL_ENABLED="false"`

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/fortune-app
git add components/HepanFlow.tsx
git commit -m "refactor(hepan): delegate HepanFlow's result rendering to HepanResultView"
```

---

## Task 6: Update `app/bazihepan/page.tsx` to link into `/hepan`

**Files:**
- Modify: `app/bazihepan/page.tsx`

**Interfaces:**
- No new exports — this is a page-level UI change only.

- [ ] **Step 1: Remove the `BaziHepanFlow` import and usage**

In `app/bazihepan/page.tsx`, remove:
```tsx
import BaziHepanFlow from "@/components/BaziHepanFlow";
```

Find:
```tsx
        {/* Interactive flow */}
        <section className="paper-card rounded-2xl border border-border-warm p-5 sm:p-6">
          <BaziHepanFlow />
        </section>
```

Replace with:
```tsx
        {/* CTA into the unified /hepan flow — 八字合盤 is now part of the same
            5-tab experience there, this page keeps its SEO content only. */}
        <section className="paper-card rounded-2xl border border-border-warm p-6 sm:p-8 text-center space-y-4">
          <p className="text-sm text-ink-3 leading-relaxed max-w-md mx-auto">
            八字合盤已併入紫微雙人合盤——一次填寫，同時看到紫微與八字兩套系統的完整分析。
          </p>
          <Link href="/hepan"
            className="inline-flex items-center gap-2 rounded-full bg-vermillion px-6 py-3 text-sm font-semibold text-white hover:bg-vermillion-h transition-colors">
            開始合盤 →
          </Link>
        </section>
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/Projects/fortune-app && npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 3: Manual verification**

```bash
cd ~/Projects/fortune-app && npm run dev > /tmp/mingli-dev.log 2>&1 &
disown
sleep 3
```
Navigate to `http://localhost:3000/bazihepan`, confirm the FAQ/hero content still renders, confirm the new "開始合盤 →" button navigates to `/hepan`.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/fortune-app
git add app/bazihepan/page.tsx
git commit -m "refactor(bazihepan): replace embedded flow with CTA into unified /hepan"
```

---

## Task 7: Delete now-orphaned `BaziHepanFlow.tsx` + `bazi-couple/preview` route

**Files:**
- Delete: `components/BaziHepanFlow.tsx`
- Delete: `app/api/reading/bazi-couple/preview/route.ts`

**Interfaces:** None — pure removal, verified by full-codebase reference search before deleting.

- [ ] **Step 1: Confirm both are genuinely unreferenced**

Run:
```bash
cd ~/Projects/fortune-app
grep -rn "BaziHepanFlow" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules | grep -v "components/BaziHepanFlow.tsx"
grep -rn "bazi-couple/preview" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v node_modules
```
Expected: both return empty (Task 6 already removed the only caller of `BaziHepanFlow`; `bazi-couple/preview` was only ever called from inside `BaziHepanFlow.tsx`).

- [ ] **Step 2: Check `lib/baziCouple.ts` isn't now also orphaned**

Run: `cd ~/Projects/fortune-app && grep -rln "baziCouple\|calcBaziCoupleScore" --include="*.tsx" --include="*.ts" app components lib | grep -v "lib/baziCouple.ts"`
Expected: still shows `app/api/reading/bazi-couple/route.ts` (the main route, still live and used by `HepanResultView.tsx`) — `lib/baziCouple.ts` stays, only the `/preview` sub-route and the flow component are dead.

- [ ] **Step 3: Delete both files**

```bash
cd ~/Projects/fortune-app
rm components/BaziHepanFlow.tsx
rm -rf app/api/reading/bazi-couple/preview
```

- [ ] **Step 4: Typecheck and build**

```bash
cd ~/Projects/fortune-app
pkill -f "next dev" 2>/dev/null; sleep 1
npx tsc --noEmit
npm run build 2>&1 | tail -15
```
Expected: tsc clean, build succeeds with no errors (must run with dev server stopped, per Global Constraints).

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fortune-app
git add -A
git commit -m "chore(hepan): remove orphaned BaziHepanFlow + bazi-couple/preview route"
```

---

## Task 8: Full manual verification pass

**Files:** None — verification only.

- [ ] **Step 1: Clean build**

```bash
cd ~/Projects/fortune-app
pkill -f "next dev" 2>/dev/null; sleep 1
npx tsc --noEmit
npm run build 2>&1 | tail -15
```
Expected: both clean.

- [ ] **Step 2: Start dev server, temporarily enable paywall**

```bash
cd ~/Projects/fortune-app
cp .env.local /tmp/env.local.backup.final
sed -i.bak 's/NEXT_PUBLIC_PAYWALL_ENABLED="false"/NEXT_PUBLIC_PAYWALL_ENABLED="true"/' .env.local
rm .env.local.bak
npm run dev > /tmp/mingli-dev.log 2>&1 &
disown
sleep 3
```

- [ ] **Step 3: Full live click-through on `/hepan`**

Navigate to `http://localhost:3000/hepan`, submit two people's birth data for the **lover** relationship type, then:
- Confirm 緣分總覽 loads free, immediately, no lock.
- Confirm the other 4 tabs show 🔒 + `PaywallLock` while gated.
- Confirm all 4 paid streams (`synthesisA`, `synthesisB`, `couple`, `bazi-couple`) do NOT fire while gated — check `tail -f /tmp/mingli-dev.log` shows no POST to `/api/reading/synthesis`/`couple`/`bazi-couple` yet, only `couple/preview`.
- There is no way to unlock via real payment in local dev (Stripe checkout requires live keys) — to test the unlocked state, temporarily flip `gated` by setting `paywall.enabled` false again (revert the env var), OR manually set the KV unlock key. Simplest: revert `NEXT_PUBLIC_PAYWALL_ENABLED` to `"false"` for this one check (paywall becomes fully inert, `gated` is always false), restart dev server, reload `/hepan`, resubmit the same two people, and confirm:
  - 各自解讀 tab shows both people's individual solo-style readings once streams complete.
  - 合盤綫析 tab shows both 紫微合盤 and 八字合盤 sections, each ending in a share card, **neither** containing a `## 緣分時機`/`## 大運時機` heading (confirms `removeSection` worked).
  - 緣分時機 tab shows both "紫微視角"/"八字視角" sub-sections once the two full streams finish, with no separate loading spinner beyond the initial wait (confirms zero extra AI call — content appears as soon as `合盤綫析`'s streams are already done).
  - 問合盤 tab's chat responds to a test question referencing both people's charts.

- [ ] **Step 4: Repeat a quick spot-check for one more relationship type**

Repeat Step 3's submission (with paywall still off) for the **parentchild** type, confirming the 前世緣分 section still appears (per `coupleTypes.ts`, `parentchild.hasPastLife === true`) and reads coherently with the Task 2 enrichment applied.

- [ ] **Step 5: Confirm `/bazihepan`'s CTA end-to-end**

Navigate to `http://localhost:3000/bazihepan`, click "開始合盤 →", confirm it lands on `/hepan`'s input form.

- [ ] **Step 6: Final environment restore and diff check**

```bash
cd ~/Projects/fortune-app
cp /tmp/env.local.backup.final .env.local
diff .env.local /tmp/env.local.backup.final && echo "env.local restored correctly"
grep PAYWALL .env.local
pkill -f "next dev" 2>/dev/null
git status --short
git log --oneline -8
```
Expected: `env.local restored correctly`, `NEXT_PUBLIC_PAYWALL_ENABLED="false"`, working tree clean (all task commits already made), 8 commits from this plan visible in `git log`.

- [ ] **Step 7: Report to Niki, do not push**

Per this project's standing rule (never push without explicit request), stop here. Summarize what was verified and ask before pushing to `origin/main`.
