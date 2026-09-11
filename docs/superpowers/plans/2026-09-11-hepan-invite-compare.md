# Hepan Invite-and-Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a hepan (雙人合盤) reading start from a shareable link — Person A enters only their own birth data, gets an invite link, sends it to Person B, and B entering their own data on their own is what actually produces the (now free) full compare reading, instead of one person typing both people's birth data in themselves.

**Architecture:** A KV-backed invite record (`lib/compareInvite.ts`, same `@vercel/kv` pattern as `lib/unlock.ts`) stores Person A's raw birth fields and, once Person B responds, Person B's too. A new dynamic page (`app/compare/[inviteId]/page.tsx`) reads that record server-side and renders one of three states: expired/missing, "waiting for B" (a birth-input form), or "both present" (computes both charts client-side and hands off to the existing, unmodified `HepanResultView`). `components/HepanFlow.tsx` gains a cold-start "邀請朋友合盤" mode that only collects Person A's data and creates the invite instead of computing a chart directly. Solo and niandu result pages get a small new CTA linking into that cold-start mode with Person A's data pre-filled via URL params (same param-based restore pattern `HepanFlow.tsx` already uses for Stripe returns).

**Tech Stack:** Next.js App Router (Server Components for the KV read), `@vercel/kv`, existing `lib/bazi.ts`/`lib/ziwei.ts` client-side chart computation, existing `HepanResultView`/`HepanCharts` (unmodified).

## Global Constraints

- Do not modify `components/HepanResultView.tsx`, `lib/couple.ts`, `app/api/reading/couple*`, or `app/api/reading/bazi-couple*` — this feature is purely a new way to *arrive* at the existing hepan reading with both people's data populated, not a change to the reading itself.
- Do not modify `lib/usePaywall.ts`, `lib/chartType.ts`, or any Stripe/checkout file — hepan is already permanently free (`PERMANENTLY_FREE_TYPES`, commit e6061bd); this feature relies on that already being true and must not touch it.
- All user-facing copy is Traditional Chinese (zh-TW), matching every existing page in this app.
- No test framework exists in this repo (no jest/vitest, no `*.test.ts` files) — verification is `npx tsc --noEmit` / `npm run build`, plus a live end-to-end browser or `fetch()`-based check before considering a task done, matching this repo's established convention (see e.g. the niandu plan's Task 2/3/4 verification approach).
- Invite records expire after 30 days (`ex: 60 * 60 * 24 * 30`), matching `lib/sseWriter.ts`'s `CACHE_TTL` convention elsewhere in this codebase.
- The `/compare/[inviteId]` page must not be indexed by search engines (`robots: { index: false }` in its `metadata` export) — it's a personalized, ephemeral URL, not SEO content.

---

### Task 1: KV invite-record helpers

**Files:**
- Create: `lib/compareInvite.ts`

