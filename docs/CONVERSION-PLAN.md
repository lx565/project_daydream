# 命里 Conversion & Growth Plan — 2026-07-21

Goal: first paying customers, then repeatable conversion. Current state: paywall live
($6.99 Stripe, card-only), **zero purchases**, funnel analytics fixed 07-20, only 總覽
free as of 07-21. Traffic: 小红书 + organic (~900 SEO pages).

Everything below is audited against the actual code as of commit `437bc60` — file
references are real. Items are tagged **[S]**mall (<1h), **[M]**edium (half day),
**[L]**arge (1+ day), and ★ = do first.

---

## 0 · Data to pull before heavy investment (you do this — 15 min)

The plan's ordering below is my best judgment from the code audit; these numbers
confirm or reorder it. From **GA4** (last 14–28 days):

| # | Metric | Where | What it decides |
|---|--------|-------|-----------------|
| 1 | Sessions + users, by source | Reports → Acquisition | Is there enough traffic to convert at all? (<50/day = traffic problem first) |
| 2 | `reading_started` count | Engagement → Events | How many actually try the product |
| 3 | `reading_completed` count | same | Generation completion rate (drop here = product/latency problem) |
| 4 | `paywall_view` count | same | **The key number** — how many ever SEE the paywall |
| 5 | `paywall_checkout_start` | same | Paywall persuasiveness |
| 6 | `paywall_view` by `section` dimension | add secondary dimension | Which surface (result/問命/合盤) drives paywall exposure |
| 7 | Avg engagement time on /result | Pages report | Are people reading the free content or bouncing |

**Decision rules:**
- `paywall_view` ≪ `reading_completed` → §2 (paywall exposure) is the whole game. *Code audit says this is the most likely finding — nothing currently pushes a reader to a locked tab.*
- `checkout_start` decent but `purchase` = 0 → §3 (checkout friction / payment methods) is the killer.
- `reading_started` low vs sessions → §1 (landing/input) matters more than I've ranked it.
- Everything near zero → traffic problem: §6 (SEO) + 小红书 cadence before any CRO.

From **Google Search Console**: indexed page count vs ~900 submitted, total
impressions/clicks 28d, top 20 queries by impressions with CTR. (Needed for §6.)

---

## 1 · Landing & input (smallest issues — the landing page is genuinely good)

1.1 ★[S] **Copy inconsistencies that dent the "rigorous" brand promise**: homepage
says 121 部典籍 in hero/stats but "103 部典籍" in the knowledge-library section
(`app/page.tsx:519`); guide badge says 15 篇 but there are 23 guide topics now;
famous badge 33 位 (verify actual count). A site selling precision shouldn't
disagree with itself. Sweep all counts once.

1.2 [S] The homepage `#form` card says 免費開始 — good. But nowhere on the landing
page does the word 解鎖/價格 appear. Consider one honest line under the form:
"總覽免費 · 完整命書 $6.99" — mainland users hate surprise paywalls; being upfront
raises paid intent quality and reduces "betrayal" feeling at the wall. Worth A/B
thinking but cheap to try.

1.3 [S] Mobile: verify the hero H1 (2 lines of dense copy) + seal + stats push the
form below the fold on 375px. If yes, tighten hero vertical rhythm on mobile so the
form peeks above the fold.

## 2 · Paywall exposure — the free experience never asks for money ★★ likely the core problem

The audit found the free path is a **dead end**: three generous free sections
(混合解讀 + 紫薇綜合 + 八字綜合 ≈ 2-3k words) stream in and then the tab simply
ends (`components/WizardFlow.tsx` overview case — no CTA after 八字綜合). The only
way a user ever sees the paywall is to spontaneously tap a locked tab, whose lock
indicator is an 8px 🔒 at 50% opacity (`WizardFlow.tsx:741`). `paywall_view` almost
certainly ≪ `reading_completed`.

