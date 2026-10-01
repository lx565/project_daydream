# mingli-app Phase 2: IAP Paywall Design

**Goal:** Let users unlock a saved profile's AI reading content for $6.99 via Apple In-App Purchase, matching the web app's existing per-chart pricing, without building an accounts system.

**Repo:** `~/Projects/mingli-app` (the iOS app). No fortune-app backend changes — this is entirely client-side.

**Status:** Phase 1 (free tier, all reading screens unlocked) is code-complete. This spec covers Phase 2 only.

## Context

The web app (`fortune-app`) gates AI reading content behind a Stripe-based paywall, keyed by a single `chartId` per chart-generation session, unlocked server-side via webhook → Vercel KV (`lib/usePaywall.ts`, `components/PaywallLock.tsx`). There is no account system on the web — unlock is purely tied to the chart/session.

The app has no equivalent backend concept of a "session" — it has locally-stored `SavedProfile` records (`app/lib/profileStorage.ts`, AsyncStorage, no backend). Apple requires IAP (not Stripe) for unlocking digital content inside an iOS app, so Phase 2 replaces Stripe with StoreKit via RevenueCat, re-using the profile as the unlock boundary instead of a chart session.

## Decisions made (confirmed with Niki, 2026-10-01)

1. **Pricing granularity: per profile, bundled.** One $6.99 purchase unlocks every AI reading screen (總覽/大運/八字/眾說/注意/問命 + the Chart tab's merged palace-reading section) for that one saved profile. Matches the web's existing solo-chart price exactly. The Ziwei chart itself (12-palace grid + mingge/格局 detection) stays free always, on every profile, whether unlocked or not.
2. **No cross-device sync, no accounts.** Unlock status lives in local device storage only, alongside the profile data that already lives there. A user who deletes the app or switches phones loses their purchased unlocks and would need to repurchase — accepted tradeoff for shipping without any backend/account system.
3. **IAP library: RevenueCat** (`react-native-purchases`). Handles the purchase flow, Apple receipt verification, and (for applicable product types) Restore Purchases, without needing a custom receipt-validation backend. Free tier covers this app's expected volume.
4. **Product type: Consumable.** Profiles are user-created and unbounded in number, so a single Apple product can't be pre-registered per profile. The purchase must be a **Consumable** IAP (`unlock_reading`, $6.99) — bought repeatedly, one unit "spent" per profile unlocked. **Important consequence:** Apple does not support Restore Purchases for consumables (that mechanism only applies to subscriptions/non-consumables) — this is consistent with decision 2 (no recovery path is expected or promised to the user).

## Architecture

```
User taps a gated reading screen for a locked profile
  → PaywallGate renders instead of reading content
  → User taps "解鎖 $6.99"
  → purchases.ts calls RevenueCat purchasePackage() for `unlock_reading`
  → On success: profileStorage.unlockProfile(profile.id) sets unlocked: true, persists to AsyncStorage
  → PaywallGate's onUnlocked callback fires → screen re-renders → reading content (or useReading's existing generate-or-load-from-cache flow) proceeds normally
```

No new backend routes. No new backend data store. The only persistent state Phase 2 adds is one boolean field on the existing locally-stored profile record.

## Components

### `app/lib/purchases.ts` (new)
Thin wrapper around the RevenueCat SDK:
- `configurePurchases(): void` — calls `Purchases.configure({ apiKey })` once, at app startup (in the root `App` component / navigation root, alongside any other one-time startup calls already there).
- `purchaseUnlock(): Promise<{ success: true } | { success: false; error: string; cancelled: boolean }>` — wraps `Purchases.purchasePackage()` for the `unlock_reading` package, translating RevenueCat's error shape into this simple result (distinguishing a user-cancelled purchase from a genuine failure, so the UI doesn't show a scary error message for a deliberate cancel).

### `app/components/PaywallGate.tsx` (new)
Props: `{ profile: SavedProfile; onUnlocked: () => void }`.

