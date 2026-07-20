import type { Metadata } from "next";
import Link from "next/link";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "命理知識庫 — 紫微斗數 · 八字 — 命裡",
  description: "命裡知識庫涵蓋紫微斗數與八字命理，包含格局、星曜、宮位、學習指南、名人命盤與書單推薦，依據121部經典整理，超過3萬個知識檢索塊。",
  openGraph: {
    title: "命理知識庫 — 紫微斗數 · 八字 — 命裡",
    description: "格局 · 星曜 · 宮位 · 學習指南 · 名人命盤 · 書單，依據121部典籍整理。",
    url: "https://www.mingli.study/library",
    siteName: "命裡",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/library" },
};

type Cat = {
  href: string;
  label: string;
  subtitle: string;
  desc: string;
  count: number | null;
  countLabel: string;
  accent: string;
  badge: string;
};

const ZIWEI_CATEGORIES: Cat[] = [
  {
    href: "/guide",
    label: "學習中心",
    subtitle: "從入門到進階",
    desc: "紫微斗數入門、三合 / 四化 / 飛星三大流派、大限流年、感情事業……系統梳理核心概念。",
    count: 15,
    countLabel: "篇指南",
    accent: "border-jade/40 hover:border-jade/70",
    badge: "bg-jade/10 text-jade",
  },
  {
    href: "/mingge",
    label: "命格大全",
    subtitle: "31 個核心格局",
    desc: "紫微斗數中由特定星曜組合構成的特殊格局，判斷命盤層次與人生走向的核心工具。吉格、兇格、特殊格局逐一詳解。",
    count: 31,
    countLabel: "個格局",
    accent: "border-vermillion/30 hover:border-vermillion/60",
    badge: "bg-vermillion-l text-vermillion",
  },
  {
    href: "/star",
    label: "星曜詳解",
    subtitle: "二十八星曜 × 十二宮位",
    desc: "紫微、天機、太陽……十四主星，以及左輔、文昌、擎羊等十四輔星，落入各宮位的詳細解讀，共 336 篇典籍文章。",
    count: 336,
    countLabel: "篇文章",
    accent: "border-gold/40 hover:border-gold/70",
    badge: "bg-gold/10 text-gold",
  },
  {
    href: "/palace",
    label: "十二宮位",
    subtitle: "命盤的十二個人生領域",
    desc: "命宮、財帛、官祿、夫妻……十二宮位各自主管的人生範疇，以及各主星落入後的表現。",
    count: 12,
    countLabel: "個宮位",
    accent: "border-border-warm hover:border-ink-4/40",
    badge: "bg-paper-2 text-ink-3",
  },
  {
    href: "/personality",
    label: "紫微 × MBTI",
    subtitle: "命盤與性格型別交叉解讀",
    desc: "紫微斗數命主星與現代 MBTI 性格型別的跨系統對照，從東西方兩個維度理解你的性格底色。",
    count: null,
    countLabel: "",
    accent: "border-purple-200/60 hover:border-purple-300/80",
    badge: "bg-purple-50 text-purple-600",
  },
];

const BAZI_CATEGORIES: Cat[] = [
  {
    href: "/bazi",
    label: "八字知識庫",
    subtitle: "入門 · 十神 · 日主 · 格局 · 用神",
    desc: "子平八字從入門到精通：八字基礎（五行生剋、藏幹、旺衰、調候、大運流年）、十神詳解、十天干日主、八字格局，依據淵海子平、子平真詮、滴天髓等經典整理。",
    count: 40,
    countLabel: "篇",
    accent: "border-gold/40 hover:border-gold/70",
    badge: "bg-gold/10 text-gold",
  },
];

const SHARED_CATEGORIES: Cat[] = [
  {
    href: "/famous",
    label: "名人命盤",
    subtitle: "33 位歷史名人的命盤解析",
    desc: "李小龍、王菲、馬雲、愛因斯坦……依據精確命盤計算，紫微斗數 + 八字雙盤呈現，深度解讀格局如何塑造傳奇人生。",
    count: 33,
    countLabel: "位名人",
    accent: "border-border-warm hover:border-ink-4/40",
    badge: "bg-paper-2 text-ink-3",
  },
  {
    href: "/books",
    label: "命理書單",
    subtitle: "紫微斗數 · 八字經典書目",
    desc: "必讀書單、書籍對比、作者傳記——從《子平真詮》到《窮通寶鑑》，按系統分類，幫你找到最短的命理學習路徑。",
    count: 30,
    countLabel: "篇書評",
    accent: "border-amber-300/50 hover:border-amber-400/70",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    href: "/sources",
    label: "典籍知識庫",
    subtitle: "命裡收錄書目全覽",
    desc: "命裡 AI 讀過的全部典籍：三合、四化、飛星、八字子平、祿命法……共 78 部，每本附詳細介紹與流派背景。",
    count: 78,
    countLabel: "部典籍",
    accent: "border-jade/30 hover:border-jade/60",
    badge: "bg-jade/10 text-jade",
  },
];

const GROUPS: { key: string; label: string; desc: string; bar: string; accent: string; cats: Cat[] }[] = [
  { key: "ziwei", label: "紫微斗數", desc: "星曜 · 宮位 · 格局 · 三派流派", bar: "bg-vermillion", accent: "text-vermillion", cats: ZIWEI_CATEGORIES },
  { key: "bazi",  label: "八字命理", desc: "子平 · 十神 · 旺衰 · 調候用神", bar: "bg-gold", accent: "text-gold", cats: BAZI_CATEGORIES },
  { key: "shared", label: "綜合 · 跨系統", desc: "名人命盤與典籍書單", bar: "bg-jade", accent: "text-jade", cats: SHARED_CATEGORIES },
];

export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-parchment">
      {/* Minimal top nav */}
      <div className="border-b border-border-warm bg-paper-2/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-1.5 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span className="text-ink-4/50">/</span>
          <span className="text-ink-3">知識庫</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-10 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 典籍知識庫</p>
          <h1
            className="text-3xl font-bold text-ink"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            命理知識庫
          </h1>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            依據121部古今典籍整理 · 紫微斗數 · 八字命理 · 名人命盤 · 書單
          </p>
        </div>

        <ToolCTA variant="slim" label="檢視你的命盤 · AI 詳批格局與運勢 →" />

        {/* Grouped category cards: 紫微 / 八字 / 綜合 */}
        <div className="space-y-9">
          {GROUPS.map(group => (
            <section key={group.key} className="space-y-4">
              <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
                <div className={`w-1.5 h-5 ${group.bar} rounded-full self-center`} />
                <h2 className={`text-lg font-bold tracking-wide ${group.accent}`} style={{ fontFamily: "var(--font-serif)" }}>
                  {group.label}
                </h2>
                <span className="text-[11px] text-ink-4">{group.desc}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {group.cats.map(cat => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{cat.label}</p>
                      {cat.count != null && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${cat.badge}`}>
                          {cat.count} {cat.countLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-4 leading-relaxed">{cat.subtitle}</p>
                    <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-3 flex-1">{cat.desc}</p>
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">檢視 →</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <ToolCTA variant="card" label="排命盤 · 看你的格局與運勢" sub="AI 綜合三合、四化、飛星三派典籍，為你深度解讀命盤" />
      </div>
    </main>
  );
}
