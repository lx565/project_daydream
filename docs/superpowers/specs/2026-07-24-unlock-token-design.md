# Purchase-bound unlock design — closing the same-birthday leak

## Problem

`app/result/page.tsx`'s `sessionId` (the paywall's `chartId`) is
`${date}${時辰}${gender}` — deterministic, no name or random component. This is
deliberate: it lets anyone retrieve a reading by re-entering the same birth info,
no bookmark or login needed. But it means two *different* real people who share
birth date + 時辰 (2-hour shichen bucket) + gender get the identical chart ID —
whoever pays first unlocks it for both. Not a privacy or content bug (the chart
really is astrologically identical for both people under the traditional
methodology — showing them the same content is correct), but a real revenue leak:
the second person skips paying entirely.

Birthday-paradox math: 365 × 12 × 2 ≈ 8,760 buckets. At today's scale (2 real
unlocks) this is a non-issue; at hundreds of paying customers it stops being
negligible.

**Confirmed out of scope:** `/hepan` and `/bazihepan` combine *both* people's
birth data + relationship type for their chart IDs (`hepan_${personKey(A)}_
${personKey(B)}_${relType}`, `components/HepanFlow.tsx:432`) — ~383 million
combinations, no meaningful collision risk. This design touches solo `/result`
only.

## Decisions (confirmed with Niki, 2026-07-24)

1. Close the leak for real — don't just paper over it with a save-prompt and
   accept the risk.
2. **Same device/session must stay exactly as frictionless as today.** The
   actual purchaser, on their own device, must never see a paywall again after
   paying — no new friction for the common case.
3. **Different device/session must NOT get free access from birth data alone.**
   Re-entering matching birth info on a device without proof of purchase must
   show the paywall, even if that chart is unlocked for someone else.
4. The mechanism for legitimately reaching a second device is a **prominent
   post-payment save prompt** pointing at the already-built `ReadingExport`
   (email / copy-link / print) — not a new feature, just making it load-bearing
   and prominent instead of a buried nice-to-have.
5. Scope: solo `/result` flow only, per the out-of-scope note above.

## Architecture

**1. Data model (`lib/unlock.ts`)** — the KV value at `unlock:${chartId}`
changes from a bare `true` to `{ token: string }`.

- `markUnlocked(chartId: string, token: string): Promise<void>` — replaces the
  current `markUnlocked(chartId: string)`. Stores `{ token }`, no TTL (unchanged
  from the earlier permanent-access fix).
- `checkUnlock(chartId: string, providedToken?: string): Promise<boolean>` —
  replaces `isUnlocked(chartId: string)`. Reads the stored value:
  - Not found → `false`.
  - Legacy value (literal `true`, no token — the 2 pre-existing unlock records
    `unlock:19901217female` and `unlock:2002112515female`) → `true`
    unconditionally. **These two are grandfathered permanently** — today's real
    customers must never lose access or need a token they were never issued.
  - `{ token }` found → `true` only if `providedToken === token`.

**2. Token generation (`app/api/checkout/route.ts`)** — generate
`crypto.randomUUID()` when creating the Stripe Checkout session. Add it to
`session.metadata` alongside the existing `chartId`. Append it to `success_url`
as a query param (same place `?paid=1` already gets added, e.g.
`${origin}${safeReturn}${sep}paid=1&token=${token}`).

**3. Webhook (`app/api/webhook/stripe/route.ts`)** — on
`checkout.session.completed`, read both `chartId` and `token` from
`session.metadata`, call `markUnlocked(chartId, token)` instead of the current
`markUnlocked(chartId)`.

**4. Cookie for same-device continuity** — `/api/unlock` (GET), on a successful
check (token matched, from URL or an already-set cookie, OR the legacy
grandfather case), sets a cookie `unlock_${chartId}=${token}` — `HttpOnly`,
`Secure`, `SameSite=Lax`, no expiry (matches the "永久保存" promise). Same-origin
requests from that browser automatically send it on future visits, so the actual
purchaser never needs the token in the URL again after the first successful
check. For the legacy grandfather case there's no real token to store in the
cookie — skip setting a cookie there, `checkUnlock` already returns `true`
unconditionally for those two regardless.