**Interfaces:**
- Produces: `PersonSnapshot { date: string; hour: number; gender: "male" | "female"; name?: string }`, `CompareInvite { personA: PersonSnapshot; personB?: PersonSnapshot & { respondedAt: number }; relType: RelationshipType; createdAt: number }`, `createInvite(personA: PersonSnapshot, relType: RelationshipType): Promise<string>` (returns a new `inviteId`), `getInvite(inviteId: string): Promise<CompareInvite | null>`, `respondToInvite(inviteId: string, personB: PersonSnapshot): Promise<boolean>` (returns `false` if the invite doesn't exist) — consumed by Tasks 2, 3, and 6.

- [ ] **Step 1: Write the file**

Create `lib/compareInvite.ts`:

```ts
// Server-authoritative hepan invite state, persisted in @vercel/kv — same
// pattern as lib/unlock.ts's unlock:${chartId} keys, new key namespace.
// A visitor creates an invite from their own birth data (Person A); a second
// visitor opening the link supplies their own (Person B); once both are
// present, the compare page computes both charts client-side and hands off
// to the existing (unmodified) HepanResultView.

import type { RelationshipType } from "./coupleTypes";

export interface PersonSnapshot {
  date: string;   // "YYYY-MM-DD"
  hour: number;
  gender: "male" | "female";
  name?: string;
}

export interface CompareInvite {
  personA: PersonSnapshot;
  personB?: PersonSnapshot & { respondedAt: number };
  relType: RelationshipType;
  createdAt: number;
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches lib/sseWriter.ts's CACHE_TTL convention

function keyFor(inviteId: string): string {
  return `compare:${inviteId}`;
}

function randomInviteId(): string {
  // 16 hex chars — short enough for a shareable URL, long enough that
  // guessing another user's invite ID isn't practical.
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createInvite(personA: PersonSnapshot, relType: RelationshipType): Promise<string> {
  const inviteId = randomInviteId();
  const record: CompareInvite = { personA, relType, createdAt: Date.now() };
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(keyFor(inviteId), record, { ex: TTL_SECONDS });
  } catch {
    /* KV unavailable — invite simply won't persist; caller still gets an id back
       but the compare page will report it as expired/missing, which is the
       correct degraded behavior rather than a hard failure. */
  }
  return inviteId;
}

export async function getInvite(inviteId: string): Promise<CompareInvite | null> {
  if (!inviteId) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<CompareInvite>(keyFor(inviteId))) ?? null;
  } catch {
    return null;
  }
}

export async function respondToInvite(inviteId: string, personB: PersonSnapshot): Promise<boolean> {
  const existing = await getInvite(inviteId);
  if (!existing) return false;
  const updated: CompareInvite = { ...existing, personB: { ...personB, respondedAt: Date.now() } };
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(keyFor(inviteId), updated, { ex: TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `lib/compareInvite.ts`.

- [ ] **Step 3: Write and run a scratch verification script (round-trips through real KV if configured, or confirms the graceful-degradation path if not)**

Create `scripts/_verify_compare_invite.mjs`:

```js
import { createInvite, getInvite, respondToInvite } from '../lib/compareInvite.ts';

const id = await createInvite({ date: '1990-01-15', hour: 11, gender: 'female', name: '小美' }, 'lover');
console.log('created invite:', id, typeof id === 'string' && id.length === 16);

const fetched = await getInvite(id);
console.log('fetched:', JSON.stringify(fetched));

const ok = await respondToInvite(id, { date: '1988-06-01', hour: 9, gender: 'male', name: '阿明' });
console.log('responded ok:', ok);

const final = await getInvite(id);
console.log('final:', JSON.stringify(final));
console.log('personB present:', !!final?.personB);

const missing = await getInvite('0000000000000000');
console.log('missing invite returns null:', missing === null);
```

Run:
```bash
cd ~/Projects/fortune-app
npx tsx scripts/_verify_compare_invite.mjs
```
Expected: if `KV_REST_API_URL` is set in `.env.local`, `created invite: <id> true`, the fetched/final records print with `personB present: true`, and `missing invite returns null: true`. If KV isn't configured locally, every `kv` call throws internally and is caught — `getInvite` calls will print `fetched: null` and `final: null`, `personB present: false`, and `respondToInvite` will return `false` (since `getInvite` inside it returns null) — this is the correct degraded-without-KV behavior, not a bug; confirm the script doesn't crash either way.

- [ ] **Step 4: Delete the scratch script**

```bash
cd ~/Projects/fortune-app
rm scripts/_verify_compare_invite.mjs
```

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fortune-app
git add lib/compareInvite.ts
git commit -m "feat(compare): add KV-backed hepan invite record helpers"
```

---

### Task 2: Create-invite API route

**Files:**
- Create: `app/api/compare/invite/route.ts`

**Interfaces:**
- Consumes: `createInvite`, `PersonSnapshot` from `lib/compareInvite.ts` (Task 1); `checkRateLimit`/`rateLimitResponse` from `lib/rateLimit.ts`; `RELATIONSHIP_TYPES` from `lib/coupleTypes.ts`.
- Produces: `POST` handler returning `{ inviteId: string }` — consumed by `components/HepanFlow.tsx`'s cold-start mode (Task 7).

- [ ] **Step 1: Write the route**

Create `app/api/compare/invite/route.ts`:

```ts
import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { createInvite, type PersonSnapshot } from "@/lib/compareInvite";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@/lib/coupleTypes";

export interface CreateInviteResult {
  inviteId: string;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "compare-invite" })).allowed) {
    return rateLimitResponse();
  }

  let body: { date?: string; hour?: number; gender?: string; name?: string; relType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { date, hour, gender, name, relType } = body;
  if (!date || typeof hour !== "number" || (gender !== "male" && gender !== "female")) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!relType || !(relType in RELATIONSHIP_TYPES)) {
    return Response.json({ error: "invalid_relType" }, { status: 400 });
  }

  const personA: PersonSnapshot = {
    date: date.slice(0, 20),
    hour,
    gender,
    name: name ? name.slice(0, 50) : undefined,
  };

  const inviteId = await createInvite(personA, relType as RelationshipType);

  return Response.json({ inviteId } satisfies CreateInviteResult);
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `app/api/compare/invite/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add app/api/compare/invite/route.ts
git commit -m "feat(compare): add POST /api/compare/invite route"
```

---

### Task 3: Respond-to-invite API route

**Files:**
- Create: `app/api/compare/[inviteId]/respond/route.ts`

**Interfaces:**
- Consumes: `respondToInvite`, `PersonSnapshot` from `lib/compareInvite.ts` (Task 1); `checkRateLimit`/`rateLimitResponse` from `lib/rateLimit.ts`.
- Produces: `POST` handler returning `{ ok: true }` or a 404-shaped error — consumed by `components/CompareRespondForm.tsx` (Task 4).

- [ ] **Step 1: Write the route**

Create `app/api/compare/[inviteId]/respond/route.ts`:

```ts
import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { respondToInvite, type PersonSnapshot } from "@/lib/compareInvite";

export interface RespondInviteResult {
  ok: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "compare-respond" })).allowed) {
    return rateLimitResponse();
  }

  const { inviteId } = await params;
  if (!inviteId) return Response.json({ error: "missing_invite" }, { status: 400 });

  let body: { date?: string; hour?: number; gender?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { date, hour, gender, name } = body;
  if (!date || typeof hour !== "number" || (gender !== "male" && gender !== "female")) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const personB: PersonSnapshot = {
    date: date.slice(0, 20),
    hour,
    gender,
    name: name ? name.slice(0, 50) : undefined,
  };

  const ok = await respondToInvite(inviteId, personB);
  if (!ok) return Response.json({ error: "invite_not_found" }, { status: 404 });

  return Response.json({ ok: true } satisfies RespondInviteResult);
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `app/api/compare/[inviteId]/respond/route.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add "app/api/compare/[inviteId]/respond/route.ts"
git commit -m "feat(compare): add POST /api/compare/[inviteId]/respond route"
```

---

### Task 4: Person B's response form

**Files:**
- Create: `components/CompareRespondForm.tsx`

**Interfaces:**
- Consumes: `BirthdayWheel` from `./WheelPicker` (props: `date`, `hour`, `onDateChange`, `onHourChange` — same as every other flow in this app); `RelationshipConfig` from `@/lib/coupleTypes`.
- Produces: default-exported `CompareRespondForm({ inviteId, personALabel, relConfig, onResponded })` where `onResponded: (personB: { date: string; hour: number; gender: "male" | "female"; name?: string }) => void` fires after a successful submit — consumed by `app/compare/[inviteId]/page.tsx` (Task 6).

- [ ] **Step 1: Write the file**

Create `components/CompareRespondForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BirthdayWheel } from "./WheelPicker";
import type { RelationshipConfig } from "@/lib/coupleTypes";

interface PersonBFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

export interface RespondedPerson {
  date: string;
  hour: number;
  gender: "male" | "female";
  name?: string;
}

interface Props {
  inviteId: string;
  personALabel: string; // Person A's name, or a generic fallback, for "OO 想看你們的緣分"
  relConfig: RelationshipConfig;
  onResponded: (personB: RespondedPerson) => void;
}

export default function CompareRespondForm({ inviteId, personALabel, relConfig, onResponded }: Props) {
  const [person, setPerson] = useState<PersonBFields>({ name: "", date: "", hour: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

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
    if (!validate() || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const hour = parseInt(person.hour, 10);
      const gender = person.gender as "male" | "female";
      const res = await fetch(`/api/compare/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: person.date, hour, gender, name: person.name || undefined }),
      });
      if (!res.ok) throw new Error("respond_failed");
      onResponded({ date: person.date, hour, gender, name: person.name || undefined });
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 雙人合盤邀請</p>
        <h1 className="text-xl font-bold text-ink tracking-wide">
          {personALabel} 想看你們的{relConfig.shareLabel}
        </h1>
        <p className="text-sm text-ink-3">
          填寫你的出生資訊，立即檢視你們的 {relConfig.emoji} {relConfig.label} 合盤——完全免費。
        </p>
      </header>

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

        {submitError && (
          <p className="text-sm text-vermillion text-center">送出失敗，請重試一次。</p>
        )}

        <button type="submit" disabled={submitting} style={{ color: "#FDFCF8" }}
          className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm ${
            ready && !submitting
              ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
              : "bg-vermillion/60 cursor-pointer opacity-80"
          }`}>
          {submitting ? "正在排盤…" : ready ? "檢視合盤 →" : "請填寫出生資訊"}
        </button>

        <p className="text-center text-[11px] text-ink-4">
          出生時間預設按北京時間（UTC+8）排盤 · 資訊僅用於本次推算，不會用於其他用途
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `components/CompareRespondForm.tsx`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add components/CompareRespondForm.tsx
git commit -m "feat(compare): add Person B's invite-response form"
```

