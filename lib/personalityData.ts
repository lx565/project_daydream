// 紫微斗數 × MBTI personality crossover content.
// Two article series:
//   1. Star → MBTI  (14 articles): "天機星命宮 = INTP 嗎？"
//   2. MBTI → 紫微  (16 articles): "INTP 的紫微命盤畫像"

export interface StarMbtiEntry {
  starName: string;          // "天機"
  starSlug: string;          // "tianji" — matches MAJOR_STARS urlSlug
  slug: string;              // "tianji-mbti" — article slug
  primaryMbti: string;       // "INTP"
  primaryMbtiName: string;   // "邏輯學家"
  secondaryMbti: string;     // "ENTP"
  secondaryMbtiName: string; // "辯論家"
  coreTraits: string;        // comma-joined traits shared by star + MBTI
  brief: string;             // one-line for meta description
}

export interface MbtiEntry {
  mbtiCode: string;          // "INTP"
  mbtiName: string;          // "邏輯學家"
  slug: string;              // "intp"
  primaryStar: string;       // "天機" — most resonant star
  primaryStarSlug: string;   // "tianji"
  secondaryStars: string[];  // ["巨門"] — secondary resonances
  mbtiDescription: string;   // brief MBTI archetype description (Chinese)
  brief: string;             // one-line for meta
}

// ── Star → MBTI (14 entries, one per 命宮主星) ─────────────────────────────

