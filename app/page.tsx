import type { Metadata } from "next";
import Link from "next/link";
import FortuneForm from "@/components/FortuneForm";
import ReadingPreview from "@/components/ReadingPreview";
import ReadingCount from "@/components/ReadingCount";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "https://www.mingli.study" },
};

// ── Data constants ──────────────────────────────────────────────

const STATS = [
  { value: "121部", label: "命理典籍" },
  { value: "3萬+", label: "知識檢索塊" },
  { value: "雙系統", label: "紫微·八字" },
  { value: "多模型", label: "AI交叉驗證" },
];

const QUOTES = [
  {
    text: "祿存守身，一生溫飽不缺；化祿入財，必有積蓄之命。",
    source: "《紫微斗數全書》",
  },
  {
    text: "命強運弱，運來必發；命弱運強，運來亦發。",
    source: "《三命通會》",
  },
  {
    text: "八字以日主為我，五行生剋制化，格局高低，由此定矣。",
    source: "韋千里《千里命稿》",
  },
];

const TAB_SECTIONS = [
  {
    tab: "總覽",
    title: "命格總覽 · 三派共參",
    desc: "綜合紫微斗數三派（三合、四化、飛星）與八字子平，給出命格整體判斷——優勢、挑戰、核心格局與人生主題。",
  },
  {
    tab: "宮位",
    title: "十二宮位 · 逐宮詳解",
    desc: "逐一解讀命宮、財帛、官祿、夫妻、疾厄、遷移等十二宮，分析每個生命領域的星曜配置與運勢走向。",
  },
  {
    tab: "大運",
    title: "大運流年 · 運勢時機",
    desc: "按十年大限拆解人生各階段走勢，逐年梳理流年吉凶，幫助你判斷哪些年份適合進取、哪些年份宜守。",
  },
  {
    tab: "八字",
    title: "八字深度詳批 · 五行全解",
    desc: "從天干地支、日主強弱、格局用神全面解析你的八字，揭示先天性格、才能與命運底層邏輯。",
  },
  {
    tab: "眾說",
    title: "三派詳解 · 各家之言",
    desc: "三合、四化、飛星三大紫微流派分別獨立解讀，讓你看到不同學派如何解讀同一張命盤。",
  },
];

const LIFE_DOMAINS = [
  { title: "事業發展", desc: "適合的行業方向、職場格局、升職時機與事業高峰年份" },
  { title: "感情婚姻", desc: "配偶星分析、正緣時機、感情模式、早晚婚判斷" },
  { title: "財運理財", desc: "正財偏財格局、求財方式、財運高峰期與破財風險" },
  { title: "健康注意", desc: "五行失衡對應身體弱點、需關注的年齡段與運程" },
  { title: "需要注意", desc: "挑戰格局、流年兇象、化煞方向與提前預防" },
  { title: "人生時機", desc: "大運轉折點、最佳進取年份、守勢建議與時機把握" },
];

const HEPAN_RELATIONS = ["情侶戀人", "夫妻姻緣", "朋友閨蜜", "兄弟姐妹", "親子關係"];

const HEPAN_FEATURES = [
  {
    title: "緣分指數 · 四維得分",
    desc: "由確定性演算法計算日主生克、五行互補、夫妻宮星曜與地支合衝，給出可量化的緣分分數，同一對命盤每次一致。",
  },
  {
    title: "夫妻宮飛化互入",
    desc: "看兩人命盤如何互相飛化牽引——誰的星曜落入對方的夫妻宮、誰為對方帶來助力或考驗，揭示關係的深層能量流動。",
  },
  {
    title: "五行互補 · 相處之道",
    desc: "分析雙方五行的補足與相悖，指出這段關係最自然的相處方式與需要磨合之處，落到具體可行的經營建議。",
  },
  {
    title: "緣分時機 · 高峰與考驗",
    desc: "結合雙方大運交匯，點出最有利於關係深化的時間視窗，以及需要格外用心維護的階段。",
  },
];

const COMPARISON_ROWS = [
  {
    dim: "知識來源",
    us: "121部命理典籍，即時引用原著段落",
    them: "通用訓練資料，無專業典籍支撐",
  },
  {
    dim: "排盤精度",
    us: "iztro引擎精確計算紫微星盤與八字",
    them: "無法準確排盤，常出現星曜錯誤",
  },
  {
    dim: "準確性保障",
    us: "多模型交叉驗證，矛盾處自動重推",
    them: "單模型推演，易產生命理幻覺",
  },
  {
    dim: "命理深度",
    us: "紫微三派 + 八字格局用神深度解析",
    them: "表面回答，無流派區分",
  },
  {
    dim: "有據可查",
    us: "每句解讀附原著出處，可追溯",
    them: "答案無來源，無法核實",
  },
  {
    dim: "專業覆蓋",
    us: "感情/事業/財運/健康逐宮詳解",
    them: "泛泛而談，缺乏命盤依據",
  },
];

