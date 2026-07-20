# Landing Page v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully rewrite the 命里 homepage as a rich marketing landing page using brand colors (parchment/vermillion/gold/ink) with 10 sections: nav, hero, stats, ancient quotes, visual reading preview, tab-by-tab guide, life domain cards, knowledge base, competitor comparison, and form.

**Architecture:** Two files change — `components/ReadingPreview.tsx` (rewritten with 3-panel visible top + blurred bottom, using real `ElementsRadar` component) and `app/page.tsx` (full rewrite, 10 sections). All brand colors come from existing Tailwind custom tokens — no new dependencies, no globals.css changes.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 3 with existing custom tokens (`parchment`, `vermillion`, `ink-*`, `gold`, `paper`, `border-warm`), `ElementsRadar` component (already exists at `components/ElementsRadar.tsx`).

## Global Constraints

- Only modify `app/page.tsx` and `components/ReadingPreview.tsx` — no other files
- All colors use existing Tailwind tokens: `bg-parchment`, `bg-paper`, `text-vermillion`, `bg-vermillion`, `hover:bg-vermillion-h`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `border-border-warm`, `text-gold` — no indigo, no generic gray-* palette
- Use `.paper-card` utility class for card shadows (defined in `globals.css`)
- Import `ElementsRadar` from `@/components/ElementsRadar` — do NOT modify it
- Import `FortuneForm` from `@/components/FortuneForm` — do NOT modify it
- No new npm packages
- No `"use client"` on `ReadingPreview` or `page.tsx` — both are server components
- `ElementsRadar` has `"use client"` already — importing it into a server component is valid in Next.js App Router

---

### Task 1: Rewrite ReadingPreview component

**Files:**
- Modify: `components/ReadingPreview.tsx` (full rewrite)

**Interfaces:**
- Consumes: `ElementsRadar` from `@/components/ElementsRadar` with props `{ elements: { wood, fire, earth, metal, water }, size?: number }`
- Produces: `export default function ReadingPreview(): JSX.Element` — no props, self-contained

- [ ] **Step 1: Overwrite `components/ReadingPreview.tsx` with the full rewrite**