---

### Task 5: Compare result (computes both charts, renders the existing HepanResultView)

**Files:**
- Create: `components/CompareResult.tsx`

**Interfaces:**
- Consumes: `HepanResultView`, `type HepanCharts` from `@/components/HepanResultView` (props: `{charts: HepanCharts, onReset: () => void}`); `calculateBazi` from `@/lib/bazi`; `calculateZiwei` from `@/lib/ziwei`; `RelationshipType` from `@/lib/coupleTypes`; `PersonSnapshot` from `@/lib/compareInvite`.
- Produces: default-exported `CompareResult({ personA, personB, relType })` — consumed by `app/compare/[inviteId]/page.tsx` (Task 6).

- [ ] **Step 1: Write the file**

Create `components/CompareResult.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import HepanResultView, { type HepanCharts } from "./HepanResultView";
import { calculateBazi } from "@/lib/bazi";
import type { RelationshipType } from "@/lib/coupleTypes";
import type { PersonSnapshot } from "@/lib/compareInvite";

interface Props {
  personA: PersonSnapshot;
  personB: PersonSnapshot;
  relType: RelationshipType;
}

function personKey(p: PersonSnapshot): string {
  return `${p.date.replace(/-/g, "")}${p.hour}${p.gender}`;
}

async function computeCharts(personA: PersonSnapshot, personB: PersonSnapshot, relType: RelationshipType): Promise<HepanCharts> {
  const { calculateZiwei } = await import("@/lib/ziwei");
  const [ya, ma, da] = personA.date.split("-").map(Number);
  const [yb, mb, db] = personB.date.split("-").map(Number);

  const [baziA, ziweiA, baziB, ziweiB] = await Promise.all([
    Promise.resolve(calculateBazi(ya, ma, da, personA.hour, personA.gender)),
    calculateZiwei(ya, ma, da, personA.hour, personA.gender),
    Promise.resolve(calculateBazi(yb, mb, db, personB.hour, personB.gender)),
    calculateZiwei(yb, mb, db, personB.hour, personB.gender),
  ]);

  return {
    baziA, ziweiA, baziB, ziweiB,
    nameA: personA.name || undefined,
    nameB: personB.name || undefined,
    genderA: personA.gender, genderB: personB.gender,
    dateA: personA.date, hourA: personA.hour, dateB: personB.date, hourB: personB.hour,
    sessionId: `${personKey(personA)}_${personKey(personB)}_${relType}`,
    relType,
  };
}

export default function CompareResult({ personA, personB, relType }: Props) {
  const [charts, setCharts] = useState<HepanCharts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    computeCharts(personA, personB, relType)
      .then((c) => { if (!cancelled) setCharts(c); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-2">
        <p className="text-sm text-vermillion">排盤失敗，請重新整理頁面重試。</p>
      </div>
    );
  }

  if (!charts) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-2">
        <p className="text-sm text-ink-3">正在排盤…</p>
      </div>
    );
  }

  return <HepanResultView charts={charts} onReset={() => {}} />;
}
```

