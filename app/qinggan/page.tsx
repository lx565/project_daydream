import type { Metadata } from "next";
import Link from "next/link";
import { QINGGAN } from "@/lib/qingganData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "感情與桃花 · 命理詳解 — 命裡",
  description:
    "命理視角下的感情、桃花與緣分：桃花運怎麼看、夫妻宮空亡是什麼意思、桃花煞好不好、貪狼坐命感情……紫微斗數與八字雙視角，幫你讀懂自己的感情命盤。",
  openGraph: {
    title: "感情與桃花 · 命理詳解 — 命裡",
    description: "桃花運 · 緣分 · 夫妻宮 · 桃花煞，命理雙視角解讀你的感情格局。",
    url: "https://www.mingli.study/qinggan",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/qinggan" },
};

const FAQ = [
  {
    question: "命理能看出我的感情運嗎？",
    answer:
      "可以，但要有邊界感。命盤能看出一個人感情的整體模式——是容易遇到人還是容易錯過，是早婚還是晚婚，感情裡容易有哪些課題。流年大運還能看出感情活躍的時間段。但它不能告訴你\"那個人是誰\"或\"我們一定能在一起\"。命理給的是機率與時機，不是劇本。",
  },
  {
    question: "什麼是桃花運，怎麼在命盤裡看？",
    answer:
      "桃花運在命理裡指感情、人緣、異性吸引力的活躍程度。紫微斗數看天姚星、貪狼星的位置與四化；八字看桃花煞（由日支決定）、咸池的位置與流年引動。流年遇到桃花訊號的年份，往往感情機遇更多、人緣更旺。",
  },
  {
    question: "夫妻宮空亡是什麼意思，是不是註定感情不好？",
    answer:
      "不是。夫妻宮空亡在紫微斗數裡指夫妻宮是空宮（無主星），需要從對宮借星來看。它更多意味著感情上容易\"等待\"或有理想化傾向，而不是註定感情不順或單身。結合全盤、流年大運綜合來看，才是完整的判斷。",
  },
  {
    question: "桃花煞是好是壞？",
    answer:
      "桃花煞本身是中性的——它代表異性緣與魅力，不是凶煞。關鍵看配合：桃花煞遇到吉星（天乙貴人、文昌等），感情順遂、異性緣好；遇到凶煞（劫煞、亡神、咸池疊加），才容易出現感情複雜或\"爛桃花\"的情況。",
  },
  {
    question: "紫微斗數和八字哪個更準看感情？",
    answer:
      "兩者各有側重，合參更準。紫微斗數長於看感情格局、夫妻宮的星曜組合與各宮的互動，細節豐富；八字長於看感情時間節點、日主與財官星的關係來判斷婚姻層次。命裡同時支援兩套系統，AI 會綜合雙盤給出解讀。",
  },
];

const CATEGORIES = ["桃花運勢", "紫微感情", "八字感情", "緣分人生"] as const;

export default function QingganHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "感情與桃花", path: "/qinggan" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="qinggan" />

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 感情命理</p>
          <h1
            className="text-3xl font-bold text-rose-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            感情與桃花
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            桃花運、夫妻宮、緣分時機——命理從紫微斗數與八字雙視角，幫你讀懂自己的感情格局與人生課題。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盤 · AI 詳批感情格局與桃花運 →" />

        {/* Article grid by category */}
        {CATEGORIES.map(cat => {
          const items = QINGGAN.filter(e => e.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
                <div className="w-1.5 h-5 bg-rose-400 rounded-full self-center" />
                <h2 className="text-lg font-bold text-rose-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
                  {cat}
                </h2>
                <span className="ml-auto text-[11px] text-ink-4">{items.length} 篇</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {items.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/qinggan/${e.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{e.name}</p>
                    <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{e.oneLine}</p>
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-rose-400 rounded-full self-center" />
            <h2 className="text-lg font-bold text-rose-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
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

        <ToolCTA variant="card" label="看你的感情命盤" sub="紫微 + 八字雙系統，AI 依據逾百部典籍詳批你的感情格局、桃花運與婚姻時機。" />
      </div>
    </main>
  );
}