const ARTICLE_AREAS = [
  {
    href: "/famous",
    label: "名人命盤",
    badge: "33 位",
    desc: "李小龍、王菲、馬雲、愛因斯坦……依據精確命盤，紫微 + 八字雙盤解讀傳奇人生。",
  },
  {
    href: "/star",
    label: "星曜詳解",
    badge: "336 篇",
    desc: "十四主星與十四輔星落入十二宮位的詳細解讀，依據典籍逐篇整理。",
  },
  {
    href: "/mingge",
    label: "命格大全",
    badge: "31 格局",
    desc: "紫微斗數特殊格局逐一拆解，判斷命盤層次與人生走向的核心工具。",
  },
  {
    href: "/bazi",
    label: "八字知識庫",
    badge: "40 篇",
    desc: "從五行生剋、十神、日主到格局用神，子平八字從入門到精通。",
  },
  {
    href: "/books",
    label: "命理書單",
    badge: "30 篇",
    desc: "從《子平真詮》到《窮通寶鑑》，經典書目導讀與最短學習路徑。",
  },
  {
    href: "/guide",
    label: "學習中心",
    badge: "24 篇",
    desc: "紫微入門、三合 / 四化 / 飛星三派、大限流年，系統梳理核心概念。",
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
            <img src="/mingli-seal.png" alt="命裡" className="h-7 w-auto" />
            <span className="font-bold text-base text-ink tracking-tight">命裡</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/hepan"
              className="hidden sm:block text-sm text-ink-3 hover:text-vermillion transition-colors"
            >
              雙人合盤
            </Link>
            <Link
              href="/library"
              className="hidden sm:block text-sm text-ink-3 hover:text-vermillion transition-colors"
            >
              知識庫
            </Link>
            <a
              href="#form"
              className="text-sm bg-vermillion text-paper px-4 py-2 rounded-full hover:bg-vermillion-h transition-colors"
            >
              開始解讀
            </a>
          </div>
        </div>
      </nav>

      {/* ── 2. Hero ── */}
      <section className="py-8 lg:py-16 px-4">
        {/* flex-col-reverse on mobile puts the FORM first — the audience is
            mobile-first (TW/HK/overseas), and text-first made a phone visitor scroll
            past logo + tagline + headline + paragraph + count + a 4-item stats
            grid before reaching the one action that matters. Desktop keeps the
            original text-left / form-right layout. */}
        <div className="max-w-5xl mx-auto flex flex-col-reverse lg:flex-row items-start lg:items-center gap-10 lg:gap-14">

          {/* Left: text + stats */}
          <div className="flex-1 text-center lg:text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mingli-seal.png"
              alt="命裡"
              className="h-16 w-auto mb-6 opacity-90 mx-auto lg:mx-0"
            />
            <p className="text-[11px] text-vermillion/60 tracking-[0.45em] mb-5">
              科技 · 智慧 · 傳承 · 古典
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-ink leading-snug mb-5">
              彙集百位命理名家的智慧，融合紫微、八字與 AI 多模型驗證，給予最嚴謹認真的解讀。
            </h1>
            <p className="text-base text-ink-3 leading-relaxed mb-6">
              紫微斗數與八字雙系統推演，多模型 AI 交叉驗證——每一句解讀，都有出處，不空談。
            </p>
            <div className="mb-8 flex justify-center lg:justify-start">
              <ReadingCount />
            </div>
            <div className="grid grid-cols-2 gap-y-5 gap-x-8 max-w-sm mx-auto lg:mx-0">
              {STATS.map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-vermillion">{s.value}</p>
                  <p className="text-xs text-ink-4 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div
              id="form"
              className="paper-card rounded-2xl border border-border-warm p-6 scroll-mt-20"
            >
              <p className="text-sm font-semibold text-ink mb-1">生成你的命盤解讀</p>
              <p className="text-xs text-ink-4 mb-5">輸入出生資訊，AI 即刻推演 · 免費開始</p>
              <FortuneForm />
              <div className="mt-4 text-center space-y-1">
                <p className="text-xs text-ink-3">
                  總覽免費 · 完整命書 <span className="font-semibold text-vermillion">$6.99</span>
                </p>
                <p className="text-[11px] text-ink-4">
                  人工命理諮詢動輒數千元起跳 · 一次付費永久保存
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. Ancient Quotes ── */}
      <section className="py-16 px-4">
        <p className="text-[10px] text-ink-4 tracking-[0.4em] text-center mb-10 uppercase">
          古籍有云
        </p>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0">
          {QUOTES.map((q, i) => (
            <div key={q.source} className="relative text-center sm:px-6">
              {i > 0 && (
                <div className="hidden sm:block absolute left-0 top-1 bottom-1 w-px bg-border-warm" />
              )}
              <p className="text-sm text-ink-2 leading-loose italic mb-3">
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
            你的解讀，長這樣
          </h2>
          <p className="text-sm text-ink-3">生成命盤後即可檢視完整版</p>
        </div>
        <ReadingPreview />
        <p className="text-center text-xs text-ink-4 mt-4 italic">
          示例解讀（內容模糊處理）— 生成你的命盤後即可檢視完整版
        </p>
        {/* Mid-page CTA: the page runs ~500 lines of persuasion between the hero
            form and the closing CTA. A reader convinced here shouldn't have to
            scroll to the bottom (or back to the top) to act. */}
        <div className="text-center mt-8">
          <a
            href="#form"
            className="inline-block bg-vermillion text-paper text-sm font-medium px-7 py-3 rounded-full hover:bg-vermillion-h transition-colors"
          >
            生成我的命盤 · 免費檢視總覽 →
          </a>
        </div>
      </section>

      {/* ── 5.5 Competitor Comparison ── moved up from position 9: TW/HK media
           actively publishes "do 算命 free with Gemini/ChatGPT" guides, so this is
           the core objection to answer, not a footnote most visitors never reach. */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            為什麼命裡優於通用 AI？
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">
            通用AI沒有專業命理知識，也無法準確排盤
          </p>
          <div className="paper-card rounded-2xl border border-border-warm overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-warm">
                  <th className="text-left px-4 py-3 bg-parchment text-ink-3 font-medium w-1/4">維度</th>
                  <th className="text-left px-4 py-3 bg-vermillion text-white font-semibold w-5/12">
                    命裡
                  </th>
                  <th className="text-left px-4 py-3 bg-parchment text-ink-4 font-medium w-5/12">
                    通用AI模型
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
                    <td className="px-4 py-3 bg-vermillion-l text-ink font-medium border-l-2 border-vermillion/30">{row.us}</td>
                    <td className="px-4 py-3 text-ink-4">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mid-page CTA — the comparison table is the page's strongest
              differentiation argument; give the convinced reader a way to act. */}
          <div className="text-center mt-8">
            <a
              href="#form"
              className="inline-block bg-vermillion text-paper text-sm font-medium px-7 py-3 rounded-full hover:bg-vermillion-h transition-colors"
            >
              試試命裡的解讀 · 免費開始 →
            </a>
          </div>
        </div>
      </section>

      {/* ── 6. Tab-by-Tab Reading Guide ── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            五大解讀維度
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">每一份解讀，由這五個部分組成</p>
          <div className="divide-y divide-border-warm border-t border-b border-border-warm">
            {TAB_SECTIONS.map((t, i) => (
              <div key={t.tab} className="flex items-baseline gap-4 sm:gap-6 py-5">
                <span className="text-lg font-bold text-vermillion/30 tabular-nums w-6 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] bg-vermillion-l text-vermillion px-2 py-0.5 rounded-full font-medium">
                      {t.tab}
                    </span>
                    <h3 className="text-sm font-semibold text-ink">{t.title}</h3>
                  </div>
                  <p className="text-xs text-ink-3 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Life Domains ── */}
      <section className="bg-paper border-y border-border-warm py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            它能回答你哪些人生問題？
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">命盤的每個宮位，對應一個真實的人生課題</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-7">
            {LIFE_DOMAINS.map((d) => (
              <div key={d.title} className="flex items-start gap-3">
                <div className="w-1 h-4 bg-vermillion rounded-full mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-1">{d.title}</h3>
                  <p className="text-xs text-ink-3 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7.5 紫微雙人合盤 ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] text-vermillion/70 tracking-[0.35em] uppercase mb-3">
              兩個人的緣分
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
              紫微雙人合盤
            </h2>
            <p className="text-sm text-ink-3 leading-relaxed max-w-2xl mx-auto">
              不只看一個人的命——把兩張命盤放在一起對照，
              從<strong className="text-ink-2">夫妻宮飛化互入</strong>、
              <strong className="text-ink-2">日主五行生克</strong>與
              <strong className="text-ink-2">地支合衝</strong>，
              看清兩人的緣分底色、契合程度與相處之道。
            </p>
          </div>

          {/* Relationship types */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {HEPAN_RELATIONS.map((r) => (
              <span
                key={r}
                className="text-xs bg-vermillion-l text-vermillion px-3.5 py-1.5 rounded-full border border-vermillion/20"
              >
                {r}
              </span>
            ))}
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {HEPAN_FEATURES.map((f) => (
              <div
                key={f.title}
                className="paper-card rounded-xl border border-border-warm p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-vermillion rounded-full flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-ink">{f.title}</h3>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed pl-3">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/hepan"
              className="inline-flex items-center justify-center gap-1.5 bg-vermillion text-paper text-sm font-medium px-6 py-3 rounded-full hover:bg-vermillion-h transition-colors w-full sm:w-auto"
            >
              免費測紫微合盤
              <span>→</span>
            </Link>
            <Link
              href="/bazihepan"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-vermillion border border-vermillion/40 px-6 py-3 rounded-full hover:bg-vermillion-l transition-colors w-full sm:w-auto"
            >
              也可測八字合盤
              <span>→</span>
            </Link>
          </div>
          <p className="text-center text-[11px] text-ink-4 mt-5">
            緣分指數與「緣分一瞥」免費 · 支援情侶、夫妻、朋友、親子、兄弟姐妹五種關係
          </p>
        </div>
      </section>

      {/* ── 8. Knowledge Base ── */}
      <section className="bg-paper border-y border-border-warm py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            知識庫來源
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">121部典籍，每句解讀有據可查</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Left: authors & books */}
            <div className="paper-card rounded-2xl border border-border-warm p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-vermillion rounded-full" />
                  <p className="text-xs font-semibold text-ink tracking-widest">紫微斗數名家</p>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  王亭之、蔡明宏、梁若瑜、陳雪濤、慧心齋主 等三合/四化/飛星三派名家著作
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-gold rounded-full" />
                  <p className="text-xs font-semibold text-ink tracking-widest">八字命理經典</p>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  《三命通會》、韋千里《千里命稿》、《命理探源》、袁樹珊《命譜》、《窮通寶鑑》 等子平格局經典
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {["121部典籍", "逾12位名家", "3萬+知識塊"].map((chip) => (
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
                <p className="text-xs font-semibold text-ink tracking-widest">知識庫如何工作</p>
              </div>
              <div className="space-y-5">
                {[
                  { n: "1", title: "典籍OCR分割", desc: "原著掃描識別，按段落語義切分為逾3萬個檢索塊" },
                  { n: "2", title: "即時語義檢索", desc: "每次解讀，從知識庫中調取最相關的原著段落" },
                  { n: "3", title: "AI引用生成", desc: "模型基於原文推演，不憑空作答，每句有出處" },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-vermillion-l border border-vermillion/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] text-vermillion font-bold leading-none">{step.n}</span>
                    </div>
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

      {/* ── 9.5 Knowledge Library / Articles ── */}
      <section className="bg-paper border-y border-border-warm py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-2">
            深入閱讀 · 命理知識庫
          </h2>
          <p className="text-sm text-ink-3 text-center mb-10">
            依據 121 部典籍整理，數百篇可免費閱讀的深度文章
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ARTICLE_AREAS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group paper-card rounded-xl border border-border-warm p-5 hover:border-vermillion/50 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-ink group-hover:text-vermillion transition-colors">
                    {a.label}
                  </h3>
                  <span className="text-[10px] bg-vermillion-l text-vermillion px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    {a.badge}
                  </span>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed flex-1">{a.desc}</p>
                <span className="text-xs text-vermillion mt-3 inline-flex items-center gap-1">
                  閱讀
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-vermillion hover:text-vermillion-h transition-colors"
            >
              瀏覽完整知識庫 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 10. Closing CTA ── */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
          準備好了解你的命盤了嗎？
        </h2>
        <p className="text-sm text-ink-3 mb-3">
          輸入出生資訊，即刻獲得你的專屬命理解讀
        </p>
        {/* The highest-intent moment on the page — state the offer here rather
            than only saying "免費開始", which undersells what the reader gets. */}
        <p className="text-sm text-ink-3 mb-8">
          <span className="font-semibold text-ink">總覽免費</span>，不需註冊 ·
          完整命書 <span className="font-semibold text-vermillion">$6.99</span> 一次付費永久保存
        </p>
        <a
          href="#form"
          className="inline-block bg-vermillion text-paper text-base font-medium px-8 py-3.5 rounded-full hover:bg-vermillion-h transition-colors"
        >
          免費開始解讀 →
        </a>
        <p className="text-[11px] text-ink-4 leading-relaxed mt-12">
          本平臺內容僅供學習參考與娛樂，不構成任何決策依據
          <br />
          命理是傳統文化的智慧結晶，請理性看待，切勿迷信
        </p>
      </section>

    </main>
  );
}