Visual/copy pattern adapted from the web's `components/PaywallLock.tsx` (card with lock icon, "解鎖完整命書" header, included-sections list, price, CTA button) — translated from the web's Tailwind/HTML to React Native `View`/`Text`/`Pressable`, using this app's existing `theme.ts` tokens (not the web's Tailwind classes). Drop the web-specific pieces that don't apply here: no `UnlockSocialProof` fetch (that's a web-conversion-optimization embellishment, not core to the gate), no Stripe/Apple Pay copy (replaced with a single native purchase button — Apple's own payment sheet handles payment method selection).

On tap: calls `purchaseUnlock()`. On success: calls `profileStorage.unlockProfile(profile.id)`, then `onUnlocked()`. On failure (not cancelled): shows an inline error with a retry affordance, mirroring the existing error+retry pattern already used in `useReading`-backed screens. On cancel: silently resets to the idle gate (no error shown — the user deliberately backed out).

### `app/lib/profileStorage.ts` (modify)
- Extend `SavedProfile` interface with `unlocked?: boolean` (default/absent = false, consistent with how `relationship?: string` was added earlier as an optional field on an existing interface).
- Add `unlockProfile(id: string): Promise<void>` — loads the profile list, sets `unlocked: true` on the matching entry, persists, mirroring the existing `deleteProfile`/`addProfile` read-modify-write pattern already in this file.

### Reading screens (modify: `OverviewScreen`, `DecadesScreen`, `BaziScreen`, and the 更多 submenu screens — 眾說/注意/問命 — plus `ChartScreen`'s merged palace-reading section)
Each wraps its AI-content rendering with:
```tsx
{profile.unlocked ? (
  <ExistingReadingContent />
) : (
  <PaywallGate profile={profile} onUnlocked={() => setProfile({ ...profile, unlocked: true })} />
)}
```
`ChartScreen` specifically: only the bottom merged palace-AI-reading section (added earlier today, commit `6ec6870`) gets this treatment. The 12-palace grid and mingge/格局 detection section above it render unconditionally regardless of `unlocked` — these are free on every profile, this was never in question.

The exact local-state mechanism for reflecting `onUnlocked` immediately (without requiring a profile reload) is an implementation detail for the task plan — each screen already receives `profile` as a route param and most hold it in local state or re-read it from storage on focus; the plan should pick whichever pattern each screen already uses and stay consistent with it, not introduce a new one per screen.

## Error handling & edge cases

- **Purchase cancelled**: `purchaseUnlock()` returns `cancelled: true`; `PaywallGate` resets to idle with no error message.
- **Purchase fails for another reason** (network, Apple-side error, sandbox misconfiguration during dev/TestFlight testing): inline Chinese error message + retry button, consistent with this app's established `toErrorMessage()` fallback pattern (`app/lib/useReading.ts`) for user-facing error text.
- **RevenueCat SDK not configured / API key missing**: should fail the purchase attempt gracefully (surfaced as a normal purchase error), not crash the app. A plan task should verify this explicitly (e.g. a deliberately-blank-key dev check), since a crash here would be a hard app-store-review and day-one-user blocker.
- **TestFlight / development testing**: Apple's sandbox IAP environment applies automatically to TestFlight and Simulator/device debug builds signed with a development provisioning profile — testing needs a Sandbox Apple ID (created in App Store Connect), not code changes.
- **Existing Phase-1-era test profiles**: no migration needed. This app has no real users yet; any profile created before this field existed simply has `unlocked` absent/falsy, identical to a brand-new profile.

## Testing

No test suite exists for this repo currently (consistent with the rest of Phase 1 — `tsc --noEmit` is the verification bar, not a Jest/RTL suite). The implementation plan should specify manual verification steps for the purchase flow (sandbox purchase succeeds → profile unlocks → content renders; purchase cancel → gate stays locked, no error; purchase failure → error+retry shown) since this is payment-path code where a silent logic bug has real financial/trust consequences, not just a cosmetic one.

## Out of scope (explicitly not Phase 2)

- Accounts, sign-in, or any cross-device identity.
- Receipt-validation backend (RevenueCat's own infrastructure covers this).
- Subscriptions or any pricing model other than the single $6.99 consumable.
- Changes to the web app's existing Stripe paywall — untouched.
- iCloud-backed unlock persistence (considered, declined for Phase 2 — see Decisions #2).
