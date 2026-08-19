# 合盤統一重構 — 5-tab unified hepan experience

**日期:** 2026-08-19
**狀態:** 待實現

## 背景

命裡目前有兩個獨立、平行的雙人合盤產品：

- **`/hepan`** (`HepanFlow.tsx`) — 紫微視角，呼叫 `/api/reading/couple`，免費預覽（`/api/reading/couple/preview`）→ `PaywallLock` → 付費完整解讀。SEO 頁面，鎖定「紫微雙人合盤」「雙人合盤免費」等關鍵詞。
- **`/bazihepan`** (`BaziHepanFlow.tsx`) — 八字視角，呼叫 `/api/reading/bazi-couple`，同樣的免費/付費結構。SEO 頁面，鎖定「八字雙人合盤免費」（此查詢排名第 55 名，過去誤記在 `/hepan` 名下）。

兩者互相跨連結（"測紫微合盤？→" / "測八字合盤？→"），各自付費解鎖互不相通——用戶若想同時看紫微+八字兩套系統的合盤，必須分別付兩次錢、填兩次資料。

第三個路徑 `components/CoupleResultView.tsx`（`/result` 頁面上 `partner=true` 分支）完全免費、無付費牆，但經全庫搜尋確認**無任何現存 UI 路徑可達**——已於 2026-08-19 刪除（−322 行），與本次重構無關，純屬順手清理的殭屍程式碼。

**目標：** 把 `/hepan` 與 `/bazihepan` 合併為一個統一的頁面/流程，一次付費（$6.99，與 solo 相同）看到紫微+八字雙系統的完整合盤，仿照 solo `WizardFlow.tsx` 的分頁結構。

**決策記錄（與 Niki 確認，2026-08-19）：**
1. 支援全部 5 種關係類型（情侶/夫妻/朋友/兄弟姐妹/親子），`coupleTypes.ts` 已有完整設定，無額外成本。
2. 各自解讀沿用既有 solo 個人解讀邏輯（非關係語境化的內容），非重寫新 prompt。
3. 合盤綫析同時保留並「加深」現有 `couple`+`bazi-couple` 兩條 route 的內容（原本 yuanfen-v3 spec 中被延後的 Phase 2 加深工作，這次一併做）。
4. 緣分時機採「跨系統綜合分析」立意，但技術上發現零額外 AI 成本即可達成（見下方）。
5. Niki 主動選擇現在就做，不再等待排名數據——原本的「排名未到、暫緩」判斷被明確覆蓋。
6. `/hepan`、`/bazihepan` 兩個獨立頁面合併為一，不再各自維護。

## 架構

### 分頁結構（比照 solo `WizardFlow.tsx` 的 `TABS`/`renderContent()` 模式）

| Tab | 存取 | 內容來源 |
|---|---|---|
| **緣分總覽** | 免費 | 確定性四維得分（`calcCoupleScoreV2`，已上線）+ 免費預覽文字（`couple/preview` route，已存在，沿用） |
| **各自解讀** | 付費 | 各自呼叫一次既有 solo 個人解讀（`synthesis`/`overview` route），甲乙雙方各一次 |
| **合盤綫析 · 紫微+八字** | 付費 | `couple`（紫微）+ `bazi-couple`（八字）兩條既有 route 的輸出，扣掉「緣分時機/大運時機」與「分享卡片」兩段後，分兩個子區塊並排/堆疊顯示。兩條 prompt 同步加深（見下方） |
| **緣分時機** | 付費 | **不新增 AI 呼叫**——從上方已抓取的 `couple`（`## 緣分時機`）與 `bazi-couple`（`## 大運時機 · 關係高峰與考驗`）兩段輸出中，用現有的 markdown 分段技巧（同 `CoupleFullReading`/`FullReading` 目前用 `text.indexOf(marker)` 拆分享卡片的做法）切出這兩段，合併顯示 |
| **問合盤** | 付費 chat | `ChatInterface`（已支援 `partnerZiwei` prop），比照 solo `問命` tab 的模式，`maxQuestions={10}` |

### AI 呼叫預算（一次完整付費解鎖）

| 呼叫 | 何時觸發 | 備註 |
|---|---|---|
| `couple/preview` | 免費，掛載即觸發 | 已存在，零新增 |
| `synthesis`（甲方） | 解鎖後 | 新增呼叫，但沿用既有 route/prompt |
| `synthesis`（乙方） | 解鎖後 | 同上 |
| `couple`（紫微完整） | 解鎖後 | 已存在，prompt 內容加深（見下方），不是新 route |
| `bazi-couple`（八字完整） | 解鎖後 | 同上 |
| 緣分時機 | — | 零新增，切現有輸出 |
| 問合盤 chat | 使用者主動追問時 | 與 solo 問命一致的既有模式 |

