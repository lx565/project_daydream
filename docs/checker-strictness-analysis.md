# Reading checker strictness analysis (2026-10-19)

Branch `fix/checker-strictness`. Production tally since the Gemini 2.5 Flash switch (2026-10-16): 36-41% of readings FAIL, and every FAIL costs a full regeneration (+40-70 s).

## Method
- 12 varied charts (both genders, 1965-2004) x 44 real readings from the local dev server (overview, palaces, decades, cautions, bazi, synthesis). Generation used `.env.local` = `AI_PROVIDER=deepseek`, `DEEPSEEK_MODEL=deepseek-flash` (fine for this analysis). KV env vars were blanked for the dev server so nothing touched production KV/stats.
- The SAME validator functions (`validateReading` / `validateBaziReading`, unchanged code = "before") were run on all 44, then every reported issue was hand-checked against the real chart (iztro output, palace stems, 天干四化 table).
- Throwaway harness lived in a mktemp dir, not in the repo.

## Before: 24 of 44 readings FAIL (54.5%), 126 issues reported

| Category | Count | Share |
|---|---|---|
| (a) real chart-fact error | 12 | 9.5% |
| (b) stylistic / interpretive / omission complaint | 31 | 24.6% |
| (c) false positive (claim is supported, or issue text itself says "correct") | 32 | 25.4% |
| (d) checker limitation (fact not shown, or out-of-scope dynamic claim) | 51 | 40.5% |

Only 5 of 44 readings (11%) contained a real error, yet 24 failed.

**(a) real** (1) overview: "遷移甲干廉貞化祿入兄弟" but 遷移宮干 is 戊. (2) overview: "命宮破軍以壬干起飛" but 命宮干 is 甲. (3) overview: "身宮落福德太陽落陷" but 太陽 is 旺 in 福德. (4) overview: "財帛宮飛天機化祿入遷移" but 財帛宮干 丙 gives 天同祿 (also 4 other wrong 飛星 claims in the same reading). (5) overview: "官祿宮辛干使巨門化祿" but 官祿宮干 is 癸.

**(b) style / interpretive** (1) palaces: 8x "亮度未提及" (reading simply did not state brightness). (2) cautions: "擎羊在福德宮為陷，不應輕描淡寫為偶爾會躁" (tone softening). (3) cautions: "陀羅在命宮為廟旺，其負面影響不應過度強調". (4) palaces: "主星：天機、天梁、左輔、擎羊" flagged because 輔星 sit under a "主星" format label. (5) decades: "僅坐地空" flagged because 天哭/天虛 also in the palace.

**(c) false positive** (1) palaces: 8 issues each ending "此處描述正確". (2) palaces: 8x "亮度不符" for brightness the reading never mentioned (phantom claims). (3) overview: "祿存、天馬同宮成祿馬交馳" flagged though facts list both in 官祿. (4) overview: 命宮三方會照火星 flagged though 火星 is in the 對宮 遷移. (5) overview: "命宮巨門化忌在乙宮，解讀說巳" - reading is right, checker mixed stem and branch (also 3 more correct 飛星 claims flagged).

**(d) limitation** (1) `buildChartFacts` omits 輔星四化: "左輔化科", "文昌化忌", "文曲化科" flagged as fabricated though correct for the year stem. (2) Facts have no palace branch / 大限 age: "命宮 · 亥宮" headers flagged with invented branches. (3) cautions: 2026/2027/2035 流年四化 claims judged against natal-only facts (route did not pass `natalOnly`). (4) decades: "大限干丙使天同化祿入田宅" judged against natal facts. (5) synthesis: 八字 claims (日主戊土 ...) flagged "not in facts" because the synthesis reading mixes in 八字. Also: the deterministic 格局 gate applies the natal 格局 list to a 大限-palace "殺破狼" mention (kept as is, per scope).

Also seen: no 宮干->四化 table in the facts, so correct 飛星 claims were "verified" by guessing.

## Fix
- Prompt: only verifiable contradictions; each issue carries quote, verbatim fact line, analysis, `contradicts`, `severity` ("error" / "note"). `pass:false` iff >= 1 surviving error; notes never affect pass/fail or revision.
- Guards: error demoted to note if its quote is not literally in the reading (hallucinated phrases), the cited fact line is not literally in the facts, `contradicts` is not true, the message concedes consistency/unverifiability, or (natalOnly) it is about a 大限/流年/palace-relative position. Vague life-stage wording ("中晚年") never counts.
- `buildReviewFacts` (reviewer only; `buildChartFacts` is also pasted into generation prompts so it is untouched): adds 輔星四化, 生年四化, 天干四化 table, palace branches + 大限 ages, 身宮/命宮/來因宮, and expanded 三方四正 star lists.
- Deterministic hard-fact gate (free): 五行局, 命宮 branch, palace header branch, explicit "<palace> N~M歲" 大限. Existing 格局 check and negation handling unchanged.
- thinkingBudget 0 -> 1024 (maxOutputTokens 2048 -> 4096 since thinking counts against it): at 0 the model tagged correct claims as errors even with severity rules. Measured 6.0 s avg / 11.2 s max per call (was 1.1 s avg), inside the 20 s deadline, fail-open unchanged.
- `cautions` now reviewed as natalOnly (route + client). Revision issues capped at 5 (server + client). JSON contract `{pass, issues, reviewed}` unchanged (`issues` = errors only; extra `notes` field optional). validateBazi / validateFlowYear share the new contract.

## After (same 44 readings)
Fail: **7 / 44 = 15.9%** (was 24 / 44 = 54.5%). Remaining 7: 4 contain real errors (wrong stem 甲/壬, 太陽 旺 called 陷, 七殺/擎羊 not in those palaces, 地支申金三見 - only two 申, which the old checker missed), 1 borderline, 1 flow-year claim without a 大限 keyword, 1 false positive on 借星 wording.

## Regression set (planted errors in clean readings; 2 runs after final change, plus earlier runs)
| Planted error | Result |
|---|---|
| wrong 命宮 main star (命宮坐紫微) | FAIL |
| wrong palace branch (命宮 in 子, real 戌) | FAIL (deterministic) |
| 格局 not satisfied (石中隱玉) | FAIL (deterministic) |
| wrong 四化 target (本命太陽化忌, real 太陰) | FAIL |
| wrong age range (命宮大限 50~59, real 2~11) | FAIL (deterministic) |
| wrong 五行局 (水二局, real 木三局) | FAIL (deterministic) |
| 4 clean readings (2 overview, 2 palaces) | all PASS |

Before the deterministic gate, the branch and age-range cases passed in ~1 of 3 LLM-only runs; that is why they were made deterministic. Caveat: the sample is small (44 readings, 6 plants); main-star and 四化 detection are still LLM-judged.

## Retry budget
Current max before the change: client `reviseOrSurface` allows 1 regeneration (`retriedRef < 1`); server `sseWriter` does 0 regenerations (removed 2026-10-04, only validates). So the cap was already one regeneration per reading; unchanged. After the single regeneration the revised text is re-validated (one extra checker call, no extra generation) and, if still flagged, shown with a soft notice. New max = 1.
