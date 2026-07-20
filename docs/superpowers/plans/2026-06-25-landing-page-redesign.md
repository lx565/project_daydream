# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the form-first homepage with a marketing landing page (hero → stats → blurred reading preview → feature cards → form) in a modern white/indigo SaaS style.

**Architecture:** Two files change — a new `ReadingPreview` component renders a static blurred mockup of the reading UI, and `page.tsx` is fully rewritten into 6 sections. All other pages and shared styles are untouched. The page uses Tailwind's built-in `indigo-*` / `gray-*` palette directly; no changes to `globals.css` or `tailwind.config.ts`.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 3, Noto Serif SC (already loaded via layout), no new dependencies.

## Global Constraints

- Scope: only `app/page.tsx` and `components/ReadingPreview.tsx` — do NOT touch any other file
- Visual palette: white (`#ffffff`), `gray-50/100/200/500/600`, `indigo-600` (`#4F46E5`) for primary, `indigo-50` for tints — use Tailwind class names, not hex values
- The `body` in `layout.tsx` has `style={{ background: "#F5F0E6" }}` — override by giving `<main>` an explicit `bg-white` so parchment doesn't show through
- `FortuneForm` is imported and rendered as-is — do NOT modify it
- No new npm packages
- Chinese copy must match spec exactly (see each section below)
- No animations beyond `transition-colors` on hover states

---

### Task 1: ReadingPreview component

