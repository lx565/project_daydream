import { redirect } from "next/navigation";
import Link from "next/link";
import { calculateBazi } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";
import BaziProfile from "@/components/BaziProfile";
import ZiweiChart from "@/components/ZiweiChart";
import ReadingSession from "@/components/ReadingSession";
import ReadingCountPing from "@/components/ReadingCountPing";
import ShareButton from "./ShareButton";
import ChartSaver from "@/components/ChartSaver";
import BugReportButton from "@/components/BugReportButton";
import CoupleResultView from "@/components/CoupleResultView";
import MbtiCard from "@/components/MbtiCard";
import { detectMingge } from "@/lib/detectMingge";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

const SHICHEN: Record<number, string> = {
  0: "子时", 1: "丑时", 3: "寅时", 5: "卯时",
  7: "辰时", 9: "巳时", 11: "午时", 13: "未时",
  15: "申时", 17: "酉时", 19: "戌时", 21: "亥时",
};
function shichenLabel(h: number) {
  const key = h === 0 || h === 23 ? 0 : h % 2 === 0 ? h - 1 : h;
  return SHICHEN[key] ?? `${h}时`;
}

interface SearchParams {
  name?: string; date?: string; hour?: string; gender?: string; method?: string;
  partner?: string; pname?: string; pdate?: string; phour?: string; pgender?: string;
  location?: string; tz?: string; rel?: string;
}

// Convert local birth time to Beijing time (UTC+8).
// Works in minutes so fractional offsets (e.g. India +5:30, Nepal +5:45,
// Iran +3:30) convert correctly; the resulting hour is floored to an integer
// for 时辰 bucketing.
// Returns { year, month, day, hour } in Beijing time.
function toBjt(year: number, month: number, day: number, hour: number, tzOffset: number) {
  if (tzOffset === 8) return { year, month, day, hour };
  const diffMin = (8 - tzOffset) * 60;
  const totalMin = hour * 60 + diffMin;
  const dayDelta = Math.floor(totalMin / (24 * 60));
  const bjtMinOfDay = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const bjtHour = Math.floor(bjtMinOfDay / 60);
  const d = new Date(year, month - 1, day + dayDelta);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: bjtHour };
}