**5. Client (`lib/usePaywall.ts`)** — currently detects `?paid=1` via
`justPaid`. Add: also read `?token=` from the URL if present and include it in
the `/api/unlock?chartId=...` fetch (e.g. `&token=...`). The browser handles
sending the cookie automatically on subsequent requests — no client-side token
storage needed beyond what's already in the URL for that one request.

**6. `/api/unlock` route** — accepts an optional `token` query param, reads the
`unlock_${chartId}` cookie as a fallback if no query param token is present,
calls the updated `checkUnlock(chartId, token)`, and — on `true` — sets/refreshes
the cookie in the response.

**7. Post-payment save prompt** — in `components/ReadingSession.tsx`, the
existing "已解鎖完整命書" banner (added earlier this session, condition `enabled
&& unlocked && !exportData`) gets strengthened copy explicitly naming the save
action: something like "已解鎖完整命書 — 點擊下方保存或寄送到郵箱，永久保留這份命書（尤其是在其他裝置查看時需要）". Once
`exportData` is ready and `ReadingExport` renders, no further prompt needed — the
buttons are already there.

**8. Email must carry the working link, not just the homepage** —
`lib/emailTemplate.ts`'s `buildReadingEmail` currently links to bare
`https://www.mingli.study`. Needs the actual chart URL *with the token always
explicitly included* — the email must be self-sufficient on any device,
regardless of whether that device has the unlock cookie, so the token param is
never omitted just because the browser composing the email happens to already
be authenticated via cookie. `ReadingEmailData` needs a new field for this URL
(e.g. `readingUrl: string`), populated by whichever caller builds the email data
(`components/WizardFlow.tsx`'s `onExportReady`) as `window.location.origin +
window.location.pathname + "?" + <query params with date/hour/gender/tz/name
preserved, token always set to the chart's actual stored token>`. This means the
token needs to be available in that component's scope at export-build time —
either read from the current URL's `?token=` param (present if the user is
mid-session right after paying) or, if absent (e.g. they're viewing a
already-unlocked chart via cookie without a token in the URL), the token isn't
directly knowable client-side and the email link should omit `token=` in that
case, relying on the copy-link button (which does carry whatever's in the
current URL) as the primary same-session share path, and treating "share the
emailed link to a device that never had the token" as the one input to
`readingUrl` that may legitimately be blank. Flagging this rather than glossing
over it — the implementation plan should resolve exactly how `WizardFlow.tsx`
gets the token value in this case (candidate: `usePaywall` could expose the
token it successfully validated with, if any, as part of its returned state).

## Testing

No automated test framework in this codebase (consistent with the rest of the
project) — manual verification via dev server + `npx tsx` sanity scripts for the
pure logic in `lib/unlock.ts`:

1. `checkUnlock` unit-style check: legacy `true` value → always `true`
   regardless of token; `{token: "a"}` with providedToken `"a"` → `true`; same
   with `"b"` → `false`; same with no token provided → `false`; missing key →
   `false`.
2. Manual click-through: pay for a test chart (or simulate via the KV write
   directly), confirm same-browser return works with no `?token=` in the URL
   (cookie carries it). Then clear cookies (or use a different browser/incognito)
   and confirm the same chart, same birth data, shows the paywall — then confirm
   pasting the token-bearing link unlocks it and *also* sets a fresh cookie for
   that browser.
3. Confirm the 2 legacy unlocks (`unlock:19901217female`,
   `unlock:2002112515female`) still resolve `true` with zero token, on any
   device — the grandfather case must never regress.
4. Confirm the emailed reading's link actually opens to an unlocked view, not a
   paywalled one.
