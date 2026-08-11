import type { Metadata } from "next";
import Link from "next/link";
import { STAR_MBTI_LIST, MBTI_ZIWEI_LIST } from "@/lib/personalityData";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微斗數 × MBTI 性格對照 — 命裡",
  description: "命裡獨家研究：14顆紫微命宮主星與MBTI 16型人格的深度對照。用兩套語言——中國命理與西方人格學——立體認識你自己。",
  openGraph: {
    title: "紫微斗數 × MBTI 性格對照 — 命裡",
    description: "紫微斗數主星與MBTI人格型別的跨文化對照解讀，命裡獨家研究。",
    url: "https://www.mingli.study/personality",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/personality" },
};

const MBTI_COLORS: Record<string, string> = {
  INTJ: "bg-jade/10 text-jade border-jade/30",
  INTP: "bg-jade/10 text-jade border-jade/30",
  ENTJ: "bg-vermillion-l text-vermillion border-vermillion/30",
  ENTP: "bg-vermillion-l text-vermillion border-vermillion/30",
  INFJ: "bg-gold/10 text-gold border-gold/30",
  INFP: "bg-gold/10 text-gold border-gold/30",
  ENFJ: "bg-gold/10 text-gold border-gold/30",
  ENFP: "bg-gold/10 text-gold border-gold/30",
  ISTJ: "bg-jade/10 text-jade border-jade/30",
  ISFJ: "bg-jade/10 text-jade border-jade/30",
  ESTJ: "bg-vermillion-l text-vermillion border-vermillion/30",
  ESFJ: "bg-vermillion-l text-vermillion border-vermillion/30",
  ISTP: "bg-jade/10 text-jade border-jade/30",
  ISFP: "bg-jade/10 text-jade border-jade/30",
  ESTP: "bg-vermillion-l text-vermillion border-vermillion/30",
  ESFP: "bg-vermillion-l text-vermillion border-vermillion/30",
};

const FAQ = [
  {
    question: "紫微斗數的命宮主星和 MBTI 是同一回事嗎？",
    answer: "不是。紫微斗數是命理系統，MBTI 是現代心理學的人格分類工具，兩者理論基礎完全不同。這套對照是借用大眾熟悉的 MBTI 語言，類比紫微命宮主星的性格特質，幫助理解，不是說某主星「等於」某個 MBTI 類型。",
  },
  {
    question: "不知道自己的 MBTI 或命宮主星，該從哪裡開始？",
    answer: "如果已知 MBTI 型別，可以從「MBTI 型別 → 紫微命盤」找到對應介紹；如果還不知道命宮主星，建議先排一次命盤，找到你的命宮主星後，再從「命宮主星 → MBTI 對照」查看深度解讀。",
  },
];

export default function PersonalityPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "紫微×MBTI", path: "/personality" },
        ]),
        collectionPageSchema({
          name: "紫微斗數 × MBTI 性格對照",
          description: "14顆紫微命宮主星與MBTI 16型人格的深度對照。用兩套語言——中國命理與西方人格學——立體認識你自己。",
          path: "/personality",
        }),
        faqSchema(FAQ),
      ]} />
    <main className="min-h-screen bg-parchment">
      <LibraryNav category="personality" currentTitle="紫微×MBTI" />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-10">
        <div className="text-center pt-8 pb-2 space-y-3">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            紫微斗數 × MBTI
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 獨家跨文化性格解讀</p>
          <p className="text-sm text-ink-3 max-w-sm mx-auto leading-relaxed pt-1">
            東方命理與西方人格學的首次深度對話——14顆命宮主星，映照MBTI 16種人格型別，用兩套語言立體認識你自己。
          </p>
        </div>

        <ToolCTA variant="slim" label="先排你的命盤，看命宮主星是誰 →" />

        {/* Star → MBTI */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-vermillion rounded-full" />
            <h2 className="text-base font-bold text-ink">命宮主星 → MBTI 對照</h2>
            <span className="text-xs text-ink-4">14 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed pl-4">
            你的命宮坐什麼星，就對應什麼人格底色。找到你的主星，看看西方人格學怎麼說。
          </p>
          <div className="grid grid-cols-1 gap-3">
            {STAR_MBTI_LIST.map(entry => (
              <Link
                key={entry.slug}
                href={`/personality/${entry.slug}`}
                className="paper-card rounded-xl border border-border-warm p-4 hover:border-vermillion/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink group-hover:text-vermillion transition-colors">
                        {entry.starName}星命宮
                      </span>
                      <span className="text-ink-4 text-xs">×</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-bold ${MBTI_COLORS[entry.primaryMbti] ?? "bg-ink-5 text-ink-3 border-border-warm"}`}>
                        {entry.primaryMbti}
                      </span>
                      <span className="text-xs text-ink-3">{entry.primaryMbtiName}</span>
                    </div>
                    <p className="text-xs text-ink-4 leading-relaxed line-clamp-2">{entry.brief}</p>
                  </div>
                  <span className="text-ink-4 text-sm shrink-0 group-hover:text-vermillion transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* MBTI → 紫微 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-jade rounded-full" />
            <h2 className="text-base font-bold text-ink">MBTI 型別 → 紫微命盤</h2>
            <span className="text-xs text-ink-4">16 篇</span>
          </div>
          <p className="text-xs text-ink-4 leading-relaxed pl-4">
            已知自己的MBTI型別？來看看紫微斗數如何解讀你的命盤底色。
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MBTI_ZIWEI_LIST.map(entry => (
              <Link
                key={entry.slug}
                href={`/personality/${entry.slug}`}
                className="paper-card rounded-xl border border-border-warm p-4 hover:border-jade/50 transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-full border ${MBTI_COLORS[entry.mbtiCode] ?? "bg-ink-5 text-ink-3 border-border-warm"}`}>
                      {entry.mbtiCode}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-ink group-hover:text-jade transition-colors">{entry.mbtiName}</p>
                  <p className="text-xs text-ink-4">{entry.primaryStar}星</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-2">
          <p className="text-xs font-medium text-ink-3">關於這套對照體系</p>
          <p className="text-xs text-ink-4 leading-relaxed">
            紫微斗數與MBTI來自不同文化，各有側重：紫微看"天生底牌"，MBTI看"行為偏好"。
            命裡獨家研究將兩套系統在認知模式、人際風格、行為傾向上的交叉點系統梳理，
            幫助你獲得更立體的自我認知——不是算命，是工具。
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">常見問題</p>
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
      </div>
    </main>
    </>
  );
}
