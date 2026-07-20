import type { RagQuery } from "@/lib/rag";

// 十天干日主 — the day master (日主/日元) is the stem of the day pillar, the
// "you" of a 八字 chart. Each of the ten stems has a fixed 五行 + 陰陽 + 物象.
export interface TianganEntry {
  gan: string;         // 天干，如「甲」
  urlSlug: string;     // pinyin slug, e.g. "jiamu"
  element: string;     // 五行，如「木」
  yinyang: string;     // 陰陽，如「陽」
  image: string;       // 物象，如「參天大樹」
  title: string;
  subtitle: string;
  oneLine: string;     // hub 卡片用一句話
  intro: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];   // urlSlugs
}

export const TIANGAN: TianganEntry[] = [
  {
    gan: "甲", urlSlug: "jiamu", element: "木", yinyang: "陽", image: "參天大樹",
    title: "甲木日主：棟樑之才與向上的生命力",
    subtitle: "陽木 · 參天大樹 · 正直、進取、有擔當",
    oneLine: "陽木如大樹，主正直、進取與領導力。",
    intro: "甲木是陽木，象徵參天大樹、棟樑之材。甲木日主的人通常正直、有主見、向上心強，天生具備開創與領導氣質；但也可能固執、不懂轉彎。本文講清甲木的性格底色、喜用（需丙火向陽、庚金修剪、壬癸水滋養），以及甲木在身強身弱時的不同表現。",
    ragQuery: { text: "甲木 日主 陽木 十天干 性格 喜用神 丙火 庚金 棟樑 旺衰 格局", topic: "格局" },
    related: ["yimu", "binghuo", "gengjin"],
  },
  {
    gan: "乙", urlSlug: "yimu", element: "木", yinyang: "陰", image: "花草藤蔓",
    title: "乙木日主：柔韌靈活與堅強的生命力",
    subtitle: "陰木 · 花草藤蔓 · 柔韌、隨和、善變通",
    oneLine: "陰木如花草，主柔韌、隨和與適應力。",
    intro: "乙木是陰木，象徵花草、藤蔓、禾苗。乙木日主的人外柔內韌、善於變通、人緣好，能在夾縫中生長；但也可能依賴、缺乏決斷。本文講清乙木的性格特質、喜用（喜丙火暖陽、忌金多克伐），以及它與甲木「同為木卻氣質迥異」的關鍵差異。",
    ragQuery: { text: "乙木 日主 陰木 十天干 性格 柔韌 喜用神 丙火 藤蘿系甲 旺衰 格局", topic: "格局" },
    related: ["jiamu", "binghuo", "guishui"],
  },
  {
    gan: "丙", urlSlug: "binghuo", element: "火", yinyang: "陽", image: "太陽",
    title: "丙火日主：光明熱烈與無私的能量",
    subtitle: "陽火 · 太陽 · 熱情、坦蕩、有感染力",
    oneLine: "陽火如太陽，主熱情、坦蕩與感染力。",
    intro: "丙火是陽火，象徵太陽，照耀萬物而無私。丙火日主的人熱情外向、光明磊落、有領袖魅力與感染力；但也可能性急、張揚、起伏大。本文講清丙火的性格、喜用（喜壬水輝映成「江暉相映」、忌火炎土燥），以及它與丁火的根本不同。",
    ragQuery: { text: "丙火 日主 陽火 太陽 十天干 性格 熱情 喜用神 壬水 江暉相映 格局", topic: "格局" },
    related: ["dinghuo", "renshui", "jiamu"],
  },
  {
    gan: "丁", urlSlug: "dinghuo", element: "火", yinyang: "陰", image: "燈燭星火",
    title: "丁火日主：溫暖細膩與內在的光",
    subtitle: "陰火 · 燈燭星火 · 溫和、敏銳、有奉獻精神",
    oneLine: "陰火如燈燭，主溫和、細膩與奉獻。",
    intro: "丁火是陰火，象徵燈燭、星火，光雖不烈卻能持久照人。丁火日主的人溫和細膩、思慮周到、富同理心與奉獻精神；但也可能多思、敏感、易內耗。本文講清丁火的性格、喜用（喜甲木為薪持續燃燒、忌水多克滅），以及它與丙火「外放 vs 內斂」的差異。",
    ragQuery: { text: "丁火 日主 陰火 燈燭 十天干 性格 溫和 喜用神 甲木 引丁 旺衰 格局", topic: "格局" },
    related: ["binghuo", "jiamu", "yimu"],
  },
  {
    gan: "戊", urlSlug: "wutu", element: "土", yinyang: "陽", image: "城牆大山",
    title: "戊土日主：厚重穩定與包容的力量",
    subtitle: "陽土 · 城牆高山 · 穩重、可靠、有包容力",
    oneLine: "陽土如高山，主穩重、可靠與包容。",
    intro: "戊土是陽土，象徵城牆、高山、堤壩，厚重而能擋水、載物。戊土日主的人穩重踏實、有信用、能容人容事，是天生的靠山；但也可能固執、慢熱、不善變通。本文講清戊土的性格、喜用（喜丙火照暖、甲木疏土、癸水潤澤），以及它與己土的差異。",
    ragQuery: { text: "戊土 日主 陽土 高山 城牆 十天干 性格 穩重 喜用神 丙火 甲木疏土 格局", topic: "格局" },
    related: ["jitu", "binghuo", "jiamu"],
  },
  {
    gan: "己", urlSlug: "jitu", element: "土", yinyang: "陰", image: "田園溼土",
    title: "己土日主：包容滋養與務實的智慧",
    subtitle: "陰土 · 田園沃土 · 溫厚、務實、善培育",
    oneLine: "陰土如田園，主溫厚、務實與培育力。",
    intro: "己土是陰土，象徵田園、沃土，能種植萬物、低調含蓄。己土日主的人溫厚務實、包容耐心、善於培育與協調；但也可能多慮、保守、易自我消耗。本文講清己土的性格、喜用（喜丙火暖土、忌水多木盛成「稼穡」受損），以及它與戊土「高山 vs 田園」的氣質差異。",
    ragQuery: { text: "己土 日主 陰土 田園 十天干 性格 溫厚 務實 喜用神 丙火 稼穡 格局", topic: "格局" },
    related: ["wutu", "binghuo", "yimu"],
  },
  {
    gan: "庚", urlSlug: "gengjin", element: "金", yinyang: "陽", image: "頑鐵刀劍",
    title: "庚金日主：剛毅果決與開拓的鋒芒",
    subtitle: "陽金 · 頑鐵刀劍 · 果斷、講義氣、有魄力",
    oneLine: "陽金如刀劍，主果斷、剛毅與義氣。",
    intro: "庚金是陽金，象徵頑鐵、刀劍、礦石，需錘鍊方成器。庚金日主的人剛毅果決、講義氣、有開拓魄力；但也可能強硬、衝動、易傷人傷己。本文講清庚金的性格、喜用（喜丁火鍊金成器、壬水淘洗顯鋒、忌金多無制），以及它與辛金的根本不同。",
    ragQuery: { text: "庚金 日主 陽金 刀劍 頑鐵 十天干 性格 剛毅 喜用神 丁火鍊金 壬水 格局", topic: "格局" },
    related: ["xinjin", "dinghuo", "renshui"],
  },
  {
    gan: "辛", urlSlug: "xinjin", element: "金", yinyang: "陰", image: "珠玉首飾",
    title: "辛金日主：精緻敏銳與內秀的鋒芒",
    subtitle: "陰金 · 珠玉首飾 · 細膩、愛美、有審美力",
    oneLine: "陰金如珠玉，主細膩、愛美與審美力。",
    intro: "辛金是陰金，象徵珠玉、首飾、精金，貴在溫潤有光。辛金日主的人細膩敏銳、重儀表、有審美與品味；但也可能愛面子、敏感、記仇。本文講清辛金的性格、喜用（喜壬水洗淘成「淘洗珠玉」越發光亮、忌火多熔傷），以及它與庚金「珠玉 vs 刀劍」的差異。",
    ragQuery: { text: "辛金 日主 陰金 珠玉 十天干 性格 細膩 喜用神 壬水淘洗 忌火 旺衰 格局", topic: "格局" },
    related: ["gengjin", "renshui", "jitu"],
  },
  {
    gan: "壬", urlSlug: "renshui", element: "水", yinyang: "陽", image: "江河大海",
    title: "壬水日主：奔放智慧與包容的格局",
    subtitle: "陽水 · 江河大海 · 聰明、大氣、善謀略",
    oneLine: "陽水如江海，主聰明、大氣與謀略。",
    intro: "壬水是陽水，象徵江河、大海，奔流不息、包納百川。壬水日主的人聰明機變、心胸開闊、有謀略與社交力；但也可能漂泊、貪多、定力不足。本文講清壬水的性格、喜用（喜丙火照映、戊土築堤約束、忌水泛無制），以及它與癸水的氣質差異。",
    ragQuery: { text: "壬水 日主 陽水 江河 大海 十天干 性格 聰明 喜用神 丙火 戊土製水 格局", topic: "格局" },
    related: ["guishui", "binghuo", "wutu"],
  },
  {
    gan: "癸", urlSlug: "guishui", element: "水", yinyang: "陰", image: "雨露泉水",
    title: "癸水日主：溫潤細膩與滲透的智慧",
    subtitle: "陰水 · 雨露泉水 · 內斂、聰慧、有耐性",
    oneLine: "陰水如雨露，主內斂、聰慧與耐性。",
    intro: "癸水是陰水，象徵雨露、泉水、雲霧，至柔而能滲透滋養。癸水日主的人內斂聰慧、想像力豐富、有耐性與同理心；但也可能多疑、悲觀、易鑽牛角尖。本文講清癸水的性格、喜用（喜庚辛金為源、丙火暖局、忌土多濁水），以及它與壬水「雨露 vs 江海」的差異。",
    ragQuery: { text: "癸水 日主 陰水 雨露 十天干 性格 內斂 聰慧 喜用神 庚辛金 丙火 格局", topic: "格局" },
    related: ["renshui", "gengjin", "dinghuo"],
  },
];

export function getTiangan(urlSlug: string): TianganEntry | undefined {
  return TIANGAN.find(t => t.urlSlug === urlSlug);
}