export const STAR_MBTI_LIST: StarMbtiEntry[] = [
  {
    starName: "紫微", starSlug: "ziwei", slug: "ziwei-mbti",
    primaryMbti: "ENTJ", primaryMbtiName: "指揮官",
    secondaryMbti: "INTJ", secondaryMbtiName: "建築師",
    coreTraits: "領導力強、戰略思維、掌控欲、完美主義、自我要求極高",
    brief: "紫微星命宮與MBTI指揮官/建築師型高度重合——帝王之星的領導氣質與ENTJ/INTJ的戰略本能，一東一西，異曲同工。",
  },
  {
    starName: "天機", starSlug: "tianji", slug: "tianji-mbti",
    primaryMbti: "INTP", primaryMbtiName: "邏輯學家",
    secondaryMbti: "ENTP", secondaryMbtiName: "辯論家",
    coreTraits: "分析型、善謀劃、機變靈活、多思多智、好奇心強",
    brief: "天機星的多謀善變與INTP/ENTP的思維跳躍驚人吻合——紫微斗數的智慧之星，遇上西方人格學的邏輯學家。",
  },
  {
    starName: "太陽", starSlug: "taiyang", slug: "taiyang-mbti",
    primaryMbti: "ENFJ", primaryMbtiName: "主人公",
    secondaryMbti: "INFJ", secondaryMbtiName: "提倡者",
    coreTraits: "利他主義、影響力強、光明磊落、重情義、渴望被認可",
    brief: "太陽星的慷慨熱情與ENFJ主人公型如出一轍——光明之星的奉獻精神，映照西方人格學中最具感召力的型別。",
  },
  {
    starName: "武曲", starSlug: "wuqu", slug: "wuqu-mbti",
    primaryMbti: "ESTJ", primaryMbtiName: "總經理",
    secondaryMbti: "ISTJ", secondaryMbtiName: "物流師",
    coreTraits: "務實執行、意志力強、財務敏感、規則意識、剛毅果斷",
    brief: "武曲星的執行力與財務本能與ESTJ/ISTJ型人格高度契合——財帛之星的剛毅氣質，對應西方最具執行力的人格型別。",
  },
  {
    starName: "天同", starSlug: "tiantong", slug: "tiantong-mbti",
    primaryMbti: "ISFJ", primaryMbtiName: "守護者",
    secondaryMbti: "INFP", secondaryMbtiName: "調停者",
    coreTraits: "溫和善良、重感情、享受生活、情緒敏感、喜歡和平",
    brief: "天同星的溫柔平和與ISFJ守護者/INFP調停者型人格深度共鳴——福德之星的享樂氣質，正是西方性格學中最溫暖的型別。",
  },
  {
    starName: "廉貞", starSlug: "lianzhen", slug: "lianzhen-mbti",
    primaryMbti: "ESTP", primaryMbtiName: "企業家",
    secondaryMbti: "ISTP", secondaryMbtiName: "鑑賞家",
    coreTraits: "行動力強、競爭性強、直覺敏銳、有魅力、處事靈活",
    brief: "廉貞星的激烈與魅力，與ESTP/ISTP型人格的冒險本能高度對應——紫微斗數的囚星，折射出西方人格學最具行動力的型別。",
  },
  {
    starName: "天府", starSlug: "tianfu", slug: "tianfu-mbti",
    primaryMbti: "ESFJ", primaryMbtiName: "執政官",
    secondaryMbti: "ISFJ", secondaryMbtiName: "守護者",
    coreTraits: "穩健守成、資源管理、人情味濃、責任感強、保守務實",
    brief: "天府星的財庫守成與人情世故，與ESFJ/ISFJ型人格的穩重本能完美呼應——南斗主星的厚重底色，映照西方最重責任的人格型別。",
  },
  {
    starName: "太陰", starSlug: "taiyin", slug: "taiyin-mbti",
    primaryMbti: "INFJ", primaryMbtiName: "提倡者",
    secondaryMbti: "ISFP", secondaryMbtiName: "探險家",
    coreTraits: "細膩內斂、情感豐富、審美能力強、重內心感受、藝術氣質",
    brief: "太陰星的細膩與感性，與INFJ/ISFP型人格的內在深度高度共振——月亮之星的溫柔光芒，對應西方人格學中最具靈魂深度的型別。",
  },
  {
    starName: "貪狼", starSlug: "tanlang", slug: "tanlang-mbti",
    primaryMbti: "ENFP", primaryMbtiName: "競選者",
    secondaryMbti: "ESTP", secondaryMbtiName: "企業家",
    coreTraits: "魅力四射、多才多藝、慾望旺盛、適應性強、善於社交",
    brief: "貪狼星的桃花魅力與多欲多能，與ENFP競選者型人格的熱情活力如出一轍——慾望之星的才藝底色，映照西方最具感染力的人格型別。",
  },
  {
    starName: "巨門", starSlug: "jumen", slug: "jumen-mbti",
    primaryMbti: "INTJ", primaryMbtiName: "建築師",
    secondaryMbti: "INFJ", secondaryMbtiName: "提倡者",
    coreTraits: "思辨深刻、口才犀利、懷疑精神、追根究底、善於探索真相",
    brief: "巨門星的探究本能與懷疑精神，與INTJ/INFJ型人格的內省深度高度契合——口才之星的暗曜氣質，對應西方人格學中最具洞察力的型別。",
  },
  {
    starName: "天相", starSlug: "tianxiang", slug: "tianxiang-mbti",
    primaryMbti: "ESFJ", primaryMbtiName: "執政官",
    secondaryMbti: "ENFJ", secondaryMbtiName: "主人公",
    coreTraits: "協調能力強、人際智慧、樂於助人、重義氣、包容性強",
    brief: "天相星的印綬氣質與助人本能，與ESFJ/ENFJ型人格的和諧精神完美吻合——印星的人情味，映照西方最具協調力的人格型別。",
  },
  {
    starName: "天梁", starSlug: "tianliang", slug: "tianliang-mbti",
    primaryMbti: "INFJ", primaryMbtiName: "提倡者",
    secondaryMbti: "ENTJ", secondaryMbtiName: "指揮官",
    coreTraits: "道德感強、老成持重、廕庇他人、清高自守、化險為夷",
    brief: "天梁星的老人氣質與道德底色，與INFJ提倡者型人格的使命感深度共振——蔭星的庇護精神，對應西方人格學中最具道義感的型別。",
  },
  {
    starName: "七殺", starSlug: "qisha", slug: "qisha-mbti",
    primaryMbti: "ENTJ", primaryMbtiName: "指揮官",
    secondaryMbti: "ISTP", secondaryMbtiName: "鑑賞家",
    coreTraits: "魄力超凡、雷厲風行、孤傲獨立、突破力強、敢於冒險",
    brief: "七殺星的將軍氣質與破局本能，與ENTJ/ISTP型人格的強勢執行力高度對應——將星的凜冽氣勢，映照西方最具決斷力的人格型別。",
  },
  {
    starName: "破軍", starSlug: "pojun", slug: "pojun-mbti",
    primaryMbti: "ENTP", primaryMbtiName: "辯論家",
    secondaryMbti: "ENFP", secondaryMbtiName: "競選者",
    coreTraits: "叛逆創新、突破傳統、變動不居、創造力強、勇於革新",
    brief: "破軍星的破壞與重建精神，與ENTP/ENFP型人格的創新衝勁完美契合——耗星的開創氣質，對應西方人格學中最具變革力的型別。",
  },
];

// ── MBTI → 紫微 (16 entries) ────────────────────────────────────────────────