export default async function ResultPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { name, date, hour: hourStr, gender, partner, pname, pdate, phour: phourStr, pgender } = params;

  if (!date || !gender || (gender !== "male" && gender !== "female")) redirect("/");

  const [year, month, day] = date.split("-").map(Number);
  const localHour = parseInt(hourStr ?? "0", 10);
  const tzOffset = parseFloat(params.tz ?? "8");
  const isCouple = partner === "true" && !!pdate && !!pgender;

  // Convert to Beijing time if needed
  const bjt = toBjt(year, month, day, localHour, tzOffset);
  const { year: bjtYear, month: bjtMonth, day: bjtDay, hour } = bjt;
  const tzAdjusted = tzOffset !== 8;

  const baziResult = calculateBazi(bjtYear, bjtMonth, bjtDay, hour, gender as "male" | "female");

  const { calculateZiwei } = await import("@/lib/ziwei");
  const ziweiResult: ZiweiResult = await calculateZiwei(bjtYear, bjtMonth, bjtDay, hour, gender as "male" | "female");

  let partnerZiwei: ZiweiResult | undefined;
  if (isCouple && pdate && pgender) {
    const [py, pm, pd] = pdate.split("-").map(Number);
    partnerZiwei = await calculateZiwei(py, pm, pd, parseInt(phourStr ?? "0", 10), pgender as "male" | "female");
  }

  const sessionId = `${bjtYear}${bjtMonth}${bjtDay}${hour}${gender}`;

  // ── Couple mode: dedicated view ──────────────────────────────────────────
  if (isCouple && partnerZiwei) {
    const [py, pm, pd] = (pdate ?? "").split("-").map(Number);
    const partnerBazi = calculateBazi(py, pm, pd, parseInt(phourStr ?? "0", 10), pgender as "male" | "female");
    return (
      <main className="min-h-screen bg-parchment px-4 py-10">
        <ReadingCountPing />
        <CoupleResultView
          baziA={baziResult} ziweiA={ziweiResult} nameA={name} genderA={gender as "male" | "female"}
          baziB={partnerBazi} ziweiB={partnerZiwei} nameB={pname} genderB={pgender as "male" | "female"}
          sessionId={sessionId}
          relationshipType={params.rel}
        />
        <BugReportButton sessionId={sessionId} page="couple-result" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <ReadingCountPing />
      {/* Save chart to localStorage for returning-user daily loop */}
      <ChartSaver
        name={name}
        date={date}
        hour={hour}
        gender={gender as "male" | "female"}
        method={params.method}
        summary={ziweiResult.summary}
        soulPalace={ziweiResult.soulPalace}
        bodyPalace={ziweiResult.bodyPalace}
        mainStar={ziweiResult.mainStar}
        bodyStar={ziweiResult.bodyStar}
        fiveElementsClass={ziweiResult.fiveElementsClass}
      />
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors">
          ← 重新推算
        </Link>

        {/* Combined card: identity + bazi + ziwei */}
        <div className="paper-card rounded-2xl border border-border-warm overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-vermillion rounded-full" />
              <h2 className="text-base font-bold text-ink tracking-wide">
                {name ? `${name} · ` : ""}命盘
              </h2>
              {isCouple && (
                <span className="px-2 py-0.5 rounded text-xs bg-vermillion-l border border-vermillion/30 text-vermillion">合盘</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
              <span>{formatDate(date)}</span>
              <span className="text-ink-4">·</span>
              <span>{shichenLabel(localHour)}</span>
              <span className="text-ink-4">·</span>
              <span>{gender === "male" ? "男命" : "女命"}</span>
            </div>
            {tzAdjusted && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1.5">
                <span>→ 北京时间推盘：{formatDate(`${bjtYear}-${String(bjtMonth).padStart(2,"0")}-${String(bjtDay).padStart(2,"0")}`)} {shichenLabel(hour)}</span>
              </p>
            )}
            <p className="text-xs text-ink-4 mt-1.5">
              {baziResult.year.stem}{baziResult.year.branch}年
              · 日主{baziResult.dayMaster}（{baziResult.dayMasterElement}）
              · {ziweiResult.fiveElementsClass}
            </p>
          </div>

          {/* Eight characters */}
          <div className="border-t border-border-light px-5 py-4">
            <p className="text-[11px] text-ink-4 tracking-widest uppercase mb-3 flex items-center gap-2">
              <span className="w-px h-3 bg-ink-4 inline-block" />八字四柱
            </p>
            <BaziProfile result={baziResult} name={name} gender={gender as "male" | "female"} />
          </div>

          {/* Ziwei chart */}
          {ziweiResult.palaces.length > 0 && (
            <div className="border-t border-border-light px-5 py-4">
              <p className="text-[11px] text-ink-4 tracking-widest uppercase mb-3 flex items-center gap-2">
                <span className="w-px h-3 bg-ink-4 inline-block" />紫微斗数命盘
              </p>
              <ZiweiChart
                palaces={ziweiResult.palaces}
                soulPalace={ziweiResult.soulPalace}
                bodyPalace={ziweiResult.bodyPalace}
                fiveElementsClass={ziweiResult.fiveElementsClass}
                mainStar={ziweiResult.mainStar}
                bodyStar={ziweiResult.bodyStar}
                name={name}
                gender={gender as "male" | "female"}
                birthYear={year}
                ziwei={ziweiResult}
                sessionId={sessionId}
              />
            </div>
          )}
        </div>

        {/* Partner chart */}
        {partnerZiwei && partnerZiwei.palaces.length > 0 && (
          <div>
            <p className="text-xs text-ink-4 tracking-widest uppercase mb-2 px-1 flex items-center gap-2">
              <span className="w-px h-3 bg-ink-4 inline-block" />对方命盘
            </p>
            <ZiweiChart
              palaces={partnerZiwei.palaces}
              soulPalace={partnerZiwei.soulPalace}
              bodyPalace={partnerZiwei.bodyPalace}
              fiveElementsClass={partnerZiwei.fiveElementsClass}
              mainStar={partnerZiwei.mainStar}
              bodyStar={partnerZiwei.bodyStar}
              name={pname}
              gender={pgender as "male" | "female"}
            />
          </div>
        )}

        {/* 命格 detection card */}
        {ziweiResult.palaces.length > 0 && (() => {
          const formations = detectMingge(ziweiResult.palaces);
          if (!formations.length) return null;
          const TYPE_COLOR: Record<string, string> = {
            吉格: "bg-jade/10 text-jade border-jade/30",
            凶格: "bg-vermillion-l text-vermillion border-vermillion/30",
            特殊: "bg-gold/10 text-gold border-gold/30",
          };
          return (
            <div className="paper-card rounded-2xl border border-border-warm p-4 sm:p-5 space-y-3">
              <p className="text-xs text-ink-4 font-medium tracking-widest uppercase flex items-center gap-2">
                <span className="w-px h-3 bg-gold inline-block" />
                <span className="text-gold">命格 · 特殊格局</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {formations.map(f => (
                  <Link
                    key={f.slug}
                    href={`/mingge/${f.urlSlug}`}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-opacity hover:opacity-70 ${TYPE_COLOR[f.type] ?? ""}`}
                  >
                    {f.name}
                  </Link>
                ))}
              </div>
              <p className="text-xs text-ink-4 leading-relaxed">
                以上格局由命盘自动识别，点击名称可查看详解。
              </p>
            </div>
          );
        })()}

        {/* AI Reading + Chat — ReadingSession shares completed readings into chat context */}
        {ziweiResult.palaces.length > 0 && (
          <ReadingSession
            ziwei={ziweiResult}
            bazi={baziResult}
            gender={gender}
            birthYear={year}
            sessionId={sessionId}
            name={name}
            dateLabel={formatDate(date)}
            timeLabel={shichenLabel(localHour)}
          />
        )}

        {/* MBTI crossover card */}
        {ziweiResult.palaces.length > 0 && (
          <MbtiCard palaces={ziweiResult.palaces} />
        )}

        {/* Share */}
        <div className="paper-card rounded-2xl border border-border-warm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">分享此命盘</p>
            <p className="text-xs text-ink-4 mt-0.5">复制链接给朋友</p>
          </div>
          <ShareButton />
        </div>

        <p className="text-center text-xs text-ink-4 pb-4">
          仅供学习参考与娱乐，请理性看待，切勿迷信
        </p>
      </div>
      <BugReportButton sessionId={sessionId} page="result" />
    </main>
  );
}
