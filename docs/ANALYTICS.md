# Analytics — event tracking & GA4 setup

Last updated: 2026-07-27

All events fire through `gtagEvent(name, params?)` in `lib/gtag.ts`, which is
SSR-safe (no-ops when `window`/`gtag` is absent) and takes typed params.

---

## Event inventory

| Event | Fires from | Params | Purpose |
|---|---|---|---|
| `form_submit` | `components/FortuneForm.tsx` | — | Birth form submitted successfully |
| `form_validation_failed` | `components/FortuneForm.tsx` | — | Submit blocked by validation — the friction signal (e.g. stuck on the 時辰 picker) |
| `reading_started` | `components/WizardFlow.tsx` | — | Reading page mounted, generation began |
| `reading_completed` | `components/WizardFlow.tsx` | `gated` | All core streams settled with zero errors |
| `reading_error` | `lib/useSSEStream.ts` | `section`, `message` | A reading stream failed |
| `tab_view` | `components/WizardFlow.tsx` | `tab` | An unlocked tab was clicked |
| `locked_tab_click` | `components/WizardFlow.tsx` | `tab` | A 🔒 tab was clicked — strongest purchase-intent signal |
| `paywall_view` | `components/PaywallLock.tsx` | `chart_id`, `section` | Paywall became visible |
| `paywall_checkout_start` | `components/PaywallLock.tsx` | `chart_id`, `section` | Clicked through to Stripe |
| `purchase` | `lib/usePaywall.ts` | `transaction_id`, `value`, `currency` | Payment confirmed (guarded once-per-chart by sessionStorage) |
| `chat_question_sent` | `components/ChatInterface.tsx` | — | 問命 question asked |
| `library_to_tool` | `components/ToolCTA.tsx` | `variant` | SEO article → tool CTA click |
| `export_pdf` | `components/ReadingExport.tsx` | — | PDF/print export |
| `export_email_sent` | `components/ReadingExport.tsx` | — | Reading emailed successfully |
| `share_copy` | `components/ReadingExport.tsx` | — | Share caption copied (platform-neutral) |

### Why `reading_error` lives in `useSSEStream`

Firing it from the hook rather than per-component means every reading route is
covered in one place — including the couple flows (`/hepan`, `/bazihepan`) and
any route added later. `section` is derived from the request URL.

---

## GA4 setup

### 1. Register custom dimensions (required)

Event parameters do **not** appear in reports until registered. They only
collect data going forward — they do not backfill.

**Admin → Data display → Custom definitions → Create custom dimension**, scope `Event`:

| Dimension name | Parameter |
|---|---|
| Section | `section` |
| Tab | `tab` |
| Gated | `gated` |
| Error message | `message` |

### 2. Main funnel (Funnel exploration)

1. `form_submit`
2. `reading_started`
3. `reading_completed`
4. `paywall_view`
5. `paywall_checkout_start`
6. `purchase`

Settings: use an **open funnel** (a lot of traffic lands on `/result` directly
from a shared link and never sees the form), and enable **Show elapsed time**
(time between `reading_started` and `reading_completed` reveals whether slow
generation drives abandonment).

Each drop maps to a different fix:

| Drop | Diagnosis |
|---|---|
| `reading_started` → `reading_completed` | Technical friction — failures, slowness, leaving during generation. Cross-check with `reading_error`. |
| `reading_completed` → `paywall_view` | Exposure — they read it but never reached the paywall |
| `paywall_view` → `paywall_checkout_start` | Persuasion / pricing |
| `paywall_checkout_start` → `purchase` | Checkout friction (card-only, Stripe UX) |

### 3. Error report (Free-form exploration)

- Dimension: `Section`
- Metric: Event count
- Filter: Event name = `reading_error`

Product-health dashboard. A dominant section points at a specific route to fix.

### 4. Verify

Use **Admin → DebugView** or **Reports → Realtime** rather than waiting 24–48h
for standard reports. Generating one reading should produce
`form_submit` → `reading_started` → `reading_completed` in sequence.

---

## History / gotchas

- **`reading_completed` was broken until 2026-07-27.** It lived inside the
  export effect in `WizardFlow.tsx`, which returns early when `gated` (true for
  every non-paying user), and that effect also waits on `allContentReady` →
  `baziDecadesText`, which is never set when gated (`BaziDecades` has
  `preload={!gated}`). So the event only ever fired for users who had already
  paid — the single event meant to measure the largest funnel drop was
  unreachable for ~96% of users. Now in its own effect keyed off `allSettled`
  (already gated-aware), carrying `gated` so free/paid completions are separable.
- **Funnel data collected before 2026-07-27 is a pre-fix baseline**, not a
  stable measurement. Two bugs fixed that day — a 35s generation timeout killing
  longer readings mid-stream, and readings re-streaming from scratch on
  navigation — both would have inflated the `reading_started` drop-off.
- `reading_completed` deliberately does **not** fire when any core stream
  errored; failures are reported by `reading_error` instead, so "completed"
  means a genuinely readable reading.
- When a gated user pays mid-session, `coreStreams` grows from 3 to 9 and
  `allSettled` flips back to false. `reading_completed` is ref-guarded to fire
  at most once per reading session by design.