2.1 ★[M] **End-of-free-content bridge.** After 八字綜合 finishes streaming, render
an upsell block: 1-2 blurred lines visually sampled from what a locked section looks
like + the PaywallLock included-list + button (or a compact variant). This is the
moment of maximum engagement; it currently converts to nothing. Note
`components/PremiumReportCTA.tsx` already exists and is imported nowhere — audit
what it does; either wire it or replace it (delete if superseded — ask before
deleting per rules).

2.2 ★[S] **Make tab locks visible.** Bigger 🔒, or amber tint on locked tab labels,
or a "5 個章節待解鎖" pill above the tab bar. One-line change, directly raises
paywall_view.

2.3 [M] **Blurred teaser inside locked tabs.** When a locked tab is tapped, show
2-3 lines of real-looking blurred text above the PaywallLock card (loss aversion —
"it's already written, you're just not allowed to read it"). Static fake-blur is
fine; do NOT generate real AI content for gated users (cost discipline already in
place — keep it).

2.4 [S] **Personalize the paywall pitch.** PaywallLock's included-list is generic.
One dynamic line using data already on the client — e.g. "你的命宮主星是{X}——
宮位篇會逐宮拆解它如何影響財帛與官祿" — makes the locked content feel written
for *them*. Pass one prop; no new AI call.

2.5 [S] **Social proof at the wall.** A reading counter already exists
(`components/ReadingCount.tsx`, homepage). Reuse at the paywall: "已有 N 人生成命書"
(or unlock count once ≥ ~20). Skip fake numbers.

2.6 [S] **Free-section endings should point at locked answers.** Prompt-level: end
免費 sections with a concrete open loop tied to a locked tab ("至於哪些年份最適合
進取，見大運篇"), not a summary that feels complete. Edit the 3 free prompts
(synthesis / overview / bazi routes). Cheap, compounding.

## 3 · Checkout — remove the mainland-China wall ★★

3.1 ★[S] **Enable Alipay (+ WeChat Pay if approved) in Stripe.** Production has no
`STRIPE_PAYMENT_METHODS` env → checkout is **card-only**. Your traffic is 小红书 —
mainland users largely can't/won't pay by foreign card. The code already supports it
(`app/api/checkout/route.ts:31-34`: set `STRIPE_PAYMENT_METHODS="card,alipay"` after
enabling Alipay in the Stripe dashboard; wechat_pay similarly). Zero code changes.
This alone could be the difference between 0 and >0 conversions.

3.2 [S] Show a **¥ reference price** next to $6.99 ("≈¥50") in PaywallLock, and
mention 支付寶 once enabled. Note honestly: ¥50 sits above the ¥29 impulse anchor
domestic competitors use — don't lower the price yet (competitors charge $15-40;
your cost ≈ $0.05), but watch funnel data; the fix for sticker shock is anchoring
(3.3), not discounting.

3.3 [S] **Anchor the price.** "$6.99 · 一次付費永久解讀" next to a crossed-out
reference or a comparison line ("同類深度報告 $15-40"). Truthful — LingYuan charges
$14.9, FateTell $39.99.

