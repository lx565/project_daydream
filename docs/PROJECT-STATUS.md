# 命裡 Website — Project Status (2026-10-19)

Repo `~/Projects/fortune-app` (Next.js on Vercel, project `fortune-app`, GitHub `lx565/project_daydream`, live https://www.mingli.study). This site is also the backend for the iOS app.

- iOS status doc: `~/Projects/mingli-app-edit-profile/docs/PROJECT-STATUS.md` (branch `feature/edit-profile` of `~/Projects/mingli-app`)
- Vault notes: `~/Desktop/Claude One/Projects/Fortune App/Overview.md`, `~/Desktop/Claude One/Projects/Web–iOS Contract.md`, `~/Desktop/Claude One/Sessions/2026-10-19 Grounding Incident, Hardening and Marketing Audit.md`
- Source brief: `.superpowers/session-brief-2026-10-19.md`

## Live now (final CLI deploy 2026-10-19, deployment fortune-fuzpw4gw2)
- Grounding restored: production readings had no book grounding for ~30+ days (gitignored `knowledge/` missing from Git-built deploys); CLI deploy fixed it, now ~9-15 reference books per reading.
- Reliability: two-phase AI deadline (50s to first content, else fast tier `deepseek-flash`; 130s cap once streaming), `: ping` heartbeat every 15s, maxDuration 180 on 19 routes, truncation retry on fast tier.
- Checker: Gemini 2.5 Flash on all validation paths (independent of writer `deepseek-v4-pro`), fail-open. KV tally `stats:validation:YYYY-MM-DD`.
- Security: /api/email/report relay closed, input caps on 28 routes, /api/unlock/claim deleted, IPv6 /64 limiting, GLOBAL_DAILY_GEN_CAP 10000.
- Content/data: star/palace SEO pages serve proofread articles again; 醜→丑 fixed (5,048 chunks, 226 articles); iztro 2.6.1; Sources card on 總覽; marketing/privacy copy corrected; feedback pipeline repaired (KV backup `feedback:backup`).
- Corpus truth: 117 distinct books, 31,689 passages, ~891 library articles. Public copy: 「百餘部」/「3萬+」.

## In flight
- `fix/checker-strictness`: Gemini fails 36-41% of readings (10-18: 15/42; 10-19: 17/41), each fail = full regeneration (~2x slower/costlier). Fix: fail only on clear chart-fact errors, cap revision to 1 regeneration.
- Article batches built, not merged: `content/kb-guide-batch` (6), `content/kb-hepan-batch` (6), `content/kb-daxian-batch` (12); drafts and review docs in `docs/content-drafts/` inside those worktrees.
- `vercel.json` guard (`git.deploymentEnabled.main=false`) committed locally on main, NOT pushed; local main ~55 commits ahead of origin/main.
- iOS: v1.0.0 build 3 in App Review; v1.0.1 on `feature/edit-profile` held (see [[Mingli iOS App/Overview]]).

## Waiting on Niki (decisions)
1. 年度解讀 and 逐月運勢 copy says $1.99 but both are temporarily free: wording (recommended 「限時免費（原價 $1.99）」).
2. Solo 宮位 tab: code locks it (`FREE_TABS=["overview"]`); older notes said free. Which is intended?
3. Delete unused `components/PremiumReportCTA.tsx` (「即將推出」「微訊號」)?
4. Form footer default time zone 北京時間: change to 台北／香港 (UTC+8)?
5. Keep numeric 緣分指數 on website hepan (dimensions clamped 66-96)? App direction: no score.
6. Terms §5 and §9 wording (and iOS paragraph rewrite).
7. 2027 丁未年 series (~November); /cases Simplified bodies; real-person claims in /famous briefs; push `vercel.json` and verify; monthly cheaper-model price check (unanswered).
- Also: cached readings stay as is by Niki's decision (CACHE_VERSION v54, CACHE_PREFIX `ziwei_rd_v29_`).

## Hard rules
- Deploy only with `cd ~/Projects/fortune-app && npx vercel --prod --yes`. `git push` of main is NOT a deploy and must not be treated as one.
- Do not `git push` main until `vercel.json` is verified; never push without Niki asking.
- Website API changes are live for app users instantly: backward compatible and additive only (SSE events, route shapes).
- Do not bump CACHE_VERSION / CACHE_PREFIX without Niki.
- Apps Script feedback code: update ONLY via 部署→管理部署→edit existing→新版本, never 新增部署.
- Vercel Hobby logs last ~30 min: use the KV tally and timed requests.
- Run `node scripts/check-chou.mjs` after any KB/lib text change (4 genuine 醜 words remain on purpose).
- Public copy: 百餘部 / 3萬+, never 121 or 84; no 最嚴謹, 每句有出處, 絕不.

## Branches and worktrees (`git worktree list`, 2026-10-19)
Merge state per branch is unverified unless stated; check `git branch --merged main`.
| Worktree | Branch | Note |
|---|---|---|
| `.` | `main` | local main ~55 commits ahead of origin/main; holds `vercel.json` guard |
| `fortune-app-wt-checker2` | `fix/checker-strictness` | RUNNING: Gemini strictness fix, not merged |
| `fortune-app-wt-checker` | `fix/gemini-checker` | Gemini checker on all validation paths |
| `fortune-app-wt-ai` | `fix/ai-pipeline` | two-phase deadline / pipeline |
| `fortune-app-wt-trunc` | `fix/truncation-retry` | truncation retry on fast tier |
| `fortune-app-wt-sec` | `fix/security-hardening` | security hardening |
| `fortune-app-wt-hardening` | `fix/feedback-hardening` | feedback pipeline hardening |
| `fortune-app-wt-fe` | `fix/frontend-review` | frontend review fixes |
| `fortune-app-wt-trad` | `fix/traditional-ui` | Traditional Chinese UI fixes |
| `fortune-app-wt-integ` | `integration/oct18` | integration branch |
| `fortune-app-wt-iztro` | `chore/iztro-2.6.1` | iztro upgrade |
| `fortune-app-wt-chou` | `fix/kb-chou-branch` | 醜 to 丑 in knowledge base |
| `fortune-app-wt-libchou` | `content/fix-chou-articles` | 醜 to 丑 in library articles |
| `fortune-app-wt-orphans` | `content/fix-sources-orphan` | orphan source page fix |
| `fortune-app-wt-titles` | `content/fix-titles` | article title fixes |
| `fortune-app-wt-sources` | `feat/sources-card` | Sources card |
| `fortune-app-wt-mk1` / `mk2` / `mk3` | `copy/marketing-home` / `-products` / `-content` | marketing audit copy fixes |
| `fortune-app-wt-kb1` | `content/kb-guide-batch` | 6 guide articles, NOT merged (two replace live articles) |
| `fortune-app-wt-kb2` | `content/kb-hepan-batch` | 6 合盤 articles, NOT merged |
| `fortune-app-wt-kb3` | `content/kb-daxian-batch` | 12 大限-by-palace articles, NOT merged |
| `fortune-app-wt-rewrite` | `content/rewrite-pilot` | pilot; bulk rewrite skipped |
| `.worktrees/p1-decades-duration` | `fix/p1-decades-duration` | earlier P1 audit fix |
| `.worktrees/p1-overview-safety` | `fix/p1-overview-safety` | earlier P1 audit fix |

## How to deploy
1. Work from a tree that has `knowledge/` (gitignored) locally.
2. `cd ~/Projects/fortune-app && npx vercel --prod --yes` (CLI upload from the Mac).
3. Verify: a fresh reading's `refs` event lists ~9-15 books.
4. Never rely on `git push`: GitHub-built deploys lack the knowledge base and retrieval silently returns nothing. Do not push main until the `vercel.json` guard is verified.

## Reading the KV validation tally
- Keys: `stats:validation:YYYY-MM-DD` (pass / fail / unreviewed, truncated / fastFallback / truncRetryOk), 90-day expiry.
- `npx tsx scripts/validation-stats.ts [days]` (needs KV env from `vercel env pull`).
- Vercel Hobby runtime logs last only ~30 min, so use the tally plus live timed requests.
- Reference points: fail rate 36-41% (10-18: 15/42; 10-19: 17/41).

## Where the audit docs are
- Marketing audit: `docs/marketing-audit/` (`content-hubs.md`, `home-global.md`, `products.md`)
- iztro study: `docs/iztro-2.6.1-diff-study.md`
- Feedback Apps Script: `docs/apps-script/Code.gs` + README
- Article drafts and review docs: `docs/content-drafts/` inside the `content/kb-*` worktrees (not on main)
- Security/AI/frontend review reports: in the conversation, not as repo files (per the brief)
- Older: `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/ANALYTICS.md`, `docs/CONVERSION-PLAN.md`

## Addendum 2026-10-19 (late)
Checker fix DEPLOYED (merge of `fix/checker-strictness`): the checker now fails a reading only on a verified chart-fact error (quote + verbatim fact line + severity); `buildReviewFacts` gives it palace branches, 大限 ages and minor-star 四化; a free deterministic gate checks 五行局/命宮 branch/palace-header branch/大限 age ranges; thinkingBudget 1024 (avg 6s per check, max 11s). Measured on 44 real readings: fail rate 54.5% → 15.9%, 6/6 planted errors still caught. Live test: 3 fresh synthesis readings ≈26s each, `_validated`, no rewrite. Watch the KV tally (`npx tsx scripts/validation-stats.ts 3`) over the next days: expected fail rate ≈15–20%. Known gap: the deterministic 格局 check can still flag a valid 殺破狼 mention on decades readings. Analysis: `docs/checker-strictness-analysis.md`.