export const MBTI_ZIWEI_LIST: MbtiEntry[] = [
  {
    mbtiCode: "INTJ", mbtiName: "建築師", slug: "intj",
    primaryStar: "紫微", primaryStarSlug: "ziwei",
    secondaryStars: ["巨門", "天梁"],
    mbtiDescription: "獨立、戰略性強、追求系統性思維，天生的遠見者，不輕易表露情感，對低效深感不耐。",
    brief: "INTJ建築師型性格的紫微斗數命盤解讀：紫微星、巨門星與天梁星如何詮釋這種罕見的戰略型人格？",
  },
  {
    mbtiCode: "INTP", mbtiName: "邏輯學家", slug: "intp",
    primaryStar: "天機", primaryStarSlug: "tianji",
    secondaryStars: ["巨門"],
    mbtiDescription: "善於抽象思維，熱愛分析和理論建構，思維跳躍，對新奇想法充滿熱情，但執行力有時不穩。",
    brief: "INTP邏輯學家的紫微斗數命盤：天機星的多謀善變與巨門星的深度探究，如何在紫微命盤中呈現？",
  },
  {
    mbtiCode: "ENTJ", mbtiName: "指揮官", slug: "entj",
    primaryStar: "紫微", primaryStarSlug: "ziwei",
    secondaryStars: ["七殺", "天梁"],
    mbtiDescription: "天生領袖，目標明確，決策果斷，擅長整合資源推動變革，對低效零容忍，具強烈成就導向。",
    brief: "ENTJ指揮官型人格的紫微斗數解讀：紫微星與七殺星的霸氣組合，如何在命盤中展現天生領袖特質？",
  },
  {
    mbtiCode: "ENTP", mbtiName: "辯論家", slug: "entp",
    primaryStar: "天機", primaryStarSlug: "tianji",
    secondaryStars: ["破軍", "貪狼"],
    mbtiDescription: "思維活躍，善於辯證，喜歡挑戰規則，創意無限，但有時缺乏耐心完成細節工作。",
    brief: "ENTP辯論家的紫微命盤：天機星的機變與破軍星的突破精神，解讀這種充滿活力的創新型人格。",
  },
  {
    mbtiCode: "INFJ", mbtiName: "提倡者", slug: "infj",
    primaryStar: "太陽", primaryStarSlug: "taiyang",
    secondaryStars: ["太陰", "天梁", "巨門"],
    mbtiDescription: "有深刻的內在價值觀，富有同情心，追求使命感，直覺敏銳，人群中的稀有存在。",
    brief: "INFJ提倡者——最稀有的人格型別，在紫微斗數中對應太陽、太陰、天梁等具有使命感的星曜組合。",
  },
  {
    mbtiCode: "INFP", mbtiName: "調停者", slug: "infp",
    primaryStar: "天同", primaryStarSlug: "tiantong",
    secondaryStars: ["太陰"],
    mbtiDescription: "理想主義者，重視內在和諧，富有創造力，情感豐富，追求真實自我，有時過於敏感。",
    brief: "INFP調停者的紫微命盤：天同星的溫柔感性與太陰星的細膩內斂，解讀這種充滿理想氣質的人格型別。",
  },
  {
    mbtiCode: "ENFJ", mbtiName: "主人公", slug: "enfj",
    primaryStar: "太陽", primaryStarSlug: "taiyang",
    secondaryStars: ["天相", "天梁"],
    mbtiDescription: "富有感召力，善於激勵他人，關注人際和諧，以使命感驅動，天生的導師和領導者。",
    brief: "ENFJ主人公型人格與紫微斗數的對應：太陽星的光明利他與天相星的協調氣質，如何共同塑造天生的感召者？",
  },
  {
    mbtiCode: "ENFP", mbtiName: "競選者", slug: "enfp",
    primaryStar: "貪狼", primaryStarSlug: "tanlang",
    secondaryStars: ["破軍", "太陽"],
    mbtiDescription: "熱情洋溢，充滿創意，社交能力強，追求可能性而非確定性，生命力旺盛，渴望深度連線。",
    brief: "ENFP競選者型人格的紫微命盤：貪狼星的魅力與桃花，加上破軍星的突破創新，解讀最有活力的人格型別。",
  },
  {
    mbtiCode: "ISTJ", mbtiName: "物流師", slug: "istj",
    primaryStar: "武曲", primaryStarSlug: "wuqu",
    secondaryStars: ["天府"],
    mbtiDescription: "務實可靠，注重細節，遵守規則，責任感極強，是團隊中最穩定的支柱。",
    brief: "ISTJ物流師型人格的紫微斗數解讀：武曲星的執行力與天府星的穩重氣質，如何在命盤中體現這種可靠的性格型別？",
  },
  {
    mbtiCode: "ISFJ", mbtiName: "守護者", slug: "isfj",
    primaryStar: "天府", primaryStarSlug: "tianfu",
    secondaryStars: ["天同", "天相", "太陰"],
    mbtiDescription: "溫暖體貼，默默付出，重視傳統與責任，善於保護所愛之人，情感細膩且忠誠。",
    brief: "ISFJ守護者——紫微斗數中天府、天同、天相等多個星曜都與這種溫暖守護的人格高度共鳴，如何解讀？",
  },
  {
    mbtiCode: "ESTJ", mbtiName: "總經理", slug: "estj",
    primaryStar: "武曲", primaryStarSlug: "wuqu",
    secondaryStars: ["紫微", "天府"],
    mbtiDescription: "高效執行，重視秩序，善於管理和組織，直接務實，有強烈的責任心和領導慾望。",
    brief: "ESTJ總經理型人格的紫微命盤：武曲星與紫微星的雙強組合，解讀這種天生的管理者和執行者人格特質。",
  },
  {
    mbtiCode: "ESFJ", mbtiName: "執政官", slug: "esfj",
    primaryStar: "天相", primaryStarSlug: "tianxiang",
    secondaryStars: ["天府", "天同"],
    mbtiDescription: "善於協調，重視人際和諧，關心他人需求，在團隊中扮演粘合劑角色，情感細膩。",
    brief: "ESFJ執政官型人格的紫微解讀：天相星的協調助人與天府星的穩重氣質，如何共同塑造這種溫暖的社交型人格？",
  },
  {
    mbtiCode: "ISTP", mbtiName: "鑑賞家", slug: "istp",
    primaryStar: "廉貞", primaryStarSlug: "lianzhen",
    secondaryStars: ["七殺", "破軍"],
    mbtiDescription: "冷靜分析，善於動手，獨立低調，對機械和技藝有天賦，遇到問題直接解決，不喜空談。",
    brief: "ISTP鑑賞家型人格的紫微斗數命盤：廉貞星的冷靜行動力與七殺星的突破本能，解讀這種務實的技藝型人格。",
  },
  {
    mbtiCode: "ISFP", mbtiName: "探險家", slug: "isfp",
    primaryStar: "太陰", primaryStarSlug: "taiyin",
    secondaryStars: ["天同", "貪狼"],
    mbtiDescription: "敏感溫柔，具有藝術氣質，活在當下，不喜歡衝突，有獨特的審美眼光，忠於內心感受。",
    brief: "ISFP探險家型人格與紫微斗數：太陰星的細膩藝術氣質與天同星的溫柔感性，如何詮釋這種安靜的美學人格？",
  },
  {
    mbtiCode: "ESTP", mbtiName: "企業家", slug: "estp",
    primaryStar: "廉貞", primaryStarSlug: "lianzhen",
    secondaryStars: ["貪狼", "破軍"],
    mbtiDescription: "行動導向，善於抓住機會，充滿活力，直接果斷，享受冒險，是天生的實踐者。",
    brief: "ESTP企業家型人格的紫微命盤：廉貞星與貪狼星的組合，解讀這種充滿行動力與魅力的冒險型人格。",
  },
  {
    mbtiCode: "ESFP", mbtiName: "表演者", slug: "esfp",
    primaryStar: "貪狼", primaryStarSlug: "tanlang",
    secondaryStars: ["廉貞", "天同"],
    mbtiDescription: "活潑開朗，享受當下，善於娛樂他人，情感外放，熱愛生活中的一切美好，具有感染力。",
    brief: "ESFP表演者型人格與紫微斗數：貪狼星的桃花魅力與廉貞星的激情本能，解讀這種充滿活力的表演型人格。",
  },
];

