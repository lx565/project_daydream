// 黃曆 / 擇日 data layer, built on lunar-javascript.
//
// IMPORTANT: lunar-javascript returns its 宜忌 vocabulary in SIMPLIFIED Chinese
// (开光, 馀事勿取, 理发…). This site is Traditional throughout and the audience is
// Taiwan/HK, so every term is mapped through YI_JI_TW before display. The
// vocabulary is a closed set — 113 distinct terms across a 3-year scan — so a
// static map is safer and more predictable than a runtime converter, and it
// pins the ambiguous cases explicitly (理发 → 理髮 not 理發; 馀 → 餘).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LunarAny = any;

const YI_JI_TW: Record<string, string> = {
  "上梁": "上樑",
  "习艺": "習藝",
  "会亲友": "會親友",
  "修坟": "修墳",
  "修门": "修門",
  "修饰垣墙": "修飾垣牆",
  "入学": "入學",
  "入殓": "入殮",
  "出货财": "出貨財",
  "动土": "動土",
  "取渔": "取漁",
  "合寿木": "合壽木",
  "合帐": "合帳",
  "启钻": "啟鑽",
  "坏垣": "壞垣",
  "塑绘": "塑繪",
  "安机械": "安機械",
  "安门": "安門",
  "平治道涂": "平治道塗",
  "开仓": "開倉",
  "开光": "開光",
  "开厕": "開廁",
  "开市": "開市",
  "开柱眼": "開柱眼",
  "开池": "開池",
  "开渠": "開渠",
  "开生坟": "開生墳",
  "归宁": "歸寧",
  "归岫": "歸岫",
  "扫舍": "掃舍",
  "挂匾": "掛匾",
  "教牛马": "教牛馬",
  "斋醮": "齋醮",
  "断蚁": "斷蟻",
  "无": "無",
  "架马": "架馬",
  "栽种": "栽種",
  "求医": "求醫",
  "牧养": "牧養",
  "理发": "理髮",
  "畋猎": "畋獵",
  "盖屋": "蓋屋",
  "竖柱": "豎柱",
  "筑堤": "築堤",
  "纳婿": "納婿",
  "纳畜": "納畜",
  "纳财": "納財",
  "纳采": "納采",
  "经络": "經絡",
  "结网": "結網",
  "置产": "置產",
  "行丧": "行喪",
  "补垣": "補垣",
  "订盟": "訂盟",
  "词讼": "詞訟",
  "诸事不宜": "諸事不宜",
  "谢土": "謝土",
  "进人口": "進人口",
  "造仓": "造倉",
  "造庙": "造廟",
  "造桥": "造橋",
  "造车器": "造車器",
  "针灸": "針灸",
  "问名": "問名",
  "雇佣": "僱傭",
  "馀事勿取": "餘事勿取",
};

/** Simplified 宜忌 term → Traditional. Unknown terms pass through unchanged. */
export function toTW(term: string): string {
  return YI_JI_TW[term] ?? term;
}

// lunar-javascript also returns 生肖 and 方位 in Simplified (马/猪/龙/鸡, 东).
// Same closed-set treatment as the 宜忌 vocabulary above.
const SHENGXIAO_TW: Record<string, string> = {
  "龙": "龍", "马": "馬", "鸡": "雞", "猪": "豬",
};
const DIRECTION_TW: Record<string, string> = { "东": "東" };

/** 生肖 (zodiac animal) → Traditional. */
export function shengxiaoTW(s: string): string {
  return SHENGXIAO_TW[s] ?? s;
}

/** 方位 (compass direction) → Traditional. */
export function directionTW(s: string): string {
  return s.split("").map((c) => DIRECTION_TW[c] ?? c).join("");
}


