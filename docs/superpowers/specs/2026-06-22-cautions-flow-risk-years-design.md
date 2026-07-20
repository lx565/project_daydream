# Design: Cautions Tab — Add 近年需格外留意 Section

**Date:** 2026-06-22  
**Status:** Approved

## Summary

Enhance the existing 注意/警 (cautions) tab by replacing the current `## 当前大运重点` section with `## 近年需格外留意` — a list of 2–3 specific upcoming years where 流年 signals stack up badly, grounded in deterministic iztro computation and explained by AI.

The tab currently outputs two sections from a single SSE call:
1. `## 一生需特别注意` — lifetime risks from natal chart (kept, unchanged)
2. `## 当前大运重点（XX岁）` — **removed**

After this change:
1. `## 一生需特别注意` — lifetime risks from natal chart (unchanged)
2. `## 近年需格外留意` — 2–3 upcoming years with worst 流年 risk signals, with specific dates and actionable framing

## Motivation

- The current `## 当前大运重点` is partially redundant with the 大运 tab (D1), which already covers the current decade in depth
- The cautions tab is "light" — users want more concrete, actionable warnings
- Specific flagged years ("watch out for 2028") are more useful than another decade-level summary
- This eliminates cross-tab redundancy and adds genuine new value

## Architecture

### Files Changed

**`app/api/reading/cautions/route.ts`** — only file modified

Changes:
1. Import `getFlowYears` from `@/lib/flowYears`
2. After existing natal chart analysis, run `getFlowYears(birth, currentAge, currentAge+19)` for 20 years
3. Run deterministic risk scoring on each year (see below)
4. Pick top 2–3 highest-risk years
5. Include their 四化 data in the AI user message
6. Update system prompt: remove `## 当前大运重点` block, add `## 近年需格外留意` block

No new routes, no new components, no cache changes needed.

### Deterministic Risk Scoring

For each of the 20 流年 years, compute a `riskScore`:

| Signal | Points |
|--------|--------|
| 化忌 star lands in 命宫 (natal) | +3 |
| 化忌 star lands in 疾厄宫 | +2 |
| 化忌 star lands in 官禄宫 | +2 |
| 化忌 star lands in 财帛宫 | +2 |
| 化忌 star lands in 夫妻宫 | +1 |
| 化忌 star lands in any other palace | +1 |
| 凶星 in 流年命宫's `natalStars` (擎羊/陀罗/火星/铃星/地空/地劫) | +1 each |

Use the existing `buildStarPalaceMap` pattern (already in `flowyears-scores/route.ts`) to map star name → natal palace name for the 化忌 check.

Select top 2–3 years by `riskScore`. If fewer than 2 years score above 0, include the lowest-scoring ones anyway to ensure the section is never empty.

### System Prompt Change

**Remove:**
```
## 当前大运重点（{{DECADE}}）
（聚焦当前这步大限十年...）
```

**Add:**
```
## 近年需格外留意
（根据流年四化数据，点出未来二十年中流年信号最不利的2–3年，每年指明年份干支、核心风险星曜与落宫、可能受影响的人生面向；随附1条可操作应对。约200字）
```

Tone stays the same: 温和关切，不夸大不吓人，每个风险都给出应对。

### User Message Change

**Remove:** current decade palace block  
**Add:** a block with the flagged years' 四化 data, e.g.:
```
近年流年风险年份：
2028年 戊申（X岁）｜流年命宫：本命XX宫｜流年四化：天机化忌（本命官禄宫）、...｜风险指数：5
2031年 辛亥（X岁）｜流年命宫：本命XX宫｜流年四化：太阴化忌（本命财帛宫）、...｜风险指数：4
```

## Data Flow

```
POST /api/reading/cautions
  ├── existing: build natal cautionLines from ziwei.palaces
  ├── NEW: getFlowYears(birth, currentAge, currentAge+19)
  ├── NEW: score each year → pick top 2-3 risk years
  ├── existing: getKnowledge() for RAG (stars updated to include risk-year stars)
  └── streamWithRefs() → SSE
        system: updated prompt (2 sections, no decade section)
        user:   natal summary + cautionLines + NEW risk year lines
```

## Paywall

No change — the cautions tab is already behind the paywall (gated streams). The new section inherits the same gate.

## Cache

No change — cautions uses `useSSEStream` with existing cache key `ck("cautions")`. The server-side cache version (`CACHE_VERSION` in `lib/sseWriter.ts`) and client cache prefix (`CACHE_PREFIX` in `lib/useSSEStream.ts`) must both be bumped after this change so existing charts regenerate with the new section structure.

## Out of Scope

- No new API routes
- No new UI components
- No 八字 流年 risk detection (紫微 only for now)
- No user-facing rerun button

## Success Criteria

- 注意 tab renders 2 distinct sections with no cross-tab redundancy
- `## 近年需格外留意` always names specific years with 干支, age, and a named star/palace
- Framing is non-alarmist: each flagged year has an actionable response
- No extra model calls vs. current implementation