```tsx
import ElementsRadar from "@/components/ElementsRadar";

const MOCK_ELEMENTS = { wood: 3, fire: 5, earth: 2, metal: 4, water: 3 };

const PILLARS = [
  { label: "年柱", stem: "癸", branch: "卯" },
  { label: "月柱", stem: "丁", branch: "巳" },
  { label: "日柱", stem: "甲", branch: "寅" },
  { label: "时柱", stem: "壬", branch: "子" },
];

const PALACES = [
  { name: "父母", star: "天梁" },
  { name: "福德", star: "七杀" },
  { name: "田宅", star: "天府" },
  { name: "官禄", star: "廉贞" },
  { name: "命宫", star: "紫微" },
  { name: "兄弟", star: "天机" },
  { name: "夫妻", star: "太阴" },
  { name: "仆役", star: "贪狼" },
  { name: "子女", star: "太阳" },
  { name: "财帛", star: "武曲" },
  { name: "疾厄", star: "天相" },
  { name: "迁移", star: "巨门" },
];

const TABS = ["总览", "宫位", "大运", "八字", "众说"];

export default function ReadingPreview() {
  return (
    <div className="paper-card rounded-2xl overflow-hidden max-w-3xl mx-auto border border-border-warm select-none">

      {/* Tab bar */}
      <div className="flex border-b border-border-warm bg-parchment px-2 overflow-x-auto no-scrollbar">
        {TABS.map((tab, i) => (
          <div
            key={tab}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 ${
              i === 0
                ? "text-vermillion border-b-2 border-vermillion -mb-px"
                : "text-ink-4"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Visible top row: three panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b border-border-warm bg-paper">

        {/* Panel 1: Five-element radar */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-ink-4 tracking-[0.3em] uppercase">五行分布</p>
          <ElementsRadar elements={MOCK_ELEMENTS} size={110} />
        </div>

        {/* Panel 2: Bazi four pillars */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-ink-4 tracking-[0.3em] uppercase">八字四柱</p>
          <div className="flex gap-2">
            {PILLARS.map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center border border-border-warm rounded-lg px-2 py-2.5 bg-parchment"
              >
                <span className="text-[8px] text-ink-4 mb-1.5">{p.label}</span>
                <span className="text-base font-bold text-vermillion leading-none">{p.stem}</span>
                <span className="w-px h-2.5 bg-border-warm my-1" />
                <span className="text-base font-bold text-ink leading-none">{p.branch}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Ziwei palace mini-grid */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-ink-4 tracking-[0.3em] uppercase">紫微星盘</p>
          <div className="grid grid-cols-4 gap-0.5">
            {PALACES.map((palace) => (
              <div
                key={palace.name}
                className="border border-border-warm rounded p-1 text-center bg-parchment"
              >
                <p className="text-[7px] text-ink-4 leading-tight">{palace.name}</p>
                <p className="text-[9px] text-ink font-semibold leading-tight mt-0.5">{palace.star}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blurred content area */}
      <div className="relative bg-paper">
        <div className="p-5" style={{ filter: "blur(5px)" }}>
          <p className="text-xs font-semibold text-ink mb-2">命格总览 · 紫微坐命</p>
          <p className="text-xs text-ink-2 leading-relaxed mb-3">
            命主生于癸卯年丁巳月，天干癸水，地支卯木。紫微星坐命宫，化权入迁移宫，三方会合廉贞、七杀，
            形成「紫府同宫」变格，主一生贵气自带，逢贵人提携，事业宫位气势宏大。
            三合派与飞星派在此格局判断一致，四化派补充贪狼化忌入夫妻，感情路稍有曲折。
          </p>
          <p className="text-xs text-ink-2 leading-relaxed mb-3">
            八字方面，日主甲木生于寅月，木气当令，身旺。年干癸水生助，月干丁火泄秀，食神格局初现。
            调候用神以丙火、庚金为主，行西方金运时事业财运均有建树。
            大限逢甲午运（32–42岁），天干透甲与日主比肩，进取心强，适合创业或主动转型。
          </p>
          <p className="text-xs text-ink-2 leading-relaxed">
            财帛宫武曲化禄，官禄宫天府守，三方形成「财官双美」。
            据《斗数卷》王亭之按：武曲化禄逢天府守官，财源稳定，中年后积累显著。
            千里命稿论食神格：食神生财，以印为忌，行运宜避印绶旺地，丙运、午运皆为财运高峰期。
          </p>
        </div>
        {/* Gradient fade overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

---

### Task 2: Rewrite app/page.tsx

**Files:**
- Modify: `app/page.tsx` (full rewrite)

**Interfaces:**
- Consumes:
  - `ReadingPreview` from `@/components/ReadingPreview` (default export, no props) — from Task 1
  - `FortuneForm` from `@/components/FortuneForm` (default export, no props)
  - `Link` from `next/link`
  - `type Metadata` from `next`
- Produces: homepage route `/`

- [ ] **Step 1: Overwrite `app/page.tsx` with the full rewrite**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import FortuneForm from "@/components/FortuneForm";
import ReadingPreview from "@/components/ReadingPreview";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "https://www.mingli.study" },
};

// ── Data constants ──────────────────────────────────────────────

const STATS = [
  { value: "103部", label: "命理典籍" },
  { value: "2.5万+", label: "知识检索块" },
  { value: "双系统", label: "紫微·八字" },
  { value: "多模型", label: "AI交叉验证" },
];

const QUOTES = [
  {
    text: "禄存守身，一生温饱不缺；化禄入财，必有积蓄之命。",
    source: "《紫微斗数全书》",
  },
  {
    text: "命强运弱，运来必发；命弱运强，运来亦发。",
    source: "《三命通会》",
  },
  {
    text: "八字以日主为我，五行生克制化，格局高低，由此定矣。",
    source: "韦千里《千里命稿》",
  },
];

const TAB_SECTIONS = [
  {
    tab: "总览",
    icon: "☯",
    title: "命格总览 · 三派共参",
    desc: "综合紫微斗数三派（三合、四化、飞星）与八字子平，给出命格整体判断——优势、挑战、核心格局与人生主题。",
  },
  {
    tab: "宫位",
    icon: "🏛",
    title: "十二宫位 · 逐宫详解",
    desc: "逐一解读命宫、财帛、官禄、夫妻、疾厄、迁移等十二宫，分析每个生命领域的星曜配置与运势走向。",
  },
  {
    tab: "大运",
    icon: "📅",
    title: "大运流年 · 运势时机",
    desc: "按十年大限拆解人生各阶段走势，逐年梳理流年吉凶，帮助你判断哪些年份适合进取、哪些年份宜守。",
  },
  {
    tab: "八字",
    icon: "🧭",
    title: "八字深度详批 · 五行全解",
    desc: "从天干地支、日主强弱、格局用神全面解析你的八字，揭示先天性格、才能与命运底层逻辑。",
  },
  {
    tab: "众说",
    icon: "📖",
    title: "三派详解 · 各家之言",
    desc: "三合、四化、飞星三大紫微流派分别独立解读，让你看到不同学派如何解读同一张命盘。",
  },
];

const LIFE_DOMAINS = [
  { icon: "💼", title: "事业发展", desc: "适合的行业方向、职场格局、升职时机与事业高峰年份" },
  { icon: "💕", title: "感情婚姻", desc: "配偶星分析、正缘时机、感情模式、早晚婚判断" },
  { icon: "💰", title: "财运理财", desc: "正财偏财格局、求财方式、财运高峰期与破财风险" },
  { icon: "🏥", title: "健康注意", desc: "五行失衡对应身体弱点、需关注的年龄段与运程" },
  { icon: "⚠️", title: "需要注意", desc: "挑战格局、流年凶象、化煞方向与提前预防" },
  { icon: "🎯", title: "人生时机", desc: "大运转折点、最佳进取年份、守势建议与时机把握" },
];

const COMPARISON_ROWS = [
  {
    dim: "知识来源",
    us: "103部命理典籍，实时引用原著段落",
    them: "通用训练数据，无专业典籍支撑",
  },
  {
    dim: "排盘精度",
    us: "iztro引擎精确计算紫微星盘与八字",
    them: "无法准确排盘，常出现星曜错误",
  },
  {
    dim: "准确性保障",
    us: "多模型交叉验证，矛盾处自动重推",
    them: "单模型推演，易产生命理幻觉",
  },
  {
    dim: "命理深度",
    us: "紫微三派 + 八字格局用神深度解析",
    them: "表面回答，无流派区分",
  },
  {
    dim: "有据可查",
    us: "每句解读附原著出处，可追溯",
    them: "答案无来源，无法核实",
  },
  {
    dim: "专业覆盖",
    us: "感情/事业/财运/健康逐宫详解",
    them: "泛泛而谈，缺乏命盘依据",
  },
];

// ── Page ────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="bg-parchment min-h-screen">

      {/* ── 1. Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-parchment border-b border-border-warm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mingli-seal.png" alt="命里" className="h-7 w-auto" />
            <span className="font-bold text-base text-ink tracking-tight">命里</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/library"
              className="hidden sm:block text-sm text-ink-3 hover:text-vermillion transition-colors"
            >
              知识库
            </Link>
            <a
              href="#form"
              className="text-sm bg-vermillion text-paper px-4 py-2 rounded-full hover:bg-vermillion-h transition-colors"
            >
              开始解读
            </a>
          </div>
        </div>
      </nav>

      {/* ── 2. Hero ── */}
      <section className="py-20 px-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mingli-seal.png"
          alt="命里"
          className="mx-auto h-20 w-auto mb-6 opacity-90"
        />
        <p className="text-[11px] text-vermillion/60 tracking-[0.4em] uppercase mb-5">
          紫微斗数 · 八字 · AI命理
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-tight mb-6">
          你的命盘，<br className="sm:hidden" />有 103 部古籍作证。
        </h1>
        <p className="text-base sm:text-lg text-ink-3 leading-relaxed max-w-xl mx-auto mb-8">
          紫微斗数与八字双系统推演，多模型 AI 交叉验证——
          <br className="hidden sm:block" />
          每一句解读，都有出处，不空谈。
        </p>
        <a
          href="#form"
          className="inline-block bg-vermillion text-paper text-base font-medium px-8 py-3.5 rounded-full hover:bg-vermillion-h transition-colors"
        >
          生成我的命盘解读 →
        </a>
        <p className="text-xs text-ink-4 mt-3">无需注册 · 即刻生成 · 免费开始</p>
      </section>

      {/* ── 3. Stats Bar ── */}
      <section className="bg-paper border-y border-border-warm py-8 px-4">
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={s.label} className="text-center relative">
              {i > 0 && (
                <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border-warm" />
              )}
              <p className="text-2xl font-bold text-vermillion">{s.value}</p>
              <p className="text-xs text-ink-4 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Ancient Quotes ── */}
      <section className="py-14 px-4">
        <p className="text-[10px] text-ink-4 tracking-[0.4em] text-center mb-8 uppercase">
          古籍有云
        </p>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUOTES.map((q) => (
            <div
              key={q.source}
              className="paper-card rounded-xl border border-border-warm border-l-4 border-l-vermillion p-5"
            >
              <p className="text-sm text-ink-2 leading-relaxed italic mb-3">
                「{q.text}」
              </p>
              <p className="text-xs text-ink-4">— {q.source}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Reading Preview ── */}
      <section className="bg-paper border-y border-border-warm py-14 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-2">
            你的解读，长这样
          </h2>
          <p className="text-sm text-ink-3">生成命盘后即可查看完整版</p>
        </div>
        <ReadingPreview />
        <p className="text-center text-xs text-ink-4 mt-4 italic">
          示例解读（内容模糊处理）— 生成你的命盘后即可查看完整版
        </p>
      </section>

      {/* ── 6. Tab-by-Tab Reading Guide ── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            解读包含哪些内容？
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">五个维度，全面覆盖你的命盘</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TAB_SECTIONS.map((t, i) => (
              <div
                key={t.tab}
                className={`paper-card rounded-2xl border border-border-warm border-l-4 border-l-vermillion p-6 ${
                  i === 4 ? "sm:col-span-2 sm:max-w-sm sm:mx-auto sm:w-full" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-[10px] bg-vermillion-l text-vermillion px-2 py-0.5 rounded-full font-medium">
                    {t.tab}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-ink mb-2">{t.title}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Life Domain Cards ── */}
      <section className="bg-paper border-y border-border-warm py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            你的解读涵盖哪些人生领域？
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">命盘的每个宫位，对应真实的人生话题</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {LIFE_DOMAINS.map((d) => (
              <div key={d.title} className="paper-card rounded-xl border border-border-warm p-5">
                <div className="text-2xl mb-3">{d.icon}</div>
                <h3 className="text-sm font-semibold text-ink mb-1.5">{d.title}</h3>
                <p className="text-xs text-ink-3 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Knowledge Base ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            知识库来源
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">103部典籍，每句解读有据可查</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Left: authors & books */}
            <div className="paper-card rounded-2xl border border-border-warm p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-vermillion rounded-full" />
                  <p className="text-xs font-semibold text-ink tracking-widest">紫微斗数名家</p>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  王亭之、蔡明宏、梁若瑜、陈雪涛、慧心斋主 等三合/四化/飞星三派名家著作
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gold rounded-full" />
                  <p className="text-xs font-semibold text-ink tracking-widest">八字命理经典</p>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  《三命通会》、韦千里《千里命稿》、《命理探源》、袁树珊《命谱》、《穷通宝鉴》 等子平格局经典
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {["103部典籍", "逾12位名家", "2.5万+知识块"].map((chip) => (
                  <span
                    key={chip}
                    className="text-xs bg-vermillion-l text-vermillion px-3 py-1 rounded-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            {/* Right: how it works */}
            <div className="paper-card rounded-2xl border border-border-warm p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-4 bg-vermillion rounded-full" />
                <p className="text-xs font-semibold text-ink tracking-widest">知识库如何工作</p>
              </div>
              <div className="space-y-5">
                {[
                  { n: "1", icon: "📖", title: "典籍OCR分割", desc: "原著扫描识别，按段落语义切分为2.5万个检索块" },
                  { n: "2", icon: "🔍", title: "实时语义检索", desc: "每次解读，从知识库中调取最相关的原著段落" },
                  { n: "3", icon: "✅", title: "AI引用生成", desc: "模型基于原文推演，不凭空作答，每句有出处" },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{step.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-ink mb-0.5">{step.title}</p>
                      <p className="text-xs text-ink-3 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Competitor Comparison ── */}
      <section className="bg-paper border-y border-border-warm py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            为什么不能只用 ChatGPT 算命？
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">
            通用AI没有专业命理知识，也无法准确排盘
          </p>
          <div className="paper-card rounded-2xl border border-border-warm overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-parchment border-b border-border-warm">
                  <th className="text-left px-4 py-3 text-ink-3 font-medium w-1/4">维度</th>
                  <th className="text-left px-4 py-3 text-vermillion font-semibold w-5/12">
                    命里 ✓
                  </th>
                  <th className="text-left px-4 py-3 text-ink-4 font-medium w-5/12">
                    普通AI (ChatGPT等) ✗
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.dim}
                    className={`border-b border-border-warm last:border-0 ${
                      i % 2 === 0 ? "bg-paper" : "bg-parchment"
                    }`}
                  >
                    <td className="px-4 py-3 text-ink-3 font-medium">{row.dim}</td>
                    <td className="px-4 py-3 text-ink-2">{row.us}</td>
                    <td className="px-4 py-3 text-ink-4">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 10. Form ── */}
      <section id="form" className="py-16 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-2">
            生成你的命盘解读
          </h2>
          <p className="text-sm text-ink-3">输入出生信息，AI 即刻推演</p>
        </div>
        <div className="max-w-lg mx-auto paper-card rounded-2xl border border-border-warm p-6 md:p-8">
          <FortuneForm />
        </div>
        <p className="text-center text-[11px] text-ink-4 leading-relaxed mt-6">
          本平台内容仅供学习参考与娱乐，不构成任何决策依据
          <br />
          命理是传统文化的智慧结晶，请理性看待，切勿迷信
        </p>
      </section>

    </main>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

- [ ] **Step 3: Start dev server and verify all sections render**

```bash
cd ~/Desktop/Projects/fortune-app && npm run dev
```

Open `http://localhost:3000` and verify (scroll through the full page):
- Nav: 命里 logo + seal + 知识库 link + 开始解读 vermillion button
- Hero: seal image, Chinese headline, vermillion CTA, trust copy below
- Stats bar: 4 metrics on paper background, vermillion numbers
- Quotes strip: 3 paper cards with left vermillion border
- Reading preview: tab bar visible, 3-panel top (radar + pillars + grid), blurred text with fade
- Tab guide: 5 cards, 5th card centered on desktop; each shows icon + tab label + description
- Life domains: 6 cards in 2×3 grid
- Knowledge base: 2-col layout, authors left, how-it-works right
- Comparison: table with vermillion column for 命里, muted column for generic AI
- Form: paper-card, FortuneForm renders with brand colors

Also verify: visit `/mingge` — parchment/vermillion theme unchanged ✓

Kill dev server after verification: `Ctrl+C`

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 Nav: parchment, vermillion CTA, seal logo
- ✅ Section 2 Hero: seal, eyebrow, H1, subhead, vermillion button, trust copy
- ✅ Section 3 Stats bar: 4 stats, vermillion values, paper bg
- ✅ Section 4 Ancient quotes: 3 sourced quotes, vermillion left-border cards
- ✅ Section 5 Preview: ReadingPreview with tabs, 3-panel top, blurred bottom
- ✅ ReadingPreview: ElementsRadar + bazi pillars + 12-palace grid + blurred text
- ✅ Section 6 Tab guide: 5 tabs explained, 5th card centered
- ✅ Section 7 Life domains: 6 cards (career, marriage, money, health, cautions, timing)
- ✅ Section 8 Knowledge base: authors, books, how-it-works 3 steps
- ✅ Section 9 Comparison: 6-row table vs ChatGPT
- ✅ Section 10 Form: paper-card, FortuneForm, disclaimer
- ✅ Global palette: only parchment/paper/vermillion/ink/gold tokens used
- ✅ No other files modified
- ✅ No new dependencies

**Placeholder scan:** None found. All copy is complete, all code is written.

**Type consistency:** `ReadingPreview` produced in Task 1 as `export default function ReadingPreview()` — consumed in Task 2 as `import ReadingPreview from "@/components/ReadingPreview"` and rendered as `<ReadingPreview />`. Consistent.