Note: `onReset` is a required prop on `HepanResultView` but has no meaningful action here (there's no birth-entry form on this page to reset back to) — passed as a no-op. If `HepanResultView`'s reset button renders regardless, that's an acceptable minor UX nit for v1 (clicking it just does nothing), not a defect worth a `HepanResultView` change per this plan's Global Constraints.

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `components/CompareResult.tsx`. Confirm `HepanCharts` is genuinely exported from `components/HepanResultView.tsx` (it is — `export interface HepanCharts` — verify with `grep -n "export interface HepanCharts" components/HepanResultView.tsx` if the type import fails).

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/fortune-app
git add components/CompareResult.tsx
git commit -m "feat(compare): add CompareResult — computes both charts, renders existing HepanResultView"
```

---

### Task 6: `/compare/[inviteId]` page

**Files:**
- Create: `app/compare/[inviteId]/page.tsx`

**Interfaces:**
- Consumes: `getInvite` from `@/lib/compareInvite` (Task 1); `CompareRespondForm` from `@/components/CompareRespondForm` (Task 4); `CompareResult` from `@/components/CompareResult` (Task 5); `getRelationshipConfig` from `@/lib/coupleTypes`.
- Produces: the `/compare/[inviteId]` route.

- [ ] **Step 1: Write the file**

Create `app/compare/[inviteId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getInvite } from "@/lib/compareInvite";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import CompareRespondForm, { type RespondedPerson } from "@/components/CompareRespondForm";
import CompareResultClient from "./CompareResultClient";

export const metadata: Metadata = {
  title: "雙人合盤邀請 — 命裡",
  robots: { index: false, follow: false },
};

interface PageParams { inviteId: string }

export default async function ComparePage({ params }: { params: Promise<PageParams> }) {
  const { inviteId } = await params;
  const invite = await getInvite(inviteId);

  if (!invite) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-3">
          <p className="text-lg font-bold text-ink">此連結已失效</p>
          <p className="text-sm text-ink-3">邀請連結可能已過期或不存在，請向對方索取新的邀請連結。</p>
        </div>
      </main>
    );
  }

  const relConfig = getRelationshipConfig(invite.relType);

  if (invite.personB) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-10">
        <CompareResultClient personA={invite.personA} personB={invite.personB} relType={invite.relType} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-16">
      <CompareRespondForm
        inviteId={inviteId}
        personALabel={invite.personA.name || "朋友"}
        relConfig={relConfig}
        onResponded={(() => {}) as (p: RespondedPerson) => void}
      />
    </main>
  );
}
```

- [ ] **Step 2: Write the client wrapper that swaps the form for the result on submit**

`CompareRespondForm.onResponded` needs to trigger a client-side switch to `CompareResult` without a full page reload (so the newly-computed charts render immediately). Since `page.tsx` above is a Server Component (it reads KV directly), the interactive "form → result" swap needs its own small Client Component wrapper — create `app/compare/[inviteId]/CompareResultClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import CompareRespondForm, { type RespondedPerson } from "@/components/CompareRespondForm";
import CompareResult from "@/components/CompareResult";
import type { PersonSnapshot, CompareInvite } from "@/lib/compareInvite";
import { getRelationshipConfig } from "@/lib/coupleTypes";

interface Props {
  personA: PersonSnapshot;
  personB?: CompareInvite["personB"];
  relType: CompareInvite["relType"];
}

