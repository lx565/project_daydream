import type { Metadata } from "next";
import Link from "next/link";
import { SOURCE_BOOKS, getSourcesBySchool, SCHOOL_LABELS, SCHOOL_DESC } from "@/lib/sourcesData";
import ToolCTA from "@/components/ToolCTA";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "命理典籍知識庫 — 命裡收錄書目全覽 — 命裡",
  description:
    "命裡 AI 讀過的全部命理典籍：三合派·四化派·飛星派·倪師學派·八字子平·祿命法·盲派等，共逾百部典籍、逾三萬條知識。點選任意書目瞭解詳細內容與流派背景。",
  openGraph: {
    title: "命理典籍知識庫 — 命裡收錄書目全覽",
    description: "命裡 AI 讀過的全部命理典籍：三合、四化、飛星、八字子平、祿命法……逾百部典籍收錄。",
    url: "https://www.mingli.study/sources",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/sources" },
};

const SCHOOL_COLORS: Record<string, { accent: string; bar: string }> = {
  "三合派":   { accent: "text-vermillion", bar: "bg-vermillion" },
  "四化派":   { accent: "text-jade", bar: "bg-jade" },
  "飛星派":   { accent: "text-gold", bar: "bg-gold" },
  "倪師學派": { accent: "text-ink-2", bar: "bg-ink-3" },
  "八字命理": { accent: "text-vermillion", bar: "bg-vermillion" },
  "八字祿命": { accent: "text-jade", bar: "bg-jade" },
  "八字盲派": { accent: "text-ink-2", bar: "bg-ink-3" },
  "古籍經典": { accent: "text-gold", bar: "bg-gold" },
  "其他名家": { accent: "text-ink-3", bar: "bg-ink-4" },
};

const FAQ = [
  {
    question: "命裡的解讀有典籍依據嗎？",
    answer: "有。命裡 AI 的每一條解讀都基於收錄的命理典籍原文提煉而成，涵蓋紫微斗數三合派、四化派、飛星派、倪師學派，以及八字子平、祿命法、盲派等主流與旁參流派，不憑空杜撰。",
  },
  {
    question: "命裡收錄了哪些流派的典籍？",
    answer: "紫微斗數方面涵蓋三合派、四化派、飛星派與倪師學派；八字方面涵蓋子平命理、祿命法與盲派；此外也收錄古籍經典與其他名家著作，多流派合參而非偏執一家。",
  },
];

export default function SourcesPage() {
  const bySchool = getSourcesBySchool();
  const totalBooks = SOURCE_BOOKS.length;
  const totalChunks = SOURCE_BOOKS.reduce((s, b) => s + b.chunks, 0).toLocaleString();

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "典籍書目", path: "/sources" },
        ]),
        collectionPageSchema({
          name: "命理典籍知識庫 — 命裡收錄書目全覽",
          description: "命裡 AI 讀過的全部命理典籍：三合派·四化派·飛星派·倪師學派·八字子平·祿命法·盲派等，共逾百部典籍、逾三萬條知識。",
          path: "/sources",
        }),
        faqSchema(FAQ),
      ]} />
    <main className="min-h-screen bg-parchment">
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/library" className="hover:text-vermillion transition-colors">知識庫</Link>
          <span>/</span>
          <span className="text-ink-3">典籍書目</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            典籍知識庫
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 收錄書目全覽</p>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            命裡 AI 閱讀並學習了 <span className="text-vermillion font-semibold">{totalBooks} 部</span>命理典籍，
            涵蓋紫微斗數與八字命理各大流派，共提煉 <span className="text-vermillion font-semibold">{totalChunks}</span> 條知識片段。
            每一條解讀背後都有典籍依據。
          </p>
        </div>

        <ToolCTA variant="slim" label="讓 AI 用這些典籍為你詳批命盤 →" />

        {Array.from(bySchool.entries()).map(([school, books]) => {
          if (books.length === 0) return null;
          const colors = SCHOOL_COLORS[school] ?? { accent: "text-ink-2", bar: "bg-ink-3" };
          const schoolChunks = books.reduce((s, b) => s + b.chunks, 0);
          return (
            <section key={school} className="space-y-4">
              <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
                <div className={`w-1.5 h-5 ${colors.bar} rounded-full self-center`} />
                <h2 className={`text-lg font-bold tracking-wide ${colors.accent}`} style={{ fontFamily: "var(--font-serif)" }}>
                  {SCHOOL_LABELS[school]}
                </h2>
                <span className="text-[11px] text-ink-4">{SCHOOL_DESC[school]}</span>
                <span className="ml-auto text-[11px] text-ink-4">{books.length} 部 · {schoolChunks.toLocaleString()} 條</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {books.map(book => (
                  <Link
                    key={book.slug}
                    href={`/sources/${book.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{book.title}</p>
                      <span className="text-[10px] text-ink-4 shrink-0 mt-0.5 bg-paper-2 border border-border-light px-1.5 py-0.5 rounded">
                        {book.era}
                      </span>
                    </div>
                    {book.author && (
                      <p className="text-[11px] text-ink-4">作者：{book.author}</p>
                    )}
                    <p className="text-xs text-ink-3 leading-relaxed">{book.intro}</p>
                    <div className="flex items-center gap-2 pt-1">
                      {book.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-ink-4 bg-paper-2 border border-border-light px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto text-[10px] text-ink-4">~{book.chunks} 條知識</span>
                    </div>
                    <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">閱讀 →</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

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

        <ToolCTA variant="card" />
      </div>
    </main>
    </>
  );
}