// Grounding block for Star→MBTI articles
export function starMbtiGroundingBlock(entry: StarMbtiEntry): string {
  return `【紫微×MBTI 權威對照資料】
星曜：${entry.starName}星（命宮主星）
星曜性格底色：${entry.coreTraits}
主要對應MBTI型別：${entry.primaryMbti}（${entry.primaryMbtiName}）
次要對應MBTI型別：${entry.secondaryMbti}（${entry.secondaryMbtiName}）

此對照為命裡平臺獨家研究，基於：
1. 紫微斗數古籍對該星曜在命宮的性格描述
2. MBTI官方型別描述（Myers-Briggs Type Indicator權威定義）
3. 兩套系統在認知模式、行為傾向、人際風格上的交叉印證

寫作要求：以平實現代的語言，幫助讀者用"兩套語言"更立體地認識自己，不是占卜，是心理+命理的雙維度自我認知工具。`;
}

// Grounding block for MBTI→紫微 articles
export function mbtiZiweiGroundingBlock(entry: MbtiEntry): string {
  const secondaryList = entry.secondaryStars.length
    ? `次要共鳴星曜：${entry.secondaryStars.join("、")}` : "";
  return `【MBTI×紫微 權威對照資料】
MBTI型別：${entry.mbtiCode}（${entry.mbtiName}）
MBTI描述：${entry.mbtiDescription}
主要共鳴星曜：${entry.primaryStar}星
${secondaryList}

此對照為命裡平臺獨家研究，基於兩套系統在認知模式、行為傾向、人際風格上的深度交叉。
寫作要求：幫助已知自己MBTI型別的讀者，在紫微斗數中找到對應的星曜畫像，用命理視角補充西方人格學的盲區，落點是自我認知與人生策略。`;
}

// ════════════════════════════════════════════════════════════════════════════
// 紫微斗數 × 星座 (Western zodiac) crossover content.
// 重要框架：紫微主星【不是】星座、也不是行星，兩套系統毫無淵源。本系列一律以
// "原型對照 / 異曲同工"立論，絕不寫成"紫微星=獅子座"這類等同關係（那是杜撰）。
// 與 MBTI 系列同構：
//   1. 主星 → 星座 (14 篇): "紫微星命宮的性格，西方星座裡像誰？"
//   2. 星座 → 紫微 (12 篇): "白羊座的紫微命盤原型對照"
// ════════════════════════════════════════════════════════════════════════════