// 吉神 / 凶煞 names are a SEPARATE vocabulary from 宜忌 and also come back
// Simplified (时德, 天马, 青龙…). Same closed-set treatment: 145 distinct terms
// across a 3-year scan, 67 needing conversion.
const SHENSHA_TW: Record<string, string> = {
  "七鸟": "七鳥",
  "三丧": "三喪",
  "三阴": "三陰",
  "不将": "不將",
  "临日": "臨日",
  "五离": "五離",
  "五虚": "五虛",
  "八专": "八專",
  "八风": "八風",
  "八龙": "八龍",
  "六仪": "六儀",
  "勾陈": "勾陳",
  "单阴": "單陰",
  "厌对": "厭對",
  "四击": "四擊",
  "四废": "四廢",
  "四穷": "四窮",
  "圣心": "聖心",
  "复日": "復日",
  "大会": "大會",
  "大时": "大時",
  "大败": "大敗",
  "天仓": "天倉",
  "天医": "天醫",
  "天愿": "天願",
  "天贼": "天賊",
  "天马": "天馬",
  "宝光": "寶光",
  "小会": "小會",
  "小时": "小時",
  "岁薄": "歲薄",
  "归忌": "歸忌",
  "招摇": "招搖",
  "无": "無",
  "时德": "時德",
  "时阳": "時陽",
  "时阴": "時陰",
  "普护": "普護",
  "月厌": "月厭",
  "月虚": "月虛",
  "死气": "死氣",
  "母仓": "母倉",
  "游祸": "遊禍",
  "灾煞": "災煞",
  "生气": "生氣",
  "益后": "益後",
  "纯阴": "純陰",
  "绝阳": "絕陽",
  "续世": "續世",
  "触水龙": "觸水龍",
  "逐阵": "逐陣",
  "金匮": "金匱",
  "阳德": "陽德",
  "阳破阴冲": "陽破陰衝",
  "阳错": "陽錯",
  "阳错阴冲": "陽錯陰衝",
  "阴位": "陰位",
  "阴德": "陰德",
  "阴道冲阳": "陰道衝陽",
  "阴错": "陰錯",
  "阴阳交破": "陰陽交破",
  "阴阳俱错": "陰陽俱錯",
  "阴阳击冲": "陰陽擊衝",
  "青龙": "青龍",
  "驿马": "驛馬",
  "鸣吠": "鳴吠",
  "鸣吠对": "鳴吠對",
};

/** 吉神/凶煞 name → Traditional. */
export function shenshaTW(t: string): string {
  return SHENSHA_TW[t] ?? t;
}

export interface Almanac {
  date: Date;
  solarStr: string;
  weekday: string;
  lunarStr: string;
  ganzhiStr: string;
  shengxiao: string;
  jieqi: string;
  yi: string[];
  ji: string[];
  chong: string;
  sha: string;
  jishen: string[];
  xiongsha: string[];
}

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

/** Today in China time (UTC+8) — the almanac is defined on the Chinese calendar day. */
export function chinaToday(): Date {
  const now = new Date();
  return new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
}

