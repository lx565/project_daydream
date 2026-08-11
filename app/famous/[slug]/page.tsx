import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { FAMOUS_PEOPLE } from "@/lib/famousData";
import { STAR_TO_MBTI } from "@/lib/personalityData";
import { calculateZiwei } from "@/lib/ziwei";
import { calculateBazi } from "@/lib/bazi";
import SeoMarkdown from "@/components/SeoMarkdown";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";
import VoteWidget from "@/components/VoteWidget";
import LikeButton from "@/components/LikeButton";
import JsonLd from "@/components/JsonLd";
import ZiweiChart from "@/components/ZiweiChart";
import BaziProfile from "@/components/BaziProfile";
import { articleSchema, breadcrumbSchema, personSchema, faqSchema } from "@/lib/jsonld";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return FAMOUS_PEOPLE.map(p => ({ slug: p.slug }));
}

interface PageParams { slug: string }

const HOUR_MAP: Record<string, number> = {
  子: 0, 丑: 2, 寅: 4, 卯: 6, 辰: 8, 巳: 10,
  午: 12, 未: 14, 申: 16, 酉: 18, 戌: 20, 亥: 22,
};

function parseBirthLabel(label: string): { year: number; month: number; day: number; hour: number } | null {
  const m = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\S)時/);
  if (!m) return null;
  return {
    year: parseInt(m[1]),
    month: parseInt(m[2]),
    day: parseInt(m[3]),
    hour: HOUR_MAP[m[4]] ?? 6,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug } = await params;
  const person = FAMOUS_PEOPLE.find(p => p.slug === slug);
  if (!person) return {};

  const title = `${person.name}命盤解析 · ${person.formations[0]} — 命裡`;
  const description = person.brief;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/famous/${slug}`,
      siteName: "命裡",
      locale: "zh_TW",
      type: "article",
    },
    alternates: { canonical: `https://www.mingli.study/famous/${slug}` },
  };
}