export interface StarZodiacEntry {
  starName: string;            // "紫微"
  starSlug: string;            // "ziwei" — matches MAJOR_STARS urlSlug
  slug: string;                // "ziwei-baiyang" — article slug (星pinyin-座pinyin)
  primaryZodiac: string;       // "獅子座"
  primaryZodiacSlug: string;   // "shizi"
  secondaryZodiac: string;     // "白羊座"
  secondaryZodiacSlug: string; // "baiyang"
  coreTraits: string;          // comma-joined traits the star & sign archetypes share
  brief: string;               // one-line for meta description
}

export interface ZodiacZiweiEntry {
  zodiacName: string;          // "白羊座"
  zodiacSlug: string;          // "baiyang"
  slug: string;                // "baiyang" — article slug
  primaryStar: string;         // "七殺" — most archetype-resonant star
  primaryStarSlug: string;     // "qisha"
  secondaryStars: string[];    // ["破軍", "廉貞"] — secondary resonances
  zodiacDescription: string;   // brief zodiac archetype description (Chinese)
  brief: string;               // one-line for meta
}

// ── 主星 → 星座 (14 entries, one per 命宮主星; reuses MBTI list's 14 主星) ──────

export const STAR_ZODIAC_LIST: StarZodiacEntry[] = [
  {
    starName: "紫微", starSlug: "ziwei", slug: "ziwei-shizi",
    primaryZodiac: "獅子座", primaryZodiacSlug: "shizi",
    secondaryZodiac: "摩羯座", secondaryZodiacSlug: "mojie",
    coreTraits: "尊貴氣場、領導欲、好面子、掌控全域性、天生王者氣質",
    brief: "紫微星的帝王氣質，與獅子座的王者光芒原型相通——一東一西，異曲同工。注意：這是原型對照，不是說紫微星就是獅子座。",
  },
  {
    starName: "天機", starSlug: "tianji", slug: "tianji-shuangzi",
    primaryZodiac: "雙子座", primaryZodiacSlug: "shuangzi",
    secondaryZodiac: "處女座", secondaryZodiacSlug: "chunv",
    coreTraits: "機變靈活、多思善謀、好奇心強、思維跳躍、資訊敏感",
    brief: "天機星的多謀善變，與雙子座的機敏多變在原型上呼應——兩套不相干的系統，卻描摹出相似的聰明底色。",
  },
  {
    starName: "太陽", starSlug: "taiyang", slug: "taiyang-shizi",
    primaryZodiac: "獅子座", primaryZodiacSlug: "shizi",
    secondaryZodiac: "射手座", secondaryZodiacSlug: "sheshou",
    coreTraits: "光明磊落、慷慨熱情、影響力強、利他奉獻、渴望被看見",
    brief: "太陽星的光明與奉獻，與獅子座的熱力四射原型相映——以「光」為名的兩種氣質，異曲同工。",
  },
  {
    starName: "武曲", starSlug: "wuqu", slug: "wuqu-mojie",
    primaryZodiac: "摩羯座", primaryZodiacSlug: "mojie",
    secondaryZodiac: "金牛座", secondaryZodiacSlug: "jinniu",
    coreTraits: "務實堅毅、意志力強、財務敏感、自律剛硬、目標導向",
    brief: "武曲星的剛毅務實與理財本能，與摩羯座的堅韌自律原型高度共鳴——東西兩套語言，講的是同一種「硬漢」底色。",
  },
  {
    starName: "天同", starSlug: "tiantong", slug: "tiantong-juxie",
    primaryZodiac: "巨蟹座", primaryZodiacSlug: "juxie",
    secondaryZodiac: "雙魚座", secondaryZodiacSlug: "shuangyu",
    coreTraits: "溫和善良、重感情、享受生活、情緒柔軟、渴望安穩",
    brief: "天同星的溫柔安逸，與巨蟹座的戀家柔軟原型相通——福德之星映照西方最顧家的星座，異曲同工。",
  },
  {
    starName: "廉貞", starSlug: "lianzhen", slug: "lianzhen-tianxie",
    primaryZodiac: "天蠍座", primaryZodiacSlug: "tianxie",
    secondaryZodiac: "白羊座", secondaryZodiacSlug: "baiyang",
    coreTraits: "情感濃烈、魅力深沉、掌控欲強、愛憎分明、不輕易示人",
    brief: "廉貞星的次桃花與暗藏的激烈，與天蠍座的深沉魅力原型呼應——兩套系統，同樣寫出一種「水面下的火」。",
  },
  {
    starName: "天府", starSlug: "tianfu", slug: "tianfu-jinniu",
    primaryZodiac: "金牛座", primaryZodiacSlug: "jinniu",
    secondaryZodiac: "處女座", secondaryZodiacSlug: "chunv",
    coreTraits: "穩健守成、資源管理、務實保守、重安全感、厚重可靠",
    brief: "天府星的財庫守成與厚重，與金牛座的踏實守財原型相映——南斗主星對照西方最穩的星座，異曲同工。",
  },
  {
    starName: "太陰", starSlug: "taiyin", slug: "taiyin-juxie",
    primaryZodiac: "巨蟹座", primaryZodiacSlug: "juxie",
    secondaryZodiac: "雙魚座", secondaryZodiacSlug: "shuangyu",
    coreTraits: "細膩內斂、情感豐富、審美出眾、重內心感受、溫柔守護",
    brief: "太陰星的細膩感性，與巨蟹座的月相柔情原型相通——同以「月」為意象的兩種氣質，跨文化卻呼應。",
  },
  {
    starName: "貪狼", starSlug: "tanlang", slug: "tanlang-sheshou",
    primaryZodiac: "射手座", primaryZodiacSlug: "sheshou",
    secondaryZodiac: "雙子座", secondaryZodiacSlug: "shuangzi",
    coreTraits: "魅力四射、慾望旺盛、多才多藝、愛自由、善於社交",
    brief: "貪狼星的桃花與多欲多能，與射手座的奔放貪玩原型呼應——慾望之星映照西方最愛自由的星座，異曲同工。",
  },
  {
    starName: "巨門", starSlug: "jumen", slug: "jumen-tianxie",
    primaryZodiac: "天蠍座", primaryZodiacSlug: "tianxie",
    secondaryZodiac: "處女座", secondaryZodiacSlug: "chunv",
    coreTraits: "追根究底、口才犀利、懷疑精神、洞察人心、深藏不露",
    brief: "巨門星的探究與懷疑，與天蠍座的洞察深沉原型相映——暗曜的「挖真相」本能，跨文化也對應得上。",
  },
  {
    starName: "天相", starSlug: "tianxiang", slug: "tianxiang-tiancheng",
    primaryZodiac: "天秤座", primaryZodiacSlug: "tiancheng",
    secondaryZodiac: "巨蟹座", secondaryZodiacSlug: "juxie",
    coreTraits: "協調和諧、人際智慧、重義氣、講究分寸、樂於助人",
    brief: "天相星的印綬氣質與協調本能，與天秤座的平衡和諧原型高度共鳴——講「權衡分寸」的兩套系統，異曲同工。",
  },
  {
    starName: "天梁", starSlug: "tianliang", slug: "tianliang-mojie",
    primaryZodiac: "摩羯座", primaryZodiacSlug: "mojie",
    secondaryZodiac: "處女座", secondaryZodiacSlug: "chunv",
    coreTraits: "老成持重、道德感強、廕庇他人、清高自守、有長者風範",
    brief: "天梁星的老人星氣質與道義感，與摩羯座的沉穩擔當原型相通——「老靈魂」的兩種說法，跨文化卻一致。",
  },
  {
    starName: "七殺", starSlug: "qisha", slug: "qisha-baiyang",
    primaryZodiac: "白羊座", primaryZodiacSlug: "baiyang",
    secondaryZodiac: "天蠍座", secondaryZodiacSlug: "tianxie",
    coreTraits: "魄力超凡、雷厲風行、孤傲獨立、衝勁十足、敢打敢拼",
    brief: "七殺星的將軍衝勁，與白羊座的開拓莽撞原型高度呼應——一往無前的兩種氣質，東西方異曲同工。",
  },
  {
    starName: "破軍", starSlug: "pojun", slug: "pojun-shuiping",
    primaryZodiac: "水瓶座", primaryZodiacSlug: "shuiping",
    secondaryZodiac: "白羊座", secondaryZodiacSlug: "baiyang",
    coreTraits: "叛逆創新、突破傳統、特立獨行、求變求新、不守舊規",
    brief: "破軍星的破舊立新，與水瓶座的離經叛道原型相映——都愛「砸掉重來」的兩種氣質，跨文化卻共振。",
  },
];

