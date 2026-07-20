# Landing Page v2 — Enhanced Design Spec

**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** `app/page.tsx` (full rewrite) + `components/ReadingPreview.tsx` (full rewrite)

---

## Goal

Enhance the new marketing landing page with: brand color alignment (parchment/vermillion), rich knowledge content (books, authors, ancient quotes), an enhanced visual reading preview, tab-by-tab reading guide, life domain cards, a competitor comparison section, and a branded form card.

---

## Global Palette

All colors use existing Tailwind custom tokens (defined in `tailwind.config.ts`):

- Background: `bg-parchment` (`#F5F0E6`)
- Cards: `bg-paper` (`#FDFCF8`) with `border border-border-warm`
- Primary accent: `text-vermillion` / `bg-vermillion` (`#8B1A1A`)
- Secondary: `text-gold` (`#7B5C00`)
- Body text: `text-ink` (`#2C1A10`), `text-ink-2`, `text-ink-3`, `text-ink-4`
- Card shadow: `.paper-card` utility class from `globals.css`

No indigo, no gray-* palette. No changes to `globals.css` or `tailwind.config.ts`.

---

## Page Sections (top to bottom)

### 1. Sticky Nav

- `bg-parchment border-b border-border-warm sticky top-0 z-50`
- Left: "命里" text logo, `font-bold text-ink`
- Right: "知识库" text link (→ `/library`, `text-ink-3 hover:text-vermillion`) + "开始解读" vermillion pill button (`bg-vermillion text-white rounded-full hover:bg-vermillion-h`)
- `href="#form"` smooth scroll on CTA

### 2. Hero

- `bg-parchment py-20 px-4 text-center`
- Small 命里 seal logo: `<img src="/mingli-seal.png" className="mx-auto h-16 w-auto mb-4" />`
- Eyebrow: `紫微斗数 · 八字 · AI命理` — `text-xs text-vermillion/60 tracking-[0.35em] mb-4`
- H1: `你的命盘，有 103 部古籍作证。` — `text-4xl sm:text-5xl font-bold text-ink leading-tight mb-6`
- Subheadline: `紫微斗数与八字双系统推演，多模型 AI 交叉验证——每一句解读，都有出处，不空谈。` — `text-base sm:text-lg text-ink-3 leading-relaxed max-w-xl mx-auto mb-8`
- CTA button: `生成我的命盘解读 →` — `bg-vermillion text-white px-8 py-3.5 rounded-full hover:bg-vermillion-h transition-colors`
- Trust micro-copy: `无需注册 · 即刻生成 · 免费开始` — `text-xs text-ink-4 mt-3`

### 3. Stats Bar

- `bg-paper border-y border-border-warm py-8 px-4`
- 4-column grid (2×2 on mobile): `103部` / 命理典籍 · `2.5万+` / 知识检索块 · `双系统` / 紫微·八字 · `多模型` / AI交叉验证
- Values: `text-2xl font-bold text-vermillion`
- Labels: `text-xs text-ink-4`
- Vertical dividers between columns on desktop: `w-px h-8 bg-border-warm`

### 4. Ancient Quotes Strip

- `bg-parchment py-12 px-4`
- Section label: `text-[10px] tracking-widest text-ink-4 text-center mb-6` — `古籍有云`
- 3 paper cards in a row (stack on mobile), each with left vermillion border `border-l-2 border-vermillion`:
  1. 「禄存守身，一生温饱不缺；化禄入财，必有积蓄之命。」— 《紫微斗数全书》
  2. 「命强运弱，运来必发；命弱运强，运来亦发。」— 《三命通会》
  3. 「八字以日主为我，五行生克制化，格局高低，由此定矣。」— 韦千里《千里命稿》
- Quote text: `text-sm text-ink-2 leading-relaxed italic`
- Source: `text-xs text-ink-4 mt-2 not-italic`

### 5. Enhanced Reading Preview

**Component:** `components/ReadingPreview.tsx` — full rewrite.

**Structure:**