export default async function FamousPersonPage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug } = await params;
  const person = FAMOUS_PEOPLE.find(p => p.slug === slug);
  if (!person) notFound();

  const primaryStarName = person.mainStars.split("·")[0].trim();
  const mbti = STAR_TO_MBTI[primaryStarName] ?? null;
  const gender = person.gender ?? "male";

  const contentFile = path.join(process.cwd(), "content", "seo", "mingge_famous", `${person.name}.json`);
  let markdown = "";
  if (fs.existsSync(contentFile)) {
    const d = JSON.parse(fs.readFileSync(contentFile, "utf8"));
    markdown = d.markdown ?? "";
  }

  const birthInfo = parseBirthLabel(person.birthLabel);
  const ziwei = birthInfo ? await calculateZiwei(birthInfo.year, birthInfo.month, birthInfo.day, birthInfo.hour, gender).catch(() => null) : null;
  const bazi = birthInfo ? calculateBazi(birthInfo.year, birthInfo.month, birthInfo.day, birthInfo.hour, gender) : null;

  const path_ = `/famous/${person.slug}`;
  const birthYear = birthInfo?.year;

  // FAQ: built only from facts already displayed on this page (birth data,
  // 命宮主星, 格局) — no invented claims about a real, named public figure.
  const faq = [
    {
      question: `${person.name}的命宮主星是什麼？`,
      answer: `${person.name}命宮為${person.soulPalace}宮，主星${person.mainStars}，具${person.formations.join("、")}格局。`,
    },
    {
      question: "名人命盤的出生時間準確嗎？",
      answer: "名人的出生日期多可考證，但精確到「時辰」的資料較難完全確認，坊間流傳的時辰可能存在誤差。本頁排盤僅供學習參考與命理研究，不作為對該人物的定論。",
    },
  ];

  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命裡", path: "/" },
          { name: "知識庫", path: "/library" },
          { name: "名人命盤", path: "/famous" },
          { name: person.name, path: path_ },
        ]),
        personSchema(person, path_),
        articleSchema({
          headline: `${person.name}命盤解析 · ${person.formations[0] ?? "紫微斗數"}`,
          description: person.brief,
          path: path_,
          section: "名人命盤",
        }),
        faqSchema(faq),
      ]} />
      <LibraryNav category="mingge" currentTitle={`${person.name}命盤`} />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
        {/* Hero */}
        <div className="text-center pt-8 pb-4 space-y-2">
          <p className="text-xs text-ink-4 tracking-widest">{person.era} · {person.domain}</p>
          <h1
            className="text-4xl font-bold text-vermillion"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.15em" }}
          >
            {person.name}
          </h1>
          <p className="text-xs text-ink-4">{person.nameEn}</p>
          <div className="flex items-center gap-3 justify-center pt-1">
            <div className="h-px w-16 bg-vermillion/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-vermillion/40" />
            <div className="h-px w-16 bg-vermillion/20" />
          </div>
        </div>

        {/* Summary card */}
        <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <div>
              <span className="text-ink-4">出生：</span>
              <span className="text-ink-2">{person.birthLabel}</span>
            </div>
            <div>
              <span className="text-ink-4">五行局：</span>
              <span className="text-ink-2">{person.fiveElements}</span>
            </div>
            <div>
              <span className="text-ink-4">命宮：</span>
              <span className="text-ink-2">{person.soulPalace}宮 · {person.mainStars}</span>
            </div>
            <div>
              <span className="text-ink-4">格局：</span>
              <span className="text-ink-2">{person.formations.join("、")}</span>
            </div>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed border-t border-border-light pt-3">{person.brief}</p>
        </div>

        <ToolCTA variant="slim" label="排你自己的命盤 · AI 解讀你的格局與運勢 →" />

        {/* Ziwei Chart */}
        {ziwei && (
          <div className="space-y-2">
            <p className="text-xs text-ink-4 font-medium tracking-widest">紫微斗數命盤</p>
            <ZiweiChart
              palaces={ziwei.palaces}
              soulPalace={ziwei.soulPalace}
              bodyPalace={ziwei.bodyPalace}
              fiveElementsClass={ziwei.fiveElementsClass}
              mainStar={ziwei.mainStar}
              bodyStar={ziwei.bodyStar}
              name={person.name}
              gender={gender}
              isExample={true}
              birthYear={birthYear}
            />
          </div>
        )}

        {/* Bazi Profile */}
        {bazi && (
          <div className="space-y-2">
            <p className="text-xs text-ink-4 font-medium tracking-widest">八字四柱</p>
            <BaziProfile result={bazi} name={person.name} gender={gender} />
          </div>
        )}

        {/* Article */}
        {markdown ? (
          <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
            <SeoMarkdown>{markdown}</SeoMarkdown>
          </div>
        ) : (
          <div className="paper-card rounded-2xl border border-border-warm p-5 text-center text-sm text-ink-4">
            內容生成中，請稍後再訪問。
          </div>
        )}

        {/* MBTI cross-link */}
        {mbti && (
          <Link
            href={`/personality/${mbti.slug}`}
            className="paper-card rounded-2xl border border-border-warm p-4 flex items-center justify-between gap-4 hover:border-jade/40 transition-colors group"
          >
            <div className="space-y-0.5">
              <p className="text-[11px] text-ink-4 tracking-widest uppercase">紫微 × MBTI</p>
              <p className="text-sm text-ink-2">
                {person.name}的命宮主星<span className="font-semibold text-ink">·{primaryStarName}星</span>對應西方人格畫像
              </p>
              <p className="text-xs text-ink-4">點選檢視深度對照分析</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-mono font-bold text-jade">{mbti.code}</div>
              <div className="text-xs text-ink-3">{mbti.name}</div>
            </div>
          </Link>
        )}

        {/* Formation links */}
        <div className="space-y-2">
          <p className="text-xs text-ink-4 font-medium">相關格局詳解</p>
          <div className="flex flex-wrap gap-2">
            {person.formations.map(f => (
              <Link
                key={f}
                href={`/mingge`}
                className="text-xs px-3 py-1 rounded-full border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
              >
                {f}
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">常見問題</p>
          <div className="space-y-2">
            {faq.map(item => (
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

        <LikeButton />
        <VoteWidget />

        <ToolCTA variant="card" label="排命盤 · 看你的格局是否與這些名人相似" sub="AI 綜合三派典籍，為你詳批命格與人生走向" />

        {/* Other famous people */}
        <div className="space-y-3">
          <p className="text-xs text-ink-4 font-medium">其他名人命盤</p>
          <div className="flex flex-wrap gap-2">
            {FAMOUS_PEOPLE.filter(p => p.slug !== slug).map(p => (
              <Link
                key={p.slug}
                href={`/famous/${p.slug}`}
                className="text-xs px-3 py-1 rounded-full border border-border-warm text-ink-3 hover:border-vermillion/50 hover:text-vermillion transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