// ── 星座 → 紫微 (12 entries, one per Western sign) ───────────────────────────

export const ZODIAC_ZIWEI_LIST: ZodiacZiweiEntry[] = [
  {
    zodiacName: "白羊座", zodiacSlug: "baiyang", slug: "baiyang",
    primaryStar: "七殺", primaryStarSlug: "qisha",
    secondaryStars: ["破軍", "廉貞"],
    zodiacDescription: "火象開創星座，衝勁十足、行動派、直來直往，喜歡做第一個，缺乏耐心但敢闖敢拼。",
    brief: "白羊座的開拓衝勁，在紫微斗數裡像哪顆星？七殺的將軍氣與破軍的破局力，給你一個原型對照（非等同）。",
  },
  {
    zodiacName: "金牛座", zodiacSlug: "jinniu", slug: "jinniu",
    primaryStar: "天府", primaryStarSlug: "tianfu",
    secondaryStars: ["武曲", "太陰"],
    zodiacDescription: "土象固定星座，踏實穩重、重物質安全感、愛享受，性子慢熱而固執，對金錢與品質敏感。",
    brief: "金牛座的踏實守財，在紫微斗數裡像哪顆星？天府的財庫與武曲的理財本能，原型對照解讀。",
  },
  {
    zodiacName: "雙子座", zodiacSlug: "shuangzi", slug: "shuangzi",
    primaryStar: "天機", primaryStarSlug: "tianji",
    secondaryStars: ["貪狼", "巨門"],
    zodiacDescription: "風象變動星座，機敏多變、好奇心旺盛、溝通能力強，思維跳躍但容易三分鐘熱度。",
    brief: "雙子座的機敏多變，在紫微斗數裡像哪顆星？天機的多謀與貪狼的多才，給你一個原型對照。",
  },
  {
    zodiacName: "巨蟹座", zodiacSlug: "juxie", slug: "juxie",
    primaryStar: "太陰", primaryStarSlug: "taiyin",
    secondaryStars: ["天同", "天相"],
    zodiacDescription: "水象開創星座，戀家顧家、情感細膩、保護欲強，敏感念舊，重視安全感與歸屬。",
    brief: "巨蟹座的戀家柔情，在紫微斗數裡像哪顆星？太陰的月相溫柔與天同的安逸，原型對照解讀。",
  },
  {
    zodiacName: "獅子座", zodiacSlug: "shizi", slug: "shizi",
    primaryStar: "紫微", primaryStarSlug: "ziwei",
    secondaryStars: ["太陽", "廉貞"],
    zodiacDescription: "火象固定星座，自信大氣、愛面子、有領導欲與表現欲，慷慨重情，渴望舞臺與掌聲。",
    brief: "獅子座的王者光芒，在紫微斗數裡像哪顆星？紫微的帝王氣與太陽的熱力，給你一個原型對照（非等同）。",
  },
  {
    zodiacName: "處女座", zodiacSlug: "chunv", slug: "chunv",
    primaryStar: "天機", primaryStarSlug: "tianji",
    secondaryStars: ["巨門", "天梁"],
    zodiacDescription: "土象變動星座，細緻嚴謹、追求完美、善分析、重秩序，對細節敏感但容易焦慮挑剔。",
    brief: "處女座的嚴謹挑剔，在紫微斗數裡像哪顆星？天機的精算與巨門的追根究底，原型對照解讀。",
  },
  {
    zodiacName: "天秤座", zodiacSlug: "tiancheng", slug: "tiancheng",
    primaryStar: "天相", primaryStarSlug: "tianxiang",
    secondaryStars: ["天同", "貪狼"],
    zodiacDescription: "風象開創星座，重和諧與平衡、講分寸、有審美與社交天賦，但常在選擇中猶豫不決。",
    brief: "天秤座的權衡和諧，在紫微斗數裡像哪顆星？天相的協調印綬之氣，給你一個原型對照。",
  },
  {
    zodiacName: "天蠍座", zodiacSlug: "tianxie", slug: "tianxie",
    primaryStar: "廉貞", primaryStarSlug: "lianzhen",
    secondaryStars: ["巨門", "七殺"],
    zodiacDescription: "水象固定星座，情感濃烈、洞察力強、愛恨分明、掌控欲強，神秘深沉，不輕易交付信任。",
    brief: "天蠍座的深沉魅力，在紫微斗數裡像哪顆星？廉貞的闇火與巨門的洞察，原型對照解讀。",
  },
  {
    zodiacName: "射手座", zodiacSlug: "sheshou", slug: "sheshou",
    primaryStar: "貪狼", primaryStarSlug: "tanlang",
    secondaryStars: ["太陽", "天機"],
    zodiacDescription: "火象變動星座，熱愛自由、樂觀奔放、好奇貪玩、追求意義與遠方，但容易喜新厭舊。",
    brief: "射手座的奔放自由，在紫微斗數裡像哪顆星？貪狼的多欲多能與太陽的熱力，給你一個原型對照。",
  },
  {
    zodiacName: "摩羯座", zodiacSlug: "mojie", slug: "mojie",
    primaryStar: "武曲", primaryStarSlug: "wuqu",
    secondaryStars: ["天梁", "紫微"],
    zodiacDescription: "土象開創星座，堅韌自律、目標明確、務實有耐心、責任感強，但易壓抑情感、過度嚴苛。",
    brief: "摩羯座的堅韌擔當，在紫微斗數裡像哪顆星？武曲的剛毅與天梁的沉穩，原型對照解讀。",
  },
  {
    zodiacName: "水瓶座", zodiacSlug: "shuiping", slug: "shuiping",
    primaryStar: "破軍", primaryStarSlug: "pojun",
    secondaryStars: ["天機", "貪狼"],
    zodiacDescription: "風象固定星座，特立獨行、理性疏離、愛創新與自由，重視思想獨立，常有不按常理的想法。",
    brief: "水瓶座的離經叛道，在紫微斗數裡像哪顆星？破軍的破舊立新與天機的奇思，給你一個原型對照。",
  },
  {
    zodiacName: "雙魚座", zodiacSlug: "shuangyu", slug: "shuangyu",
    primaryStar: "天同", primaryStarSlug: "tiantong",
    secondaryStars: ["太陰", "天梁"],
    zodiacDescription: "水象變動星座，溫柔多情、富同理心與想像力、易感性強，浪漫夢幻但容易逃避現實。",
    brief: "雙魚座的溫柔夢幻，在紫微斗數裡像哪顆星？天同的柔軟與太陰的感性，原型對照解讀。",
  },
];

