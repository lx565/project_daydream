# Marketing/UX claim audit: product pages (2026-10-19)

Scope: /hepan, /bazihepan, /niandu, /yueyun, /compare, hepan/niandu/yueyun flows and result views, WizardFlow labels, PaywallLock, emails. Verdicts: OK = accurate, FIXED = changed in this branch, FLAG = needs owner decision (not changed).

## Truth-sheet checks against code
- Solo free tabs: code (`components/WizardFlow.tsx:25` `FREE_TABS = ["overview"]`) shows ONLY 總覽 is free. 宮位 is locked and listed as paid in `PaywallLock` DEFAULT_INCLUDED. This disagrees with the owner note ("總覽 + 宮位 free"); code trusted, no copy claims 宮位 is free.
- Hepan permanence: `lib/usePaywall.ts` `PERMANENTLY_FREE_TYPES = {hepan}`; hepandeep ($7.99) is a separate ChartType gated only by the env override. Split is unambiguous, so the /hepan FAQ wording was applied.
- Niandu shares ChartType "monthly" with yueyun ($1.99); both currently free via NEXT_PUBLIC_PAYWALL_DISABLED_TYPES.
- Hepan dims: `lib/couple.ts:200` clamps each dim to 66..96; total clamped 42..98 (`couple.ts:76`).
- Validation (Gemini check): niandu full reading uses `validate:true`; solo synthesis per person does; the couple full, bazi-couple and monthly routes do NOT. So "AI 輔助校驗" is only claimed on niandu.
- Privacy: no page or email says birth data is "not stored" any more (grep `不會被儲存|不會用於其他用途|僅用於本次` clean). Emails/PDF headers contain no such claim.

