import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ACTIVITIES, getActivity, findAuspiciousDays, chinaToday } from "@/lib/huangli";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, articleSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

// Rebuilt daily — the 90-day window rolls forward, so yesterday's list is stale.
export const revalidate = 86400;

export async function generateStaticParams() {
  return ACTIVITIES.map((a) => ({ slug: a.slug }));
}

interface PageParams { slug: string }

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug } = await params;
  const act = getActivity(slug);
  if (!act) return {};
  const year = chinaToday().getFullYear();
  const title = `${year}年${act.label}吉日查詢 · 未來三個月好日子 — 命裡`;
  const description = `${act.blurb}依傳統農民曆宜忌，列出未來三個月適合${act.label}的日子，並標明當日沖煞與其他宜忌，方便你避開與自己生肖相沖的日期。`;
  return {
    title,
    description,
    openGraph: { title, description, url: `https://www.mingli.study/zeri/${slug}`, siteName: "命裡", locale: "zh_TW", type: "article" },
    alternates: { canonical: `https://www.mingli.study/zeri/${slug}` },
  };
}

export default async function ZeriPage({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const act = getActivity(slug);
  if (!act) notFound();

  const today = chinaToday();
  const year = today.getFullYear();
  const days = await findAuspiciousDays(act, today, 90);
  const path = `/zeri/${act.slug}`;

  const faq = [
    {
      question: `${act.label}怎麼挑日子？`,
      answer: `傳統上先用農民曆篩出當日「宜${act.label.replace(/（.*/, "")}」的日子，再避開與自己或關鍵當事人生肖相沖的那幾天。本頁已列出未來三個月符合的日子，並標出每天沖的生肖供你比對。`,
    },
    {
      question: "為什麼有些日子宜忌看起來互相矛盾？",
      answer: "同一天可能同時列出多項宜與忌，因為傳統通書是依不同神煞系統分別判斷的。實務上以你要做的那一件事為準：只要該事項出現在「宜」，就是通則上合適的日子。",
    },
    {
      question: "沖到生肖一定不能辦事嗎？",
      answer: "傳統上會盡量避開，但這是通則性的提醒而非硬性禁止。若日期無法更動，民間常見的做法是避開沖煞時辰或請當事人暫避；完整判斷仍需結合個人命盤。",
    },
  ];

  const others = ACTIVITIES.filter((a) => a.slug !== act.slug && a.group === act.group).slice(0, 4);

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "今日黃曆", path: "/huangli" },
          { name: `${act.label}吉日`, path },
        ]),
        articleSchema({
          headline: `${year}年${act.label}吉日查詢`,
          description: act.blurb,
          path,
          section: "黃曆擇日",
        }),
        faqSchema(faq),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="huangli" currentTitle={`${act.label}吉日`} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
          <div className="text-center pt-8 pb-2 space-y-2">
            <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命裡 · 農民曆擇日</p>
            <h1 className="text-3xl font-bold text-vermillion leading-snug" style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.08em" }}>
              {year}年{act.label}吉日
            </h1>
            <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">{act.blurb}</p>
          </div>

          <div className="paper-card rounded-2xl border-2 border-vermillion/30 bg-vermillion-l/40 p-4">
            <p className="text-xs text-vermillion font-bold tracking-widest mb-1.5">一句話</p>
            <p className="text-sm text-ink font-medium leading-[1.8]">
              未來三個月共有 <span className="text-vermillion font-bold">{days.length}</span> 天農民曆上宜「{act.label.replace(/（.*/, "")}」。挑日子時，記得避開沖到自己生肖的那幾天。
            </p>
          </div>

          {days.length === 0 ? (
            <p className="text-sm text-ink-3">未來三個月內，農民曆上沒有標示宜「{act.label}」的日子。可以往後再查，或改看其他項目。</p>
          ) : (
            <div className="space-y-2">
              {days.map((d) => (
                <div key={d.solarStr} className="paper-card rounded-xl border border-border-warm p-4">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-ink">{d.solarStr}</span>
                      <span className="text-xs text-ink-3">{d.weekday}</span>
                    </div>
                    <span className="text-[11px] text-ink-4">
                      農曆{d.lunarStr} · {d.ganzhiStr} · 沖<span className="text-vermillion font-medium">{d.chong}</span>
                    </span>
                  </div>
                  {d.alsoYi.length > 0 && (
                    <p className="text-[11px] text-ink-4 mt-2">
                      當日也宜：<span className="text-jade">{d.alsoYi.join("、")}</span>
                    </p>
                  )}
                  {d.ji.length > 0 && (
                    <p className="text-[11px] text-ink-4 mt-0.5">
                      當日忌：<span className="text-vermillion">{d.ji.join("、")}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <ToolCTA variant="card" label="排我的命盤" sub="黃曆看的是「這一天」的性質，命盤看的是「你這個人」的運勢。想知道哪一年、哪一步大運最適合成家或創業，可以從自己的命盤看起。" />

          {/* FAQ */}
          <div className="space-y-3">
            <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
              <div className="w-1.5 h-5 bg-vermillion rounded-full self-center" />
              <h2 className="text-lg font-bold text-vermillion tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>常見問題</h2>
            </div>
            <div className="space-y-2">
              {faq.map((item) => (
                <details key={item.question} className="paper-card rounded-xl border border-border-warm px-4 py-3 group">
                  <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                    <span>{item.question}</span>
                    <span className="text-ink-4 text-xs transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <p className="text-xs text-ink-3 leading-relaxed pt-2.5">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>

          {others.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">其他{act.group}類擇日</p>
              <div className="grid grid-cols-2 gap-2">
                {others.map((o) => (
                  <Link key={o.slug} href={`/zeri/${o.slug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-vermillion/40 hover:text-vermillion transition-colors">
                    <p className="font-medium">{o.label}</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{o.blurb}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link href="/huangli" className="block text-center text-xs text-ink-4 hover:text-vermillion transition-colors">
            ← 回今日黃曆
          </Link>
        </div>
      </main>
    </>
  );
}
