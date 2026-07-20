// Server component — runs at request time, always shows today in China time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SolarType = any;

function getChinaToday() {
  const now = new Date();
  const chinaMs = now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000;
  return new Date(chinaMs);
}

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

export default async function HuangLi() {
  const { Solar } = await import("lunar-javascript");
  const china = getChinaToday();
  const solar = Solar.fromDate(china) as SolarType;
  const lunar = solar.getLunar();

  const solarStr = `${china.getFullYear()}年${china.getMonth() + 1}月${china.getDate()}日`;
  const weekday = `周${WEEKDAY[china.getDay()]}`;
  const lunarStr = `農曆 ${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  const ganzhiStr = `${lunar.getYearInGanZhi()}年 · ${lunar.getMonthInGanZhi()}月 · ${lunar.getDayInGanZhi()}日`;
  const shengxiao = lunar.getYearShengXiao();
  const jieqi = lunar.getJieQi() || lunar.getQi() || "";

  const yi: string[] = lunar.getDayYi().slice(0, 6);
  const ji: string[] = lunar.getDayJi().slice(0, 6);
  const chong = lunar.getDayChongShengXiao();
  const sha = lunar.getDaySha();
  const jishen: string[] = lunar.getDayJiShen().slice(0, 4);
  const xiongsha: string[] = lunar.getDayXiongSha().slice(0, 4);

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-ink tracking-wide">{solarStr}</span>
              <span className="text-sm text-ink-3">{weekday}</span>
            </div>
            <p className="text-xs text-ink-3 mt-0.5">{lunarStr}</p>
          </div>
          <div className="text-right">
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-vermillion-l border border-vermillion/20 text-vermillion font-medium">
              {shengxiao}年
            </span>
            {jieqi && (
              <p className="text-[10px] text-gold font-semibold mt-1">{jieqi}</p>
            )}
          </div>
        </div>

        {/* Ganzhi */}
        <div className="text-[11px] text-ink-3 tracking-widest border-t border-border-light pt-3">
          {ganzhiStr}
        </div>

        {/* 宜忌 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1 h-3.5 bg-jade rounded-full" />
              <span className="text-[11px] font-bold text-jade tracking-widest">宜</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {yi.map((item) => (
                <span key={item} className="text-[11px] px-1.5 py-0.5 rounded bg-jade-l border border-jade/20 text-jade">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1 h-3.5 bg-vermillion rounded-full" />
              <span className="text-[11px] font-bold text-vermillion tracking-widest">忌</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {ji.map((item) => (
                <span key={item} className="text-[11px] px-1.5 py-0.5 rounded bg-vermillion-l border border-vermillion/20 text-vermillion">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-light pt-3 text-[11px] text-ink-3">
          <span>衝 <span className="text-ink font-medium">{chong}</span></span>
          <span>煞 <span className="text-ink font-medium">{sha}</span></span>
          {jishen.length > 0 && (
            <span>吉神 <span className="text-jade font-medium">{jishen.join(" ")}</span></span>
          )}
          {xiongsha.length > 0 && (
            <span>凶煞 <span className="text-vermillion font-medium">{xiongsha.join(" ")}</span></span>
          )}
        </div>
      </div>
    </div>
  );
}
