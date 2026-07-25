import type { RagQuery } from "@/lib/rag";

export interface GuideTopic {
  slug: string;
  urlSlug: string; // pinyin-friendly URL slug (e.g., ziwei-rumen for 紫微斗數入門)
  title: string;
  subtitle: string;
  intro: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[]; // slugs of related topics
  /** Override for the early slim ToolCTA label — use when the default is too generic
   *  to close the gap between what the title promises and what the tool delivers. */
  ctaLabel?: string;
}

export const GUIDE_TOPICS: GuideTopic[] = [
  // ── 入門 ─────────────────────────────────────────────────────────────────
  {
    slug: "紫微斗數入門",
    urlSlug: "ziwei-rumen",
    title: "紫微斗數入門",
    subtitle: "什麼是紫微斗數？",
    intro:
      "紫微斗數是中國傳統命理學中最精密的推算體系之一，以北斗星君紫微星為核心，結合108顆星曜、十二宮位與四化飛星，構建出一套完整的命盤系統。通過出生年月日時排出命盤，可推演人生各方面的運勢走向。",
    ragQuery: {
      text: "紫微斗數 起源 基本原理 命盤 入門 十二宮 主星 什麼是紫微斗數",
      topic: "格局",
    },
    related: ["十二宮", "主星總覽", "三派比較", "紫微八字區別", "三合派"],
  },
  {
    slug: "十二宮",
    urlSlug: "palaces",
    title: "紫微斗數十二宮",
    subtitle: "命盤的十二個人生領域",
    intro:
      "紫微斗數命盤由十二個宮位構成，分別代表人生的不同領域：命宮（整體格局）、財帛宮（財運）、官祿宮（事業）、夫妻宮（婚姻）等。每個宮位落入的主星與四化，決定了該領域的運勢特質。",
    ragQuery: {
      text: "十二宮 命宮 財帛宮 官祿宮 夫妻宮 宮位 宮氣 三方四正",
      topic: "格局",
    },
    related: ["紫微斗數入門", "主星總覽", "三合派"],
  },
  {
    slug: "主星總覽",
    urlSlug: "main-stars",
    title: "紫微斗數十四主星",
    subtitle: "命盤中的核心星曜",
    intro:
      "紫微斗數有十四顆主星，以北斗七星（紫微、天機、太陽、武曲、天同、廉貞、破軍）與南斗六星（天府、太陰、貪狼、巨門、天相、天梁、七殺）為核心。每顆主星有其五行屬性、陰陽極性與獨特性情，落入不同宮位呈現不同面貌。",
    ragQuery: {
      text: "主星 十四主星 紫微 天機 太陽 武曲 天同 天府 太陰 貪狼 七殺 破軍 五行屬性",
      topic: "格局",
    },
    related: ["廟旺利陷", "六煞星", "桃花星", "紫微斗數入門", "十二宮"],
  },

  // ── 三大流派 ─────────────────────────────────────────────────────────────
  {
    slug: "三合派",
    urlSlug: "sanhe-school",
    title: "三合派紫微斗數",
    subtitle: "以三方四正為核心的古典派別",
    intro:
      "三合派是紫微斗數三大流派之一，你不需要先選定派別才能看懂自己的命盤——命裡的 AI 解讀採三合、四化、飛星三派合參，互相補充而非偏執一家。三合派是紫微斗數最為廣泛流傳的傳統流派，以中州派為代表，由香港命理大師王亭之集大成。三合派以宮氣為重，看命宮三方四正（命宮、官祿宮、財帛宮、遷移宮）的星曜組合，判斷命主的格局高低與運勢走向。",
    ragQuery: {
      text: "三合派 三方四正 宮氣 中州派 王亭之 命宮 格局 宮位影響",
      school: "三合派",
    },
    related: ["中州派", "三方四正", "三派比較", "四化派", "飛星派"],
    ctaLabel: "不必先選派別 · AI 三合、四化、飛星三派合參，直接為你詳批命盤 →",
  },
  {
    slug: "四化派",
    urlSlug: "sihua-school",
    title: "四化派紫微斗數",
    subtitle: "以化祿化權化科化忌為核心的推演體系",
    intro:
      "四化派又稱欽天四化，由臺灣命理師許銓仁發揚光大。四化派以化祿、化權、化科、化忌四顆飛化星為核心，通過天干飛化到各宮位，解讀命主在財運、事業、感情等領域的動態變化。與三合派重宮氣不同，四化派更重星曜的動態飛化。",
    ragQuery: {
      text: "四化派 化祿 化權 化科 化忌 欽天四化 許銓仁 飛化 天干 動態",
      school: "四化派",
    },
    related: ["三合派", "飛星派", "四化", "紫微斗數入門"],
  },
  {
    slug: "飛星派",
    urlSlug: "feixing-school",
    title: "飛星派紫微斗數",
    subtitle: "以生年四化飛星判斷動態運勢",
    intro:
      "飛星派以生年四化為基礎，將命主出生年份的四顆飛化星（化祿、化權、化科、化忌）按天干規則飛入各宮，解讀宮位之間的互動與衝化關係。飛星派擅長判斷人生變動的時間節點，對流年大限的推算尤為精準。",
    ragQuery: {
      text: "飛星派 生年四化 飛星 梁若瑜 顧祥弘 蔡明宏 流年 大限 宮位互動",
      school: "飛星派",
    },
    related: ["三合派", "四化派", "四化", "大限"],
  },
  {
    slug: "中州派",
    urlSlug: "zhongzhou-school",
    title: "中州派紫微斗數",
    subtitle: "王亭之集大成的三合正宗",
    intro:
      "中州派是三合派中最具影響力的一支，由香港命理大師王亭之整理古訣、集其大成，上承《紫微斗數全書》與明清星訣。中州派重宮氣、看星情、論三方四正的星曜組合，強調星曜落宮的廟旺與會照，是當代學習三合派最完整的門徑之一。",
    ragQuery: {
      text: "中州派 王亭之 三合派 宮氣 星情 三方四正 廟旺 安星訣 古訣",
      school: "三合派",
    },
    related: ["三合派", "三方四正", "廟旺利陷", "紫微斗數入門"],
  },
  {
    slug: "三派比較",
    urlSlug: "schools-compared",
    title: "三合、四化、飛星三派有何不同？",
    subtitle: "三大流派的核心差異與選擇",
    intro:
      "紫微斗數三大流派同源異流：三合派以宮氣與三方四正論格局高低，重星曜組合；四化派以化祿、化權、化科、化忌串連宮位，重飛化路徑；飛星派以生年四化飛星判斷動態變化，擅推時間節點。三者並非對立，理解各自的側重，才能選對入門路徑、互相參照。",
    ragQuery: {
      text: "三合派 四化派 飛星派 流派差異 宮氣 四化 飛星 比較 論命方法",
      topic: "格局",
    },
    related: ["三合派", "四化派", "飛星派"],
  },

  // ── 核心概念 ─────────────────────────────────────────────────────────────
  {
    slug: "四化",
    urlSlug: "sihua",
    title: "四化：化祿、化權、化科、化忌",
    subtitle: "紫微斗數中最重要的四顆飛化星",
    intro:
      "四化是紫微斗數中至關重要的動態機制。每年的天干（如甲、乙、丙……）決定哪四顆星曜化祿、化權、化科、化忌。化祿主福祿財源，化權主權勢掌控，化科主聲譽文名，化忌主阻礙是非。四化落入不同宮位，對該宮位的運勢產生關鍵影響。",
    ragQuery: {
      text: "四化 化祿 化權 化科 化忌 定義 含義 天干四化 宮位影響 喜忌",
      topic: "格局",
    },
    related: ["四化派", "飛星派", "大限", "流年"],
  },
  {
    slug: "大限",
    urlSlug: "major-luck",
    title: "大限：十年大運週期",
    subtitle: "人生每十年的運勢格局",
    intro:
      "大限是紫微斗數中以十年為單位的運勢週期。命主一生依次走過多個大限宮位，每個大限宮位的星曜組合與四化飛星，決定了該十年的整體運勢走向。大限與流年的疊加分析，是紫微斗數推算人生階段性變化的核心方法。",
    ragQuery: {
      text: "大限 十年大運 大限宮位 大限走向 大限流年 運勢週期 起大限",
      topic: "大限",
    },
    related: ["流年", "四化", "格局", "紫微斗數入門"],
  },
  {
    slug: "流年",
    urlSlug: "annual-luck",
    title: "流年是什麼？流年運勢的推算原理",
    subtitle: "流年宮位與大限疊加的年度分析",
    intro:
      "本文說明流年的推算原理與方法；如果你想直接看自己今年的流年吉凶，可以用命裡的 AI 排盤，依你的命盤即時分析。流年是紫微斗數中以一年為單位的短期運勢推算。每年以流年命宮（太歲宮）為起點，結合大限與本命盤進行三盤疊合分析。流年的四化飛星對大限宮位和本命宮位的衝化，往往預示著該年的重大事件與運勢變化。",
    ragQuery: {
      text: "流年 太歲 流年命宮 流年四化 年運 三盤疊合 大限流年 運勢預測",
      topic: "大限",
    },
    related: ["大限", "四化", "格局"],
    ctaLabel: "想知道你今年流年運勢如何？直接生成命盤，AI 精算流年吉凶 →",
  },
  {
    slug: "格局",
    urlSlug: "formations",
    title: "紫微斗數格局",
    subtitle: "命盤整體結構與高低層次",
    intro:
      "格局是對命盤整體結構的綜合評價，是判斷命主人生髮展層次的核心依據。好的格局通常包括：三方四正星曜強旺、主星得地、吉星拱照、四化得位等特徵。格局的高低並非決定貴賤，而是指向命主在其所處環境中的發展潛力。",
    ragQuery: {
      text: "格局 命格 富貴格局 格局高低 三方四正 吉格 兇格 論命",
      topic: "格局",
    },
    related: ["三合派", "主星總覽", "十二宮", "大限"],
  },
  {
    slug: "三方四正",
    urlSlug: "sanfang-sizheng",
    title: "三方四正",
    subtitle: "紫微斗數論命的核心結構",
    intro:
      "三方四正是紫微斗數解讀任一宮位的基本框架：以本宮為主，加上對宮（正照）與三合方的兩宮（會照），四個宮位的星曜共同影響本宮的吉凶。看命宮時，命、財、官、遷四宮的星曜組合決定格局；看任何宮位皆循此法。不懂三方四正，就無法真正論命。",
    ragQuery: {
      text: "三方四正 對宮 三合 會照 正照 本宮 命財官遷 宮位 星曜組合",
      school: "三合派",
    },
    related: ["十二宮", "三合派", "格局"],
  },
  {
    slug: "廟旺利陷",
    urlSlug: "star-brightness",
    title: "星曜廟旺利陷",
    subtitle: "星曜亮度與力量強弱",
    intro:
      "同一顆星曜落入不同宮位，力量強弱大不相同，這由「廟、旺、得地、利、平、不、陷」等亮度等級決定。星入廟旺，能盡展其吉性；星落陷地，則凶性顯露或吉力打折。判斷星曜廟旺，是評估格局高低與宮位吉凶不可略過的一步。",
    ragQuery: {
      text: "廟旺利陷 廟旺 得地 落陷 星曜亮度 星曜力量 入廟 陷地 亮度等級",
      school: "古籍經典",
    },
    related: ["主星總覽", "格局", "三方四正"],
  },
  {
    slug: "命宮身宮",
    urlSlug: "ming-shen-gong",
    title: "命宮與身宮",
    subtitle: "先天本命與後天際遇",
    intro:
      "命宮代表先天稟賦、性格與人生總格局，是整張命盤的核心；身宮則反映後天際遇與中晚年的用力方向，隨命主經營而顯。身宮落在命、夫妻、財帛、遷移、官祿、福德六宮之一，落點不同，人生的著力點與轉變也各異。命身合參，方見全貌。",
    ragQuery: {
      text: "命宮 身宮 先天 後天 本命 命身同宮 身宮落點 福德宮 性格 人生格局",
      topic: "格局",
    },
    related: ["十二宮", "紫微斗數入門", "大限"],
  },
  {
    slug: "六煞星",
    urlSlug: "six-malefic-stars",
    title: "六煞星",
    subtitle: "擎羊、陀羅、火星、鈴星、地空、地劫",
    intro:
      "六煞星指擎羊、陀羅、火星、鈴星、地空、地劫六顆煞星。煞星並非全然為害——落陷或衝命則主阻礙磨難，但與吉星同宮或格局得宜時，火鈴可助貪狼成「火貪格」暴發，羊陀亦能激發鬥志。關鍵在於落宮、廟旺與整體格局的搭配。",
    ragQuery: {
      text: "六煞星 擎羊 陀羅 火星 鈴星 地空 地劫 煞星 火貪格 鈴貪格 煞忌",
      topic: "格局",
    },
    related: ["主星總覽", "格局", "健康"],
  },
  {
    slug: "桃花星",
    urlSlug: "peach-blossom-stars",
    title: "紫微斗數桃花星",
    subtitle: "貪狼、廉貞、紅鸞、天喜與感情緣分",
    intro:
      "桃花星是紫微斗數判斷感情緣分與人際魅力的關鍵星曜，主要包括貪狼、廉貞兩顆主桃花，以及紅鸞、天喜、咸池、沐浴等副桃花。桃花星落入命宮、夫妻宮或福德宮，往往主人緣佳、異性緣旺；但桃花逢煞化忌，則需留意感情糾葛與爛桃花。",
    ragQuery: {
      text: "桃花星 貪狼 廉貞 紅鸞 天喜 咸池 沐浴 桃花 異性緣 感情 爛桃花",
      topic: "感情",
    },
    related: ["感情婚姻", "合盤", "主星總覽"],
  },

  // ── 應用主題 ─────────────────────────────────────────────────────────────
  {
    slug: "合盤",
    urlSlug: "synastry",
    title: "紫微斗數合盤",
    subtitle: "兩人命盤的緣分與匹配分析",
    intro:
      "合盤是將兩人的紫微斗數命盤進行比對，分析雙方在感情、婚姻和緣分上的契合程度。主要看：雙方夫妻宮的星曜相互影響、紅鸞天喜星的位置、生年四化的衝化關係，以及八字四柱的生克搭配。合盤並非判斷合不合，而是揭示雙方相處模式與需要注意的課題。",
    ragQuery: {
      text: "合盤 夫妻宮 緣分 紅鸞 天喜 婚姻 感情 配對 雙方命盤 生克",
      topic: "感情",
    },
    related: ["感情婚姻", "格局", "流年"],
  },
  {
    slug: "感情婚姻",
    urlSlug: "love-marriage",
    title: "紫微斗數看感情與婚姻",
    subtitle: "夫妻宮星曜與感情運勢",
    intro:
      "紫微斗數中，夫妻宮是解讀感情與婚姻的主宮，配合福德宮（內心感情觀）與子女宮（互動模式）分析。夫妻宮的主星性質決定了伴侶的特質，四化飛入夫妻宮則影響感情運勢的動態變化。桃花星（貪狼、廉貞、紅鸞、天喜）亦是判斷感情運的重要參考。",
    ragQuery: {
      text: "夫妻宮 感情 婚姻 桃花 貪狼 廉貞 紅鸞 天喜 化忌 感情運 伴侶特質",
      topic: "感情",
    },
    related: ["合盤", "格局", "大限"],
  },
  {
    slug: "事業財運",
    urlSlug: "career-wealth",
    title: "紫微斗數看事業與財運",
    subtitle: "官祿宮與財帛宮的命理解讀",
    intro:
      "官祿宮與財帛宮是紫微斗數中解讀事業財運的核心宮位。官祿宮反映職業發展方向與成就高低；財帛宮揭示財富格局與賺錢方式。化祿飛入財帛宮主進財，化忌飛入則代表破財隱患。結合大限流年的四化分析，可推算事業財運的最佳時機。",
    ragQuery: {
      text: "官祿宮 財帛宮 事業 財運 化祿 進財 破財 事業格局 武曲 太陰 賺錢 理財",
      topic: "事業",
    },
    related: ["格局", "大限", "四化"],
  },
  {
    slug: "健康",
    urlSlug: "health",
    title: "紫微斗數看健康",
    subtitle: "疾厄宮與身體運勢",
    intro:
      "疾厄宮是紫微斗數中專司健康的宮位，反映命主的體質強弱、易患疾病型別與身體運勢。化忌飛入疾厄宮或疾厄宮化忌外飛，往往是健康需要注意的訊號。主星的五行屬性與疾厄宮的互動，也可對應身體的特定部位。",
    ragQuery: {
      text: "疾厄宮 健康 體質 五行 化忌 疾病 身體 抗壓 疾厄 健康運",
      topic: "健康",
    },
    related: ["格局", "大限", "流年"],
  },
  {
    slug: "貴人運",
    urlSlug: "nobility-luck",
    title: "紫微斗數看貴人運",
    subtitle: "交友宮與貴人星曜",
    intro:
      "貴人運是紫微斗數中判斷命主能否獲得外部助力的重要維度。交友宮（奴僕宮）反映朋友、同事與貴人關係；遷移宮反映外出機遇與社會形象。天魁、天鉞為貴人星，化祿飛入交友宮或遷移宮，往往帶來貴人相助的機緣。",
    ragQuery: {
      text: "貴人 交友宮 遷移宮 天魁 天鉞 化祿 貴人運 助力 機緣 外出",
      topic: "貴人",
    },
    related: ["格局", "大限", "事業財運"],
  },
  {
    slug: "紫微八字區別",
    urlSlug: "ziwei-vs-bazi",
    title: "紫微斗數與八字有什麼區別？",
    subtitle: "兩大命理體系的差異與互補",
    intro:
      "紫微斗數與八字（子平）是漢族命理的兩大體系。八字以出生年月日時的天干地支為據，論五行生克、日主旺衰與格局用神，長於推斷性格底層與大運起伏；紫微斗數以星曜落入十二宮位成盤，宮位分明、事象具體，長於逐宮細看感情、事業、財運。二者一縱一橫，互為印證，命裡兼採雙盤同參。",
    ragQuery: {
      text: "紫微斗數 八字 子平 區別 差異 五行 日主 十二宮 星曜 命理體系 互補",
      topic: "格局",
    },
    related: ["紫微斗數入門", "合盤", "格局"],
  },
] as const;

export type GuideSlug = typeof GUIDE_TOPICS[number]["slug"];

/**
 * FAQ pairs for a guide article, derived mechanically from fields that already
 * exist on every topic (title / subtitle / intro) — no per-topic authored copy.
 */
export function guideFaqItems(topic: GuideTopic): { question: string; answer: string }[] {
  // Titles that are already phrased as a question (end with "？") are used as-is;
  // otherwise build a clean question from the short topic label (`slug`), since
  // some titles embed a "？" mid-sentence and don't end with one (e.g. "流年是什麼？流年運勢的推算原理").
  const mainQuestion = topic.title.endsWith("？") ? topic.title : `${topic.slug}是什麼？`;
  return [
    { question: mainQuestion, answer: topic.intro },
    { question: `${topic.slug}的重點是什麼？`, answer: topic.subtitle },
  ];
}