export default function CompareResultClient({ personA, personB: initialPersonB, relType }: Props) {
  const [personB, setPersonB] = useState<PersonSnapshot | undefined>(initialPersonB);

  if (personB) {
    return <CompareResult personA={personA} personB={personB} relType={relType} />;
  }

  return (
    <CompareRespondForm
      inviteId=""
      personALabel={personA.name || "朋友"}
      relConfig={getRelationshipConfig(relType)}
      onResponded={(p: RespondedPerson) => setPersonB(p)}
    />
  );
}
```

**Note — reconcile Step 1 and Step 2:** Step 1's server component should NOT render `CompareRespondForm` directly in the "no personB yet" branch — it should delegate entirely to `CompareResultClient`, which owns both the "waiting for B" and "B has responded" states via its own `useState`, and receives the real `inviteId` so `CompareRespondForm`'s fetch call actually hits the right endpoint. Rewrite `app/compare/[inviteId]/page.tsx` from Step 1 to this corrected version instead:

```tsx
import type { Metadata } from "next";
import { getInvite } from "@/lib/compareInvite";
import CompareResultClient from "./CompareResultClient";

export const metadata: Metadata = {
  title: "雙人合盤邀請 — 命裡",
  robots: { index: false, follow: false },
};

interface PageParams { inviteId: string }

export default async function ComparePage({ params }: { params: Promise<PageParams> }) {
  const { inviteId } = await params;
  const invite = await getInvite(inviteId);

  if (!invite) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-3">
          <p className="text-lg font-bold text-ink">此連結已失效</p>
          <p className="text-sm text-ink-3">邀請連結可能已過期或不存在，請向對方索取新的邀請連結。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <CompareResultClient inviteId={inviteId} personA={invite.personA} personB={invite.personB} relType={invite.relType} />
    </main>
  );
}
```

And `CompareResultClient` needs `inviteId` threaded through to `CompareRespondForm` — update its `Props`/usage from Step 2 to:

```tsx
"use client";

import { useState } from "react";
import CompareRespondForm, { type RespondedPerson } from "@/components/CompareRespondForm";
import CompareResult from "@/components/CompareResult";
import EntryTracker from "@/components/EntryTracker";
import type { PersonSnapshot, CompareInvite } from "@/lib/compareInvite";
import { getRelationshipConfig } from "@/lib/coupleTypes";

interface Props {
  inviteId: string;
  personA: PersonSnapshot;
  personB?: CompareInvite["personB"];
  relType: CompareInvite["relType"];
}

export default function CompareResultClient({ inviteId, personA, personB: initialPersonB, relType }: Props) {
  const [personB, setPersonB] = useState<PersonSnapshot | undefined>(initialPersonB);

  if (personB) {
    return (
      <>
        {/* Fires once each on mount (EntryTracker's own localStorage dedup key
            prevents re-logging on a later revisit of the same link) — mirrors
            HepanResultView's two EntryTracker calls, one per person, same
            method="hepan"-sibling convention but tagged "compare" so these
            entries are filterable apart from the direct-entry hepan flow. */}
        <EntryTracker date={personA.date} hour={personA.hour} gender={personA.gender} name={personA.name} method="compare" dedupeKey="compare_birth" relationshipType={relType} />
        <EntryTracker date={personB.date} hour={personB.hour} gender={personB.gender} name={personB.name} method="compare" dedupeKey="compare_birth" relationshipType={relType} />
        <CompareResult personA={personA} personB={personB} relType={relType} />
      </>
    );
  }

  return (
    <CompareRespondForm
      inviteId={inviteId}
      personALabel={personA.name || "朋友"}
      relConfig={getRelationshipConfig(relType)}
      onResponded={(p: RespondedPerson) => setPersonB(p)}
    />
  );
}
```

**Interfaces (updated):** `CompareResultClient` also consumes `EntryTracker` from `@/components/EntryTracker` (props: `date`, `hour`, `gender`, `name?`, `method`, `dedupeKey`, `relationshipType?` — the last two added in the 2026-09-09/10 hepan relationship-tracking work, already live).

- [ ] **Step 3: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `app/compare/[inviteId]/page.tsx` or `app/compare/[inviteId]/CompareResultClient.tsx`.

- [ ] **Step 4: Live end-to-end verification**

Run the dev server and exercise the full loop with a real invite:

```bash
cd ~/Projects/fortune-app
npm run dev &
sleep 5
# Create an invite exactly like HepanFlow's cold-start mode will (Task 7) —
# this call already works even before Task 7 exists, since Task 2's route is independent.
curl -s -X POST http://localhost:3000/api/compare/invite \
  -H "Content-Type: application/json" \
  -d '{"date":"1990-01-15","hour":11,"gender":"female","name":"小美","relType":"lover"}'