```
┌─────────────────────────────────────────────────────┐
│  [总览] [宫位] [大运] [八字] [众说]  ← tab bar (not blurred)   │
├───────────┬──────────────┬──────────────────────────┤
│  元素雷达  │  八字四柱    │  12宫简图               │
│ (SVG chart)│  年月日时    │  4×3 palace grid        │
│ ElementsRadar with mock  │  static labels           │
│ data (visible, no blur)  │                          │
├───────────┴──────────────┴──────────────────────────┤
│  [BLURRED TEXT CONTENT — sample analysis paragraphs] │
│                                                       │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│              ↑ gradient fade to parchment             │
└─────────────────────────────────────────────────────┘
```

**Tab bar:** `总览` active (vermillion underline), rest `text-ink-4`. `bg-paper border-b border-border-warm px-2`.

**Top visible row (3 columns, no blur):**
- Left — `ElementsRadar` component with mock props `{ wood: 3, fire: 5, earth: 2, metal: 4, water: 3 }` and `size={110}`. Label below: `五行分布`.
- Center — Static 4-pillar display: 4 boxes side by side, each showing 天干 + 地支 stacked. Mock values: 年柱 `癸卯`, 月柱 `丁巳`, 日柱 `甲寅`, 时柱 `壬子`. Styled as small paper cards with ink text. Label: `八字四柱`.
- Right — Simplified 12-palace grid: 4 columns × 3 rows of tiny boxes. Static data (reading order, traditional layout):
  Row 1: 夫妻(天机) | 兄弟(紫微) | 命宫(破军) | 父母(天梁)
  Row 2: 子女(太阳) | [center label: 紫微星盘] | 福德(七杀)
  Row 3: 财帛(武曲) | 疾厄(太阴) | 迁移(贪狼) | 仆役(巨门) | 官禄(廉贞)
  Each box: palace name `text-[8px] text-ink-4` top, star name `text-[9px] text-ink font-medium` bottom. Box: `border border-border-warm rounded p-0.5 text-center`. Label above grid: `紫微星盘`.

**Blurred section:** 3 paragraphs of sample Chinese analysis text, `filter: blur(5px)`, with `bg-gradient-to-t from-parchment to-transparent` overlay at bottom (h-32).

**Caption below card:** `示例解读（内容模糊处理）— 生成你的命盘后即可查看完整版` — `text-xs text-ink-4 italic text-center mt-3`

**Card wrapper:** `paper-card rounded-2xl overflow-hidden max-w-3xl mx-auto`

### 6. Tab-by-Tab Reading Guide

- `bg-paper border-y border-border-warm py-16 px-4`
- Section heading: `解读包含哪些内容？` — H2, centered, `text-ink font-bold`
- Subtitle: `五个维度，全面覆盖你的命盘` — `text-ink-3 text-sm`
- 5 cards, 2-col grid on desktop (last card centered on its row):

| Tab | Icon | 中文标题 | 描述 |
|-----|------|----------|------|
| 总览 | ☯ | 命格总览 · 三派共参 | 综合紫微斗数三派（三合、四化、飞星）与八字子平，给出命格整体判断——优势、挑战、核心格局与人生主题。 |
| 宫位 | 🏛 | 十二宫位 · 逐宫详解 | 逐一解读命宫、财帛、官禄、夫妻、疾厄、迁移等十二宫，分析每个生命领域的星曜配置与走势。 |
| 大运 | 📅 | 大运流年 · 运势时机 | 按十年大限拆解人生各阶段走势，逐年梳理流年吉凶，帮助你判断哪些年份适合进取、哪些年份宜守。 |
| 八字 | 🧭 | 八字深度详批 · 五行全解 | 从天干地支、日主强弱、格局用神全面解析你的八字，揭示先天性格、才能与命运底层逻辑。 |
| 众说 | 📖 | 三派详解 · 各家之言 | 三合、四化、飞星三大紫微流派分别独立解读，让你看到不同学派如何解读同一张命盘。 |

Card style: `paper-card rounded-2xl p-6`. Icon in `text-2xl mb-3`. Title: `text-sm font-semibold text-ink mb-2`. Body: `text-xs text-ink-3 leading-relaxed`. Vermillion left-border accent on card: `border-l-2 border-vermillion`.

### 7. Life Domain Cards

- `bg-parchment py-16 px-4`
- Section heading: `你的解读涵盖哪些人生领域？` — H2, centered
- 6 cards in 3×2 grid (2×3 on mobile), `paper-card rounded-xl p-5`:

