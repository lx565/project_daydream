# Hepan Invite-and-Compare (Lightweight Social Loop) — Design

**Status:** Self-run brainstorm (Niki asked me to run this alone while he stepped out — see note at the end). Presented for his review when he's back. Per superpowers:brainstorming's hard gate, **no implementation has started** — this is a design for approval, not a plan.

## 1. Problem / Opportunity

From `reference-mingli-competitors` (2026-09-09 competitor teardown of Co-Star/The Pattern/Starla/Nebula): the single biggest growth lever those apps share is a **social comparison loop** — "add a friend, see your compatibility" — not the horoscope itself. Domestic-style 玄学 apps (and 命裡's current 雙人合盤/hepan) are single-player: one person types in *both* people's birth data themselves, generates a report, done. There is no invite mechanism, no moment where a second real person enters the product on their own.

This matters because hepan is 命裡's closest existing product to Co-Star's mechanic — it already computes a real two-person chart — but structurally it can't go viral, because the second person never touches the product.

## 2. Goal

Give hepan a **lightweight invite-and-compare loop**: Person A starts a compare, sends a link to Person B, Person B enters their own birth data on their own, both see a free compatibility teaser, and either can unlock the existing full paid report. Primary goal is **acquisition** (a real second visitor per share) with a secondary benefit of a nicer flow for two people who already both want a reading (no more one person guessing/typing their friend's exact birth hour for them).

## 3. Explicit non-goals (this round)

- **No user accounts.** 命裡 is anonymous-first today; this is a stated asset (see competitor doc's "Gaps" section — rivals capture email before value, 命裡 doesn't). Full accounts are a much bigger, separate bet — deliberately out of scope here.
- **No push notifications / friend graph.** Person A finds out B responded by revisiting their own invite link, not via an in-app notification system.
- **No change to the existing $6.99 hepan report itself** — this sits in front of it as a new free entry point, not a redesign of the paid product.

## 4. Approaches considered

**A — Invite-link compare (recommended).** Person A generates a shareable link from an existing result (solo or niandu) or a small new standalone entry point. The link carries an invite ID backed by a KV record (same pattern as `lib/unlock.ts`'s `unlock:${chartId}` keys — no new infra class, just a new key namespace). Person B opens the link cold, enters their own birth data, and the system computes the **existing** deterministic 4-dimension score (`lib/couple.ts` — already built, zero new scoring logic) plus a short free AI teaser (mirrors `couple/preview/route.ts` — already built). Both people land on the same free result; either can unlock the full paid report, which pre-fills both people's data via the same URL-persistence trick already used for Stripe returns.
*Trade-off:* no live notification back to A when B responds (v1 accepts this — A just re-opens their link to check).

**B — Shareable "challenge card," no live compare.** After any reading, generate a screenshot-style card with a personality/trait teaser and a generic "see if you're compatible" CTA that sends new visitors into hepan cold, with no 1:1 invite thread.
*Trade-off:* much cheaper to build (pure image export, reuses `html2canvas` patterns already in the app), but doesn't actually build the "specific two people compare" hook — this is really approach for the *shareable-artifact* insight (#5 in the competitor notes), not the *social-loop* insight (#1), and on its own doesn't close the gap that motivated this brainstorm.

**C — Full accounts + persistent friend graph.** Real signup, saved friends list, repeat/ongoing compares, notifications.
*Trade-off:* closest to Co-Star's actual depth, but contradicts 命裡's anonymous-first identity, and is a major scope jump (auth, user model, notification infra) relative to everything else in this codebase. Not recommended now — worth revisiting only if A validates real demand for the loop at all.

**Recommendation: A.** It's the smallest version that actually creates the mechanic (a real second person enters the product via a link), and it reuses an unusually large share of existing infrastructure (`lib/couple.ts` scoring, `couple/preview` prompt, KV token pattern, URL-persistence-for-checkout trick). B is worth doing too, later, as a complement — not a substitute.

## 5. Design (Approach A)

**Entry point:** a "找朋友比一比" CTA added to solo and niandu result pages (same `ToolCTA` cross-sell pattern already used there), plus optionally a small dedicated `/compare` landing page for cold entry.

**New KV record** (`compare:${inviteId}`, 30-day TTL matching `CACHE_TTL` convention elsewhere): `{ personA: { ziwei, bazi?, name, gender }, createdAt, personB?: { ziwei, bazi?, name, gender, respondedAt }, relationshipType }`.

**New routes:**
- `POST /api/compare/invite` — takes Person A's already-computed chart + relationship type, writes the KV record, returns `inviteId`.
- `GET /compare/[inviteId]` — landing page. If `personB` absent: show "OO 想看你們的緣分" + a birth-input form for Person B (reuses `BirthdayWheel` + gender picker from `HepanFlow.tsx`). If present: show the compare result directly (so A revisiting their own link, or B's link being reopened, both just show the result).
- `POST /api/compare/[inviteId]/respond` — Person B's submit. Computes the deterministic score (`lib/couple.ts`) + free AI teaser (mirrors `couple/preview/route.ts`), writes `personB` into the KV record, returns the result.

**Free result view:** the 4-dimension score card (already exists as a component) + AI teaser, shown to both. CTA: "解鎖完整合盤 $6.99" → routes into the *existing* hepan paid flow, both birth-data sets pre-filled via URL params (reuses the `history.replaceState` pattern `HepanFlow.tsx` already uses for Stripe-return persistence — same trick, new trigger).

**Error handling:** expired/missing invite ID → friendly "此連結已失效" page, not a raw 404. Person B abandoning mid-form → the KV record just sits with `personB` absent until TTL expiry; no cleanup job needed.

**Entry tracking:** both A's invite-creation and B's response should fire `EntryTracker` with a new `method="compare"` (same generic pipeline used by hepan/monthly/niandu — no Apps Script changes needed, `readingKind` just gets a new value automatically written through, per the `doPost` script reviewed 2026-09-09, which has no allowlist on that field).

## 6. What this deliberately reuses vs. builds new

**Reused as-is:** `lib/couple.ts` 4-dimension scoring, `couple/preview` prompt/AI-teaser pattern, `lib/unlock.ts`-style KV token pattern, `BirthdayWheel`/gender-picker UI, URL-persistence-for-checkout trick, `EntryTracker`/`/api/track/birth` pipeline, existing $6.99 hepan paid flow (untouched).

**New:** one KV record shape, 2 API routes, 1 dynamic landing page (`/compare/[inviteId]`), 1 new CTA placement on 2 existing result pages.

## 7. Open questions for Niki (resolve before this becomes a plan)

1. Where should the "找朋友比一比" CTA physically live — only on solo/niandu results, or also a standalone landing page reachable from the homepage nav (like `/niandu` and `/hepan` are)?
2. Should Person A need to have *already* generated their own reading, or can someone start a compare cold (type their own birth data fresh, specifically to invite someone)? (This spec assumes "both," but the CTA-only entry point makes "already have a reading" the primary path — worth confirming that's the intended emphasis.)
3. Relationship type: does A pick it when creating the invite (matches current hepan, which picks it upfront), or does B also get a say/confirmation once they land? Assumed: A picks it, matching current hepan behavior — no new UI for this.
4. Is $6.99 the right unlock price for this lighter-weight entry funnel, or should there be a specific "invite compare" price point? Assumed: reuse $6.99 as-is (no new `ChartType`, same pattern niandu used to reuse monthly's price) — flag if this should differ.

---
*Note on how this doc was produced: Niki asked me to run this brainstorm autonomously while he stepped away, rather than the normal one-question-at-a-time interactive flow. I made the calls in sections 2-5 myself and documented my reasoning inline rather than asking him live; section 7 lists the specific points I'd normally have asked about but answered provisionally instead. This spec is not yet approved — per the brainstorming skill's hard gate, no implementation plan will be written until he reviews this.*