export async function getAlmanac(date: Date): Promise<Almanac> {
  const { Solar } = await import("lunar-javascript");
  const solar = Solar.fromDate(date) as LunarAny;
  const lunar = solar.getLunar();

  return {
    date,
    solarStr: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
    weekday: `週${WEEKDAY[date.getDay()]}`,
    lunarStr: `農曆 ${lunar.getYearInChinese()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganzhiStr: `${lunar.getYearInGanZhi()}年 · ${lunar.getMonthInGanZhi()}月 · ${lunar.getDayInGanZhi()}日`,
    shengxiao: shengxiaoTW(lunar.getYearShengXiao()),
    jieqi: lunar.getJieQi() || lunar.getQi() || "",
    yi: (lunar.getDayYi() as string[]).map(toTW),
    ji: (lunar.getDayJi() as string[]).map(toTW),
    chong: shengxiaoTW(lunar.getDayChongShengXiao()),
    sha: directionTW(lunar.getDaySha()),
    jishen: (lunar.getDayJiShen() as string[]).map(shenshaTW),
    xiongsha: (lunar.getDayXiongSha() as string[]).map(shenshaTW),
  };
}

// ── 擇日 (auspicious-date lookup) ────────────────────────────────────────────

/** Curated activity list for the picker — the terms people actually search for,
 *  grouped for the UI. `term` is the SIMPLIFIED key lunar-javascript matches on;
 *  `label` is what we display. */
export interface Activity {
  slug: string;
  term: string;    // simplified, as returned by lunar-javascript
  label: string;   // Traditional, displayed
  group: string;
  blurb: string;
}

export const ACTIVITIES: Activity[] = [
  { slug: "jiequ",   term: "嫁娶", label: "嫁娶（結婚）", group: "婚嫁", blurb: "舉行婚禮、迎娶、登記結婚的日子。" },
  { slug: "dingmeng", term: "订盟", label: "訂盟（訂婚）", group: "婚嫁", blurb: "訂婚、文定、交換婚約的日子。" },
  { slug: "nacai",   term: "纳采", label: "納采（提親）", group: "婚嫁", blurb: "提親、下聘、送聘禮的日子。" },
  { slug: "kaishi",  term: "开市", label: "開市（開業）", group: "事業", blurb: "開張營業、公司行號開幕、新事業啟動。" },
  { slug: "jiaoyi",  term: "交易", label: "交易", group: "事業", blurb: "簽約、買賣、重要商業往來。" },
  { slug: "lijuan",  term: "立券", label: "立券（簽約）", group: "事業", blurb: "訂立契約、簽署文件。" },
  { slug: "narcai",  term: "纳财", label: "納財（收款）", group: "事業", blurb: "收帳、進財、資金入袋。" },
  { slug: "furen",   term: "赴任", label: "赴任（上任）", group: "事業", blurb: "就職、到職、走馬上任。" },
  { slug: "ruzhai",  term: "入宅", label: "入宅（搬新家）", group: "居家", blurb: "搬入新居、新屋入住。" },
  { slug: "yixi",    term: "移徙", label: "移徙（搬家）", group: "居家", blurb: "搬遷、遷移住所。" },
  { slug: "anchuang", term: "安床", label: "安床", group: "居家", blurb: "安置新床、移動床位。" },
  { slug: "dongtu",  term: "动土", label: "動土", group: "居家", blurb: "破土興工、開始建造。" },
  { slug: "xiuzao",  term: "修造", label: "修造（裝修）", group: "居家", blurb: "房屋修繕、裝潢施工。" },
  { slug: "gaiwu",   term: "盖屋", label: "蓋屋", group: "居家", blurb: "建造房屋、上蓋工程。" },
  { slug: "chuxing", term: "出行", label: "出行（遠行）", group: "出行", blurb: "遠行、旅遊、出差啟程。" },
  { slug: "qifu",    term: "祈福", label: "祈福", group: "祈福", blurb: "祈求福運、還願、宗教儀式。" },
  { slug: "jisi",    term: "祭祀", label: "祭祀", group: "祈福", blurb: "祭拜祖先、神明供奉。" },
  { slug: "kaiguang", term: "开光", label: "開光", group: "祈福", blurb: "神像、法器開光點眼。" },
  { slug: "qiuyi",   term: "求医", label: "求醫（看診）", group: "健康", blurb: "就醫、手術、療程開始。" },
  { slug: "ruxue",   term: "入学", label: "入學", group: "其他", blurb: "入學、拜師、開始學業。" },
  { slug: "lifa",    term: "理发", label: "理髮", group: "其他", blurb: "剪髮、整理儀容。" },
];

export function getActivity(slug: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.slug === slug);
}

export interface AuspiciousDay {
  date: Date;
  solarStr: string;
  weekday: string;
  lunarStr: string;
  ganzhiStr: string;
  /** Other things this day is also good for — context, not just a bare date. */
  alsoYi: string[];
  /** What this day is bad for — shown so the user can judge trade-offs honestly. */
  ji: string[];
  chong: string;
}

/**
 * Days within `days` of `from` where `activity.term` appears in the day's 宜.
 * Deliberately does NOT rank or score: the almanac is a traditional lookup, not
 * a personalised calculation, and inventing a ranking would imply precision the
 * source data doesn't have. Personalisation (avoiding your 生肖 沖) is layered
 * on top by the caller when a birth year is known.
 */
export async function findAuspiciousDays(
  activity: Activity,
  from: Date,
  days = 90,
): Promise<AuspiciousDay[]> {
  const { Solar } = await import("lunar-javascript");
  const out: AuspiciousDay[] = [];
  // Normalize to the start of `from`'s day: callers pass chinaToday(), which
  // carries a time-of-day, and day-boundary arithmetic must not depend on what
  // o'clock the page happened to render.
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const lunar = (Solar.fromDate(d) as LunarAny).getLunar();
    const yi = lunar.getDayYi() as string[];
    if (!yi.includes(activity.term)) continue;
    out.push({
      date: d,
      solarStr: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      weekday: `週${WEEKDAY[d.getDay()]}`,
      lunarStr: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      ganzhiStr: `${lunar.getDayInGanZhi()}日`,
      alsoYi: yi.filter((t) => t !== activity.term).slice(0, 5).map(toTW),
      ji: (lunar.getDayJi() as string[]).slice(0, 5).map(toTW),
      chong: shengxiaoTW(lunar.getDayChongShengXiao()),
    });
  }
  return out;
}