```

Expected: `{"inviteId":"<16 hex chars>"}`. Take that `inviteId` and open `http://localhost:3000/compare/<inviteId>` in a browser (or `curl` it) — expect the "小美 想看你們的情侶‧戀人 合盤" respond form to render. Submit Person B's data through the form in a real browser, confirm it swaps to the full hepan reading (both people's names, score card, and — since hepan is unpaywalled — the full AI reading, not a `PaywallLock`). Then kill the dev server (`kill %1` or the equivalent for however it was backgrounded).

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fortune-app
git add "app/compare/[inviteId]/page.tsx" "app/compare/[inviteId]/CompareResultClient.tsx"
git commit -m "feat(compare): add /compare/[inviteId] page (respond form + result, or expired state)"
```

---

### Task 7: HepanFlow cold-start "邀請朋友合盤" mode

**Files:**
- Modify: `components/HepanFlow.tsx`

**Interfaces:**
- Consumes: `createInvite`'s HTTP contract via `fetch("/api/compare/invite")` (Task 2, already returns `{inviteId}`); `RELATIONSHIP_TYPES` (already imported in this file).
- Produces: a cold-start mode inside the existing `HepanFlow` component, reachable via a new toggle, and via URL params (`?adate=&ahour=&agender=&aname=&invite=1`) for Task 8's cross-sell CTA to land on directly.

- [ ] **Step 1: Add invite-mode state and the toggle**

In `components/HepanFlow.tsx`, add a new state variable and a small mode toggle above the existing relationship-type picker. Find this block (inside `export default function HepanFlow()`, after the existing `useState` declarations):

```tsx
  const [personA, setPersonA] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [personB, setPersonB] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [relType, setRelType] = useState<RelationshipType>("lover");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<Charts | null>(null);
```

Replace with (adds `inviteMode`, `creatingInvite`, `inviteUrl`):

```tsx
  const [personA, setPersonA] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [personB, setPersonB] = useState<PersonFields>({ name: "", date: "", hour: "", gender: "" });
  const [relType, setRelType] = useState<RelationshipType>("lover");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [computing, setComputing] = useState(false);
  const [charts, setCharts] = useState<Charts | null>(null);
  // "邀請朋友合盤" cold-start mode: only Person A's data is collected; submitting
  // creates a KV-backed invite (lib/compareInvite.ts via /api/compare/invite)
  // instead of computing both charts directly. inviteUrl holds the generated
  // shareable link once creation succeeds.
  const [inviteMode, setInviteMode] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
```

- [ ] **Step 2: Detect the cross-sell URL params on mount and pre-fill + enter invite mode**

Find the existing mount `useEffect` that restores from URL:

```tsx
  useEffect(() => {
    const restored = hepanInputFromUrl();
    if (!restored) { setRestoring(false); return; }
    computeCharts(restored.a, restored.b, restored.relType)
      .then((c) => { setPersonA(restored.a); setPersonB(restored.b); setRelType(restored.relType); setCharts(c); })
      .catch(() => {}) // malformed/edge-case URL params — fall back to the blank form
      .finally(() => setRestoring(false));
  }, []);
```

Replace with (adds a check for the invite-mode cross-sell params, which only carry Person A's fields, before falling back to the existing full-restore check):

```tsx
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("invite") === "1") {
        const adate = params.get("adate") ?? "";
        const ahour = params.get("ahour") ?? "";
        const agender = params.get("agender");
        if (adate && ahour !== "" && (agender === "male" || agender === "female")) {
          setPersonA({ name: params.get("aname") ?? "", date: adate, hour: ahour, gender: agender });
          setInviteMode(true);
          setRestoring(false);
          return;
        }
      }
    }
    const restored = hepanInputFromUrl();
    if (!restored) { setRestoring(false); return; }
    computeCharts(restored.a, restored.b, restored.relType)
      .then((c) => { setPersonA(restored.a); setPersonB(restored.b); setRelType(restored.relType); setCharts(c); })
      .catch(() => {}) // malformed/edge-case URL params — fall back to the blank form
      .finally(() => setRestoring(false));
  }, []);
```

- [ ] **Step 3: Add the invite-creation submit handler**

After the existing `async function onSubmit(e: React.FormEvent) { ... }`, add a sibling handler:

```tsx
  async function onSubmitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (creatingInvite) return;
    const e2: Record<string, string> = {};
    if (!personA.date) e2.adate = "請填寫出生日期";
    if (!personA.gender) e2.agender = "請選擇性別";
    if (!personA.hour && personA.hour !== "0") e2.ahour = "請選擇出生時辰";
    setErrors(e2);
    if (Object.keys(e2).length > 0) return;

    setCreatingInvite(true);
    try {
      const res = await fetch("/api/compare/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: personA.date,
          hour: parseInt(personA.hour, 10),
          gender: personA.gender,
          name: personA.name || undefined,
          relType,
        }),
      });
      if (!res.ok) throw new Error("invite_failed");
      const data: { inviteId: string } = await res.json();
      setInviteUrl(`${window.location.origin}/compare/${data.inviteId}`);
    } catch {
      setErrors({ invite: "產生邀請連結失敗，請重試一次。" });
    } finally {
      setCreatingInvite(false);
    }
  }
