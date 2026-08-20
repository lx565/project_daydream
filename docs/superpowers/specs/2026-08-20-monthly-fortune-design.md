# 逐月運勢 (monthly fortune) — new $1.99 standalone product

**日期:** 2026-08-20
**狀態:** 待實現（需 Niki 先在 Stripe 建立 $1.99 Price ID 才能接付費）

## 背景與目標

Niki 觀察：多數用戶想知道的其實是「接下來這一年、每個月會發生什麼」，比起現有 $6.99 的完整命書（總覽/宮位/大運/八字/眾說/注意/問命），這是一個更聚焦、更便宜的獨立產品。

**目標：** 一個全新、獨立的頁面與購買流程，提供「未來 12 個月」的詳細逐月運勢，$1.99 一次解鎖，與現有 $6.99 解讀完全分開（不是既有 solo reading 的附加分頁）。

## 決策記錄（與 Niki 確認，2026-08-20）

1. **獨立產品，非既有 solo reading 的分頁**——比照 `/hepan` 模式：自己的著陸頁、自己的輸入表單、自己的購買流程。
2. **單人**，非合盤——輸入一人出生資訊即可。
3. **12 個月全部覆蓋**，不是像流年重製那樣由 AI 篩選重點月份——Niki 明確要「每個月」都有內容。
4. **AI 呼叫拆成多次**（非一次涵蓋 12 個月）——避免重蹈今晚稍早遇到的「新增內容卻沒同步調高 token 預算」截斷風險。拆為 3 次呼叫，每次 4 個月（Q1+Q2 / Q3+Q4 中一種切法，實作時決定確切分界，例如純粹按月份 1-4/5-8/9-12）。
5. **免費預覽**：12 個月總覽格（確定性演算法，零 AI 成本，比照既有 `flowyears-scores` 的評分格模式）＋ 當月的免費 AI 短評。付費解鎖全部 12 個月的詳細敘述。
6. **僅紫微視角**，不做紫微+八字雙系統——比照今晚稍早重製的 solo 流年功能（也是純紫微），且與 $1.99 的價格定位相符（$6.99 的雙系統深度留在主產品）。
7. **技術基礎已確認可行**：iztro 的 `horoscope()` 已提供 `monthly`（流月）欄位，結構與既有 `getFlowYears()` 使用的 `yearly` 欄位一致（`index`/`name`/`heavenlyStem`/`earthlyBranch`/`palaceNames`/`mutagen`/`stars`）——經live驗證確認存在，非猜測。

## 架構

### 新增檔案

**`lib/flowMonths.ts`**（新建，完全比照 `lib/flowYears.ts` 的既有模式）
- `getFlowMonths(birth: BirthInfo, monthsAhead: number): Promise<FlowMonth[]>`——迴圈呼叫 `astrolabe.horoscope(dateString)`，每次取一個月，讀 `h.monthly` 而非 `h.yearly`。
- 比照 `getFlowYears` 已修好的 `"zh-TW"` 語言參數（**這次直接在新程式碼寫對，不留下同一類 bug**）。
- `FlowMonth` 介面：比照 `FlowYear`，欄位改為月份導向（`monthIndex`/`year`/`month`/`ganzhi`/`flowSoulPalace`/`natalStars`/`monthlyMutagen`/`flowStars`/`sanFang`）。
- `flowMonthFactsFrom(month)`：比照 `flowYearFactsFrom`，作為 AI grounding 用的確定性事實區塊。

**`app/api/reading/monthly/preview/route.ts`**（新建）——免費：12 個月總覽（確定性演算法，複用 `getFlowMonths` 算好的流月四化/命宮做簡易評分，比照 `flowyears-scores` 的評分邏輯）＋ 當月 AI 短評（1 次小型呼叫）。

**`app/api/reading/monthly/route.ts`**（新建，3 個呼叫其中一個的 handler，或用 query param/body 區分 1-4/5-8/9-12 三段，實作時決定是 3 個獨立 route 檔案還是 1 個 route 依 body 參數分段——傾向 1 個 route + body 參數，減少檔案數）——付費：每次呼叫產出 4 個月的詳細敘述。

**`components/MonthlyFortuneFlow.tsx`**（新建，比照 `HepanFlow.tsx` 的自包含模式：輸入表單 + 結果呈現在同一元件內，非分離的 landing + result 頁面結構）。

**`app/yueyun/page.tsx`**（新建，SEO 著陸頁 + 掛載 `MonthlyFortuneFlow`，比照 `/hepan`/`/bazihepan` 的 metadata/FAQ schema 模式）——**URL slug「yueyun」待 Niki 確認或提供更好的命名**。

### 修改檔案

- `app/api/checkout/route.ts` 或新增邏輯——需要依產品類型選擇不同的 Stripe Price ID（目前 `STRIPE_PRICE_ID` 是單一環境變數，硬編給唯一的 $6.99 產品）。需要新增例如 `STRIPE_PRICE_ID_MONTHLY` 環境變數，並讓 checkout route 依 `chartId` 前綴或新的 `productType` 參數選擇正確的 Price ID。
- `lib/chartType.ts`（如果存在，用於區分 hepan/solo 的既有邏輯）——可能需要擴充第三種 chart_type（如 `"monthly"`）供 Stripe metadata/GA4 區分。

### 待實作計畫階段決定的細節（非本 spec 範圍）

- `/api/reading/monthly` 的確切分段方式（3 個檔案 vs 1 個檔案+參數）
- 免費預覽的評分演算法細節（完全比照 `flowyears-scores` 還是需要調整）
- URL slug 最終命名
- SEO 關鍵詞策略（例如「2026年運勢逐月」「每月運勢預測」等，可套用 [[reference-mingli-title-writing-tactics]] 的標題撰寫原則）

## 外部依賴（阻塞付費功能，非阻塞開發）

**Niki 需在 Stripe Dashboard 建立新的 $1.99 Price ID**，並提供給我寫入 Vercel 環境變數（`STRIPE_PRICE_ID_MONTHLY`）。免費預覽與整體架構可以在沒有這個的情況下先開發完成，僅解鎖流程需要它才能真正上線測試。

## 測試

- 本地測試：確認 `getFlowMonths` 對已知命盤產出的流月命宮/四化與 iztro 原始資料一致（比照今晚稍早對 `getFlowYears` 的驗證方法論）。
- 確認 12 個月總覽格的免費預覽零 AI 成本、即時顯示。
- 確認付費 3 次呼叫的 token 預算不會截斷（每次 4 個月的內容量需要實測後決定 maxTokens）。
- tsc/build 需在停用本地 dev server 的情況下執行。
