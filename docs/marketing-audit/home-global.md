# Marketing audit: homepage + global (2026-10-19)

Scope: app/page.tsx, app/layout.tsx, lib/jsonld.ts, components/PaywallLock.tsx, lib/usePaywall.ts, 404/error pages, FortuneForm (homepage form), terms (report only).
Verdicts: OK = accurate; OUT = outdated; BAD = inaccurate; OVR = unverifiable/overstated; INC = inconsistent. "Fixed" = changed in this branch.

| # | File:line (pre-edit) | Text | Verdict | Action |
|---|---|---|---|---|
| 1 | layout.tsx:22 | 「多模型AI即時推演，自動交叉驗證」 (meta description) | OVR | Fixed: AI 撰寫 + 第二模型輔助校驗 |
| 2 | layout.tsx:23-26 | OG/Twitter metadata, title | OK | none |
| 3 | layout.tsx:44,51 | 「本平臺」 (mainland usage) | INC | Fixed: 本平台 |
| 4 | layout.tsx:56 | 「© 2025」 | OUT | Fixed: dynamic year |
| 5 | layout.tsx footer | no link to privacy policy | missing | Fixed: added 隱私權政策 -> /terms#privacy |
| 6 | layout.tsx:44 | Fair Use footer claim | OK (legal, untouched) | none |
| 7 | jsonld.ts:17 | WebSite description 「三合·四化·飛星三派合參，依據百餘部命理典籍」 | OK | none |
| 8 | jsonld.ts:21-29 | Organization | OK | none |
| 9 | page.tsx:15-16 | 百餘部 / 3萬+ | OK | none |
| 10 | page.tsx:17 | 雙系統 紫微·八字 | OK | none |
| 11 | page.tsx:18 | 「多模型 AI交叉驗證」 | OVR | Fixed: 「AI校驗 / 對照命盤事實」 |
| 12 | page.tsx:23-32 | three ancient quotes (《紫微斗數全書》《三命通會》《千里命稿》) | unverifiable (paraphrase risk) | Flag: confirm exact source wording |
| 13 | page.tsx:40 | 命格總覽 三派共參 | OK | none |
| 14 | page.tsx:36-62 | 「五大解讀維度…由這五個部分組成」 but solo reading has 7 tabs (總覽 宮位 大運 八字 眾說 注意 問命) | BAD | Fixed subtitle |
| 15 | page.tsx:~170 | nav 年度解讀 badge 「免費」 (temporary free) | OVR | Fixed: 「限免」 |
| 16 | page.tsx:~170 | nav 雙人合盤 「免費」 | OK (permanent) | none |
| 17 | page.tsx:~178 | banner 「雙人合盤 永久免費，年度解讀 現正限時免費」 | OK | none (matches code). Note monthly/hepandeep promos not mentioned |
| 18 | page.tsx:~207 | hero 「多模型 AI 交叉驗證——每一句解讀，都有出處」 | BAD | Fixed |
| 19 | page.tsx:~226 | 「輸入出生資訊，AI 即刻推演 · 免費開始」 | OK | none |
| 20 | page.tsx:~232 | 「總覽免費 · 完整命書可永久保存」 | OVR (unlock is permanent; readings are cached 30 days then regenerated) | Fixed: 一次解鎖，永久可重複查閱 |
| 21 | page.tsx (form) | no privacy note | missing | Fixed: approved wording + link |
| 22 | page.tsx:~280 | 「示例解讀（內容模糊處理）」 | OK | none |
| 23 | components/ReadingPreview.tsx:98-105 | sample says 「癸卯年丁巳月」 then 「日主甲木生於寅月，木氣當令」 | INC (internal contradiction; 丁巳月 is a 巳 month) | Flag, not changed (sample prose rewrite) |
| 24 | components/ReadingPreview.tsx:109 | 「據《斗數卷》王亭之按」 | unverifiable | Flag |
| 25 | page.tsx comparison h2 | 「為什麼命裡優於通用 AI？」 | OVR | Fixed: 「命裡與通用 AI 有何不同？」 |
| 26 | page.tsx comparison sub | 「通用AI…無法準確排盤」 | OVR | Fixed: softened |
| 27 | page.tsx row 知識來源 | 「即時檢索原著段落」 | OK-ish | Fixed: 相關段落 |
| 28 | page.tsx row 排盤精度 | 「iztro引擎精確計算紫微星盤與八字」 (八字 is lunar-calendar code, not iztro) | BAD | Fixed |
| 29 | page.tsx row 準確性保障 | 「多模型交叉驗證，矛盾處自動重推」 (checker is fail-open; no auto re-derive) | BAD | Fixed |
| 30 | page.tsx row 有據可查 | 「每句解讀附原著出處，可追溯」 | BAD | Fixed |
| 31 | page.tsx row 命理深度/專業覆蓋 | 紫微三派+八字; 逐宮詳解 | OK | none |
| 32 | page.tsx hepan | 「確定性演算法…每次一致」, 四維得分 | OK | none (緣分指數: decision) |
| 33 | page.tsx hepan | 「緣分指數與緣分一瞥免費」 | OK (hepan permanently free) | none |
| 34 | page.tsx KB | 「百餘部典籍 / 3萬+知識塊」 | OK | none |
| 35 | page.tsx KB | 「逾12位名家」 | unverifiable | Flag |
| 36 | page.tsx KB step 1 | 「逾3萬個檢索塊」 | OK | none |
| 37 | page.tsx KB step 3 | 「不憑空作答，每句有出處」 | BAD | Fixed |
| 38 | page.tsx articles | 名人命盤 「33 位」; actual FAMOUS_PEOPLE = 43 | BAD | Fixed: 43 |
| 39 | page.tsx articles | 星曜詳解 336 篇 (28 stars x 12) | OK | none |
| 40 | page.tsx articles | 命格大全 31 格局 (MINGGE_LIST=31) | OK | none |
| 41 | page.tsx articles | 八字知識庫 「40 篇」; sub-clusters sum to 64+ | OUT | Fixed: 60+ |
| 42 | page.tsx articles | 命理書單 30 篇 (BOOK_ARTICLES=30) | OK | none |
| 43 | page.tsx articles | 學習中心 「24 篇」; GUIDE_TOPICS=27 | OUT | Fixed: 27 |
| 44 | page.tsx closing | 「總覽免費，不需註冊」 | OK | none |
| 45 | page.tsx closing | 「本平臺」 | INC | Fixed |
| 46 | PaywallLock.tsx:25 | 「多模型 交叉校對」 | OVR | Fixed: 「AI輔助 對照命盤校驗」 |
| 47 | PaywallLock.tsx:26 | 「上百部」 | INC (site uses 百餘部) | Fixed |
| 48 | PaywallLock.tsx:24 | 「萬字以上 深度解讀」 | unverifiable | Flag |
| 49 | PaywallLock.tsx:49-55 | included list; 「永久保存 · 可重複查閱」 | OVR | Fixed: 永久解鎖 |
| 50 | PaywallLock.tsx:143 | 「人工命理諮詢動輒數千元起跳」 (no currency, unverifiable) | OVR | Flag; suggest 「人工命理諮詢常需數千元新台幣」 or remove |
| 51 | PaywallLock.tsx:144-145 | price from CHART_PRICE_USD, 「USD · 一次付費 · 永久解鎖」 (unlock has no TTL) | OK | none |
| 52 | PaywallLock.tsx:160,178 | 信用卡 / Apple Pay; Visa/Mastercard | OK, no 支付寶/微信 | none |
| 53 | usePaywall.ts | no user-facing strings | n/a | none |
| 54 | not-found.tsx, error.tsx, global-error.tsx | 此頁無緣 / 出了點小狀況 | OK | none (global-error `lang="zh"` could be `zh-Hant`; left) |
| 55 | FortuneForm.tsx:143 | 「公曆出生日期」 (mainland term) | INC | Fixed: 西曆 |
| 56 | FortuneForm.tsx:203 | 「出生地不在中國（UTC+8）？」 (Taiwan/HK users are UTC+8 too, confusing) | INC | Fixed |
| 57 | FortuneForm.tsx:191 + flows | 「將換算為北京時間推盤」 | Beijing-centric for TW/HK audience | Flag (decision) |
| 58 | NianduFlow.tsx:180, MonthlyFortuneFlow.tsx:193, HepanFlow.tsx:458 (other agents' scope) | 「資訊僅用於本次推算與網站使用統計，不會用於其他用途」 | BAD-ish: omits third-party AI and 30-day cache; approved wording should replace | Report |
| 59 | WizardFlow.tsx:44,515,521 (result page) | 「雙模型交叉校驗」 / 「已雙模型交叉校驗（DeepSeek × Gemini）」 shown even when checker is fail-open | OVR | Report to owner of result pages |
| 60 | UnlockLoadingOverlay.tsx:9-10 | 「掃描百部命理典籍」「以進階模型交叉審閱」「校驗各派論斷一致性」 (fake progress steps) | OVR | Report |
| 61 | terms/page.tsx:7 | meta description / 「本平臺」 | INC wording only | Report; not changed |
| 62 | terms:~97 (section 五) | 「本平臺核心功能始終免費」 and 打賞 section, but solo full reading costs $6.99 | INC | Report |
| 63 | terms section 九 | says data used 「僅用於內部分析」, lists Anthropic as a provider, omits 30-day server cache of readings | INC with truth sheet | Report |
| 64 | terms | Simplified-style forms (合同, 公佈, 版權法, 郵箱, 運營方, 支援) | INC | Report |

Claims audited: 64 rows. Changed: 29 (items 1,3,4,5,11,14,15,18,20,21,25,26,27,28,29,30,37,38,41,43,45,46,47,49,55,56 plus layout/page 平臺 sites).

## Decisions needed
1. 緣分指數 numeric score on hepan: keep or drop (homepage still advertises it).
2. Temporary-free wording: nav badge now 「限免」 and banner says 限時免費 for 年度解讀; 逐月運勢 and 深度合盤 are also free but unadvertised. Confirm whether banner should list them. Proposed end-of-promo text: remove banner sentence + badge when NEXT_PUBLIC_PAYWALL_DISABLED_TYPES changes (hardcoded now, could read from env).
3. Hero rewrite: current h1 「彙集眾多命理典籍…」 kept; paragraph edited minimally.
4. 「人工命理諮詢動輒數千元起跳」 anchor: keep with currency or remove.
5. Result-page 「雙模型交叉校驗 (DeepSeek x Gemini)」 badge shows when checker may have failed open: needs owner of WizardFlow.
6. Sample reading in ReadingPreview contains an astrology inconsistency (寅月 vs 巳月): rewrite sample?
7. Beijing-time default copy for TW/HK audience.
8. Terms section 九 needs a legal-owner pass (see rows 62-64).