```

- [ ] **Step 4: Render the invite-mode UI**

Find the final `return` block's form (the one starting `return ( <form onSubmit={onSubmit} ...`). Insert the invite-mode toggle immediately before the `<div className="space-y-2">` that renders the relationship-type picker, and branch the whole form body on `inviteMode`. Replace:

```tsx
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className={labelClass}>關係型別 <span className="text-vermillion">*</span></label>
```

with:

```tsx
  if (inviteMode) {
    if (inviteUrl) {
      return (
        <div className="space-y-6 text-center">
          <div className="border border-border-warm rounded-xl p-5 bg-paper space-y-3">
            <p className="text-sm font-semibold text-ink">邀請連結已產生！</p>
            <p className="text-xs text-ink-3">把這個連結傳給對方，對方填寫自己的生辰後，你們就能立即看到完整合盤。</p>
            <div className="flex items-center gap-2">
              <input readOnly value={inviteUrl}
                className="flex-1 bg-parchment border border-border-warm rounded-lg px-3 py-2 text-xs text-ink-2" />
              <button type="button"
                onClick={() => navigator.clipboard?.writeText(inviteUrl)}
                className="text-xs bg-vermillion text-white px-3 py-2 rounded-lg hover:bg-vermillion-h transition-colors whitespace-nowrap">
                複製連結
              </button>
            </div>
          </div>
          <button type="button" onClick={() => { setInviteMode(false); setInviteUrl(null); }}
            className="text-xs text-ink-3 hover:text-vermillion transition-colors underline underline-offset-2">
            改成自己填兩人資料 →
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={onSubmitInvite} className="space-y-6">
        <div className="space-y-2">
          <label className={labelClass}>關係型別 <span className="text-vermillion">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(RELATIONSHIP_TYPES).map((r) => (
              <button key={r.key} type="button" onClick={() => setRelType(r.key)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-all ${
                  relType === r.key
                    ? "border-vermillion bg-vermillion-l text-vermillion font-semibold"
                    : "border-border-warm bg-paper text-ink-3 hover:border-vermillion/40"
                }`}>
                <span className="text-lg leading-none">{r.emoji}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
          <PersonForm label="你的資料" person={personA} onChange={(p) => setPersonA((prev) => ({ ...prev, ...p }))} errors={errors} prefix="a" />
        </div>

        {errors.invite && <p className="text-xs text-vermillion text-center">{errors.invite}</p>}

        <button type="submit" disabled={creatingInvite} style={{ color: "#FDFCF8" }}
          className="w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1">
          {creatingInvite ? "產生邀請連結中…" : "產生邀請連結 →"}
        </button>

        <button type="button" onClick={() => setInviteMode(false)}
          className="block mx-auto text-xs text-ink-3 hover:text-vermillion transition-colors underline underline-offset-2">
          改成自己填兩人資料 →
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className={labelClass}>關係型別 <span className="text-vermillion">*</span></label>
        <button type="button" onClick={() => setInviteMode(true)}
          className="block mt-1 text-xs text-vermillion hover:text-vermillion-h transition-colors underline underline-offset-2">
          還不知道對方生辰？改成邀請朋友自己填 →
        </button>
      </div>
      <div className="space-y-2">
        <label className={labelClass}>關係型別 <span className="text-vermillion">*</span></label>
```

**Note:** the replacement above duplicates the `關係型別` label line — remove the *first* occurrence (the one immediately followed by the invite-mode link) since the second one already exists in the untouched code below it. The link should sit between the two, not repeat the label. The corrected insertion is:

```tsx
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <button type="button" onClick={() => setInviteMode(true)}
        className="block text-xs text-vermillion hover:text-vermillion-h transition-colors underline underline-offset-2">
        還不知道對方生辰？改成邀請朋友自己填 →
      </button>
      <div className="space-y-2">
        <label className={labelClass}>關係型別 <span className="text-vermillion">*</span></label>
```

- [ ] **Step 5: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `components/HepanFlow.tsx`.

- [ ] **Step 6: Live verification**

```bash
cd ~/Projects/fortune-app
npm run dev &
sleep 5
```

Open `http://localhost:3000/hepan` in a browser. Click "還不知道對方生辰？改成邀請朋友自己填", fill in only your own birth data, submit, and confirm an invite link appears with a working "複製連結" button. Open that link in a second tab/incognito window and confirm it lands on the `CompareRespondForm` from Task 6. Then kill the dev server.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/fortune-app
git add components/HepanFlow.tsx
git commit -m "feat(compare): add cold-start invite mode to HepanFlow"
```

---

### Task 8: "邀請朋友合盤" cross-sell CTA on solo and niandu results

**Files:**
- Modify: `components/WizardFlow.tsx` (solo's result view — add near the existing tab content, not inside `ToolCTA` which is reserved for the homepage-form cross-sell and must not be repurposed)
- Modify: `components/NianduResultView.tsx`

**Interfaces:**
- Consumes: nothing new — this is a plain `<Link>` to `/hepan?invite=1&adate=&ahour=&agender=&aname=`, which `HepanFlow.tsx`'s Task 7 mount effect already knows how to consume.
- Produces: nothing new for later tasks — this is the last task in the plan.

- [ ] **Step 1: Add the CTA to NianduResultView**

In `components/NianduResultView.tsx`, find the existing `ToolCTA` block:

```tsx
      <div className="mb-6">
        <ToolCTA
          source="niandu"
          sub="看完年度關鍵提醒，也來看看你的完整命盤吧——三合、四化、飛星三派合參，AI 依據逾百部典籍，為你逐宮詳批命格、大限與流年。"
          label="生成我的個人命盤詳批"
        />
      </div>
```

Add a new block immediately after it (this component already has `date`, `hour`, `gender`, `name` in scope from `charts` destructured near the top of the component):

```tsx
      <div className="mb-6">
        <Link
          href={`/hepan?invite=1&adate=${encodeURIComponent(date)}&ahour=${hour}&agender=${gender}${name ? `&aname=${encodeURIComponent(name)}` : ""}`}
          className="block text-center bg-paper border border-border-warm text-ink-2 text-sm font-medium px-6 py-3 rounded-full hover:border-vermillion/50 hover:text-vermillion transition-colors"
        >
          邀請朋友合盤，看看你們的緣分 →
        </Link>
      </div>
```

`Link` is already imported in this file (`import Link from "next/link";`) — confirm this before adding, no new import needed.

- [ ] **Step 2: Add the same CTA to solo's result view**

`WizardFlow.tsx`'s props (`interface WizardFlowProps`, line 353) are `{ ziwei: ZiweiResult, bazi, gender: string, birthYear: number, sessionId, name?: string, dateLabel, timeLabel, onExportReady }` — there's no plain `date`/`hour` field. The real birth date lives at `ziwei.birth.solarDate` (`"YYYY-MM-DD"`), but the real hour does **not** — `ziwei.birth.timeIndex` is an iztro shichen *index* (0–12, see `lib/ziwei.ts`'s `hourToShichen`), not the clock-hour format `HepanFlow.tsx`'s `BirthdayWheel`/cold-start mode expects (23,1,3,5,7,9,11,13,15,17,19,21). Add a small local reverse-mapping helper near the top of `components/WizardFlow.tsx` (outside the component function, alongside its other top-level helpers):

```tsx
// Reverse of lib/ziwei.ts's hourToShichen — maps an iztro shichen index (0–12)
// back to a representative clock hour, for cross-linking into flows (like
// HepanFlow's invite mode) that take a plain hour instead of a shichen index.
function shichenIndexToHour(timeIndex: number): number {
  if (timeIndex === 0 || timeIndex === 12) return 23; // 子時 (both the 0 and 12 iztro indices map here)
  return timeIndex * 2 - 1;
}
```

Then, inside the component, find the `overview` tab's rendered content (the free tab every visitor sees regardless of paywall state — search for where `case "overview":` or the equivalent tab-content branch renders, matching the pattern already seen in this file's `case "cautions":` block). Add a CTA immediately after that tab's existing content, structurally identical to Task 8 Step 1's `NianduResultView` addition:

```tsx
<div className="mb-6">
  <Link
    href={`/hepan?invite=1&adate=${encodeURIComponent(ziwei.birth.solarDate)}&ahour=${shichenIndexToHour(ziwei.birth.timeIndex)}&agender=${gender}${name ? `&aname=${encodeURIComponent(name)}` : ""}`}
    className="block text-center bg-paper border border-border-warm text-ink-2 text-sm font-medium px-6 py-3 rounded-full hover:border-vermillion/50 hover:text-vermillion transition-colors"
  >
    邀請朋友合盤，看看你們的緣分 →
  </Link>
</div>
```

Confirm `Link` from `next/link` is already imported in this file before adding (it is — used elsewhere in this same component per earlier grep results in this codebase's other files following the same convention); if for some reason it isn't in this specific file, add `import Link from "next/link";` to its import block.

- [ ] **Step 3: Verify it type-checks**

Run:
```bash
cd ~/Projects/fortune-app
npx tsc --noEmit
```
Expected: no errors touching `components/NianduResultView.tsx` or `components/WizardFlow.tsx`.

- [ ] **Step 4: Full production build**

```bash
cd ~/Projects/fortune-app
npm run build
```
Expected: build succeeds, `/compare/[inviteId]` listed as a dynamic (ƒ) route (not static — it reads KV per-request), `/api/compare/invite` and `/api/compare/[inviteId]/respond` listed as API routes, no errors.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/fortune-app
git add components/NianduResultView.tsx components/WizardFlow.tsx
git commit -m "feat(compare): add 邀請朋友合盤 cross-sell CTA to solo and niandu results"
```

---

## Post-plan manual check (not a task — do this yourself in a browser before calling it done)

1. From a niandu result (or solo result), click "邀請朋友合盤" and confirm it lands on `/hepan` with your own data pre-filled and invite mode already active.
2. Generate an invite link, open it in a different browser/incognito to simulate Person B, submit B's data, confirm the full hepan reading renders with no paywall lock anywhere.
3. Re-open the same invite link a third time (simulating Person A checking back) and confirm it goes straight to the result, not back to the form.
4. Open a made-up/invalid invite ID (e.g. `/compare/0000000000000000`) and confirm the "此連結已失效" state renders instead of a crash or raw 404.
5. Check the Google Sheet `births` tab for two new `readingKind: "compare"`-tagged rows (one per person, per `CompareResultClient`'s two `EntryTracker` calls in Task 6) after completing a real invite flow end-to-end.