| Icon | 标题 | 内容 |
|------|------|------|
| 💼 | 事业发展 | 适合的行业方向、职场格局、升职时机与事业高峰年份 |
| 💕 | 感情婚姻 | 配偶星分析、正缘时机、感情模式、早晚婚判断 |
| 💰 | 财运理财 | 正财偏财格局、求财方式、财运高峰期与破财风险 |
| 🏥 | 健康注意 | 五行失衡对应身体弱点、需关注的年龄段与运程 |
| ⚠️ | 需要注意 | 挑战格局、流年凶象、化煞方向与提前预防 |
| 🎯 | 人生时机 | 大运转折点、最佳进取年份、守势建议与时机把握 |

### 8. Knowledge Base

- `bg-paper border-y border-border-warm py-16 px-4`
- Section heading: `知识库来源` — H2, centered
- Two sub-blocks:

2-col grid on desktop (stacked on mobile). **Left — Author & book grid:**
- 紫微斗数: 王亭之、蔡明宏、梁若瑜、陈雪涛、慧心斋主 等名家著作
- 八字命理: 《三命通会》、韦千里《千里命稿》、《命理探源》、袁树珊《命谱》、《穷通宝鉴》 等经典
- Stat chips: `103部典籍` · `逾12位名家` · `2.5万+知识块`

**Right — How it works (3 steps):**
1. 📖 典籍OCR分割 — 原著扫描识别，按段落语义切分
2. 🔍 实时语义检索 — 每次解读调取最相关原著片段
3. ✅ AI引用生成 — 模型基于原文推演，不凭空作答

### 9. Competitor Comparison

- `bg-parchment py-16 px-4`
- Section heading: `为什么不能只用 ChatGPT 算命？` — H2, centered, `text-ink font-bold`
- Subtitle: `通用AI没有专业命理知识，也无法准确排盘` — `text-ink-3 text-sm`
- Styled HTML table (`w-full border-collapse max-w-3xl mx-auto`), 6 rows:

| 维度 | 命里 ✓ | 普通AI (ChatGPT等) ✗ |
|------|--------|----------------------|
| 知识来源 | 103部命理典籍，实时引用原著段落 | 通用训练数据，无专业典籍支撑 |
| 排盘精度 | iztro引擎精确计算紫微星盘与八字 | 无法准确排盘，常出现星曜错误 |
| 准确性保障 | 多模型交叉验证，矛盾处自动重推 | 单模型推演，易产生命理幻觉 |
| 命理深度 | 紫微三派 + 八字格局用神深度解析 | 表面回答，无流派区分 |
| 有据可查 | 每句解读附原著出处，可追溯 | 答案无来源，无法核实 |
| 专业覆盖 | 感情/事业/财运/健康逐宫详解 | 泛泛而谈，缺乏命盘依据 |

Styling: table or cards. 命里 column: `text-vermillion font-medium`. Generic AI column: `text-ink-4`. Row zebra: alternating `bg-paper` / `bg-parchment`.

### 10. Form Section

- `id="form"` anchor
- `bg-parchment py-16 px-4`
- Heading: `生成你的命盘解读` — H2, `text-ink font-bold text-center`
- Subtitle: `输入出生信息，AI 即刻推演` — `text-ink-3 text-sm text-center`
- Card: `paper-card rounded-2xl border border-border-warm p-6 md:p-8 max-w-lg mx-auto`
- `<FortuneForm />` unchanged
- Disclaimer: `text-[11px] text-ink-4 text-center mt-6 leading-relaxed`

---

## New / Modified Files

| File | Change |
|------|--------|
| `app/page.tsx` | Full rewrite (10 sections) |
| `components/ReadingPreview.tsx` | Full rewrite (3-panel visible top + blurred bottom) |

## Files NOT Changed

- `globals.css`, `tailwind.config.ts`
- `components/FortuneForm.tsx`
- `components/ElementsRadar.tsx`
- All other pages, components, routes

---

## Responsive

- Nav: hide "知识库" link on mobile, keep CTA button
- Stats: 2×2 on mobile, 4-col on desktop  
- Quotes: stacked on mobile, 3-col on desktop
- Preview top row: stacked vertically on mobile, 3-col on desktop
- Tab cards: 1-col mobile, 2-col desktop
- Domain cards: 2-col mobile, 3-col desktop
- Comparison: scrollable table on mobile
- Knowledge: stacked on mobile, 2-col on desktop