3.4 [S] Verify Stripe Checkout renders in Chinese (`locale` param on the session —
check; if it's defaulting to English for zh browsers, set `locale: "zh"`).

## 4 · Reading experience & prompts (first-impression quality)

4.1 [M] **Audit the free tier's first 3 paragraphs** with the reading-quality skill:
the 混合解讀 opening decides whether the user believes the paid tabs are worth $7.
Checklist: names their actual 命宮主星/日主 in sentence 1-2 (personal, not
horoscope-generic), no AI-tell prose, no hedging openers.

4.2 [S] 問命 is now fully paid (10 questions post-unlock). Consider **1 free
question** as a hook — the chat-limit moment was historically the strongest
conversion trigger, and right now free users never experience the chat at all.
Counter-argument: it costs AI per free user. Compromise: 1 free question, hard
sell after. Your call — flag for data review after §0.

4.3 [S] The 缘分指数 preview teasers (just shipped) end with an AI "hook line" —
verify on the live page that the hook + PaywallLock adjacency reads as one moment,
not two disconnected cards.

4.4 [M] **Close the /result?method=couple leak.** The homepage couple mode gives the
FULL couple reading free with no paywall (`components/CoupleResultView.tsx` — "合盘
免费" by design, deliberately deferred earlier). Now that conversion is the goal:
either gate it like /hepan (PaywallLock + preview) or redirect homepage couple mode
to /hepan entirely (simpler — one flow to maintain, /hepan is better anyway).
Recommend the redirect.

## 5 · Retention & capture (currently: nothing)

5.1 [M] **Email capture at the reading.** "把這份命書寄到郵箱，永久保存" — free,
above the paywall. You get a re-engagement channel (流年 season, birthday, price
tests); they get permanence. Email infra exists (`alerts.py`-style… actually
`app/api/email/` exists in the repo — audit and reuse).

5.2 [S] Post-unlock share moment: after purchase, prompt 分享到小紅書 with the share
card. Paid users are your best 小红书 amplifiers.

5.3 [S] UTM discipline: every 小红书 post uses a distinct `?from=` tag (XhsTracker
exists — confirm each post gets a unique tag so §0's source data is trustworthy).

## 6 · SEO pages (~900 live) — needs GSC data first

6.1 ★[S] **Pull Search Console** (see §0). The plan branches hard on
indexed-vs-impressions-vs-CTR. Don't build more pages before knowing if the
existing 900 are indexed and shown.

6.2 [S] Fix the count copy (1.1) — it appears on SEO pages' shared components too.

6.3 [M] **Internal-link mesh audit**: every SEO page should link (a) to the tool
via ToolCTA — verify all clusters actually include it, `library_to_tool` event by
`variant` tells you which clusters convert readers→tool; (b) to 2-3 sibling pages
in-cluster. The bazi clusters (7 pages each) are thin on cross-links vs the star
cluster.

6.4 [M] **Title/CTR pass on winners**: from GSC top-20-by-impressions, rewrite
titles/descriptions of pages with CTR <1.5% (question-form titles win in this
niche: "廉貞在夫妻宮代表什麼？").

6.5 [L] Expand only proven clusters: if GSC shows e.g. 星曜×宮位 queries winning,
finish that matrix (168 pages → full 14×12=336 main-star coverage) before starting
anything new. content-strategist skill run once data is in.

6.6 [S] Verify rich results: JSON-LD is broadly implemented — check GSC
Enhancements report for actual eligibility rather than adding more markup.

6.7 [S] `scripts/indexnow.mjs` exists — run it after every content deploy
(add to the deploy habit, or a package.json postbuild note).

## 7 · Measurement hygiene (so all of the above is testable)

7.1 [S] Build the GA4 funnel exploration (reading_started → reading_completed →
paywall_view → paywall_checkout_start → purchase), breakdown by `section` — saved
report. (Steps documented in chat 07-20.)
7.2 [S] Confirm `section`/`chart_id` custom dimensions are populating (registered 07-20).
7.3 [S] Weekly ritual: one screenshot of the funnel + GSC into the Obsidian vault;
decisions only from trends, not single days.

---

## Suggested execution order

**Week 1 (mostly [S], ~1 day of work):** 3.1 Alipay env ★ · 2.2 visible locks ★ ·
1.1 count sweep ★ · 6.1 pull GSC + §0 GA numbers ★ · 3.2/3.3 price display ·
2.5 social proof · 2.6 prompt endings · 7.1 funnel report

**Week 2 ([M] items, informed by data):** 2.1 end-of-free bridge ★ · 2.3 blurred
teasers · 4.4 couple-leak redirect · 4.1 free-tier prose audit · 5.1 email capture

**Week 3+:** 6.3-6.5 SEO mesh/CTR/cluster work per GSC · 4.2 free chat question
decision · 5.2 share moment · price experiments only after ≥50 paywall_views of
funnel data.

**Explicitly NOT doing now:** price changes (fix exposure first), new product
surfaces (per validate-first rule), redesigns of anything currently working
(landing page is good).