**Files:**
- Create: `components/ReadingPreview.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `export default function ReadingPreview(): JSX.Element` — a self-contained static component

- [ ] **Step 1: Create `components/ReadingPreview.tsx`**

```tsx
export default function ReadingPreview() {
  const tabs = ["总览", "宫位", "大运", "八字", "众说"];

  return (
    <div className="relative rounded-2xl border border-gray-200 shadow-lg overflow-hidden max-w-2xl mx-auto bg-white select-none">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 bg-gray-50 px-2">
        {tabs.map((tab, i) => (
          <div
            key={tab}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              i === 0
                ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px"
                : "text-gray-400"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Blurred content */}
      <div className="p-6" style={{ filter: "blur(5px)" }}>
        <h3 className="text-base font-bold text-gray-800 mb-3">
          命格总览 · 紫微坐命
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          命主生于癸卯年丁巳月，天干癸水，地支卯木。紫微星坐命宫，化权入迁移宫，三方会合廉贞、七杀，形成「紫府同宫」变格，主一生贵气自带，逢贵人提携，事业宫位气势宏大。三合派与飞星派在此格局上判断一致，四化派补充贪狼化忌入夫妻，感情路稍有曲折。
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          八字方面，日主甲木生于寅月，木气当令，身旺。年干癸水生助，月干丁火泄秀，食神格局初现。调候用神以丙火、庚金为主，行西方金运时事业财运均有建树。大限逢甲午运（32–42岁），天干透甲与日主比肩，地支午火通根丁火，进取心强，适合创业或主动转型。
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          财帛宫武曲化禄，官禄宫天府守，三方形成「财官双美」。据《斗数卷》王亭之按：武曲化禄逢天府守官，财源稳定，中年后积累显著。千里命稿论食神格：食神生财，以印为忌，行运宜避印绶旺地，丙运、午运皆为财运高峰期。
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            引用：王亭之《斗数卷》
          </span>
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            千里命稿·格局篇
          </span>
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            梁若瑜《紫微斗数全书》
          </span>
        </div>
      </div>

      {/* Gradient fade overlay */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls components/ReadingPreview.tsx
```

Expected: file listed.

- [ ] **Step 3: Start dev server and visually verify the component renders (do this after Task 2 when it's imported)**

---

### Task 2: Rewrite `app/page.tsx`

**Files:**
- Modify: `app/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `ReadingPreview` from `components/ReadingPreview.tsx`, `FortuneForm` from `components/FortuneForm.tsx`, `Link` from `next/link`, `type Metadata` from `next`
- Produces: the homepage route `/`

- [ ] **Step 1: Rewrite `app/page.tsx` in full**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import FortuneForm from "@/components/FortuneForm";
import ReadingPreview from "@/components/ReadingPreview";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "https://www.mingli.study" },
};

const STATS = [
  { value: "103部", label: "命理典籍" },
  { value: "2.5万+", label: "知识检索块" },
  { value: "双系统", label: "紫微·八字" },
  { value: "多模型", label: "AI交叉验证" },
];

const FEATURES = [
  {
    icon: "📚",
    title: "103部命理典籍",
    body: "涵盖王亭之、蔡明宏、梁若瑜等三派名家与三命通会、千里命稿等八字经典，每次解读实时引用原著段落，不凭空推断。",
  },
  {
    icon: "🔄",
    title: "多模型AI交叉验证",
    body: "多个AI模型独立推演同一命盘，自动比对校验，矛盾处重新生成——比单模型更准确可信。",
  },
  {
    icon: "☯",
    title: "紫微·八字双系统",
    body: "紫微斗数解格局宫位，八字解五行大运，两套系统独立解读、互相印证，各有侧重。",
  },
  {
    icon: "📖",
    title: "三派综合参考",
    body: "三合、四化、飞星三大紫微流派同时参考，不偏一家之言，给出更全面的解读视角。",
  },
];

export default function Home() {
  return (
    <main className="bg-white min-h-screen">

      {/* ── 1. Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight text-gray-900">命里</span>
          <div className="flex items-center gap-4">
            <Link
              href="/library"
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              知识库
            </Link>
            <a
              href="#form"
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors"
            >
              开始解读
            </a>
          </div>
        </div>
      </nav>

      {/* ── 2. Hero ── */}
      <section className="py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase mb-4">
          紫微斗数 · 八字 · AI命理
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
          你的命盘，<br className="sm:hidden" />有 103 部古籍作证。
        </h1>
        <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-8">
          紫微斗数与八字双系统推演，多模型 AI 交叉验证——
          <br className="hidden sm:block" />
          每一句解读，都有出处，不空谈。
        </p>
        <a
          href="#form"
          className="inline-block bg-indigo-600 text-white text-base font-medium px-8 py-3.5 rounded-full hover:bg-indigo-700 transition-colors"
        >
          生成我的命盘解读 →
        </a>
        <p className="text-xs text-gray-400 mt-3">无需注册 · 即刻生成 · 免费开始</p>
      </section>

      {/* ── 3. Stats Bar ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={s.label} className="text-center relative">
              {i > 0 && (
                <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-gray-200" />
              )}
              <p className="text-2xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Blurred Reading Preview ── */}
      <section className="py-16 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            你的解读，长这样
          </h2>
          <p className="text-sm text-gray-500">生成命盘后即可查看完整版</p>
        </div>
        <ReadingPreview />
        <p className="text-center text-xs text-gray-400 mt-4 italic">
          示例解读（内容模糊处理）— 生成你的命盘后即可查看完整版
        </p>
      </section>

      {/* ── 5. Feature Cards ── */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            为什么选择命里
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Form ── */}
      <section id="form" className="py-16 px-4 bg-white">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            生成你的命盘解读
          </h2>
          <p className="text-sm text-gray-500">输入出生信息，AI 即刻推演</p>
        </div>
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-8">
          <FortuneForm />
        </div>
        <p className="text-center text-[11px] text-gray-400 leading-relaxed mt-6">
          本平台内容仅供学习参考与娱乐，不构成任何决策依据
          <br />
          命理是传统文化的智慧结晶，请理性看待，切勿迷信
        </p>
      </section>

    </main>
  );
}
```

- [ ] **Step 2: Start dev server and check the page visually**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Nav is sticky with 命里 logo left + 开始解读 button right
- Hero has large headline + indigo CTA button
- Stats bar shows 4 metrics in gray-50 strip
- Blurred preview card is visible with tabs + blurred content + fade gradient
- 4 feature cards in 2×2 grid
- Form section renders FortuneForm at the bottom
- CTA button scrolls down to `#form`
- Mobile: stats 2×2, feature cards stack single column, nav hides "知识库" link

- [ ] **Step 3: Check the existing pages still look correct**

Visit `http://localhost:3000/library`, `http://localhost:3000/mingge`, and `http://localhost:3000/star/ziwei/ming-gong` — they should still use the parchment/vermillion theme unchanged.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/Projects/fortune-app
git add app/page.tsx components/ReadingPreview.tsx docs/superpowers/specs/2026-06-25-landing-page-redesign.md docs/superpowers/plans/2026-06-25-landing-page-redesign.md
git commit -m "feat: redesign homepage as marketing landing page

- Hero with headline, subhead, indigo CTA
- Stats bar (103 books / 25k chunks / dual system / multi-model)
- Blurred reading preview mockup (ReadingPreview component)
- Feature cards 2x2 grid
- Form section with FortuneForm
- Modern white/indigo SaaS palette, parchment theme unchanged on all other pages"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Sticky nav with 知识库 + 开始解读 CTA
- ✅ Hero: eyebrow, H1, subheadline, indigo button, trust micro-copy
- ✅ Stats bar: 4 columns, indigo values, gray labels, vertical dividers on desktop
- ✅ Blurred reading preview: tabs, blurred content, fade gradient, caption
- ✅ Feature cards: 4 cards, 2×2 grid, icons, titles, descriptions matching spec copy
- ✅ Form: `id="form"`, heading, subtitle, FortuneForm, disclaimer
- ✅ Body background override via `bg-white` on `<main>`
- ✅ No globals.css changes
- ✅ No FortuneForm changes
- ✅ Responsive: 2×2 stats on mobile, single-col cards on mobile

**Placeholder scan:** None found.

**Type consistency:** `ReadingPreview` is a default export used in `page.tsx` as `<ReadingPreview />` — consistent.
