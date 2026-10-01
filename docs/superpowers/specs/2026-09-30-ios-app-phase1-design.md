# 命裡 iOS App — Phase 1 (Solo Reading + Library)

**日期:** 2026-09-30
**狀態:** 待實現

## 背景

Niki 想讓 mingli.study 多一個 App Store 上的原生 iOS App，目標是提高回訪率（repeat users）。討論中確認的大方向：

1. **平台**：iOS only（Apple App Store），暫不做 Android。
2. **技術路線**：React Native 全原生重建（而非 Capacitor 包網站），理由是長期 App Store 觀感與體驗品質優先於短期開發成本。
3. **付費**：App 內的解鎖必須走 Apple StoreKit（In-App Purchase），不能沿用現有 Stripe 連結——但這是 **Phase 2** 的範圍，Phase 1 先做免費層。
4. **分階段交付**：
   - **Phase 1（本 spec）**：App 殼 + 個人命盤（單人）閱讀流程 + 知識庫瀏覽，全部走免費內容，無帳號系統。
   - Phase 2：帳號系統 + Apple IAP 付費牆。
   - Phase 3：推播通知（回訪的主要機制）。
   - Phase 4：App Store 上架（隱私揭露、年齡分級、審核準備）。

設計稿（已與 Niki 核對、選定方向）：Design 畫布 https://claude.ai/artifact/XALTfs5hhK7v3WcuGDxEzo，共 14 個畫面，涵蓋入口流程、四種分頁版型比較、以及知識庫瀏覽流程。**最終選定版型：Version 1（底部分頁，7 個分頁併為 5＋「更多」）**。

## 決策記錄（與 Niki 確認）

1. Phase 1 範圍 **只做個人命盤（單人）**，不含雙人合盤、年度解讀、逐月運勢——這些留待後續 phase。
2. 命盤資料（生日、稱呼、性別）**只存在裝置本機**（無帳號、無雲端同步），比照網站目前用 localStorage 記住「已填過的命盤」的邏輯，但 App 版要能讓使用者主動「儲存多筆命盤」並隨時切換查看，而不是網站現在那種單次、臨時性的 URL 還原。
3. App 需要**兩層導覽**：
   - **根層分頁**（App 全域）：「命盤」｜「知識庫」
   - **命盤內分頁**（選定一筆命盤後）：總覽／宮位／大運／八字／更多（更多內含：眾說／注意／問命）—— 比照現有網站 `WizardFlow.tsx` 的 7 個 tab，但底部分頁容量有限，5＋更多是與 Niki 確認過的折衷方案。
4. 知識庫（對應網站的 `/library`、`/star`、`/sihua` 等 SEO 內容頁）**也要納入 App**，獨立於命盤之外——它是全站共用的參考資料，不綁定任何一筆命盤。
5. 視覺與品牌：延續現有網站的色票與字體系統（硃紅 #8B1A1A、墨色 #2C1A10、牛皮紙 #F5F0E6、楷書/宋體系字型），不自創新的視覺語言。

## 架構

### 導覽結構

```
App 根層（Tab Navigator）
├── 命盤 Tab
│   ├── 已儲存命盤列表（空狀態：新增命盤）
│   ├── 新增命盤（生日／時辰／性別輸入）
│   └── 命盤詳情（選定一筆命盤後，進入巢狀 Tab Navigator）
│       ├── 總覽
│       ├── 宮位
│       ├── 大運
│       ├── 八字
│       └── 更多（Sheet / Push）→ 眾說／注意／問命
└── 知識庫 Tab
    ├── 分類首頁（主星解析／四化觀念／宮位組合／凶格解析／生肖命理／典籍出處 ——實際對應 `content/seo/` 下 29 個分類，Phase 1 先挑選對使用者最有感的子集，其餘分類的歸併方式留待實作階段細定）
    ├── 分類列表（如：主星解析 → 14 主星）
    └── 文章詳情頁
```

### 資料來源與後端整合

**好消息：現有後端幾乎不用改。**

