# iztro 2.5.8 → 2.6.1 chart diff study

Date: 2026-10-18. Goal: make the website use the same iztro as the iOS app (2.6.1).

## Method
- `lib/ziwei.ts` + `lib/starBrightness.ts` compiled unchanged and run against iztro 2.5.8 and 2.6.1 in separate scratch dirs.
- 600 samples (seeded PRNG): 300 random dates 1930–2025, 150 in lunar leap months (72 leap-month candidate days available), 150 more random. Hours cycle through every 時辰 (0,1,3,...,23, incl. 子時); genders alternate.
- Every `ZiweiResult` field compared: palaces (name, branch, stem, body/soul flags, decadal age/stem), star list/order/type, brightness, mutagen, 五行局, 命主/身主, 生年天干, 來因宮, summary, birth, sanFangSiZheng.
- App check: the iOS app's `lib/ziwei.ts` (identical code apart from comments) run with iztro 2.6.1 on the same 600 samples.

## Results
- Charts differing at all: **131 / 600 (21.8%)** (41 of the 150 leap-month samples).
- Fields differing: **only `star.brightness`** (131 charts). Zero differences in palaces, star placement, mutagen/四化, decades, 五行局, 命主/身主, 來因宮, 三方四正, summary.
- App (2.6.1) vs web (2.6.1): **0 / 600 charts differ** (full equality, beyond the 5-sample ask).

## Every distinct brightness change (all in 酉 palace; iztro star tables only)
| Star | Branch | 2.5.8 | 2.6.1 | Charts | Matches 令東來《紫微斗數全書》廟旺平陷表 |
|---|---|---|---|---|---|
| 七殺 | 酉 | 廟 | 旺 | 64 | 2.6.1 (table lists 殺 under 旺 at 酉) |
| 太陰 | 酉 | 不 | 旺 | 54 | 2.6.1 (月 under 旺 at 酉) |
| 太陽 | 酉 | 陷 | 平 | 13 | 2.6.1 (日 under 平和 at 酉) |

Source for the reference: `knowledge/extracted/其他名家/令东来-紫微斗数全书(2018更新目录).txt`, 第五節「星曜庙旺平陷表」 (the 酉 row). Caveat: classical tables differ between editions; the 2.5.8 values match another widely circulated table, so this is "2.6.1 agrees with the one table in our KB", not an absolute ruling. `lib/xiongData.ts` says 七殺 in 子/午/卯/酉 is a "旺宮…入廟" (ambiguous, not decisive).

## Does lib/starBrightness.ts neutralise the version?
No. It only fills blanks (祿存=廟) for minor stars where iztro returns an empty brightness; major-star brightness passes straight through from iztro, so the iztro version determines it.

## Build checks (2.6.1)
`npx tsc --noEmit` clean, `npm run build` succeeds, no code change needed in `lib/ziwei.ts`. `/result?date=1930-05-01&hour=5&gender=male&tz=8&method=ziwei` returns 200 from `next start` with the chart rendered.

## Deploy note
Readings embed the client's chart, so cached readings keyed by chart content are naturally distinct; but if any server cache is keyed only by birth inputs, bump `CACHE_VERSION` (lib/sseWriter.ts) and `CACHE_PREFIX` (lib/useSSEStream.ts) together when merging.
