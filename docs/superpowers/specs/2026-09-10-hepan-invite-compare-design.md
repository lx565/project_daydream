# Hepan Invite-and-Compare (Lightweight Social Loop) — Design

**Status:** Approved 2026-09-11 ("let's work on the share feature") — moving to an implementation plan. Originally a self-run brainstorm (Niki asked me to run it alone while he stepped out); revised below after two decisions he made once back: hepan is now **permanently free** (see `lib/usePaywall.ts`'s `PERMANENTLY_FREE_TYPES`, commit e6061bd), which removes the paid-unlock step this design originally proposed, and the remaining open questions from the first draft were resolved with my own best judgment rather than asked one-by-one, matching how the rest of this session has run.

## 1. Problem / Opportunity

From `reference-mingli-competitors` (2026-09-09 competitor teardown of Co-Star/The Pattern/Starla/Nebula): the single biggest growth lever those apps share is a **social comparison loop** — "add a friend, see your compatibility" — not the horoscope itself. Domestic-style 玄学 apps (and 命裡's current 雙人合盤/hepan) are single-player: one person types in *both* people's birth data themselves, generates a report, done. There is no invite mechanism, no moment where a second real person enters the product on their own.

This matters because hepan is 命裡's closest existing product to Co-Star's mechanic — it already computes a real two-person chart — but structurally it can't go viral, because the second person never touches the product.

## 2. Goal

Give hepan a **lightweight invite-and-compare loop**: Person A starts a compare, sends a link to Person B, Person B enters their own birth data on their own, and both land straight on the full hepan reading — free, since hepan no longer has a paywall to unlock. Primary goal is **acquisition** (a real second visitor per share) with a secondary benefit of a nicer flow for two people who already both want a reading (no more one person guessing/typing their friend's exact birth hour for them).

## 3. Explicit non-goals (this round)

- **No user accounts.** 命裡 is anonymous-first today; this is a stated asset (see competitor doc's "Gaps" section — rivals capture email before value, 命裡 doesn't). Full accounts are a much bigger, separate bet — deliberately out of scope here.
- **No push notifications / friend graph.** Person A finds out B responded by revisiting their own invite link, not via an in-app notification system.
- **No new pricing/unlock logic** — hepan is now permanently free (2026-09-11 decision), so this design no longer needs a paid-unlock step at all; both people see the full existing hepan reading directly once B responds.

## 4. Approaches considered

**A — Invite-link compare (recommended).** Person A generates a shareable link from their own already-computed chart (solo or niandu result) or a small standalone "邀請朋友合盤" entry point if they don't have one yet. The link carries an invite ID backed by a KV record (same pattern as `lib/unlock.ts`'s `unlock:${chartId}` keys — no new infra class, just a new key namespace). Person B opens the link cold, enters their own birth data, and the system runs the **existing** full hepan pipeline (`lib/couple.ts` scoring + `couple/preview` teaser + the paid `couple`/`bazi-couple` routes, now unpaywalled) — both people land on the same full reading, no unlock step.
*Trade-off:* no live notification back to A when B responds (v1 accepts this — A just re-opens their link to check).

**B — Shareable "challenge card," no live compare.** After any reading, generate a screenshot-style card with a personality/trait teaser and a generic "see if you're compatible" CTA that sends new visitors into hepan cold, with no 1:1 invite thread.
*Trade-off:* much cheaper to build (pure image export, reuses `html2canvas` patterns already in the app), but doesn't actually build the "specific two people compare" hook — this is really approach for the *shareable-artifact* insight (#5 in the competitor notes), not the *social-loop* insight (#1), and on its own doesn't close the gap that motivated this brainstorm.

**C — Full accounts + persistent friend graph.** Real signup, saved friends list, repeat/ongoing compares, notifications.
*Trade-off:* closest to Co-Star's actual depth, but contradicts 命裡's anonymous-first identity, and is a major scope jump (auth, user model, notification infra) relative to everything else in this codebase. Not recommended now — worth revisiting only if A validates real demand for the loop at all.

**Recommendation: A.** It's the smallest version that actually creates the mechanic (a real second person enters the product via a link), and it reuses an unusually large share of existing infrastructure (`lib/couple.ts` scoring, `couple/preview` prompt, KV token pattern, URL-persistence-for-checkout trick). B is worth doing too, later, as a complement — not a substitute.

## 5. Design (Approach A)

**Entry points (resolved — both, per open question 1 below):**
1. A "邀請朋友合盤" CTA on solo and niandu result pages (same `ToolCTA` cross-sell pattern already used there) — reuses that visitor's already-computed chart, zero new data entry for Person A.
2. A small standalone "邀請朋友合盤" mode reachable from `/hepan` itself, for someone arriving cold with no existing reading — same relationship-type picker `HepanFlow.tsx` already has, but only Person A's birth fields (Person B's fields simply aren't shown in this mode — the whole point is A doesn't have to already know B's exact birth hour).

Resolved (open question 2): both paths are supported — having an existing reading isn't required, just the faster path when available.

**New KV record** (`compare:${inviteId}`, 30-day TTL matching `CACHE_TTL` convention elsewhere): `{ personA: { ziwei, bazi?, name, gender }, createdAt, personB?: { ziwei, bazi?, name, gender, respondedAt }, relationshipType }`.

**New routes:**
- `POST /api/compare/invite` — takes Person A's already-computed chart + relationship type (resolved, open question 3: A picks it upfront, matching current hepan behavior — B doesn't get a separate say), writes the KV record, returns `inviteId`.
- `GET /compare/[inviteId]` — landing page. If `personB` absent: show "OO 想看你們的緣分" + a birth-input form for Person B (reuses `BirthdayWheel` + gender picker from `HepanFlow.tsx`). If present: show the full reading directly (so A revisiting their own link, or B's link being reopened, both just land on the result).
- `POST /api/compare/[inviteId]/respond` — Person B's submit. Computes both charts and hands off straight into the existing `HepanResultView` full-reading flow (hepan is unpaywalled now, so there's no separate "free preview then unlock" state to build) — writes `personB` into the KV record so the link stays permanently answered for future visits by either party.

**Result view:** reuses `HepanResultView` as-is — no new result UI, and open question 4 (unlock price) is moot now that hepan has no paywall. The only thing this feature adds is a way to *arrive* at that existing component with both people's data already populated, instead of one person typing both in themselves.

**Error handling:** expired/missing invite ID → friendly "此連結已失效" page, not a raw 404. Person B abandoning mid-form → the KV record just sits with `personB` absent until TTL expiry; no cleanup job needed.

**Entry tracking:** both A's invite-creation and B's response should fire `EntryTracker` with a new `method="compare"` (same generic pipeline used by hepan/monthly/niandu — no Apps Script changes needed, `readingKind` just gets a new value automatically written through, per the `doPost` script reviewed 2026-09-09, which has no allowlist on that field).

## 6. What this deliberately reuses vs. builds new

**Reused as-is:** `lib/couple.ts` 4-dimension scoring, `couple/preview` + `couple`/`bazi-couple` full reading routes (now free for everyone, not just hepan-via-invite), `lib/unlock.ts`-style KV token pattern, `BirthdayWheel`/gender-picker UI, `HepanResultView` (unchanged), `EntryTracker`/`/api/track/birth` pipeline.

**New:** one KV record shape, 2 API routes, 1 dynamic landing page (`/compare/[inviteId]`), a cold-start "just my own data" mode added to `HepanFlow.tsx`'s existing form, 1 new CTA placement on solo/niandu result pages.

## 7. Open questions — resolved 2026-09-11

All four questions from the original draft are resolved above (entry points in §5, relationship-type handling in §5's routes, unlock price made moot by hepan going permanently free). No open questions remain blocking a plan.

---
*Note on how this doc was produced: Niki asked me to run the initial brainstorm autonomously while he stepped away, and separately asked me to resolve the remaining open questions myself rather than one-by-one, matching how the rest of this session ran. Approved 2026-09-11 ("let's work on the share feature") — next step is superpowers:writing-plans.*