// Grounding block for 主星→星座 articles.
export function starZodiacGroundingBlock(entry: StarZodiacEntry): string {
  return `【紫微×星座 原型對照資料】
星曜：${entry.starName}星（命宮主星）
星曜性格底色：${entry.coreTraits}
主要對照星座：${entry.primaryZodiac}
次要對照星座：${entry.secondaryZodiac}

【最重要的邊界（務必貫穿全文）】
紫微斗數的主星與西方星座【沒有任何天文或歷史淵源】，二者是兩套互不相干的符號系統。
本文是"原型對照 / 異曲同工"——比較兩套系統在【性格原型】上的相似之處，幫讀者用熟悉的星座去理解陌生的紫微主星。
絕對不能寫成"${entry.starName}星=${entry.primaryZodiac}""${entry.starName}星就是${entry.primaryZodiac}"這類等同句，那是事實錯誤。
正確的說法是：${entry.starName}星的某某氣質，"很像 / 讓人聯想到 / 在原型上呼應"${entry.primaryZodiac}。

此對照為命裡平臺獨家研究，基於：
1. 紫微斗數古籍對該星曜在命宮的性格描述
2. 西方占星對該星座的性格原型描述（僅取通行的性格刻畫，不涉及天文）
3. 兩套系統在性格原型上的相似與差異

寫作要求：平實現代的簡體中文，幫讀者用"兩套語言"立體認識自己；不是占卜，是跨文化的性格類比工具。`;
}

