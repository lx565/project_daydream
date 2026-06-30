import type { Metadata } from "next";
import Link from "next/link";
import { SHISHEN } from "@/lib/baziShishen";
import { TIANGAN } from "@/lib/baziTiangan";
import { GEJU } from "@/lib/baziGeju";
import { BAZI_GUIDE } from "@/lib/baziGuide";
import { BOOK_ARTICLES, bookSystem } from "@/lib/bookArticles";
import { BAZI_HUNYIN } from "@/lib/baziHunyinData";
import { BAZI_SHIYE } from "@/lib/baziShiyeData";
import { BAZI_CAIYUN } from "@/lib/baziCaiyunData";
import { BAZI_JIBING } from "@/lib/baziJibingData";
import { SHENSHA } from "@/lib/shenshaData";
import type { ShenshaCategory } from "@/lib/shenshaData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "八字命理知识库 · 十神 · 格局 · 用神 — 命里",
  description:
    "命里八字（子平）知识库：十神详解（正官、七杀、正印、正财、食神、伤官……）、日主旺衰、格局与调候用神。依据渊海子平、子平真诠、滴天髓等经典系统整理。",
  openGraph: {
    title: "八字命理知识库 · 十神 · 格局 · 用神 — 命里",
    description: "十神详解 · 日主旺衰 · 格局与调候用神，依据八字经典系统整理。",
    url: "https://www.mingli.study/bazi",
    siteName: "命里",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/bazi" },
};

const FAQ = [
  {
    question: "八字怎么算？",
    answer:
      "八字是把出生的年、月、日、时各换成一组天干地支，共四柱八个字，故称八字。排出八字后，以日柱的天干（日主）为中心，看其余干支的五行生克、十神关系与旺衰强弱，再结合大运流年来推断命运。",
  },
  {
    question: "什么是日主和用神？",
    answer:
      "日主是出生那天的天干，代表命主本人，是整个八字的核心。用神则是命局中最需要、能让八字趋于平衡的那个五行——日主弱要扶（用印比），日主强要泄耗克（用食伤财官）。找对用神是八字论命与取运的关键。",
  },
  {
    question: "什么是十神？",
    answer:
      "十神是其他干支与日主之间生克关系的十种名称：生我者为正印、偏印，我生者为食神、伤官，克我者为正官、七杀，我克者为正财、偏财，同我者为比肩、劫财。十神是八字论命的核心语言，决定六亲、性格与事业财富的取象。",
  },
  {
    question: "八字的旺衰怎么判断？",
    answer:
      "判断日主旺衰主要看四点：是否得令（月令是否生扶日主）、得地（地支是否有根）、得生（有无印星相生）、得助（有无比劫帮身）。四者俱备则旺，反之则弱。旺衰定了，才能确定用神方向与喜忌。",
  },
  {
    question: "什么是八字格局？",
    answer:
      "格局是八字的骨架与层次，多以月令所藏十神取格，分正格（正官、七杀、正印、偏印、食神、伤官、正财、偏财八格）与变格（从格、化格、专旺、禄刃等特殊格）。格局成败决定命局的高低与人生成就的规模。",
  },
  {
    question: "八字和紫微斗数可以一起看吗？",
    answer:
      "可以，而且常被合参。八字长于看五行旺衰、格局层次与大运流年的整体趋势；紫微斗数长于看十二宫分工与具体事项。两者从不同角度推命，结论互相印证时可信度更高。命里支持八字与紫微双盘对照。",
  },
];

// 十神 grouped by their 阴阳 pair
const PAIRS: { key: string; label: string; desc: string }[] = [
  { key: "官杀", label: "官杀", desc: "克我 · 责任与压力" },
  { key: "印星", label: "印星", desc: "生我 · 庇护与学识" },
  { key: "财星", label: "财星", desc: "我克 · 财富与务实" },
  { key: "食伤", label: "食伤", desc: "我生 · 才华与表达" },
  { key: "比劫", label: "比劫", desc: "同我 · 自我与竞争" },
];

