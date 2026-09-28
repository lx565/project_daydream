# 深度合盤 — paid upsell tier for hepan

**日期:** 2026-09-28
**狀態:** 待實現

## 背景

hepan（`/hepan`）目前的 5-tab 結構（總覽/各自/綫析/時機/問合盤，見 `2026-08-19-hepan-unified-redesign-design.md`）已上線，且 hepan 的免費狀態是**永久性產品決策**（2026-09-11，`lib/usePaywall.ts` 的 `PERMANENTLY_FREE_TYPES`），不受 `NEXT_PUBLIC_PAYWALL_DISABLED_TYPES` 影響，也不會被那個暫時性開關重新上鎖。

觀察 hepan 流量記錄時，順帶發現同一人在一分鐘內對同一人+同一關係型別重複提交多達 12 次（見同次對話中已修的 `lib/useSSEStream.ts` unmount-abort 問題），過程中比對了 solo（`WizardFlow.tsx`，7 個 tab、約 10 條獨立 AI 呼叫：總覽/宮位/大運/八字/眾說/注意/問命）與 hepan 現有結構的深度差距——hepan 的「各自解讀」tab 目前只呼叫 solo 的單一 `synthesis` route，其餘 9 條 solo 才有的深度內容（宮位逐宮、大運逐運、五派眾說、注意警示）在 hepan 裡完全不存在。

Niki 想讓 hepan 做到「和 solo 一樣好、一樣全面」，並確認方向：**做成新的付費升級層**（不動現有免費 5-tab），且內容方向是**合盤專屬的新內容**，而非把兩份 solo 深度直接塞進 hepan（後者成本高且與「買兩份 solo」重疊，價值不夠差異化）。

## 決策記錄（與 Niki 確認，2026-09-28）

1. 新付費層命名「深度合盤」，新增 4 個 tab，接在現有 5 個免費 tab 後面。
2. 內容全部是**合盤專屬**：不是把 solo 的宮位/大運/眾說/注意直接搬進來對每個人各跑一次，而是圍繞「兩人之間」重新設計。
3. 現有 5 個免費 tab 完全不動——這是獨立的第二層付費閘門，不是把現有內容重新上鎖。
4. 5 種關係型別（情侶/夫妻/朋友/兄弟姐妹/親子）全部支援，內容依 `lib/coupleTypes.ts` 現有的 `palaces`/`dimensions`/`focusHint` 差異化，不套同一模板。
5. 定價：待定，暫以 solo 的 $6.99 為下限參考（見下方「待 Niki 決定」）。

## 架構

### Tab 結構（接在現有 5-tab 之後）

| Tab | 存取 | 內容 |
|---|---|---|
| 緣分總覽 / 各自解讀 / 合盤綫析 / 緣分時機 / 問合盤 | 免費（不動） | 現有 5-tab，見 2026-08-19 spec |
| **宮位** | 深度合盤付費 | 依關係型別 `cfg.palaces` 清單，逐宮列出雙方在該宮的星曜配置，對照契合/磨合之處 |
| **大運** | 深度合盤付費 | 雙方大運週期疊圖：哪些階段兩人同步向上、哪些階段一方順一方逆 |
| **眾說** | 深度合盤付費 | 三合/四化/飛星/倪師/小眾 五派對「這段關係契合度」的各自論斷 |
| **注意** | 深度合盤付費 | 兩盤之間的煞星/化忌互動、此關係型別常見的衝突模式與化解 |

### 付費閘門（獨立於現有 hepan 免費層）

- 新 `ChartType`: `"hepandeep"`，沿用 `monthly`/`niandu` 的 prefix 手法（見 `lib/chartType.ts`）
- chartId: `hepandeep_${sessionId}`（`sessionId` 與現有 hepan 的 `${personKey(a)}_${personKey(b)}_${relType}` 同一組值，確保深度合盤與免費合盤指向同一對命盤+關係型別）
- `usePaywall(hepandeepChartId)` + `PaywallLock`，模式與 solo/現有 hepan 完全一致——`hepandeep` **不**加入 `PERMANENTLY_FREE_TYPES` 或 `DISABLED_TYPES`，走一般付費流程
- Stripe：`app/api/checkout/route.ts` 的 `PRICE_ENV_BY_TYPE` 新增 `hepandeep: "STRIPE_PRICE_ID_HEPAN_DEEP"`（新 env var，需 Niki 在 Stripe dashboard 建立新 Price 並加到 Vercel prod——我無法代做這一步）
- `lib/chartType.ts`：`ChartType` 加入 `"hepandeep"`，`PREFIX_TYPE` 加 `["hepandeep_", "hepandeep"]`，`CHART_PRICE_USD` 加對應價格

### AI 呼叫預算（一次深度合盤解鎖）

