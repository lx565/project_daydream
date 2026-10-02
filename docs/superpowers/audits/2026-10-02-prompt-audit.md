# 命里 Full Prompt-Level Audit — 2026-10-02

Full audit of every AI system prompt in fortune-app, run on Opus per Niki's request, following the `reading-quality` skill's four-layer methodology (Factual Accuracy / RAG Retrieval / Prompt Depth / Cross-School Consistency). Read-only — no files were changed producing this report.

**Coverage:** all 28 `app/api/reading/**/route.ts` files plus `app/api/chat/route.ts`, the shared prompt libs (`lib/modernInstruction.ts`, `sseWriter.ts`, `callAI.ts`, `validateReading.ts`, `validateBazi.ts`, `validateFlowYear.ts`, `rag.ts`, `couple.ts`, `flowRisk.ts`, `niandu.ts`, `bazi.ts`), and the frontend callers (`WizardFlow.tsx`, `useSSEStream.ts`, `HepanResultView.tsx`).

**Method:** not reading alone — the auditing agent ran `iztro` and `lunar-javascript` directly in a scratchpad to verify ground-truth facts (iztro returns bare mutagen values like `"忌"` not `"化忌"`; short palace names like `官祿`/`疾厄`; 大限 run backwards for 陰男/陽女), and scanned every prompt with `zhconv` for residual Simplified Chinese.

**Note:** the `reading-quality` skill doc itself is partially stale relative to the current codebase — corrections discovered during this audit: the 眾說 tab actually renders from `overview`, not a route called `perspectives` (`consensus` is the separate short free teaser); the validator is `deepseek-v4-pro`, not Gemini; `[現代]` spec in code is 60-110 chars with no action advice (skill doc says 100-150 + worked example); `topic`/`validate-bazi`/`validate-flowyear` have no frontend caller at all.