**總計：4 個自動觸發的付費呼叫**（`synthesis`×2 + `couple` + `bazi-couple`），比現有任一單一頁面（各自只需 1 個付費呼叫）多，但這是把兩個各付一次錢的產品合成一次付費看兩套系統的必然代價——且與目前 solo 讀命付費後的呼叫數量（8-9 個 stream）相比仍屬合理範圍。

### `couple`/`bazi-couple` prompt 加深（Phase 2，併入本次）

延續 2026-07-21 yuanfen-v3 spec 中被延後的 Phase 2：在現有的「前世緣分」「相處之道」段落上，加強心理學風格的用語（依附風格/溝通模式框架，非臨床用詞），加深「會遇到的矛盾」的具體度，同時保持既有的高地板（66–96）不製造沮喪感的基調。這是對現有 prompt 的文字調整，非新增章節、非新增呼叫。

### `/hepan`、`/bazihepan` 的去留

**兩個 SEO 頁面本身保留**（metadata、FAQ schema、關鍵詞相關的靜態內容全部保留，不動 SEO 資產）。

**確認（與 Niki，2026-08-19）：`/hepan` 成為唯一的互動流程入口**（保留其輸入表單 + 統一後的 5-tab 結果，取代目前的 `HepanFlow.tsx`）。`/bazihepan` 保留現有 SEO 內容（FAQ、說明段落、關鍵詞），但移除 `<BaziHepanFlow />`，改為導向 `/hepan` 的 CTA（可考慮帶 `?rel=` 等參數預填關係類型，實作時定）。`/bazihepan` 自身不再跑排盤/付費流程。

## 技術設計

### 新增檔案

**`components/HepanResultView.tsx`**（新建，取代已刪除的 `CoupleResultView.tsx` 但結構完全不同）
- 比照 solo `WizardFlow.tsx` 的 tab 狀態機模式：`activeTab` state、`TABS` 常數、`renderContent()` switch
- Props: 雙方 `bazi`/`ziwei`/`name`/`gender`、`sessionId`、`relationshipType`
- 內部管理 4 個付費 stream（`synthesisA`/`synthesisB`/`couple`/`baziCouple`）+ 1 個免費 stream（`couplePreview`），比照 solo 的 `useSSEStream` + 解鎖閘門模式
- 緣分時機 tab 的分段邏輯：新增一個小工具函式（如 `extractSection(text, heading)`）從 `couple`/`bazi-couple` 已完成的文字中切出對應段落——純字串處理，不需等待額外呼叫

### 修改檔案

- `app/api/reading/couple/route.ts`、`app/api/reading/bazi-couple/route.ts` — prompt 加深（見上方），SYSTEM 字串調整，非結構性改動
- `components/HepanFlow.tsx`（`/hepan` 沿用此頁面路由）— 輸入表單保留，result 渲染部分改為呼叫新的 `HepanResultView.tsx`（5-tab 結構），取代原本單一區塊的 free-preview + PaywallLock 呈現
- `app/bazihepan/page.tsx` — 移除 `<BaziHepanFlow />` 的排盤/付費流程，SEO 內容段落（Hero/FAQ/說明）保留，換成連到 `/hepan` 的 CTA

### 待實作計畫階段決定的細節（非本 spec 範圍）

- `BaziHepanFlow.tsx` 的確切下線時機（實作完成後獨立清理，或本次一併移除；`calcBaziCoupleScore`/`lib/baziCouple.ts` 等其邏輯若仍被 `bazi-couple` route 使用則保留，只移除頁面層的元件）
- 各自解讀 tab 呼叫 solo `synthesis` route 時，是否需要對 prompt 做任何最小調整以適應「這是合盤情境下的個人解讀」（目前假設不需要，直接沿用）

## 測試

- 本地測試涵蓋全部 5 種關係類型，確認：
  - 緣分總覽維持免費、其餘 4 個 tab 正確被 `PaywallLock` 擋住（需暫時開啟 `NEXT_PUBLIC_PAYWALL_ENABLED=true` 本地測試，測完務必還原）
  - 緣分時機 tab 正確從已完成的 `couple`/`bazi-couple` 輸出中切出對應段落，無需等待額外呼叫、無 loading 狀態
  - 問合盤 chat 正確帶入雙方命盤context
  - `/hepan`、`/bazihepan` 頁面 FAQ/metadata 不受影響，CTA 正確導向新頁面
- tsc/build 需在停用本地 dev server 的情況下執行（避免 `.next/` 併發衝突產生誤導性錯誤，本次會話已遇過一次）
