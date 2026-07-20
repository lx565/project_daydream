# 紫微AI

AI-powered 紫微斗数 (Purple Star Astrology) platform. Generates personalized Chinese astrology readings by combining a 73-book classical knowledge base with Claude AI.

**Live:** https://fortune-app-ruddy-zeta.vercel.app

---

## What It Does

1. User enters birth date, time, gender, and (optional) birth location + timezone
2. App calculates the full 紫微斗数 命盘 (natal chart) using the `iztro` library
3. Chart displays as an interactive 4×4 palace grid — click any palace to highlight its 三方四正 (trine + opposite)
4. Claude AI reads the chart across 6 tabs: 总览, 宫位, 大运, 话题, 双派, 注意
5. Homepage shows today's 黄历 (Chinese almanac: 宜/忌, 干支, 吉神/凶煞)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| AI | Anthropic Claude (claude-sonnet-4-6) via streaming SSE |
| Chart calculation | iztro 2.3.x |
| Lunar calendar | lunar-javascript |
| Styling | Tailwind CSS v3 (custom classical color palette) |
| Deployment | Vercel |

---

## Project Structure

```
fortune-app/
├── app/
│   ├── page.tsx              # Homepage: form + 黄历
│   ├── result/page.tsx       # Result page: chart + AI tabs
│   ├── layout.tsx            # Root layout, disclaimer footer
│   ├── robots.ts             # Crawl rules (blocks /api/, /result/)
│   └── api/reading/
│       ├── overview/         # 总览: dual-school (三合 + 四化) reading
│       ├── palaces/          # 宫位: per-palace star breakdown
│       ├── decades/          # 大运: current decade luck analysis
│       ├── topic/            # 话题: user-selected topic deep dive
│       ├── dual-school/      # 双派: side-by-side school comparison
│       └── cautions/         # 注意: warnings + current luck
├── components/
│   ├── FortuneForm.tsx       # Birth data form (date, time, gender, location, timezone)
│   ├── ZiweiChart.tsx        # Interactive 4×4 palace grid with 三方四正 SVG lines
│   ├── WizardFlow.tsx        # 6-tab AI reading flow with streaming + loading states
│   ├── BaziProfile.tsx       # 八字 four-pillar display with 五行 breakdown
│   ├── HuangLi.tsx           # Server component: today's Chinese almanac
│   ├── ElementsRadar.tsx     # 五行 element distribution radar chart
│   └── TopicSelector.tsx     # Topic picker for 话题 tab
├── lib/
│   ├── ziwei.ts              # iztro wrapper → ZiweiResult type
│   ├── bazi.ts               # 八字 calculation
│   ├── rag.ts                # Knowledge base retrieval (chunks.json → context)
│   ├── sseWriter.ts          # SSE streaming helper
│   └── useSSEStream.ts       # Client hook for consuming SSE streams
└── knowledge/
    ├── chunks.json           # 16,918 indexed knowledge chunks (73 books, ~25MB)
    ├── sources/              # Raw PDFs + TXT files (NOT deployed — 1.4GB, in .vercelignore)
    ├── extracted/            # OCR-extracted text (NOT deployed — 23MB)
    └── 书单总览.md            # Full book list with status
```

---

## Knowledge Base

**73 books indexed · 16,918 chunks**

| School | Books |
|--------|-------|
| 三合派 | 10 |
| 四化派 | 11 |
| 飞星派 | 8 |
| 北派河洛 | 2 |
| 古籍经典 | 6 |
| 其他名家 | 36 |

Source PDFs live in `knowledge/sources/` (gitignored, not deployed). Only `chunks.json` is deployed — it's the pre-processed, indexed form used by the RAG system at runtime.

**Adding books:**
```bash
# After adding PDFs to knowledge/sources/<school>/
python3 scripts/extract_text.py      # OCR or text extract → knowledge/extracted/
python3 scripts/chunk_knowledge.py   # Re-chunk → knowledge/chunks.json
```

**Excluded:** 天纪系列 (倪海厦) is code-blocked in `lib/rag.ts` via `EXCLUDED_SCHOOLS` — removed due to copyright (estate active, protected ~2082).

---

## Running Locally

```bash
# Install
npm install

# Create .env.local
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Start dev server
npm run dev
# → http://localhost:3000
```

**Quick test:** Click "查看示例命盘 →" on the form to jump directly to an example result page.

---

## Deploying

```bash
# First time
npx vercel --yes
npx vercel env add ANTHROPIC_API_KEY production
npx vercel --prod --yes

# Subsequent deploys
npx vercel --prod --yes
```

The `.vercelignore` excludes `knowledge/sources/` and `knowledge/extracted/` — only `chunks.json` is uploaded.

---

## AI Reading Architecture

Each tab is an independent streaming SSE endpoint. The flow:

```
User opens tab
  → WizardFlow starts SSE stream (POST to /api/reading/<tab>)
  → Route calls getKnowledge() → pulls relevant chunks from chunks.json via star/palace matching
  → Builds prompt: [RAG context] + [palace table] + [system instructions]
  → Streams Claude response back via SSE
  → Client renders markdown incrementally via ClassicalMd (ReactMarkdown)
```

RAG retrieval (`lib/rag.ts`) matches by:
- Star names present in the chart
- School filter (三合派, 四化派, etc.)
- Semantic overlap via simple keyword scoring

---

## Copyright & Legal

- **Disclaimer footer** on all pages (Fair Use, 17 U.S.C. § 107)
- **robots.txt** blocks `/api/` and `/result/` from indexing
- **EXCLUDED_SCHOOLS** in `lib/rag.ts` blocks 天纪系列 (倪海厦) content
- Contact for takedowns: lxu.sud@gmail.com

---

## Color Palette

The UI uses a custom "classical Chinese manuscript" palette:

| Token | Hex | Use |
|-------|-----|-----|
| `vermillion` | `#8B1A1A` | Primary accent, 命宫, CTA buttons |
| `parchment` | `#F5F0E6` | Page background |
| `paper` | `#FDFCF8` | Card backgrounds |
| `ink` | `#2C1A10` | Body text |
| `gold` | `#7B5C00` | Secondary accent, 四化派 |
| `jade` | `#1A5C3A` | 宜, positive indicators |
