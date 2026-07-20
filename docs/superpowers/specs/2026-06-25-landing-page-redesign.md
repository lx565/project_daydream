# Landing Page Redesign — 命里

**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** `app/page.tsx` only — all other pages keep existing parchment/vermillion theme

---

## Goal

Replace the current compact homepage (form-first) with a marketing landing page that builds trust and desire before asking for birth data — matching the structure used by top competitors (OpenFate, LingYuan, Cantian, FateMaster).

**Primary conversion action:** Visitor enters birth date → goes to analysis page.

---

## Visual Style

**Modern light SaaS.** Clean white/light-gray background, indigo/purple primary accent (`#4F46E5` / `indigo-600`), dark gray body text (`#111827`). No parchment, no vermillion on this page. Noto Serif SC retained for Chinese headlines.

This palette is scoped to `page.tsx` only via inline Tailwind classes — no changes to `globals.css` or any shared CSS variables.

---

## Page Architecture (top to bottom)

### 1. Sticky Nav Header

- Left: 命里 logo (text or existing seal image, small)
- Right: "知识库" text link (→ `/library`) + "开始解读" indigo CTA button (smooth-scrolls to `#form`)
- White background, `border-b border-gray-100`, `sticky top-0 z-50`

### 2. Hero Section

- Small eyebrow: `紫微斗数 · 八字 · AI命理` (indigo, uppercase tracking)
- H1: `你的命盘，有 103 部古籍作证。` (large, bold, dark)
- Subheadline: `紫微斗数与八字双系统推演，多模型 AI 交叉验证——每一句解读，都有出处，不空谈。` (gray-600, relaxed leading)
- Primary CTA: `生成我的命盘解读 →` (indigo-600 button, rounded-full, lg padding) — smooth scroll to `#form`
- Trust micro-copy below button: `无需注册 · 即刻生成 · 免费开始` (text-xs, gray-400)
- Section background: white, generous vertical padding

### 3. Stats Bar

- Light gray background strip (`bg-gray-50`)
- 4 columns with vertical dividers:
  - `103部` / 命理典籍
  - `2.5万+` / 知识检索块
  - `双系统` / 紫微·八字
  - `多模型` / AI交叉验证
- Numbers in indigo-600, bold; labels in gray-500, small

### 4. Blurred Reading Preview

- Section heading: `你的解读，长这样` (centered, H2)
- Subtitle: `生成命盘后即可查看完整版` (gray-500)
- **New component: `components/ReadingPreview.tsx`** — renders a CSS mockup of the reading UI:
  - Tab bar: 总览 / 宫位 / 大运 / 八字 / 众说 (styled to match real tabs)
  - Below tabs: 3–4 paragraphs of realistic-looking sample analysis text (static, Chinese)
  - Applied styles: `filter: blur(6px)` on content area + bottom-to-top gradient fade overlay (`from-white`)
  - Rounded card with shadow, max-width ~700px, centered
- Caption below: `示例解读（内容模糊处理）— 生成你的命盘后即可查看完整版` (text-xs, gray-400, italic)

### 5. Feature Cards

- Section heading: `为什么选择命里` (centered, H2)
- 2×2 grid (desktop) / 1-col stack (mobile), each card white with `shadow-sm border border-gray-100 rounded-2xl p-6`
- Cards:
  1. **103部命理典籍** — Icon: 📚 — 涵盖王亭之、蔡明宏、梁若瑜等三派名家与三命通会、千里命稿等八字经典，每次解读实时引用原著段落，不凭空推断。
  2. **多模型AI交叉验证** — Icon: 🔄 — 多个AI模型独立推演同一命盘，自动比对校验，矛盾处重新生成——比单模型更准确可信。
  3. **紫微·八字双系统** — Icon: ☯ — 两套系统独立解读互相印证：紫微斗数解格局宫位，八字解五行大运，各有侧重。
  4. **三派综合参考** — Icon: 📖 — 三合、四化、飞星三大紫微流派同时参考，不偏一家之言，给出更全面的解读视角。

### 6. Form Section

- `id="form"` anchor for CTA scroll target
- Section heading: `生成你的命盘解读` (centered, H2)
- Subtitle: `输入出生信息，AI 即刻推演` (gray-500)
- White card, `shadow-md rounded-2xl p-6 md:p-8`, `max-w-lg mx-auto`
- Existing `<FortuneForm />` component — no changes to FortuneForm itself
- Background: `bg-gray-50` for this section to differentiate from feature cards above

### 7. Footer

- Keep existing global footer from `layout.tsx` — no changes needed

---

## New Files

| File | Purpose |
|------|---------|
| `components/ReadingPreview.tsx` | Static blurred reading mockup component |

## Modified Files

| File | Change |
|------|--------|
| `app/page.tsx` | Full rewrite with new 6-section structure |

## Files NOT Changed

- `globals.css` — no theme changes
- `FortuneForm.tsx` — used as-is
- All other pages/components — unchanged

---

## Responsive Behavior

- Nav: stacks logo left, links right on all sizes; on mobile hide "知识库" link, keep CTA button
- Hero: centered, single column on all sizes
- Stats bar: 4-col on desktop, 2×2 grid on mobile
- Preview: full-width card on mobile, max-w-2xl centered on desktop
- Feature cards: 2×2 on md+, single column on mobile
- Form: full-width on mobile, max-w-lg centered on desktop

---

## Non-Goals / Out of Scope

- No changes to any SEO pages, reading pages, or shared components
- No testimonials section (add later once real reviews exist)
- No FAQ section
- No language/locale switching
- No animation beyond CSS transitions on buttons
