# Purchase-Bound Unlock Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the same-birthday revenue leak by binding `/result` unlock state to a purchase-specific token instead of a bare boolean, while keeping the actual purchaser's own device exactly as frictionless as today.

**Architecture:** `crypto.randomUUID()` is minted at Stripe Checkout creation, carried through `session.metadata` and the `success_url`, written to KV by the webhook (`unlock:${chartId} = { token }`), and verified on every `/api/unlock` check via a query param (from the URL, present right after payment) or an `HttpOnly` cookie (set on the first successful check, carries the purchaser through every later visit with no token in the URL). A different browser with no cookie and no token, entering the same birth data, still sees the paywall. The 2 pre-existing legacy unlock records (bare `true`, no token) are grandfathered permanently.

**Tech Stack:** Next.js 15 App Router route handlers, `@vercel/kv`, Stripe Checkout + webhooks, `crypto.randomUUID()`, no new dependencies.

## Global Constraints

- Scope is solo `/result` only. `/hepan` and `/bazihepan` are explicitly out of scope (confirmed in the spec: their chart IDs combine both people's birth data + relationship type, ~383M combinations, no meaningful collision risk) — do not touch `components/HepanFlow.tsx`, `components/BaziHepanFlow.tsx`, or their routes in this plan.
- The 2 legacy unlock records (`unlock:19901217female`, `unlock:2002112515female`) must resolve `true` forever, unconditionally, regardless of any token — never break existing paying customers.
- No TTL on any unlock KV write, ever — "永久保存" is a live marketing promise (this was already fixed earlier; do not reintroduce an `ex` option).
- No automated test framework exists in this codebase. Verification is `npx tsx` sanity scripts for pure logic + manual click-through for the full flow — every task's testing step must give exact commands/URLs, not "write tests for this."
- Traditional Chinese for all user-facing copy (site-wide convention, reconfirmed multiple times earlier this session).
- Do not deploy to production as part of this plan. Every task ends with a local commit. Push and `npx vercel --prod` are a separate, explicit, later step the user controls — the plan's final task ends at "commit," not "deploy."
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, name `unlock_${chartId}`, no `maxAge`/`expires` (session-plus-persistent via browser default when unset is NOT what we want — see Task 4 for the exact option needed for a non-expiring cookie).

## Drift from the spec (verified 2026-07-25, plan-writing time)

The spec (`docs/superpowers/specs/2026-07-24-unlock-token-design.md`, written 2026-07-24) is otherwise fully accurate against the current codebase, with three notable updates since it was written:

1. **The copy-link button in `components/ReadingExport.tsx` was already removed** (as a same-day stopgap leak mitigation, before this token design was approved). The current code has a literal breadcrumb comment: `{/* 分享命盤 copy-link button removed — leaked free access to anyone with the link; reinstate after 2026-07-24-unlock-token-design.md ships */}`. The spec assumed this button still existed as "the primary same-session share path." **This plan restores it** (Task 8) — the token model makes it safe again: a copied URL only works if it carries the real token, so sharing it is equivalent to sharing your own paid access (same as any consumer app), not a birthday-collision free-for-all.
2. **`components/ReadingSession.tsx`'s "已解鎖完整命書" banner already has decent, specific copy** naming the save action (`已解鎖完整命書 — 內容生成完成後，可在頁面底部永久保存或寄送到郵箱`) — this was itself part of the earlier permanent-storage fix this session. The spec assumed this banner needed to be "strengthened" from scratch; it doesn't need a rewrite, just one clause added for the multi-device framing (Task 7).
3. **`app/api/unlock/route.ts`'s file header comment says "Not wired into the UI yet"** — stale; `lib/usePaywall.ts` has called it since earlier this session. Task 4 removes the stale comment while editing the file anyway.

`lib/unlock.ts`'s TTL is already fixed (no `ex` option present) — the spec's assumption there is current, no drift.

---

### Task 1: `lib/unlock.ts` — token-aware data model

**Files:**
- Modify: `lib/unlock.ts` (full rewrite of both exported functions)
- Test: `scripts/verify-unlock-logic.mjs` (new, one-off manual verification script — not a permanent test file, matches this codebase's existing convention of throwaway `npx tsx` verification scripts used earlier this session)

**Interfaces:**
- Produces: `markUnlocked(chartId: string, token: string): Promise<void>` — replaces the current `markUnlocked(chartId: string)`. Every caller in this plan (Task 3) passes a token.
- Produces: `checkUnlock(chartId: string, providedToken?: string): Promise<boolean>` — replaces the current `isUnlocked(chartId: string)`. Every caller in this plan (Task 4) passes `providedToken` (possibly `undefined`).

- [ ] **Step 1: Rewrite `lib/unlock.ts`**

```typescript
// Server-authoritative unlock state, persisted in @vercel/kv.
// A chart becomes "unlocked" only when the Stripe webhook confirms payment.
// Live production module — imported by the Stripe webhook and /api/unlock.
//
// KV value shape at unlock:${chartId}:
//   - legacy `true` (2 pre-existing records: unlock:19901217female,
//     unlock:2002112515female) — grandfathered permanently, resolves
//     unlocked=true regardless of any token. These predate the token model;
//     the real customers behind them must never lose access or need a
//     token they were never issued.
//   - `{ token: string }` (every unlock from here on) — resolves
//     unlocked=true only when the caller's providedToken matches exactly.
//     This binds "unlocked" to a specific purchase, not just a chartId,
//     which is what closes the same-birthday collision leak: a different
//     device/session with matching birth data has no way to know the
//     token, so it still sees the paywall.

type UnlockValue = true | { token: string };

// No TTL — the paywall promises "永久保存 · 可重複查閱" (permanent access), so an
// unlock grant must never expire. Omitting `ex` makes the KV key persist forever.
export async function markUnlocked(chartId: string, token: string): Promise<void> {
  if (!chartId || !token) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`unlock:${chartId}`, { token });
  } catch {
    /* KV unavailable — unlock simply won't persist */
  }
}

export async function checkUnlock(chartId: string, providedToken?: string): Promise<boolean> {
  if (!chartId) return false;
  try {
    const { kv } = await import("@vercel/kv");
    const value = await kv.get<UnlockValue>(`unlock:${chartId}`);
    if (value === null || value === undefined) return false;
    if (value === true) return true; // legacy grandfather — no token ever required
    return !!providedToken && providedToken === value.token;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Write the verification script**

```javascript
// scripts/verify-unlock-logic.mjs
// One-off manual verification for lib/unlock.ts's checkUnlock branching.
// Run: npx tsx --env-file=.env.local scripts/verify-unlock-logic.mjs
// Requires KV_REST_API_URL / KV_REST_API_TOKEN in .env.local (same KV the
// live app uses — this script writes and deletes test keys, does not touch
// any real chartId).

import { markUnlocked, checkUnlock } from "../lib/unlock.ts";

const TEST_CHART = "verify-unlock-logic-test-chart";
const { kv } = await import("@vercel/kv");

let failures = 0;
function check(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  (got ${actual}, expected ${expected})`);
  if (!pass) failures++;
}

// Clean slate
await kv.del(`unlock:${TEST_CHART}`);

// 1. Missing key
check("missing key -> false", await checkUnlock(TEST_CHART), false);

// 2. Legacy true value, no token required
await kv.set(`unlock:${TEST_CHART}`, true);
check("legacy true, no token provided -> true", await checkUnlock(TEST_CHART), true);
check("legacy true, wrong token provided -> true (grandfather ignores token)", await checkUnlock(TEST_CHART, "anything"), true);

// 3. Token-bound value
await markUnlocked(TEST_CHART, "token-a");
check("token-bound, matching token -> true", await checkUnlock(TEST_CHART, "token-a"), true);
check("token-bound, wrong token -> false", await checkUnlock(TEST_CHART, "token-b"), false);
check("token-bound, no token provided -> false", await checkUnlock(TEST_CHART), false);

// Cleanup
await kv.del(`unlock:${TEST_CHART}`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Run the verification script**

Run: `npx tsx --env-file=.env.local scripts/verify-unlock-logic.mjs`
Expected: 6 `PASS` lines, `All checks passed.`, exit code 0.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `lib/unlock.ts` (errors elsewhere are expected until Tasks 2-4 update the callers — if this is the first task run, `app/api/webhook/stripe/route.ts` and `app/api/unlock/route.ts` will now fail to typecheck since they call the old `markUnlocked(chartId)` / `isUnlocked(chartId)` signatures; that's expected and gets fixed in Tasks 3-4, not this one).

- [ ] **Step 5: Commit**

```bash
git add lib/unlock.ts scripts/verify-unlock-logic.mjs
git commit -m "feat(unlock): token-bound checkUnlock/markUnlocked, legacy records grandfathered"
```

---

### Task 2: `app/api/checkout/route.ts` — mint the token at purchase time

**Files:**
- Modify: `app/api/checkout/route.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks.
- Produces: the Stripe Checkout session now carries `metadata.token` (a `crypto.randomUUID()` string) alongside the existing `metadata.chartId`, and `success_url` carries `&token=<same value>`. Task 3 (webhook) reads `metadata.token`. Task 5 (`usePaywall`) reads `?token=` from the returned URL.

- [ ] **Step 1: Generate and thread the token**

In `app/api/checkout/route.ts`, inside the `POST` handler, right after `chartId` is validated (after the existing `if (!chartId) return ...` check) and before the `methods` computation, add:

```typescript
  const token = crypto.randomUUID();
```

Then update the `success_url` line and `metadata` field inside the `params` object:

```typescript
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      payment_method_types: methods,
      locale: "zh", // audience is Chinese-speaking; without this Checkout defaults to browser/English locale
      metadata: { chartId, token }, // webhook reads this to mark the chart unlocked with this token
      success_url: `${origin}${safeReturn}${sep}paid=1&token=${token}`,
      cancel_url: `${origin}${safeReturn}`,
    };
```

`crypto` is a Node global (available in the `"nodejs"` runtime this route already declares via `export const runtime = "nodejs";` at the top of the file) — no new import needed.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing errors from Task 1's signature change in files not yet updated are still expected and fine at this point).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, then in a separate terminal:
```bash
curl -s -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"chartId":"test-chart-123","returnPath":"/result?date=1990-01-01&hour=12&gender=male"}' | python3 -m json.tool
```
Expected: a JSON response with a `url` field pointing at `checkout.stripe.com` (requires `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` in `.env.local` — if those aren't set locally, the route correctly returns `{"error":"stripe_not_configured"}` with a 503, which also confirms the route still loads/compiles; either outcome is an acceptable pass for this step, the goal is confirming no runtime crash from the new `crypto.randomUUID()` call).

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/route.ts
git commit -m "feat(unlock): mint a purchase-specific token at checkout"
```

---

### Task 3: `app/api/webhook/stripe/route.ts` — store the token on payment confirmation

**Files:**
- Modify: `app/api/webhook/stripe/route.ts`

**Interfaces:**
- Consumes: `markUnlocked(chartId: string, token: string): Promise<void>` from Task 1. `session.metadata.token` from Task 2.
- Produces: nothing new consumed by later tasks — this is the write side, Task 4 is the read side.

- [ ] **Step 1: Read the token from metadata and pass it to `markUnlocked`**

In `app/api/webhook/stripe/route.ts`, change the `checkout.session.completed` handling block:

```typescript
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as { metadata?: { chartId?: string; token?: string } };
      const chartId = session.metadata?.chartId;
      const token = session.metadata?.token;
      if (chartId && token) await markUnlocked(chartId, token);
    }
```

(The `import { markUnlocked } from "@/lib/unlock";` line at the top of the file is unchanged — same function name, new signature, already updated by Task 1.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `app/api/webhook/stripe/route.ts`. If `app/api/unlock/route.ts` still shows an error about `isUnlocked` not existing, that's expected — Task 4 fixes it next.

- [ ] **Step 3: Manual verification**

Stripe webhook signature verification means this can't be curl'd directly without a real signed payload. Verify by reading the diff carefully instead: confirm `token` is destructured from `session.metadata`, confirm the `if (chartId && token)` guard (both must be present — a webhook event from a checkout session created before this change, or a malformed one, has no `token` and correctly does nothing rather than crashing or calling `markUnlocked` with `undefined`).

- [ ] **Step 4: Commit**

```bash
git add app/api/webhook/stripe/route.ts
git commit -m "feat(unlock): webhook stores the purchase token, not just a bare unlock flag"
```

---

### Task 4: `app/api/unlock/route.ts` — verify token, set continuity cookie

**Files:**
- Modify: `app/api/unlock/route.ts`

**Interfaces:**
- Consumes: `checkUnlock(chartId: string, providedToken?: string): Promise<boolean>` from Task 1.
- Produces: the route now accepts an optional `?token=` query param, reads a fallback from the `unlock_${chartId}` cookie, and — on a successful check — sets/refreshes that same cookie in the response. Task 5 (`usePaywall`) is the client-side caller; no other task reads this route's output shape (still `{ unlocked: boolean }`, unchanged).

- [ ] **Step 1: Rewrite the route**

```typescript
// Returns whether a chart has been unlocked (paid). The actual unlock is
// granted server-side by the Stripe webhook (see lib/unlock.ts markUnlocked).
// Called by lib/usePaywall.ts on every /result page load.
//
// Token resolution order: explicit ?token= query param (present in the URL
// right after returning from Stripe, or in an emailed/copied reading link)
// takes priority over the unlock_${chartId} cookie (set below on a prior
// successful check, carries the actual purchaser through every later visit
// with no token in the URL). A request with neither — e.g. a different
// browser/device that only knows the birth data, not the token — correctly
// resolves unlocked=false even if the chart is unlocked for someone else.

import { NextRequest, NextResponse } from "next/server";
import { checkUnlock } from "@/lib/unlock";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const chartId = url.searchParams.get("chartId") ?? "";
  const queryToken = url.searchParams.get("token") ?? undefined;
  const cookieToken = request.cookies.get(`unlock_${chartId}`)?.value;
  const token = queryToken ?? cookieToken;

  const unlocked = await checkUnlock(chartId, token);
  const response = NextResponse.json({ unlocked });

  // Refresh/set the continuity cookie only when we have a real token to
  // store — the legacy grandfather case (checkUnlock resolves true from a
  // bare `true` KV value) has no real token, nothing to persist client-side,
  // and doesn't need one since it's already unconditional server-side.
  if (unlocked && queryToken) {
    response.cookies.set(`unlock_${chartId}`, queryToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 10, // ~10 years — no real expiry, matches "永久保存"
    });
  }

  return response;
}
```

Note on the cookie condition: it only fires on `queryToken` (not `cookieToken`), because if the cookie is what resolved `unlocked=true`, the browser already has it — re-setting the same value is harmless but unnecessary. It only needs to be *set* the first time, when the token arrives via the URL (right after Stripe, or from an emailed/copied link).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. This should be the last unlock-related typecheck error to clear.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, then:
```bash
# No chartId/token at all
curl -s "http://localhost:3000/api/unlock?chartId=" | python3 -m json.tool
# Expect: {"unlocked": false}

# A chartId with no unlock record
curl -s "http://localhost:3000/api/unlock?chartId=nonexistent-chart" | python3 -m json.tool
# Expect: {"unlocked": false}
```
If `.env.local` has real KV credentials, also verify against one of the 2 legacy grandfather chartIds directly:
```bash
curl -s "http://localhost:3000/api/unlock?chartId=19901217female" | python3 -m json.tool
# Expect: {"unlocked": true} — with no token in the request at all, confirming the grandfather case still works.
```

- [ ] **Step 4: Commit**

```bash
git add app/api/unlock/route.ts
git commit -m "feat(unlock): verify token (query param or cookie), set continuity cookie"
```

---

### Task 5: `lib/usePaywall.ts` — client-side token handling

**Files:**
- Modify: `lib/usePaywall.ts`

**Interfaces:**
- Consumes: `app/api/unlock` (Task 4) now expects an optional `token` param on the same `chartId` query.
- Produces: `PaywallState` gains a `token: string | undefined` field — **this is what resolves the spec's flagged open question**. `components/WizardFlow.tsx` (Task 7) already calls `usePaywall(sessionId)` and holds the result in a `paywall` variable in the exact scope where `onExportReady` is built — reading `paywall.token` there needs no new plumbing.

- [ ] **Step 1: Thread the token through the hook**

Rewrite `lib/usePaywall.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { gtagEvent } from "@/lib/gtag";

// Client hook resolving the paywall state for a chart.
//
//   enabled  — master switch (NEXT_PUBLIC_PAYWALL_ENABLED === "true").
//              While false the whole feature is inert: every section stays free,
//              so deploying the paywall code changes nothing until you flip the
//              env var in Vercel.
//   unlocked — server-authoritative (granted by the Stripe webhook → KV),
//              read via /api/unlock?chartId=&token=. Returning from Stripe
//              Checkout the URL carries ?paid=1&token=..., so we poll briefly
//              to absorb webhook lag.
//   token    — the token this hook successfully validated with, if any (from
//              the URL's ?token=, present right after Stripe or on an
//              emailed/copied reading link). undefined if unlocked via the
//              unlock_${chartId} cookie alone (no token ever surfaced
//              client-side in that case) or if not unlocked at all. Callers
//              that need to build a shareable link (WizardFlow's export data)
//              use this — it's the one place the validated token is known.
//   loading  — true until the first unlock check resolves; callers should not
//              start (pay for) gated AI sections while loading.

const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

// Fires "purchase" at most once per chart per browser session — guards against
// re-firing on a manual refresh of the ?paid=1 return page (refs alone don't
// survive a remount, only sessionStorage does).
function trackPurchaseOnce(chartId: string) {
  const key = `ga_purchase_tracked_${chartId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  gtagEvent("purchase", { transaction_id: chartId, value: 6.99, currency: "USD" });
}

export interface PaywallState {
  enabled: boolean;
  unlocked: boolean;
  loading: boolean;
  token: string | undefined;
}

export function usePaywall(chartId?: string): PaywallState {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(PAYWALL_ENABLED);
  const [token, setToken] = useState<string | undefined>(undefined);
  const polled = useRef(false);

  useEffect(() => {
    if (!PAYWALL_ENABLED || !chartId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // The URL's ?token= is only present right after Stripe (or on an
    // emailed/copied link) — read it once per mount, not on every check()
    // call, since the cookie (once set) carries continuity without it.
    const urlToken = new URLSearchParams(window.location.search).get("token") ?? undefined;

    async function check(): Promise<boolean> {
      try {
        const qs = new URLSearchParams({ chartId: chartId! });
        if (urlToken) qs.set("token", urlToken);
        const res = await fetch(`/api/unlock?${qs.toString()}`);
        const data = await res.json();
        return data.unlocked === true;
      } catch {
        return false;
      }
    }

    async function run() {
      // Just returned from Stripe? Check this before the unlock check itself —
      // the webhook can land before this page even mounts, so "already unlocked"
      // on the very first check does not mean the purchase was tracked yet.
      const justPaid = new URLSearchParams(window.location.search).has("paid");

      const ok = await check();
      if (cancelled) return;
      if (ok) {
        setUnlocked(true);
        if (urlToken) setToken(urlToken);
        setLoading(false);
        if (justPaid) trackPurchaseOnce(chartId!);
        return;
      }

      // Webhook hasn't landed yet — poll a few times.
      if (justPaid && !polled.current) {
        polled.current = true;
        for (let i = 0; i < 6 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          if (await check()) {
            if (!cancelled) {
              setUnlocked(true);
              if (urlToken) setToken(urlToken);
              trackPurchaseOnce(chartId!);
              break;
            }
          }
        }
      }
      if (!cancelled) setLoading(false);
    }

    run();
    return () => { cancelled = true; };
  }, [chartId]);

  return { enabled: PAYWALL_ENABLED, unlocked, loading, token };
}
```

Every existing behavior is preserved (the `justPaid`/polling/`trackPurchaseOnce` logic is untouched) — the only additions are: `urlToken` read once, sent on every `check()` call via the query string, and `setToken(urlToken)` fired alongside `setUnlocked(true)` in both places `unlocked` was already being set to `true`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/usePaywall.ts`. `components/WizardFlow.tsx` and `components/ReadingSession.tsx` both destructure `{ enabled, unlocked }` or `paywall.enabled`/`paywall.unlocked` today — adding a field to the returned object is additive and does not break either existing call site; confirm no error appears for those two files either.

- [ ] **Step 3: Manual verification**

This hook only runs client-side; verify via the dev server + browser devtools Network tab: load `http://localhost:3000/result?date=1990-01-01&hour=12&gender=male&paid=1&token=test-token-abc` (with `NEXT_PUBLIC_PAYWALL_ENABLED=true` set), confirm the `/api/unlock?chartId=...&token=test-token-abc` request fires with `token` in the query string.

- [ ] **Step 4: Commit**

```bash
git add lib/usePaywall.ts
git commit -m "feat(unlock): usePaywall reads/forwards the URL token, exposes it in PaywallState"
```

---

### Task 6: `lib/emailTemplate.ts` — self-sufficient reading link

**Files:**
- Modify: `lib/emailTemplate.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks — this task only changes the data shape and template rendering.
- Produces: `ReadingEmailData` gains an optional `readingUrl?: string` field. Task 7 (`WizardFlow.tsx`) is the only caller that constructs `ReadingEmailData` objects and is responsible for populating it. Task 8 (`ReadingExport.tsx`) reads `data.readingUrl` for the restored copy-link button.

- [ ] **Step 1: Add the field to the interface**

In `lib/emailTemplate.ts`, update the `ReadingEmailData` interface:

```typescript
export interface ReadingEmailData {
  name?: string;
  gender: "male" | "female";
  birthSummary: string;   // e.g. "1990年3月15日 · 男 · 午時"
  chartSummary: string;   // e.g. "命宮子宮，命主紫微，身主天府，火六局"
  ziwei?: ZiweiResult;    // full chart — renders the 12-palace grid as part one, matching the app
  readingUrl?: string;    // self-sufficient link back to this exact unlocked chart (birth params +
                          // token, when known) — the email must work on any device regardless of
                          // whether that device has the unlock_${chartId} cookie. Omitted (not just
                          // empty-string) when the token isn't known client-side; the fallback text
                          // below points to the homepage in that case, same as before this field existed.
  readings: {
    synthesis?: string;
    overview?: string;
    bazi?: string;
    palaces?: string;
    decades?: string;
    flowYears?: string;
    baziDeep?: string;
    baziSchools?: string;
    baziDecades?: string;
    dualschool?: string;
    cautions?: string;
  };
}
```

- [ ] **Step 2: Use it in the template**

Find this block (currently around line 140-145):

```typescript
      <div style="background:#f9f5ef;border:1px solid #e8ddd0;border-radius:8px;padding:16px 20px;margin-top:32px;">
        <p style="color:#7a6040;font-size:12px;line-height:1.7;margin:0;">
          本報告由 AI 輔助生成，僅供參考，不構成任何決策依據。如需重新查看或生成新命盤，請訪問
          <a href="https://www.mingli.study" style="color:#8B1A1A;">mingli.study</a>
        </p>
      </div>
```

Replace with:

```typescript
      <div style="background:#f9f5ef;border:1px solid #e8ddd0;border-radius:8px;padding:16px 20px;margin-top:32px;">
        <p style="color:#7a6040;font-size:12px;line-height:1.7;margin:0;">
          本報告由 AI 輔助生成，僅供參考，不構成任何決策依據。
          ${data.readingUrl
            ? `<a href="${data.readingUrl}" style="color:#8B1A1A;font-weight:600;">點此在網頁上查看完整命書</a>（此連結已包含解鎖權限，可在任何裝置開啟）`
            : `如需重新查看或生成新命盤，請訪問 <a href="https://www.mingli.study" style="color:#8B1A1A;">mingli.study</a>`}
        </p>
      </div>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `readingUrl` is optional, so every existing caller of `buildReadingEmail`/`ReadingEmailData` that doesn't yet set it (there are none touched until Task 7) still compiles.

- [ ] **Step 4: Manual verification**

Run: `npx tsx -e '
import { buildReadingEmail } from "./lib/emailTemplate.ts";
const withUrl = buildReadingEmail({ gender: "female", birthSummary: "test", chartSummary: "test", readings: {}, readingUrl: "https://www.mingli.study/result?date=1990-01-01&hour=12&gender=female&token=abc" });
const withoutUrl = buildReadingEmail({ gender: "female", birthSummary: "test", chartSummary: "test", readings: {} });
console.log("with URL contains link:", withUrl.html.includes("點此在網頁上查看完整命書"));
console.log("without URL falls back:", withoutUrl.html.includes("mingli.study</a>") && !withoutUrl.html.includes("點此在網頁上查看完整命書"));
'`
Expected: both lines print `true`.

- [ ] **Step 5: Commit**

```bash
git add lib/emailTemplate.ts
git commit -m "feat(unlock): emailed reading link carries the unlock token, self-sufficient on any device"
```

---

### Task 7: `components/WizardFlow.tsx` + `components/ReadingSession.tsx` — build the link, polish the banner

**Files:**
- Modify: `components/WizardFlow.tsx`
- Modify: `components/ReadingSession.tsx`

**Interfaces:**
- Consumes: `PaywallState.token` from Task 5 (already available via the existing `const paywall = usePaywall(sessionId);` at `components/WizardFlow.tsx:403`). `ReadingEmailData.readingUrl` from Task 6.
- Produces: `onExportReady` is now called with `readingUrl` populated — Task 8 (`ReadingExport.tsx`) is the consumer.

- [ ] **Step 1: Build `readingUrl` in `WizardFlow.tsx`**

In `components/WizardFlow.tsx`, find the `onExportReady({...})` call (currently starting around line 502, inside the `useEffect` that fires once `allContentReady && !gated`). Add a `readingUrl` computation right before that `useEffect` (near the other derived values like `paywallPersonalizedHint`, so it's available in the effect's closure):

```typescript
  // Self-sufficient link for the emailed/exported reading — carries the
  // current URL's birth params plus the validated unlock token (if known;
  // undefined when unlocked purely via cookie, see PaywallState.token's
  // doc comment in lib/usePaywall.ts). Only meaningful once unlocked —
  // computed unconditionally here since it's cheap and only actually used
  // inside the onExportReady effect below, which already gates on !gated.
  const readingUrl = (() => {
    if (typeof window === "undefined") return undefined;
    const qs = new URLSearchParams(window.location.search);
    qs.delete("paid"); // one-time Stripe-return marker, not needed for future access
    if (paywall.token) qs.set("token", paywall.token);
    return `${window.location.origin}${window.location.pathname}?${qs.toString()}`;
  })();
```

Then update the `onExportReady({...})` call to include it — find:

```typescript
    onExportReady({
      name,
      gender: gender as "male" | "female",
      birthSummary: [dateLabel, timeLabel, gender].filter(Boolean).join(" · "),
      chartSummary: ziwei.summary ?? "",
      ziwei,
      readings: {
```

Change to:

```typescript
    onExportReady({
      name,
      gender: gender as "male" | "female",
      birthSummary: [dateLabel, timeLabel, gender].filter(Boolean).join(" · "),
      chartSummary: ziwei.summary ?? "",
      ziwei,
      readingUrl,
      readings: {
```

(Everything else in that call — the `readings: {...}` object and its closing — is unchanged.)

- [ ] **Step 2: Polish the `ReadingSession.tsx` banner copy**

In `components/ReadingSession.tsx`, find the existing banner (around line 41):

```typescript
          <span>已解鎖完整命書 — 內容生成完成後，可在頁面底部永久保存或寄送到郵箱</span>
```

Change to:

```typescript
          <span>已解鎖完整命書 — 內容生成完成後，可在頁面底部永久保存或寄送到郵箱（換裝置查看時會用到）</span>
```

This is the one clause the spec's Task 7 asked for (multi-device framing) — the rest of the banner's copy and logic (`enabled && unlocked && !exportData` condition, styling) is already correct from the earlier permanent-storage fix and is left untouched.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, with `NEXT_PUBLIC_PAYWALL_ENABLED=true` and a chart that's actually unlocked (e.g. navigate with `?paid=1&token=<a token you wrote directly into KV for a test chartId via the Task 1 verification script's pattern>`), let the reading finish generating, open browser devtools console, and check the object passed to `onExportReady` — easiest way: temporarily add `console.log(readingUrl)` right after the `readingUrl` computation, confirm it prints a full URL with `token=` set and no `paid=` param, then remove the temporary log before committing.

- [ ] **Step 5: Commit**

```bash
git add components/WizardFlow.tsx components/ReadingSession.tsx
git commit -m "feat(unlock): WizardFlow builds the self-sufficient reading URL, banner mentions multi-device use"
```

---

### Task 8: `components/ReadingExport.tsx` — restore the copy-link button

**Files:**
- Modify: `components/ReadingExport.tsx`

**Interfaces:**
- Consumes: `ReadingEmailData.readingUrl` from Task 6, populated by Task 7.
- Produces: nothing consumed by later tasks — this is the last UI-facing piece.

- [ ] **Step 1: Add copy-link state and handler**

In `components/ReadingExport.tsx`, add a new state variable alongside the existing ones:

```typescript
  const [linkCopied, setLinkCopied] = useState(false);
```

Add a new handler function near `handleShareXhs`:

```typescript
  async function handleCopyLink() {
    if (!data.readingUrl) return;
    await copyToClipboard(data.readingUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }
```

- [ ] **Step 2: Restore the button, conditionally**

Replace the removed-button comment and change the grid from 2 columns to 3 when the link is available. Find:

```typescript
      {/* 分享命盤 copy-link button removed — leaked free access to anyone with the link; reinstate after 2026-07-24-unlock-token-design.md ships */}
      <div className="grid grid-cols-2 gap-3">
```

Replace with:

```typescript
      <div className={`grid gap-3 ${data.readingUrl ? "grid-cols-3" : "grid-cols-2"}`}>
        {/* Copy link — only shown when a self-sufficient token-bearing URL is known
            (see lib/emailTemplate.ts's ReadingEmailData.readingUrl doc comment for
            when it's omitted). Safe to share now: the link only works because it
            carries the actual purchase token, so sharing it is sharing your own
            paid access, not a birthday-collision free-for-all like the pre-token
            version of this button was (removed earlier — see git history). */}
        {data.readingUrl && (
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-border-warm bg-paper hover:border-vermillion/40 hover:bg-paper-2 text-ink-3 hover:text-ink transition-all"
          >
            <span className="text-xl">{linkCopied ? "✓" : "🔗"}</span>
            <span className="text-xs font-medium leading-tight text-center">{linkCopied ? "已複製連結" : "複製連結"}</span>
          </button>
        )}
```

The rest of the grid (Download PDF, Email buttons) is unchanged — only the opening `<div>` tag and the new conditional button before them.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, reach the export section on an unlocked test chart (same setup as Task 7's verification), confirm: (a) with a `readingUrl` present, 3 buttons show including "複製連結"; clicking it copies the URL and shows "已複製連結" for 2.5s, then reverts. (b) Temporarily test the no-`readingUrl` case by checking the grid falls back to 2 columns and no link button renders — this matches the pre-existing state for any reading generated before this feature (or in the rare case `readingUrl` is genuinely unavailable per Task 6's doc comment).

- [ ] **Step 5: Commit**

```bash
git add components/ReadingExport.tsx
git commit -m "feat(unlock): restore the copy-link button — now safe, since the link requires the real purchase token"
```

---

### Task 9: Full manual click-through verification

**Files:** none modified — this task is pure verification of the assembled feature, matching the spec's own "Testing" section scenarios exactly.

**Interfaces:**
- Consumes: the complete feature from Tasks 1-8.
- Produces: nothing — this is the plan's final gate before handing off for push/deploy approval (which is NOT part of this plan, per Global Constraints).

- [ ] **Step 1: Re-run the Task 1 logic verification as a full-system sanity check**

Run: `npx tsx --env-file=.env.local scripts/verify-unlock-logic.mjs`
Expected: still `All checks passed.` — confirms no later task accidentally altered `lib/unlock.ts`'s behavior.

- [ ] **Step 2: End-to-end same-device flow**

With `NEXT_PUBLIC_PAYWALL_ENABLED=true` and real Stripe test-mode keys in `.env.local`:
1. Generate a fresh test chart on `/`, reach `/result`.
2. Trigger checkout, complete payment with Stripe's test card (`4242 4242 4242 4242`, any future expiry/CVC).
3. Confirm the return URL carries both `?paid=1` and `&token=<uuid>`.
4. Confirm the paywall clears (gated sections start loading) within the existing poll window.
5. Refresh the page with no `?token=` in the URL (navigate to the bare `/result?date=...&hour=...&gender=...` without `paid`/`token`) — confirm it's STILL unlocked (the cookie set in Task 4 carries it). This is the "same device must stay frictionless" requirement from the spec — it must pass with zero new friction.

- [ ] **Step 3: Different-device simulation**

1. From Step 2's unlocked chart, open the exact same `/result?date=...&hour=...&gender=...` URL (same birth data, no `token=`) in a different browser or an incognito/private window (no cookie carries over).
2. Confirm the paywall shows — this is the actual leak-close verification, the core requirement of this whole plan.
3. Now paste the full `readingUrl` (copied via Task 8's button, or from Step 2's browser devtools) into that same incognito window.
4. Confirm it unlocks — and confirm a fresh `unlock_${chartId}` cookie gets set for that browser too (check via devtools Application/Storage tab), so this "new" device now also has continuity going forward.

- [ ] **Step 4: Legacy grandfather regression check**

```bash
curl -s "https://www.mingli.study/api/unlock?chartId=19901217female" | python3 -m json.tool
curl -s "https://www.mingli.study/api/unlock?chartId=2002112515female" | python3 -m json.tool
```
Expected: both return `{"unlocked": true}` against the LIVE production KV (read-only GET, safe to run against prod) — confirms this plan's local changes, once deployed, will not regress the 2 real existing customers. (This is the one step in this task that legitimately touches production, and only as a read.)

- [ ] **Step 5: Email link verification**

Using a test chart, trigger the email-report flow from `ReadingExport.tsx`, receive the email, confirm the "點此在網頁上查看完整命書" link is present and opens directly to an unlocked view (not a paywall) even in a browser/device with no prior cookie for that chart.

- [ ] **Step 6: Final full-repo typecheck and build**

```bash
npx tsc --noEmit
npm run build
```
Expected: both clean, zero errors. This is the same verification pattern used for every other change shipped this session.

- [ ] **Step 7: Confirm everything from Tasks 1-8 is committed**

```bash
git log --oneline -9
git status --short
```
Expected: 8 commits (one per Task 1-8) visible at the top of the log, and `git status --short` shows no uncommitted changes related to this feature (`docs/superpowers/specs/2026-07-24-unlock-token-design.md` and this plan file itself may optionally be committed too, at the user's discretion — not required by this plan).

**Do not push or deploy as part of this task.** Report completion and stop — push/`npx vercel --prod` is a separate, explicit step for the user to approve, given this is the highest-stakes single change made today (live payment/webhook/auth code for a revenue-generating product with real paying customers).

---

## Plan self-review

**Spec coverage:** All 8 architecture points from the spec map to a task — (1) data model → Task 1, (2) token generation → Task 2, (3) webhook → Task 3, (4) cookie → Task 4, (5) client → Task 5, (6) `/api/unlock` route → Task 4 (combined with cookie since they're the same file/change), (7) save prompt → Task 7, (8) email link → Tasks 6-7. The spec's "Testing" section's 4 scenarios all appear as explicit steps in Task 9. The spec's one explicitly-flagged open question (how `WizardFlow.tsx` learns the token) is resolved concretely in Task 5 (expose `token` on `PaywallState`) + Task 7 (read `paywall.token`, already in scope at the exact call site) — no new plumbing needed, confirmed by reading the actual current file rather than assuming.

**Placeholder scan:** No TBD/TODO/"add appropriate X" patterns — every step has complete, exact code or exact commands.

**Type consistency:** `markUnlocked(chartId: string, token: string)` and `checkUnlock(chartId: string, providedToken?: string)` (Task 1) are called with matching signatures in Task 3 (`markUnlocked(chartId, token)`) and Task 4 (`checkUnlock(chartId, token)`). `PaywallState.token: string | undefined` (Task 5) is read as `paywall.token` in Task 7, matching. `ReadingEmailData.readingUrl?: string` (Task 6) is set in Task 7's `onExportReady` call and read as `data.readingUrl` in Task 8 — matching field name throughout.
