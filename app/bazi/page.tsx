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
  title: "八字命理知識庫 · 十神 · 格局 · 用神 — 命裡",
  description:
    "命裡八字（子平）知識庫：十神詳解（正官、七殺、正印、正財、食神、傷官……）、日主旺衰、格局與調候用神。依據淵海子平、子平真詮、滴天髓等經典系統整理。",
  openGraph: {
    title: "八字命理知識庫 · 十神 · 格局 · 用神 — 命裡",
    description: "十神詳解 · 日主旺衰 · 格局與調候用神，依據八字經典系統整理。",
    url: "https://www.mingli.study/bazi",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/bazi" },
};

const FAQ = [
  {
    question: "八字怎麼算？",
    answer:
      "八字是把出生的年、月、日、時各換成一組天干地支，共四柱八個字，故稱八字。排出八字後，以日柱的天干（日主）為中心，看其餘干支的五行生剋、十神關係與旺衰強弱，再結合大運流年來推斷命運。",
  },
  {
    question: "什麼是日主和用神？",
    answer:
      "日主是出生那天的天干，代表命主本人，是整個八字的核心。用神則是命局中最需要、能讓八字趨於平衡的那個五行——日主弱要扶（用印比），日主強要洩耗克（用食傷財官）。找對用神是八字論命與取運的關鍵。",
  },
  {
    question: "什麼是十神？",
    answer:
      "十神是其他干支與日主之間生克關係的十種名稱：生我者為正印、偏印，我生者為食神、傷官，克我者為正官、七殺，我克者為正財、偏財，同我者為比肩、劫財。十神是八字論命的核心語言，決定六親、性格與事業財富的取象。",
  },
  {
    question: "八字的旺衰怎麼判斷？",
    answer:
      "判斷日主旺衰主要看四點：是否得令（月令是否生扶日主）、得地（地支是否有根）、得生（有無印星相生）、得助（有無比劫幫身）。四者俱備則旺，反之則弱。旺衰定了，才能確定用神方向與喜忌。",
  },
  {
    question: "什麼是八字格局？",
    answer:
      "格局是八字的骨架與層次，多以月令所藏十神取格，分正格（正官、七殺、正印、偏印、食神、傷官、正財、偏財八格）與變格（從格、化格、專旺、祿刃等特殊格）。格局成敗決定命局的高低與人生成就的規模。",
  },
  {
    question: "八字和紫微斗數可以一起看嗎？",
    answer:
      "可以，而且常被合參。八字長於看五行旺衰、格局層次與大運流年的整體趨勢；紫微斗數長於看十二宮分工與具體事項。兩者從不同角度推命，結論互相印證時可信度更高。命裡支持八字與紫微雙盤對照。",
  },
];

// 十神 grouped by their 陰陽 pair
const PAIRS: { key: string; label: string; desc: string }[] = [
  { key: "官殺", label: "官殺", desc: "克我 · 責任與壓力" },
  { key: "印星", label: "印星", desc: "生我 · 庇護與學識" },
  { key: "財星", label: "財星", desc: "我克 · 財富與務實" },
  { key: "食傷", label: "食傷", desc: "我生 · 才華與表達" },
  { key: "比劫", label: "比劫", desc: "同我 · 自我與競爭" },
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
  { key: "貴人", label: "貴人神煞", desc: "逢吉助力 · 化險為夷" },
  { key: "凶煞", label: "凶煞", desc: "防範趨避 · 化煞為用" },
  { key: "雜煞", label: "雜煞", desc: "中性強烈 · 有制成器" },
];

export default function BaziHubPage() {
  const baziBooks = BOOK_ARTICLES.filter(a => bookSystem(a.slug) === "bazi").slice(0, 6);

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "八字", path: "/bazi" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="bazi" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 八字命理</p>
          <h1
            className="text-3xl font-bold text-gold"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            八字知識庫
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            子平八字從入門到精通：八字基礎、十神、十天干日主、格局與調候用神，依據淵海子平、子平真詮、滴天髓等經典系統梳理。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的八字 · AI 詳批日主旺衰、十神與格局 →" />

        {/* 八字基礎 learning path */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字入門
            </h2>
            <span className="text-[11px] text-ink-4">零基礎學習路徑 · 按順序讀</span>
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
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 十神 cluster */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              十神詳解
            </h2>
            <span className="text-[11px] text-ink-4">八字論命的核心語言</span>
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
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
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
            <span className="text-[11px] text-ink-4">你是哪種"日主"</span>
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
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
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
            <span className="text-[11px] text-ink-4">命局的骨架與層次</span>
            <span className="ml-auto text-[11px] text-ink-4">{GEJU.length} 篇</span>
          </div>
          {(["正格", "變格"] as const).map(kind => {
            const items = GEJU.filter(g => g.kind === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind} className="space-y-2">
                <p className="text-xs font-semibold text-ink-3">
                  {kind} <span className="text-ink-4 font-normal">· {kind === "正格" ? "月令取十神的八種正格" : "從、化、祿、刃等特殊格"}</span>
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
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
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
            <span className="text-[11px] text-ink-4">貴人 · 凶煞 · 雜煞</span>
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
                      <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 八字應用專題 */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              八字應用專題
            </h2>
            <span className="text-[11px] text-ink-4">婚姻 · 事業 · 財運 · 健康</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
            <Link href="/bazi/hunyin" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #e879f9" }}>
              <p className="text-[14px] font-bold text-fuchsia-700 group-hover:text-fuchsia-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看婚姻</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">配偶星、夫妻宮與正緣時機，從八字讀你的感情婚姻</p>
              <span className="text-[10px] text-ink-4">{BAZI_HUNYIN.length} 篇 →</span>
            </Link>
            <Link href="/bazi/shiye" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #38bdf8" }}>
              <p className="text-[14px] font-bold text-sky-700 group-hover:text-sky-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看事業</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">官殺格局、食傷生財與職業用神，從八字看你的事業軌跡</p>
              <span className="text-[10px] text-ink-4">{BAZI_SHIYE.length} 篇 →</span>
            </Link>
            <Link href="/bazi/caiyun" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #f59e0b" }}>
              <p className="text-[14px] font-bold text-amber-700 group-hover:text-amber-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看財運</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">正偏財格、求財方式與發財時機，從八字看你的財運結構</p>
              <span className="text-[10px] text-ink-4">{BAZI_CAIYUN.length} 篇 →</span>
            </Link>
            <Link href="/bazi/jibing" className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: "2px solid #10b981" }}>
              <p className="text-[14px] font-bold text-emerald-700 group-hover:text-emerald-900 transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>八字看健康</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">五行五臟、忌神疾患與流年養生，從八字看你的健康安全</p>
              <span className="text-[10px] text-ink-4">{BAZI_JIBING.length} 篇 →</span>
            </Link>
          </div>
        </div>

        {/* 八字 books cross-link */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold/60 rounded-full self-center" />
            <h2 className="text-base font-bold text-ink tracking-wide">八字經典書單</h2>
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
                <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
            <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              常見問題
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

        <ToolCTA variant="card" label="排八字 · 看你的十神與格局" sub="AI 依據子平、調候、格局多派典籍，為你深度解讀八字命局與大運。" />
      </div>
    </main>
  );
}
