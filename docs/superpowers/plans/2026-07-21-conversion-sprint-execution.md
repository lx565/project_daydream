# Conversion Sprint — Execution Plan (Batches B–D)

> **For the executing model:** work through batches in order, one commit per batch,
> verify each batch before moving on. Steps use checkbox (`- [ ]`) syntax. Every code
> block below contains the exact content to use — do not paraphrase or "improve" the
> Chinese copy; transcribe it verbatim.

**Goal:** raise paywall exposure and persuasion on mingli.study. Free users currently
finish the free reading without ever seeing the paywall; this plan makes every free
section end in an open loop, inserts an unlock card at the end of the free content,
and closes a leak where the homepage couple mode serves the paid couple reading free.

**Repo:** `~/Projects/fortune-app` (Next.js 15 App Router, TypeScript, live production
at www.mingli.study). Working tree is clean; base commit `2a06414`.

**Background:** `docs/CONVERSION-PLAN.md` (the full audit) and
`docs/plans → 2026-07-21-yuanfen-v3.md` (this week's prior work). Batch A of this
sprint (visible tab locks, price anchor, social proof, count fixes) is already
committed as `2a06414` — do not redo it.

## Global constraints — READ FIRST, these override your defaults

1. **Never push to origin, never run `vercel`/deploy.** Commit locally only. Deploy is
   a separate step Niki approves explicitly after reviewing your work.
2. **Never delete files** (even apparently-dead ones) without Niki's explicit
   confirmation. This includes `components/PremiumReportCTA.tsx` and
   `components/CoupleResultView.tsx` mentioned below.
3. **Two-layer cache rule:** any change to a reading prompt requires bumping BOTH
   cache versions (server `CACHE_VERSION` in `lib/sseWriter.ts` AND client
   `CACHE_PREFIX` in `lib/useSSEStream.ts`). Batch B includes this. Never bump only one.
4. **Do NOT touch `app/api/reading/overview/route.ts`.** Its output is parsed by
   exact markdown section markers ("標記一字不差") and has a history of marker bugs.
   It is deliberately excluded from this plan.
5. **Script consistency per file:** `components/WizardFlow.tsx` UI strings are
   Traditional Chinese (繁體); `components/PaywallLock.tsx` is Simplified (简体);
   the reading prompts instruct 簡體中文 output. Match each file's existing script
   exactly — mixed-script output is a recurring bug class in this repo.
6. **AI output must never contain 付費/解鎖/完整版 wording** (matches the existing
   preview-route convention — the UI sells; the AI must not).
7. **Cost discipline:** never cause AI generation for gated (non-paying) users. The
   bridge in Batch C is static JSX + the existing PaywallLock — no new AI calls.
8. **Typecheck after every batch:** `cd ~/Projects/fortune-app && npx tsc --noEmit -p tsconfig.json`
   must be clean before each commit.
9. **Dev-server caution:** port 3000 is often occupied by an unrelated project
   (Petite Dumpling Ops). Before killing anything on 3000, check
   `lsof -i :3000` → `lsof -p <PID> | grep cwd`; only kill a process whose cwd is
   `~/Projects/fortune-app`. Otherwise use `PORT=3001 npm run dev`.
10. **Do NOT set `STRIPE_PAYMENT_METHODS`** in Vercel. Alipay/WeChat Pay are 待批准
    (pending Stripe approval); requesting inactive methods breaks checkout for
    everyone. Niki flips this after approval.
11. End commit messages with:
    `Co-Authored-By: <your model name> <noreply@anthropic.com>`

---

## Batch B — Free-prompt "open loop" endings + cache bump

Free sections currently end with tidy conclusions; each should end with one concrete,
chart-specific unanswered question pointing at a locked tab.

**Files:**
- Modify: `app/api/reading/synthesis/route.ts` (SYSTEM ends at line ~32)
- Modify: `app/api/reading/bazi/route.ts` (SYSTEM ends at line ~16)
- Modify: `lib/sseWriter.ts:43` (CACHE_VERSION)
- Modify: `lib/useSSEStream.ts:27` (CACHE_PREFIX)

- [ ] **Step B1:** In `app/api/reading/synthesis/route.ts`, find the exact line:

```
簡體中文。**加粗**關鍵星曜、日主、十神與五行。` + MODERN_INSTRUCTION;
```

Replace with:

```
簡體中文。**加粗**關鍵星曜、日主、十神與五行。

最後以一句話收尾，留一個具體的懸念指向後續深度章節：點出此命最值得深究的一個時機或轉折問題（例如哪步大運是關鍵轉折），但不展開答案，僅說明"大運篇會逐年拆解"。懸念須源於此人真實命局，不得空泛套話，不得出現"付費/解鎖/完整版"等字樣。` + MODERN_INSTRUCTION;
```

- [ ] **Step B2:** In `app/api/reading/bazi/route.ts`, find the exact line:

```
專業術語後以括號簡注。簡體中文，**加粗**關鍵日主、十神與用神。**本段須能脫離上下文獨立閱讀。**` + MODERN_INSTRUCTION;
```

Replace with:

```
專業術語後以括號簡注。簡體中文，**加粗**關鍵日主、十神與用神。**本段須能脫離上下文獨立閱讀。**

最後以一句話收尾，留一個具體的懸念：點出此命局中最值得展開細看的一處結構（如用神受制、某柱十神的深層作用），並說明"八字篇的深度詳批會完整拆解"。懸念須源於真實命局，不得空泛，不得出現"付費/解鎖/完整版"等字樣。` + MODERN_INSTRUCTION;
```

- [ ] **Step B3:** In `lib/sseWriter.ts`, change line 43:

```typescript
const CACHE_VERSION = "v24"; // 2026-06-30 couple v2: relationship-aware reading + 飞化互入/三方四正/大运 + share card
```
to:
```typescript
const CACHE_VERSION = "v25"; // 2026-07-21 conversion: open-loop endings on free synthesis/bazi sections
```

- [ ] **Step B4:** In `lib/useSSEStream.ts`, change line 27:

```typescript
const CACHE_PREFIX = "ziwei_rd_v16_";
```
to:
```typescript
const CACHE_PREFIX = "ziwei_rd_v17_";
```

- [ ] **Step B5:** Typecheck (constraint 8). Expected: clean.

- [ ] **Step B6 (verify):** Start the dev server (constraint 9). POST to
`/api/reading/synthesis` with a real payload — build one by generating chart data via
the app itself, or reuse the fixture approach documented in
`.superpowers/sdd/task-5-report.md` (bazi fixtures) plus a ziwei object from
`lib/ziwei.ts`'s `calculateZiwei`. Simpler acceptable alternative: use the browser —
`http://localhost:3000/result?date=1990-03-21&hour=11&gender=male&tz=8&name=示例`
(the demo link the homepage itself uses) and confirm in the streamed 混合解讀 and
八字綜合 sections: (a) each ends with a chart-specific open question referencing
大運篇 / 八字篇 respectively; (b) no 付費/解鎖/完整版 anywhere in AI text.
Kill only your own dev server afterward.

- [ ] **Step B7:** Commit exactly these 4 files:

```
feat(conversion): free sections end with chart-specific open loops

synthesis now closes pointing at 大運篇, the free bazi summary at
八字篇 — each a real unanswered question from the person's own chart,
no 付費/解鎖 wording (UI sells, AI doesn't). Bumps both cache layers
(server v24→v25, client v16→v17) per the two-layer rule so cached
readings regenerate with the new endings.
```

## Batch C — End-of-free-content bridge (the structural fix)

The free 總覽 tab ends after the 八字綜合 section with nothing — the moment of peak
engagement converts to zero. Insert an unlock bridge there for gated users.
`PaywallLock` is already imported in `WizardFlow.tsx` and already fires the
`paywall_view` GA event on mount, so the funnel measures this change automatically.

**Files:**
- Modify: `components/WizardFlow.tsx` (`case "overview":` inside `renderContent()`)
- Read only: `components/PremiumReportCTA.tsx` — it exists and is imported nowhere.
  Read it first; if it is essentially this same bridge concept, you may adapt its
  copy, but do NOT delete the file either way.

- [ ] **Step C1:** In `components/WizardFlow.tsx`, locate the end of the overview case.
The 八字綜合 block is the last child of `<div className="space-y-6">`, ending:

```tsx
                <ReadingCard stream={bazi_} skeleton="正在生成八字綜合…"
                  onMount={() => bazi_.status === "idle" && bazi_.start(baziPayload)} />
              )}
            </div>
          </div>
        );
```

Replace with:

```tsx
                <ReadingCard stream={bazi_} skeleton="正在生成八字綜合…"
                  onMount={() => bazi_.status === "idle" && bazi_.start(baziPayload)} />
              )}
            </div>

            {/* Gated: bridge from free content into the full 命書 — shown at the
                moment of peak engagement. Static JSX + PaywallLock only (which
                fires paywall_view itself); no AI generation for gated users. */}
            {gated && (
              <div className="space-y-4 pt-4 border-t border-border-light">
                <SectionTitle accent="gold">你的完整命書</SectionTitle>
                <p className="text-sm text-ink-3 leading-relaxed">
                  以上是免費的綜合速讀。命盤裡還有五個章節尚未展開——十二宮位逐宮詳批、大運流年逐年拆解、八字深度詳批、三派各自論斷與風險提醒。
                </p>
                <PaywallLock chartId={sessionId ?? ""} sectionLabel="完整命書" />
              </div>
            )}
          </div>
        );
```

Notes: `gated`, `sessionId`, `SectionTitle`, `PaywallLock` are all already in scope in
this file — no new imports. Copy is Traditional Chinese to match WizardFlow
(constraint 5).

- [ ] **Step C2:** Typecheck. Expected: clean.

- [ ] **Step C3 (verify):** Dev server → generate a reading (demo link from B6) with
the paywall enabled. Confirm: bridge appears after 八字綜合 finishes; it does NOT
appear for unlocked charts (`gated` false); the PaywallLock inside it shows the price
anchor + social proof from Batch A. Check GA wiring by confirming the browser console
network tab (or gtag debug) fires `paywall_view` when the bridge mounts.

- [ ] **Step C4:** Commit `components/WizardFlow.tsx` only:

```
feat(conversion): unlock bridge at end of free 總覽 content

Free readers previously reached the end of the free sections and hit
nothing — the paywall was only ever seen by users who spontaneously
tapped a locked tab. The bridge surfaces the unlock card at the moment
of peak engagement; PaywallLock's own paywall_view event measures the
exposure lift.
```

## Batch D — Close the homepage couple-mode leak

`components/FortuneForm.tsx` has a `mode` toggle (`"personal" | "couple"`, ~line 100).
Couple submissions route to `/result?method=couple` (~line 163-170), rendered by
`components/CoupleResultView.tsx` — which serves the FULL paid couple reading free
(no PaywallLock, marked "合盘免费" in its comments; a previously-documented deferral).
Meanwhile `/hepan` has the proper free-preview + paywall flow. Fix by routing homepage
couple traffic to `/hepan`.

- [ ] **Step D1:** Read `components/FortuneForm.tsx` in full (~lines 90-220 are the
form logic) and `components/HepanFlow.tsx`'s top (~first 120 lines) to check whether
HepanFlow reads birth-data prefill from URL query params.

- [ ] **Step D2:** Implement whichever applies:
  - **If HepanFlow supports query prefill** (unlikely): on couple submit, `router.push`
    to `/hepan?<same params>` instead of `/result?...&method=couple`.
  - **Otherwise (expected):** keep the 雙人合盤 toggle in the mode switcher, but
    replace the couple-mode form body with a compact link-through card — keep visual
    style consistent with the existing form card (Traditional Chinese, e.g.
    雙人合盤已升級：緣分指數、緣分一瞥免費 + short benefit line + a full-width
    vermillion button 前往雙人合盤 → linking `/hepan`, plus a secondary text link
    也可測八字合盤 → `/bazihepan`). Remove the now-unreachable couple-submit branch
    from the submit handler **in this file only**. Do NOT modify or delete
    `CoupleResultView.tsx` or `app/result/page.tsx` — the old path simply becomes
    unreachable from the UI.

- [ ] **Step D3:** Typecheck. Expected: clean.

- [ ] **Step D4 (verify):** Dev server → homepage → switch to couple mode → confirm
the card renders and the button lands on `/hepan`; confirm personal mode still submits
normally to `/result`; confirm nothing on the homepage links to
`/result?method=couple` anymore (`grep -rn "method=couple" app components` — remaining
hits should only be inside `app/result/page.tsx` / `CoupleResultView.tsx` internals,
not in any link/router.push reachable from current UI).

- [ ] **Step D5:** Commit (files actually touched in D2):

```
fix(conversion): homepage couple mode routes to /hepan — closes free full-reading leak

/result?method=couple served the complete paid couple reading with no
paywall. Homepage couple traffic now lands on /hepan, which has the
proper free preview + unlock flow. Old path left in code, unreachable
from UI.
```

## Final verification (after all batches)

1. `npx tsc --noEmit -p tsconfig.json` — clean.
2. `git log --oneline -4` — 3 new commits on top of `2a06414`, `git status` clean.
3. Full click-through on dev: personal reading end-to-end (free sections stream, open
   loops present, bridge + paywall card at the end, locks visible on tabs), couple
   mode → /hepan with paywall intact.
4. **STOP. Do not push, do not deploy.** Report to Niki: commits, what was verified,
   and that deploy + `git push` await his approval.

## Out of scope for this plan (do not attempt)

- Anything in `docs/CONVERSION-PLAN.md` §4-§6 (email capture, prose audit, SEO work).
- Price changes, overview-route prompt changes, deleting any component.
- `STRIPE_PAYMENT_METHODS` env (blocked on Stripe approval — Niki handles).