| 呼叫 | 備註 |
|---|---|
| `couple/palaces`（新） | 依 `cfg.palaces`，通常 3-4 宮 |
| `couple/decades`（新） | 雙方大運疊圖 |
| `couple/schools`（新） | 五派論斷 |
| `couple/cautions`（新） | 衝突模式/化解 |

**共 4 個新增付費呼叫**，不隨人數乘倍（不是「每人重跑 solo 那 10 條」），成本可控，遠低於「方案 A：每人全套 solo 深度」的 16-18 條。

## 技術設計

### 新增檔案

- `app/api/reading/couple/palaces/route.ts` — 仿 `app/api/reading/palaces/route.ts` 的 SYSTEM/RAG/streamWithRefs 結構，但輸入雙方 `ziwei`，逐宮並列雙方星曜（複用 `lib/couple.ts` 的 `PALACE_ALIASES`），依 `cfg.palaces` 篩選要解讀的宮位
- `app/api/reading/couple/decades/route.ts` — 仿 `app/api/reading/decades/route.ts`，輸入雙方 `ziwei`/`bazi`，疊圖式描述雙方大運週期的同步/錯位階段
- `app/api/reading/couple/schools/route.ts` — 仿 `app/api/reading/bazi-schools/route.ts` 的五派結構，但論斷對象是「這段關係」而非單一命盤——這是四條新 route 裡 prompt 設計難度最高的一條，五派各自的「契合度判斷邏輯」需要分別想清楚（三合派看宮位三合、四化派看飛化互入、飛星派看星曜飛入、倪師學派、小眾學派），不能只是把現有單人版套用關係包裝
- `app/api/reading/couple/cautions/route.ts` — 仿 `app/api/reading/cautions/route.ts`，聚焦雙盤之間的煞星/化忌互動與此關係型別的常見衝突模式（`cfg.focusHint` 已有各關係型別的側重提示可承接）

### 修改檔案

- `components/HepanResultView.tsx` — `TABS` 陣列加 4 項；新增第二個 `usePaywall(hepandeepChartId)` 呼叫與對應 `isLockedDeep()` 判斷；4 個新 tab 各自的 `useSSEStream` + `renderContent()` case，模式完全比照現有 5 個 tab
- `lib/chartType.ts` — 見上方「付費閘門」
- `app/api/checkout/route.ts` — `PRICE_ENV_BY_TYPE` 新增一行

### 快取版本紀律（歷史上已踩 4 次的坑）

新增的 4 條 route 是全新 route（非修改既有 prompt），**首次上線不需要**碰 `lib/sseWriter.ts` 的 `CACHE_VERSION` 或 `lib/useSSEStream.ts` 的 `CACHE_PREFIX`——這兩個版本號只在「修改既有 route 的 prompt 結構」時才需要同步 bump。但日後若調整這 4 條新 route 的 prompt，務必記得同步 bump 兩處，否則舊快取內容會原樣重播（見 `project-fortune-app.md` 記錄的 4 次踩坑歷史）。

## 測試

- 本地測試涵蓋全部 5 種關係型別，確認：
  - 現有 5 個免費 tab 行為不受影響（永久免費，無需暫時開啟 `NEXT_PUBLIC_PAYWALL_ENABLED`）
  - 新 4 個 tab 正確被獨立的 `hepandeep` 付費閘門擋住（需暫時開啟 `NEXT_PUBLIC_PAYWALL_ENABLED=true` 本地測試，測完務必還原）
  - 五派論斷（眾說 tab）在 5 種關係型別下不套模板、確實反映各關係型別的側重
  - `注意` tab 的衝突模式描述與 `cfg.focusHint` 的側重一致，語氣維持現有「不製造沮喪感」的高地板基調
- 成本檢查：一次深度合盤解鎖僅新增 4 條付費呼叫，不因人數或關係型別而變動
- Stripe checkout 走新 `hepandeep` chartType 時，`metadata.chart_type` 正確標記，webhook unlock 邏輯無需改動（純 chartId 通用）
- tsc/build 需在停用本地 dev server 的情況下執行

## 待 Niki 決定（非本 spec 範圍，實作前需要答案）

1. **定價**：深度合盤售價？（solo 全套 $6.99 為參考下限，本 spec 暫不預設具體數字）
2. **Stripe Price ID**：需要 Niki 在 Stripe dashboard 建立新 one-time Price，並把 ID 加到 Vercel prod 環境變數 `STRIPE_PRICE_ID_HEPAN_DEEP`——這是外部依賴，實作可以先完成程式碼，但正式上線前需要這一步
3. **CTA 位置**：深度合盤的升級入口放在哪裡？（如現有 5-tab 結果頁底部新增一個升級卡片，或在「問合盤」chat 快用完免費額度時提示，比照 solo 的 chat-limit upsell 模式）——本 spec 暫定「結果頁底部升級卡片」為預設方案，實作時可調整