## Claim table
| File:line | Claim | Verdict | Action |
|---|---|---|---|
| app/hepan/page.tsx:35 | 雙方資訊僅用於本次推算，不會被儲存 | inaccurate (logged to Sheet, sent to AI, cached 30d) | FIXED approved sentence |
| app/hepan/page.tsx:40 | 完全免費…輸入兩人資訊即可全部檢視 | overstated (深度合盤 is $7.99 normally) | FIXED: 基本合盤永久免費；深度合盤目前限時免費 |
| app/hepan/page.tsx:50 | AI 嚴格基於兩張真實排盤…不會憑空杜撰星曜落宮 | unverifiable-overstated (couple route has no validation pass) | FIXED: 依據兩張真實排盤…參考百餘部 |
| app/hepan/page.tsx:50 | 逾百部 | OK (117) but inconsistent wording | FIXED 百餘部 |
| app/hepan/page.tsx:99 | NEW badge on 命理版＋白話版 | outdated (shipped 2026-09-12, 5+ weeks) | FIXED removed |
| app/hepan/page.tsx:107 | 緣分指數四維 = 吸引力/默契度/穩定度/成長潛力 | inaccurate for 4 of 5 types (dims differ per type) | FIXED: 例如情侶為… |
| app/hepan/page.tsx:45,110 | five types, 飛化互入, 三方四正, 緣分時機, 相處之道, 分享卡片 | OK, all are headings in app/api/reading/couple/route.ts | none |
| app/hepan/page.tsx:10-17 meta | 免費測…緣分指數 | OK (base hepan permanent free) | none |
| app/hepan/page.tsx:30,107 | 「可量化的緣分指數」 deterministic | OK; see Decisions on floor of 66 | none |
| app/bazihepan/page.tsx:39 | 完整八字合盤解讀為付費內容 | inaccurate (hepan permanently free, merged into /hepan) | FIXED |
| app/bazihepan/page.tsx:29,133 | 飛化互入 (紫微), 日主十神, 干支合衝刑害, 大運 | OK (prompt covers 十神, 三合六合六沖三刑, 大運時機) | none |
| app/bazihepan/page.tsx:49 | 嚴格依據…百部 | overstated / inconsistent | FIXED 依據…百餘部 |
| app/bazihepan/page.tsx:78 | 比緣分指數更貼近子平命理本義 | unverifiable opinion | FLAG minor |
| app/niandu/page.tsx:34 | 不會被儲存 | inaccurate | FIXED |
| app/niandu/page.tsx:30 | 每一句提醒都能回推到…具體星曜落點 | overstated (AI prose) | FIXED: 提醒都以四化落點為依據 |
| app/niandu/page.tsx:49,102 | 不會憑空杜撰星曜落宮; 上百部 | unsupportable absolute; niandu IS validated | FIXED: 經 AI 輔助校驗; 百餘部 |
| app/niandu/page.tsx:92 | NEW badge | outdated (2026-09-12) | FIXED removed |
| app/niandu/page.tsx:12,17,39,44 | 付費 / $1.99 | accurate normally, but currently free | FLAG (promo) |
| app/niandu/page.tsx:44 | 完整命書 $6.99 涵蓋十二宮位…問命追問 | OK (PaywallLock list) | none |
| app/yueyun/page.tsx:35 | 不會被儲存 | inaccurate | FIXED |
| app/yueyun/page.tsx:40 | 每月約130字 | inaccurate (prompt: headline 15-20 + 宜 10-15 + 忌 10-15 + advice 40-60 ≈ 75-110字) | FIXED: removed the count |
| app/yueyun/page.tsx:50 | 不會憑空杜撰星曜落宮 | unsupportable (no validation pass on monthly) | FIXED removed |
| app/yueyun/page.tsx:12,17,40,45 | 付費 / $1.99 | normally accurate, currently free | FLAG (promo) |
| app/yueyun/page.tsx:13 | keyword 2026年運勢逐月 | window is rolling 12 months; fine through 2026 | FLAG: add 2027 |
| components/HepanFlow.tsx:458, NianduFlow.tsx:180, MonthlyFortuneFlow.tsx:193, CompareRespondForm.tsx:138 | 僅用於本次推算與網站使用統計，不會用於其他用途 | inaccurate (3rd-party AI, product stats) | FIXED approved sentence |
| same files | 出生時間預設按北京時間（UTC+8）排盤 | unverified for overseas users; 北京 wording for TW/HK audience | FLAG |
| components/CompareRespondForm.tsx:77 | 合盤——完全免費 | OK for base hepan | none |
| components/HepanResultView.tsx:384 | 指數基於五行結構、日主關係與宮星曜，僅供參考 | OK, hedged | none |
| components/HepanResultView.tsx:607, NianduResultView.tsx:304, MonthlyResultView.tsx:379, ToolCTA, PaywallLock:26 | 逾百部 / 上百部 典籍 | OK (117 books), wording varies | none (cross-page consistency left to global agent) |
| components/WizardFlow.tsx:44 | 經雙模型交叉校驗 | overstated (second model checks facts, fail-open) | FIXED |
| components/PaywallLock.tsx:25 | 多模型 交叉校對 | overstated | FIXED 雙模型 輔助校驗 |
| components/PaywallLock.tsx:24 | 萬字以上 深度解讀 | unverifiable | FLAG |
| components/PaywallLock.tsx:49 | 人工命理諮詢動輒數千元起跳 | unverifiable market claim, currency unclear | FLAG |
| components/PaywallLock.tsx:51 | USD · 一次付費 · 永久解鎖 | OK (unlock KV has no TTL) | none |
| components/WizardFlow.tsx:817 | 還有五個章節尚未展開 | OK-ish; 宮位 locked per code | none |
| components/UnlockLoadingOverlay.tsx:7-10 | 掃描百部典籍; 以進階模型交叉審閱 | loosely worded | FLAG (shared component) |
| components/PremiumReportCTA.tsx | 一生詳批 即將推出; 微訊號 | stale/mainland wording but component is imported nowhere | FLAG (dead code) |
| lib/emailTemplate.ts:135,143,153 | AI 輔助生成，僅供參考 | OK; no privacy/accuracy claims | none |
| app/api/email/report/route.ts | errors, subject | OK | none |
| app/compare/** | titles/errors | OK | none |
| Simplified/variant scan (丑/醜, 綫, 紫薇) in scope | none found | OK | none |

## Decisions needed
1. Promo mismatch: niandu/yueyun meta, OG, FAQ, PaywallLock and result views say 付費 $1.99 while the env override makes both free. Pick promo wording (e.g. 限時免費) or leave until the env var is removed.
2. 緣分指數: dims clamp to 66..96 and total to 42..98, so scores never look low. Keep numeric score on web?
3. Whether to promise 日後可能調整為付費 for 深度合盤 in the /hepan FAQ (applied, easy to soften).
4. 萬字以上 and 人工諮詢數千元 on the paywall: keep, soften, or source.
5. 北京時間 default wording for TW/HK/overseas users.
6. Solo 宮位 tab: owner note says free, code locks it.
7. Add AI 輔助校驗 to hepan/monthly generation (code change) or keep claim off those pages (current).
8. Dead PremiumReportCTA: delete?