// 十天干 grouped by 五行
const ELEMENTS: { key: string; label: string }[] = [
  { key: "木", label: "木" },
  { key: "火", label: "火" },
  { key: "土", label: "土" },
  { key: "金", label: "金" },
  { key: "水", label: "水" },
];

const SHENSHA_GROUPS: { key: ShenshaCategory; label: string; desc: string }[] = [
  { key: "贵人", label: "贵人神煞", desc: "逢吉助力 · 化险为夷" },
  { key: "凶煞", label: "凶煞", desc: "防范趋避 · 化煞为用" },
  { key: "杂煞", label: "杂煞", desc: "中性强烈 · 有制成器" },
];

export default function BaziHubPage() {
  const baziBooks = BOOK_ARTICLES.filter(a => bookSystem(a.slug) === "bazi").slice(0, 6);

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命里", path: "/" },
          { name: "知识库", path: "/library" },
          { name: "八字", path: "/bazi" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="bazi" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命里 · 八字命理</p>
          <h1
            className="text-3xl font-bold text-gold"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            八字知识库
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            子平八字从入门到精通：八字基础、十神、十天干日主、格局与调候用神，依据渊海子平、子平真诠、滴天髓等经典系统梳理。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的八字 · AI 详批日主旺衰、十神与格局 →" />

        {/* 八字基础 learning path */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字入门
            </h2>
            <span className="text-[11px] text-ink-4">零基础学习路径 · 按顺序读</span>
            <span className="ml-auto text-[11px] text-ink-4">{BAZI_GUIDE.length} 篇</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {[...BAZI_GUIDE].sort((a, b) => a.step - b.step).map(g => (
              <Link
                key={g.urlSlug}
                href={`/bazi/guide/${g.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                  <span className="text-gold/70 text-[11px] font-normal mr-1">{g.step}.</span>{g.name}
                </p>
                <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{g.oneLine}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 十神 cluster */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              十神详解
            </h2>
            <span className="text-[11px] text-ink-4">八字论命的核心语言</span>
            <span className="ml-auto text-[11px] text-ink-4">{SHISHEN.length} 篇</span>
          </div>

          {PAIRS.map(pair => {
            const items = SHISHEN.filter(s => s.pair === pair.key);
            if (items.length === 0) return null;
            return (
              <div key={pair.key} className="space-y-2">
                <p className="text-xs font-semibold text-ink-3">
                  {pair.label} <span className="text-ink-4 font-normal">· {pair.desc}</span>
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                  {items.map(s => (
                    <Link
                      key={s.urlSlug}
                      href={`/bazi/shishen/${s.urlSlug}`}
                      className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderTop: "2px solid var(--color-border-warm)" }}
                    >
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{s.name}</p>
                      <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{s.oneLine}</p>
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 十天干日主 cluster */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              十天干日主
            </h2>
            <span className="text-[11px] text-ink-4">你是哪种"日主"</span>
            <span className="ml-auto text-[11px] text-ink-4">{TIANGAN.length} 篇</span>
          </div>
          {ELEMENTS.map(el => {
            const items = TIANGAN.filter(t => t.element === el.key);
            if (items.length === 0) return null;
            return (
              <div key={el.key} className="space-y-2">
                <p className="text-xs font-semibold text-ink-3">{el.label}</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                  {items.map(t => (
                    <Link
                      key={t.urlSlug}
                      href={`/bazi/tiangan/${t.urlSlug}`}
                      className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderTop: "2px solid var(--color-border-warm)" }}
                    >
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{t.gan}{t.element}日主 <span className="text-[11px] text-ink-4 font-normal">{t.image}</span></p>
                      <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{t.oneLine}</p>
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 八字格局 cluster */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字格局
            </h2>
            <span className="text-[11px] text-ink-4">命局的骨架与层次</span>
            <span className="ml-auto text-[11px] text-ink-4">{GEJU.length} 篇</span>
          </div>
          {(["正格", "变格"] as const).map(kind => {
            const items = GEJU.filter(g => g.kind === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind} className="space-y-2">
                <p className="text-xs font-semibold text-ink-3">
                  {kind} <span className="text-ink-4 font-normal">· {kind === "正格" ? "月令取十神的八种正格" : "从、化、禄、刃等特殊格"}</span>
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                  {items.map(g => (
                    <Link
                      key={g.urlSlug}
                      href={`/bazi/geju/${g.urlSlug}`}
                      className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderTop: "2px solid var(--color-border-warm)" }}
                    >
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{g.name}</p>
                      <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{g.oneLine}</p>
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 八字神煞 cluster */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字神煞
            </h2>
            <span className="text-[11px] text-ink-4">贵人 · 凶煞 · 杂煞</span>
            <span className="ml-auto text-[11px] text-ink-4">{SHENSHA.length} 篇</span>
          </div>

          {SHENSHA_GROUPS.map(group => {
            const items = SHENSHA.filter(s => s.category === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="space-y-2">
                <p className="text-xs font-semibold text-ink-3">
                  {group.label} <span className="text-ink-4 font-normal">· {group.desc}</span>
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                  {items.map(s => (
                    <Link
                      key={s.urlSlug}
                      href={`/bazi/shensha/${s.urlSlug}`}
                      className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderTop: "2px solid var(--color-border-warm)" }}
                    >
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{s.name}</p>
                      <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{s.oneLine}</p>
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 八字应用专题 */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字应用专题
            </h2>
            <span className="text-[11px] text-ink-4">婚姻 · 事业 · 财运 · 健康</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            <Link href="/bazi/hunyin" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #e879f9" }}>
              <p className="text-[14px] font-bold text-fuchsia-700 group-hover:text-fuchsia-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看婚姻</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">配偶星、夫妻宫与正缘时机，从八字读你的感情婚姻</p>
              <span className="text-[10px] text-ink-4">{BAZI_HUNYIN.length} 篇 →</span>
            </Link>
            <Link href="/bazi/shiye" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #38bdf8" }}>
              <p className="text-[14px] font-bold text-sky-700 group-hover:text-sky-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看事业</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">官杀格局、食伤生财与职业用神，从八字看你的事业轨迹</p>
              <span className="text-[10px] text-ink-4">{BAZI_SHIYE.length} 篇 →</span>
            </Link>
            <Link href="/bazi/caiyun" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #f59e0b" }}>
              <p className="text-[14px] font-bold text-amber-700 group-hover:text-amber-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看财运</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">正偏财格、求财方式与发财时机，从八字看你的财运结构</p>
              <span className="text-[10px] text-ink-4">{BAZI_CAIYUN.length} 篇 →</span>
            </Link>
            <Link href="/bazi/jibing" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #10b981" }}>
              <p className="text-[14px] font-bold text-emerald-700 group-hover:text-emerald-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看健康</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">五行五脏、忌神疾患与流年养生，从八字看你的健康安全</p>
              <span className="text-[10px] text-ink-4">{BAZI_JIBING.length} 篇 →</span>
            </Link>
          </div>
        </div>

        {/* 八字 books cross-link */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold/60 rounded-full self-center" />
            <h2 className="text-base font-bold text-ink tracking-wide">八字经典书单</h2>
            <Link href="/books" className="ml-auto text-[11px] text-gold hover:underline">全部 →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            {baziBooks.map(a => (
              <Link
                key={a.slug}
                href={`/books/${a.urlSlug}`}
                className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ borderTop: "2px solid var(--color-border-warm)" }}
              >
                <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{a.title}</p>
                <p className="text-xs text-ink-4 leading-relaxed flex-1">{a.subtitle}</p>
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              常见问题
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ.map(item => (
              <details
                key={item.question}
                className="paper-card rounded-xl border border-border-warm px-4 py-3 group"
              >
                <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>{item.question}</span>
                  <span className="text-ink-4 text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-xs text-ink-3 leading-relaxed pt-2.5">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <ToolCTA variant="card" label="排八字 · 看你的十神与格局" sub="AI 依据子平、调候、格局多派典籍，为你深度解读八字命局与大运。" />
      </div>
    </main>
  );
}