// Grounding block for 星座→紫微 articles.
export function zodiacZiweiGroundingBlock(entry: ZodiacZiweiEntry): string {
  const secondaryList = entry.secondaryStars.length
    ? `次要共鳴星曜：${entry.secondaryStars.join("、")}` : "";
  return `【星座×紫微 原型對照資料】
星座：${entry.zodiacName}
星座性格原型：${entry.zodiacDescription}
主要共鳴星曜：${entry.primaryStar}星
${secondaryList}

【最重要的邊界（務必貫穿全文）】
西方星座與紫微斗數主星【沒有任何天文或歷史淵源】，是兩套互不相干的系統。
本文是"原型對照"——幫已經熟悉自己星座的讀者，在紫微斗數裡找到性格原型相近的星曜，並非說"${entry.zodiacName}=${entry.primaryStar}星"。
正確表述：${entry.zodiacName}的某某特質，"在原型上接近 / 讓人聯想到"${entry.primaryStar}星；並要點明兩者的差異，避免生硬等同。

此對照為命裡平臺獨家研究，基於兩套系統在性格原型、行為傾向、人際風格上的相似與差異。
寫作要求：幫已知自己星座的讀者，在紫微斗數中找到對應的星曜畫像，用命理視角補充星座的盲區，落點是自我認知與人生策略。`;
}

// Simple lookup: Chinese star name → primary MBTI code
// Used by the in-app MbtiCard component.
export const STAR_TO_MBTI: Record<string, { code: string; name: string; slug: string }> = {
  紫微: { code: "ENTJ", name: "指揮官", slug: "ziwei-mbti" },
  天機: { code: "INTP", name: "邏輯學家", slug: "tianji-mbti" },
  太陽: { code: "ENFJ", name: "主人公", slug: "taiyang-mbti" },
  武曲: { code: "ESTJ", name: "總經理", slug: "wuqu-mbti" },
  天同: { code: "ISFJ", name: "守護者", slug: "tiantong-mbti" },
  廉貞: { code: "ESTP", name: "企業家", slug: "lianzhen-mbti" },
  天府: { code: "ESFJ", name: "執政官", slug: "tianfu-mbti" },
  太陰: { code: "INFJ", name: "提倡者", slug: "taiyin-mbti" },
  貪狼: { code: "ENFP", name: "競選者", slug: "tanlang-mbti" },
  巨門: { code: "INTJ", name: "建築師", slug: "jumen-mbti" },
  天相: { code: "ESFJ", name: "執政官", slug: "tianxiang-mbti" },
  天梁: { code: "INFJ", name: "提倡者", slug: "tianliang-mbti" },
  七殺: { code: "ENTJ", name: "指揮官", slug: "qisha-mbti" },
  破軍: { code: "ENTP", name: "辯論家", slug: "pojun-mbti" },
};
