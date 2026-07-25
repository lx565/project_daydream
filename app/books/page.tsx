import type { Metadata } from "next";
import Link from "next/link";
import { BOOK_ARTICLES, bookSystem, type BookSystem } from "@/lib/bookArticles";
import ToolCTA from "@/components/ToolCTA";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, collectionPageSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "紫微斗數書推薦、八字入門書單 — 命裡",
  description:
    "紫微斗數書推薦、八字入門書單一次看：子平真詮、窮通寶鑑、淵海子平、滴天髓……依系統分類，含書單推薦、書籍對比、深度解讀與作者傳，幫你選對書、讀對順序，少走彎路。",
  openGraph: {
    title: "紫微斗數書推薦、八字入門書單 — 命裡",
    description: "紫微斗數書推薦與八字入門書單，依系統分類，從書單選擇到書籍對比、深度解讀，幫你選對書、讀對順序。",
    url: "https://www.mingli.study/books",
    siteName: "命裡",
    locale: "zh_TW",
  },
  alternates: { canonical: "https://www.mingli.study/books" },
};

const CATEGORY_BAR: Record<string, string> = {
  "書單推薦":    "bg-vermillion",
  "書籍對比":    "bg-gold",
  "書籍深度解讀": "bg-jade",
  "作者人物傳":  "bg-ink-3",
};

const CATEGORY_LABEL: Record<string, string> = {
  "書單推薦":    "text-vermillion",
  "書籍對比":    "text-gold",
  "書籍深度解讀": "text-jade",
  "作者人物傳":  "text-ink-3",
};

const SYSTEMS: { key: BookSystem; label: string; desc: string; accent: string; bar: string }[] = [
  { key: "ziwei", label: "紫微斗數", desc: "星曜 · 宮位 · 三合四化各派典籍", accent: "text-vermillion", bar: "bg-vermillion" },
  { key: "bazi",  label: "八字命理", desc: "子平 · 格局 · 調候用神經典",      accent: "text-gold",      bar: "bg-gold"      },
  { key: "both",  label: "通用 · 跨系統", desc: "入門書單與兩套系統的對比",    accent: "text-jade",      bar: "bg-jade"      },
];

export default function BooksPage() {
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "命理書單", path: "/books" },
        ]),
        collectionPageSchema({
          name: "命理書單 — 紫微斗數與八字經典典籍導讀",
          description: "紫微斗數與八字命理經典書單，依系統分類：書單推薦、書籍對比、深度解讀與作者傳記，幫你選對書、讀對順序。",
          path: "/books",
        }),
      ]} />
    <main className="min-h-screen bg-parchment">
      <div className="px-4 pt-6 pb-2 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-ink-4">
          <Link href="/" className="hover:text-vermillion transition-colors">命裡</Link>
          <span>/</span>
          <Link href="/library" className="hover:text-vermillion transition-colors">知識庫</Link>
          <span>/</span>
          <span className="text-ink-3">命理書單</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-12">
        {/* Hero */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <h1
            className="text-3xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
          >
            命理書單
          </h1>
          <p className="text-xs text-ink-4 tracking-widest">命裡 · 典籍知識庫</p>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            紫微斗數與八字命理經典推薦：從書單選擇、書籍對比到深度解讀與作者傳記，幫你少走彎路。
          </p>
        </div>

        {SYSTEMS.map(system => {
          const inSystem = BOOK_ARTICLES.filter(a => bookSystem(a.slug) === system.key);
          if (inSystem.length === 0) return null;
          return (
            <section key={system.key} className="space-y-5">
              {/* Section header */}
              <div className="flex items-center gap-3 border-b border-border-warm pb-3">
                <div className={`w-1 h-5 ${system.bar} rounded-full`} />
                <h2 className={`text-lg font-bold tracking-wide ${system.accent}`} style={{ fontFamily: "var(--font-serif)" }}>
                  {system.label}
                </h2>
                <span className="text-[11px] text-ink-4 hidden sm:inline">{system.desc}</span>
                <span className="ml-auto text-[11px] text-ink-4">{inSystem.length} 篇</span>
              </div>

              {/* 2-col grid — each item is an open entry, no box */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                {inSystem.map(a => (
                  <Link
                    key={a.slug}
                    href={`/books/${a.urlSlug}`}
                    className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderTop: "2px solid var(--color-border-warm)" }}
                  >
                    {/* Category accent bar + label */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-0.5 ${CATEGORY_BAR[a.category] ?? "bg-ink-4"} rounded-full`} />
                      <span className={`text-[10px] font-medium tracking-widest ${CATEGORY_LABEL[a.category] ?? "text-ink-4"}`}>
                        {a.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {a.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-[11px] text-ink-4 leading-relaxed">{a.subtitle}</p>

                    {/* Intro excerpt */}
                    <p className="text-[11px] text-ink-3 leading-relaxed line-clamp-3 flex-1">{a.intro}</p>

                    {/* Read link */}
                    <span className={`text-[11px] font-medium mt-1 ${CATEGORY_LABEL[a.category] ?? "text-ink-4"} group-hover:underline underline-offset-2`}>
                      閱讀 →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <ToolCTA variant="card" />
      </div>
    </main>
    </>
  );
}
