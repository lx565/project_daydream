# 紫微AI — Architecture & Design Decisions

## Overview

Free Chinese-language 紫微斗数 (Zi Wei Dou Shu) fortune platform. Users input birth date → comprehensive AI analysis grounded in 84 classical texts. Revenue via knowledge packaging, self-media, and platform upsells.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 App Router | SSR for chart calc, RSC for perf |
| AI | Anthropic claude-sonnet-4-6 (readings) / claude-haiku-4-5 (daily/chat) | Cost tiering |
| RAG | Keyword inverted index over 32k chunks | No vector DB needed for fixed vocabulary |
| Streaming | Server-Sent Events (SSE) | Simple, works everywhere, no WS overhead |
| Styling | Tailwind CSS + classical Chinese palette | Parchment/vermillion/gold/ink theme |
| Font | Noto Serif SC | Authentic Chinese typography |

---

## RAG System (`lib/rag.ts`)

### Design: Inverted Index (not linear scan)

**Previous approach (removed):** Full linear scan over all 32k chunks on every API call. O(32k × query_terms) per request. At 3 concurrent `getKnowledge()` calls per overview → ~100k comparisons.

**Current approach:** Pre-built inverted index at module load time.

```
kw:   keyword → [chunk indices]       (from chunks[].keywords[])
text: star/palace name → [chunk indices]  (pre-scanned for 50 common terms)
```

**Query flow:**
1. Build `queryTerms` Set from stars + palaces + topic keywords
2. Union candidate indices from `kwIndex` + `textIndex` — O(matching terms)
3. Score only candidates — typically ~500 of 32k → 64× speedup
4. Sort + slice topK

**Cold start:** First request per process builds the index by scanning 32k chunks once. Subsequent requests hit the index. On serverless cold starts this still pays the 28MB JSON parse + index build cost — acceptable for current scale.

**Reference dedup fix:** References now dedup on `book::school` composite key (was book-only, which collapsed same-named books from different schools).

---

## SSE Streaming (`lib/sseWriter.ts` + `lib/useSSEStream.ts`)

### Server: Safe Writes
All writes wrapped in `safeWrite()` which catches errors silently when the client has disconnected. Prevents unhandled rejections on stream close race.

### Server: Prompt Caching
System prompt sent as `[{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }]`. Anthropic caches this across requests to the same model — ~50% discount on system prompt tokens (300–400 tokens per route).

### Server: maxDuration
All 6 streaming routes export `maxDuration = 60` to prevent Vercel's default 10s function timeout on long Sonnet generations.

### Client: Buffer Flush
`useSSEStream` now processes remaining `buffer` content after the read loop ends, catching any events in partial trailing lines that were previously dropped.

---

## 紫微 Bridge (`lib/ziwei.ts`)

### Critical Bug Fixed: `decadalAge` Array
`iztro`'s `decadal.range` is `[number, number]` but the `Palace` interface declared it as `string`. The `as string` cast was compile-time only — the runtime value was the array `[3, 12]`, which when `.split()` was called in the decades and cautions API routes caused `split is not a function` crash (HTTP 500 on those two tabs).

**Fix:** Convert at source: `Array.isArray(decadalRange) ? \`${decadalRange[0]}~${decadalRange[1]}\` : ''`

---

## Daily Return Loop