**Every fix that changes prompt content needs a `CACHE_VERSION` bump** (`lib/sseWriter.ts:78`, currently v45 as of tonight's earlier Simplified-Chinese fix) — this covers nearly every P0/P1 item below.

---

## P0: blocks release

### 1. [PRIVACY] Chat answers cached and leaked across different users
**Layer:** Consistency (privacy/correctness)
**Finding:** The KV cache key is `opts.system.slice(0,100) + messages`. Chat's `SYSTEM_BASE` is 233 chars, and the chart summary, name, background readings, and RAG are all appended *after* character 100. Two different users asking the same first question (e.g. 「我適合什麼工作？」) get served the identical cached answer for 30 days — an answer written about the first user's chart, which can include their name (`命主：${name}`).
**Root cause:** `lib/sseWriter.ts:81-86` (`makeCacheKey`) + `app/api/chat/route.ts:71-79`
**Fix:** hash the full `opts.system` in `makeCacheKey` (same fix `synthesize.ts:36-47` already has). Bump `CACHE_VERSION` to v46. Add a `noCache: true` option to `SSEWriterOptions`, pass it from chat — conversational turns shouldn't be KV-cached at all.

### 2. 納音 lookup wrong for 55 of 60 干支
**Layer:** Factual
**Finding:** `idx = (si*12+bi)%60` is not the correct sexagenary index. Examples: 乙丑 becomes 路旁土 (should be 海中金), 丙寅 becomes 澗下水 (should be 爐中火). The entire 祿命派 section of bazi-schools is built on this value.
**Root cause:** `app/api/reading/bazi-schools/route.ts:55`
**Fix:** `const idx = (((6*si - 5*bi) % 60) + 60) % 60;` (solves n≡si mod 10, n≡bi mod 12). Bump CACHE_VERSION.

### 3. Daily card's 干支 is wrong
**Layer:** Factual
**Finding:** Day branch always wrong (assumes 2000-01-01 = 戊辰日; it's actually 戊午). Month uses calendar month + 2 instead of 節氣. Year flips Jan 1 instead of 立春. For 2026-10-02, the route says 辛亥月 己未日; correct is 丁酉月 己酉日. Server runs UTC, so Taiwan users see the previous day before 08:00.
**Root cause:** `app/api/reading/daily/route.ts:12-37, 66`
**Fix:** replace `dateToGanzhi` with `Solar.fromYmd(y,m,d).getLunar()` → `getYearInGanZhiByLiChun()` / `getMonthInGanZhiExact()` / `getDayInGanZhi()` (lunar-javascript already a dependency). Build the date in `Asia/Taipei`.

### 4. 上一大限/下一大限 swapped for ~half of users
**Layer:** Factual
**Finding:** Code always takes `palaces[idx±1]`, but iztro runs reverse charts (陰男/陽女) backwards. Verified: for a 1991 male (辛未, 陰男), the 3~12 decade is at index 9 and the NEXT decade (13~22) is at index 8, not 10.
**Root cause:** `app/api/reading/decades/route.ts:70-71`
**Fix:** look up by age range instead of array index: `nextPalace = palaces.find(p => parseAgeRange(p.decadalAge)[0] === endAge+1)`, `prevPalace = palaces.find(p => parseAgeRange(p.decadalAge)[1] === startAge-1)`.

### 5. Solo cautions route never sees natal 化忌
**Layer:** Factual
**Finding:** Filters on `s.mutagen === "化忌"`, but iztro returns `"忌"` (bare). The 「一生需特別注意」 section's core subject only reaches the model if it happens to share a palace with a 煞 star. Verified dropped for a 1990-05-15 male test chart (天同化忌 in 遷移). `couple/cautions` already has this right (`=== "忌"`) — this is copy drift.
**Root cause:** `app/api/reading/cautions/route.ts:42, 46`
**Fix:** change both conditions to `s.mutagen === "忌"`.

### 6. Decades prompt asks for data it never supplies
**Layer:** Factual / Prompt
**Finding:** Prompt asks for 「大限干四化各自飛入哪些宮位」, 「十年內大致哪幾年是上升期」 (via 流年干支), 夫妻宮/官祿宮/疾厄宮 positions, 紅鸞天喜動靜 — none of which are in the user message (only prev/current/next palaces' major/minor stars). `flowYears` is computed but only used as RAG keywords, never surfaced as facts. The validator explicitly exempts 運限 claims (`validateReading.ts:131`), so none of this is ever caught. This is the paid tab.
**Root cause:** `app/api/reading/decades/route.ts:20-29` vs `73-92, 112-123`
**Fix:** add `astrolabe.horoscope(midYear).decadal.mutagen` mapped to natal palaces; add a compact 10-line 流年 table from the existing `flowYears`; add `buildChartFacts(ziwei)` for 夫妻/官祿/疾厄 stars; add 紅鸞/天喜 positions.

---

## P1: next deploy

7. **`bazi.summary`'s 「喜用神」 claim is simplistic/often wrong** — just the lowest-count element across 8 visible characters, ignoring 月令/藏干/旺衰. Feeds into 8 different routes, several of which separately ask the model to derive 用神 properly — internal contradiction. (`lib/bazi.ts:96-112`) → reword summary, remove the 喜用神 claim, bump CACHE_VERSION.
8. **八字 readings validate against the 紫微 checker, not a 八字 one** — `runValidation` always posts to `/api/reading/validate` regardless of reading type; `validate-bazi` exists but has no caller. (`lib/useSSEStream.ts:105-111`) → add a `validateUrl` option, wire the 3 bazi streams to `/api/reading/validate-bazi`.
9. **Validation retries can't fix anything on 3 routes** — cautions/bazi/bazi-schools ignore `revisionNotes`, so a flagged reading retries into an identical cache key and replays the same flagged text; the first-pass reading is also served to everyone for 30 days before validation completes. → accept `revisionNotes` (copy `overview:193-196`), add a `skipCacheRead` flag, delete the KV key on validation failure.
10. **bazi-couple RAG has always returned empty** — `buildQueryTerms` needs `stars`/`palaces`/`topic`, bazi-couple only passes `text`+`school`. → add explicit `stars` array, `strict: true`.
11. **bazi-decade/bazi-schools retrieve 紫微 material against a 八字 question** — no school filter, generic `topic: "格局"` pulls 紫微 keywords. → add `school: "八字命理", strict: true` with explicit stars, drop `topic`.
12. **Several topic names aren't `TOPIC_KEYWORDS` keys, silently dropping the lexical boost** — 流年大限/流年/夫妻/交友/兄弟/父母 across decades, flowyear, monthly, and every couple route. → add the missing keys.
13. **眾說 tab's 飛星派 section has no flying data to work from** — no 宮干, no `mutagedPlaces()` output, so 四化派 and 飛星派 see identical inputs and will paraphrase each other. iztro already supports this (verified `palace.mutagedPlaces()` works). → add `[宮干X]` per palace + a 宮干飛化 block.
14. **Free teaser (consensus) can fabricate 格局 names** — no minor/煞 stars, no 三方四正, no `detectMingge` list passed, but the prompt asks for a 格局 name anyway. Highest-traffic free card. → add minor stars + detectMingge block or an explicit "none detected" fallback line.
15. **Brightness (廟/旺/陷) missing from most 紫微 prompts** except synthesis — but the validator checks brightness claims, causing guess → flag → retry cycles. → format stars as `${name}(${brightness})` everywhere, matching `buildChartFacts`.
16. **虛歲/周歲 mismatch** — current-decade detection and couple/decades' calendar-year display both compare in 周歲 against iztro's 虛歲 ranges, off by ~1 year near boundaries. → use `horoscope(new Date()).decadal.index`; use `birthYear + startAge - 1`.
17. **Risk-year scorer keys don't match iztro's short palace names** — `'疾厄宮'` etc. vs iztro's `疾厄`, so only 命宮 ever gets extra weight. (`lib/flowRisk.ts:6-12`) → fix the keys.
18. **Couple palace scoring's mutagen comparison never matches** — compares Simplified+化-prefixed strings against iztro's bare Traditional values, so 四化 has zero effect on 四維得分, yet the prompt asks the model to explain scores it was never told. → fix comparison strings, expose per-dimension contributions.
19. **缘分类型 labels are Simplified**, missed by tonight's earlier sitewide fix — 天生一对型/互补成长型/相辅相成型/需要经营型, plus 「六亲」. (`lib/couple.ts:126-129`, `lib/coupleTypes.ts:62`) → correct to Traditional.
20. **Identical branches reported as 三合 (and 相刑 in bazi-couple)** — `g.includes(A) && g.includes(B)` is true when A===B; 三刑 list also missing 子卯刑. → add `ba !== bb` guard, add the missing pair.
21. **Couple prompt asks for cross-chart 飛化互入 and 當前大運 it never computes** for the main couple route (bazi-couple already does the decade part). → compute cross-chart mutagen landing palaces, add `currentDecadeDesc` for both people.
22. **bazi-decade labels every decade "當前大運" even past/future ones**, never tells the model current year/age, asks for 流年-based projections with no 流年 data. → pass `currentYear`, label 已過/當前/未來, ground or drop the 流年 ask.
23. **bazi teaser: system prompt and user message contradict each other** on length/structure (1 段 ~130-160字 vs 2-3 段 ~280-320字). (`bazi/route.ts:11` vs `61`) → align to the system prompt's spec.
24. **bazi-schools asks for 神煞 (天乙貴人/羊刃/etc.) never computed** — model invents them; also leaks internal jargon "B1" into the prompt. → compute 神煞 deterministically, fix the label.
25. **[SAFETY] overview's 健康與因果 section conflicts with SAFETY_GUARDRAIL rule #1** — asks for 「對應臟腑的先天強弱」, directly against the no-medical-claims rule. Softer versions of the same ask exist in bazi-deep/decades/topic too. → reword to non-diagnostic lifestyle/wellness framing across all four.
26. **Several routes have a deadline budget larger than their Vercel `maxDuration`** — consensus (75s budget, 60s limit), daily/couple-preview/monthly-summary/monthly-preview/niandu-preview (35s budget, 30s limit) — the platform kills them before retry can complete, and for the two previews this also loses the deterministic free grid alongside the teaser. → raise maxDuration or shrink the internal deadline budget per route.
27. **chat and topic are token-starved** — `maxTokens: 600`/`1024` with default `reasoning_effort`, the same starvation pattern already fixed elsewhere tonight (consensus). → `reasoningEffort: "none"`, raise maxTokens.
28. **Chat grounding is thin** — only `ziwei.summary` (3 fields) + 1200-char reading slices, no palace/star table, yet told to cite specific 宮位與星曜. → append `buildChartFacts(ziwei)` (client already sends full `ziwei`). Do this after fixing #1, so the cache-key fix covers the larger prompt too.

---

## P2: polish

29. **Residual Simplified Chinese** beyond tonight's sitewide fix: 「给出」(decades), 「藏乾透幹」→藏干透干 (bazi-deep), `[${stem}幹]`→干 (decades), 「兩係」→兩系 (synthesis), 「紫薇綜合」→紫微 (consensus, synthesis). Also SEO prompts outside the reading routes still say 简体中文 (`lib/personalityData.ts:522`, `lib/seoContent.ts:756,809,955`). Recommend promoting niandu's anti-Simplified block to a shared constant in `modernInstruction.ts`.
30. **「命宮宮」 doubled-suffix bug** — `${p.name}宮` used where `p.name` is already suffixed, across ~10 routes. → use the existing `pName()` helper everywhere.
31. **Prompts ask for bold labels while MODERN_INSTRUCTION forbids bolding labels/phrases** — palaces, couple (×2), couple/preview, chat all contradict the shared instruction appended to their own prompt.
32. **bazi-schools appends MODERN_INSTRUCTION mid-prompt**, breaking its own documented "keep last" contract.
33. **overview says "三個視角" but requires 5 sections** (3 schools + 倪師 + 小眾).
34. **Competing "closing section" instructions** — couple/bazi-couple ask for a 「## 給你們的話」 AND get a second MODERN `[現代]` closer; synthesis/bazi/decades make contradictory promises about per-year detail.
35. **Temperature drift across routes** with no apparent rationale — 0.5 to 0.75, including flowyear at 0.7 despite being fact-dense and unvalidated.
36. **Terminology/persona drift** — 相衝 vs 六沖, share-card quote style and length limits differ, romanized "ta" can leak into output, persona voice (老師/兄長/朋友) inconsistent, and teaser routes inconsistently mention/ban 付費 language.
37. **chat's `READING_LABELS` missing 3 keys** WizardFlow actually sends (synthesis/baziDeep/flowYears) — raw English key leaks into the prompt as a heading.
38. **流年 star-to-palace mapping drops all minor stars** (文昌/文曲/左輔/右弼 etc.) across 5 routes — only niandu does this correctly.
39. **Dead endpoints** — `topic` has no frontend caller at all; `validate-bazi`/`validate-flowyear` unused.
40. **月令 mislabeling risk** — `jieQiInfo.prevJieQi` can be a 中氣 rather than a 節, affecting bazi/bazi-deep's 月令 framing.

---

## What checked out fine
- chat correctly omits `[現代]`.
- flowyear, bazi-decade, daily, and the JSON routes correctly use SAFETY_GUARDRAIL only (no MODERN_INSTRUCTION misuse).
- `[現代]` parsing is correctly wired on every surface that receives it (`ClassicalMd`, `PalacesView`, `HepanResultView`'s share-card rescue).
- couple/cautions handles the mutagen format correctly (the one place #18's bug pattern does NOT appear).
- The validator model is confirmed `deepseek-v4-pro` and fails open on error.

---

*Scratch verification scripts (iztro/lunar-javascript ground-truth checks) used to confirm P0 findings were written to the auditing session's scratchpad and are not preserved — re-derive if needed to re-verify (`iz.js`, `gz.js`, `ny.js`, `fly.js` patterns: compute via `astro.bySolar()` / `Lunar.fromDate()` and compare against the route's own output).*