- `/api/reading/*`（synthesis、overview、palaces、decades、bazi、bazi-deep、bazi-schools、cautions、overview 的五派眾說等）這些既有 SSE API route，App 直接用 `fetch` 打同樣的 URL 即可——React Native 的網路層不是瀏覽器，不受 CORS 限制，現有 route 完全不用改。
- 命盤排盤邏輯（`lib/bazi.ts`、`lib/ziwei.ts` 的 `calculateBazi`/`calculateZiwei`）目前是**前端 JS 直接算**（網站端也是在瀏覽器裡跑），App 端需要把這兩個計算函式移植或複用到 React Native 環境（純 TypeScript 邏輯，理論上可直接共用，但 `iztro`/`lunar-javascript` 這類依賴需確認在 React Native/Hermes 引擎下能否正常運作——**這是 Phase 1 第一個需要驗證的技術風險**，若不相容，退路是新增一個薄 API route 把排盤算在伺服器端、App 只拿結果 JSON）。

**新增後端需求：知識庫內容 API。**

現有知識庫文章存在 `content/seo/<category>/<slug>.json`（如 `content/seo/star/七殺__命宮.json`，欄位為 `{label, markdown}`），由 Next.js 頁面在伺服器端讀取渲染成 HTML。App 無法渲染 Next.js 頁面，需要新增幾條薄 JSON API：

- `GET /api/library/categories` — 回傳分類清單（名稱、文章數、icon）
- `GET /api/library/<category>` — 回傳該分類下所有文章的標題/slug 列表
- `GET /api/library/<category>/<slug>` — 回傳單篇文章的 `{label, markdown}`

這三條 route 本質上是現有 `content/seo/` 檔案的 JSON 包裝，不涉及新內容生成，風險低、工作量小。

### 本機資料模型（Phase 1，無帳號）

```ts
interface SavedProfile {
  id: string;            // 本機產生的 uuid
  name?: string;
  date: string;          // "YYYY-MM-DD"
  hour: number;          // 0-11 時辰索引
  gender: "male" | "female";
  createdAt: number;
}
```

存於裝置本機（`AsyncStorage` 或 `expo-sqlite`，實作階段擇一），每筆命盤的 AI 解讀內容比照網站 `lib/useSSEStream.ts` 的 cache 模式——以 profile id 為 key 快取在本機，避免重複呼叫 AI（同樣的成本考量，見本次會話稍早修的 hepan 重複呼叫問題）。

### 技術選型

- **框架**：Expo（managed workflow）——比 bare React Native CLI 更容易處理簽章、推播、未來的 IAP 整合，且 Niki 非工程背景，Expo 的建置/發布流程更省事。
- **導覽**：React Navigation（Bottom Tabs + 巢狀 Tab/Stack）。
- **圖表視覺化**：`react-native-svg`，重建網站 `ZiweiChart.tsx` 的十二宮命盤格線圖。
- **Markdown 渲染**：`react-native-markdown-display`，對應網站的 `react-markdown` 用法。
- **出生時間選擇器**：原生 iOS 風格的分組列表 + picker sheet，取代網站的 `WheelPicker`。

## Phase 1 明確不做的事（留給後續 phase）

- 雙人合盤（hepan）、年度解讀（niandu）、逐月運勢（monthly）——皆非本 phase 範圍。
- 帳號系統、Apple IAP／StoreKit 付費牆——Phase 2。
- 推播通知——Phase 3。
- App Store 上架準備（隱私揭露、年齡分級、審核）——Phase 4。
- `iztro`/`lunar-javascript` 在 RN 環境的相容性問題一旦發生，退路（伺服器端排盤 API）的實作細節，留待 writing-plans 階段依驗證結果決定。

## 測試

- 排盤計算（命宮、十二宮、八字四柱）在 iOS 實機／模拟器上的結果需與網站版本逐一比對，確保同一組生辰輸出完全一致。
- 知識庫三條新 API route：確認回傳內容與對應 `content/seo/` 檔案一致，中文編碼正常。
- 本機命盤儲存：刪除 App 重裝後資料應消失（符合「無帳號、純本機」的預期，不是 bug）；同一設備重啟 App 後已存命盤與快取的解讀內容應正常還原。