**Goal:** Give users a reason to return daily (like 测测's daily mood score).

**Architecture:**
```
Result page visit
  → ChartSaver (client component, invisible)
      → saves SavedChart to localStorage
          ↓
Homepage visit (returning user)
  → ReturnUserSection (client component)
      → reads localStorage
      → renders DailyCard if found
          → fetches /api/reading/daily (SSE, claude-haiku)
              → 120-word today's fortune card
              → links back to full chart
```

**Daily route:** Uses Haiku (fast, cheap at ~$0.002/call) to generate a 120-word daily reading based on natal chart summary + today's heavenly stem/branch (computed from fixed epoch 2000-01-01 = 戊辰日).

**User controls:** "不是我" button clears localStorage and dismisses the card.

---

## 5-Tab Reading Wizard (`components/WizardFlow.tsx`)

Chat tab removed (will add back as separate feature). Current tabs:

| Tab | Route | Tokens | School | Rate limit |
|---|---|---|---|---|
| 总览 (overview) | `/api/reading/overview` | 2000 | 三合 + 四化 | 5/day |
| 大运 (decades) | `/api/reading/decades` | 900 | Mixed | 5/day |
| 话题 (topics) | `/api/reading/topic` | 1024 | Mixed | 10/day |
| 双派 (dual school) | `/api/reading/dual-school` | 1200 | 三合 vs 四化 | 5/day |
| 注意 (cautions) | `/api/reading/cautions` | 1000 | Mixed | 5/day |
| Daily card | `/api/reading/daily` | 300 | Haiku | 3/day |

### Dual-School Overview Format
Overview splits on markdown markers `## 三合派观点` / `## 四化派观点` / `## 两派共识` into two-column panels + full-width consensus block. If AI doesn't follow the format, falls back to raw `ClassicalMd` render (not silent empty boxes).

### Overview Prompt (updated)
Requests ~700 words covering: 命宫格局, 三宫概析 (财帛/官禄/夫妻), 人生主旋律 from 三合派; then 四化脉络 + 格局定论 from 四化派; then 两派共识. Max tokens raised 900 → 2000.

---

## Cost Model

**Per full session** (user opens all 6 tabs + 3 chat messages):

| Route | Model | Est. input | Est. output | Cost |
|---|---|---|---|---|
| Overview | Sonnet 4.6 | ~800 | ~1,400 | ~$0.023 |
| Decades | Sonnet 4.6 | ~400 | ~600 | ~$0.010 |
| Topic | Sonnet 4.6 | ~350 | ~600 | ~$0.010 |
| Dual-school | Sonnet 4.6 | ~700 | ~700 | ~$0.013 |
| Cautions | Sonnet 4.6 | ~450 | ~700 | ~$0.012 |
| Chat ×3 | Haiku 4.5 | ~900 | ~900 | ~$0.004 |
| Daily card | Haiku 4.5 | ~200 | ~150 | ~$0.001 |
| **Total** | | | | **~$0.073** |

Prompt caching reduces system prompt tokens ~50% (est. -$0.005/session).

---

## Knowledge Base (`knowledge/`)

### Book Inventory (84 books, 2026-06-14)

| School | Count | Notes |
|---|---|---|
| 三合派 | 8 | Includes all 3 王亭之全集 + 中州派深造讲义 |
| 四化派 | 11 | 蔡明宏 flagship books (image-only, OCR'd) |
| 飞星派 | 8 | 顾祥弘 + 梁若瑜 + 新生命解码 |
| 北派河洛 | 2 | 方外人系列 |
| 古籍经典 | 5 | 潘国森辨正 + 陈希夷 + 南北山人 + 道藏本 |
| 天纪系列 | 4 | 倪海厦天纪三道 + 易经 |
| 八字命理 | 1 | 渊海子平 (reference only) |
| 相学 | 4 | 古籍相学 |
| 易经风水 | 5 | 铁板神数 + 断易天机 |
| 其他名家 | 36 | 实战 + 命例 + 专题 |

### OCR Pipeline

Many books are image-only scans. Two-pass strategy:
1. **pdfplumber** (`scripts/extract-pdfs.py`) — instant for text PDFs, writes empty/tiny file for image PDFs
2. **EasyOCR** (`scripts/ocr-scanned-pdfs.py`) — for books with no text extracted; uses `["ch_sim", "en"]` (NOT `ch_tra` — cannot combine with `ch_sim`)

**Known issues:**
- 徐曾生-紫微斗数命运分析 (95MB, 182p): PDF is a web-viewer export with only 9 embedded pages — actual content unavailable. Needs re-download.
- Phase 2 OCR completed 2026-06-14 (31 books, 31 success, 0 failures, MPS GPU). See Audit below.

### Phase 2 OCR Results + Chunk Quality Audit (post-OCR, 2026-06-14)

**Final state: 16,882 chunks, 71 books, 10 schools.**

| School | Chunks | % |
|---|---|---|
| 其他名家 | 6,793 | 40.2% |
| 飞星派 | 2,367 | 14.0% |
| 四化派 | 1,960 | 11.6% |
| 三合派 | 1,566 | 9.3% |
| 八字命理 | 1,207 | 7.1% |
| 易经风水 | 1,019 | 6.0% |
| 天纪系列 | 733 | 4.3% |
| 相学 | 630 | 3.7% |
| 古籍经典 | 327 | 1.9% |
| 北派河洛 | 280 | 1.7% |

**渊海子平 dominance FIXED**: went from ~60% → 7.1%. Top book is now 周德元-命理天机-紫微斗数规则 at 13.8%.

**OCR quality by material type:**
- ✅ Excellent (>800 c/p): typed/printed Chinese — 蔡明宏悟我十八年, 渊海子平, 方外人开馆人, 铁板神数破解钥匙, 飞星通鉴, 飞星佚名, 天纪-天机道
- ⚠️ Moderate (200-500 c/p): mixed — 陆斌兆星曜, 张清渊, 陆在田 (deleted — 95% garbage), 飞星通鉴
- ❌ Poor (<200 c/p): classical vertical print, handwritten — 南北山人 ×2, 古籍经典 ×3, 蔡明宏华山四化, 天纪人间道/地脉道 (deleted)
- ❌ Near-zero (<50 c/p): diagram-heavy — 相学 ×3 (deleted ×2), 铁板神数大公开 (deleted)

**6 books deleted from extracted/ (net-negative noise, 83-100% OCR garbage):**
天纪-人间道, 天纪-地脉道, 陆在田-股票战略, 徐宇农-铁板神数大公开, 相理衡真(古籍), 麻衣神相(古籍)

**Quality filter upgraded** (chunk-knowledge.py): Added coherence check — requires ≥5% of CJK chars to be high-frequency common characters. Also strips `[本页无法识别]` and `[EasyOCR 失败]` markers before chunking.

## Security

- `ANTHROPIC_API_KEY` only in server files, never shipped to client
- `ReactMarkdown` without `rehype-raw` — model output cannot inject HTML
- Rate limiting exists on `/api/interpret` but **missing on reading + chat routes** — add before production launch (see Risks)

---

## Known Risks & TODOs

| Priority | Issue | Status |
|---|---|---|
| High | No rate limiting on `/api/reading/*` and `/api/chat` | TODO |
| Medium | 28MB JSON + index build on serverless cold start | Acceptable for now |
| Medium | No server-side session/result caching (same chart re-runs full cost) | TODO |
| Low | Orphaned files: `app/api/interpret/route.ts`, `components/AiReading.tsx`, `components/DualSchoolReading.tsx` | Delete when confirmed unused |
| Low | Chat 5-message cap enforced client-side only (spoofable) | Add server counter |

---

## Code Review Findings (2026-06-14, Opus)

### Fixed in this session:
1. ✅ **CRITICAL** `decadalAge` array crash in decades/cautions routes — fixed in `lib/ziwei.ts`
2. ✅ **HIGH** SSE writer race (write after close) — `safeWrite()` wrapper in `lib/sseWriter.ts`
3. ✅ **HIGH** SSE client drops final buffered event — buffer flush on stream end in `lib/useSSEStream.ts`
4. ✅ **MEDIUM** 29MB linear RAG scan — replaced with inverted index in `lib/rag.ts`
5. ✅ **MEDIUM** Missing `maxDuration` on streaming routes — added to all 6 routes
6. ✅ **MEDIUM** Overview silent empty boxes when markers missing — fallback render added
7. ✅ **MEDIUM** Reference dedup collapsed same-name books from different schools — fixed

### Fixed in this session (continued):
8. ✅ **HIGH** Rate limiting on all reading routes (`/api/reading/*`) — `lib/rateLimit.ts` + `checkRateLimit()` on all 5 routes + daily
9. ✅ **LOW** Deleted orphaned files (`interpret/route.ts`, `AiReading.tsx`, `DualSchoolReading.tsx`)
10. ✅ **BUG** EasyOCR language config `["ch_sim", "ch_tra", "en"]` was invalid — fixed to `["ch_sim", "en"]`; all previous OCR output was garbage `[EasyOCR 失败]` messages — re-OCR launched for all 31 affected books
11. ✅ Chat tab removed from 5-tab wizard (loop back later)
12. ✅ **BUG** `chunk-knowledge.py` now filters low-quality OCR chunks (≥15% Chinese chars, ≥60 chars) and strips pure-noise lines before chunking
13. ✅ `.doc` extraction added to `extract-pdfs.py` using antiword — 3 of 5 .doc files extracted (2 WPS binary files need LibreOffice)
14. ⚠️ **DEAD CODE** `lib/knowledge.ts` and `knowledge/stars/major/*.md` (14 files), `knowledge/palaces/*.md` (12 files), `knowledge/patterns/*.md` (5 files) — all are empty scaffold templates with `<!-- 在此填入 -->` placeholders. `buildZiweiKnowledge()` is exported but never imported. All reading routes use `lib/rag.ts` exclusively.
15. ⚠️ **DEAD CODE** `components/BaziChart.tsx` — not imported anywhere (BaziProfile is used; ElementsRadar is used via BaziProfile; BaziChart is the only true orphan here).
16. ✅ **TYPE FIX** `lib/ziwei.ts` lines 64-66: `(astrolabe as Record<string, unknown>)` → `(astrolabe as unknown as Record<string, unknown>)` to avoid TypeScript TS2352 overlapping-types error on iztro's undocumented runtime properties (`fiveElementsClass`, `soul`, `body`). `tsc --noEmit` now clean.

### Fixed in this session (Phase 2 OCR + post-OCR audit):
17. ✅ **MEDIUM** Chunk quality filter coherence blind spot — `chunk-knowledge.py` now rejects chunks where <5% of CJK chars are high-frequency common characters; strips `[本页无法识别]` / `[EasyOCR 失败]` markers
18. ✅ **DATA** 6 net-negative books removed from extracted/ (83-100% OCR garbage): 天纪人间道, 天纪地脉道, 陆在田股票, 徐宇农铁板大公开, 相理衡真, 麻衣神相
19. ✅ **BUG** Homepage "5万+" chunk count (3× overstatement) corrected to "1.6万+" in `app/page.tsx`
20. ✅ **BUG** `ChartSaver.tsx:62` used hardcoded `"ziwei_saved_chart"` string instead of `STORAGE_KEY` constant

### Still TODO:
- ✅ 紫微斗数命理学(2019最新版).doc — extracted via LibreOffice (令东来 编著, 82.6% Chinese, 1,187 chunks added)
- **MEDIUM** 顾祥弘-飞星紫微斗数全书 + 南北山人 ×2 — important texts but 80-91% OCR garbage; worth re-OCR with higher DPI/deskew or cloud OCR (Google Vision handles 繁体 better)
- **MEDIUM** 徐曾生-紫微斗数命运分析 — web-viewer PDF, only 9 of 182 pages embedded; needs re-download of real PDF
- **LOW** Client-side-only chat cap (server should enforce, but chat removed for now)
- **LOW** Server-side result caching for identical chart re-reads
- **LOW** Reclassify major 其他名家 books (周德元-命理天机, 令东来全书) into proper schools to improve school-filtered RAG retrieval
- **LOW** Dead code: `lib/knowledge.ts`, `knowledge/stars/major/*.md` (14 files), `knowledge/palaces/*.md` (12 files), `knowledge/patterns/*.md` (5 files), `components/BaziChart.tsx` — awaiting user confirmation to delete

---

## Plan Review Findings (2026-06-14, Opus)

### Addressed:
- ✅ Daily return loop (DailyCard + ReturnUserSection + ChartSaver)
- ✅ RAG performance (inverted index)
- ✅ Prompt caching (system prompt cache_control)
- ✅ Timeout protection (maxDuration)

### Still TODO (product roadmap):
- LocalStorage persistence is MVP — proper accounts/backend for history
- Lift or redesign chat 5-message cap for deeper emotional engagement
- Consider lightweight server-side caching for identical chart re-reads
- Daily loop needs server-side date awareness for accuracy across timezones
