import type { RagQuery } from "@/lib/rag";

export interface QingganEntry {
  name: string;
  urlSlug: string;
  category: "桃花運勢" | "紫微感情" | "八字感情" | "緣分人生";
  title: string;
  subtitle: string;
  oneLine: string;
  intro: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];
}

export const QINGGAN: QingganEntry[] = [
  {
    name: "桃花運",
    urlSlug: "taohua-yun",
    category: "桃花運勢",
    title: "桃花運來了是什麼感覺？命理怎麼看桃花",
    subtitle: "紫微斗數 · 八字 雙視角 · 貴人還是爛桃花？",
    oneLine: "命理裡的桃花不只是愛情——也是人緣、魅力與時機。",
    intro: "\"桃花運\"是命理裡最被誤解的概念之一。很多人以為桃花就是豔遇，其實它指的是一種吸引力、人緣與情感流動的能量。紫微斗數裡的天姚、貪狼，八字裡的桃花煞、咸池，各有側重。本文用雙系統視角說清楚：桃花運是什麼，怎麼在命盤裡找到它，以及它來了的時候你會有什麼感受。",
    ragQuery: { text: "桃花 天姚 貪狼 桃花煞 咸池 人緣 感情 魅力 流年桃花 大運桃花", topic: "格局" },
    related: ["tanlang-taohua", "fuqi-gong-kongwang", "yuanfen-mingzhong"],
  },
  {
    name: "緣分天註定",
    urlSlug: "yuanfen-mingzhong",
    category: "緣分人生",
    title: "緣分是天註定的嗎？命理的回答",
    subtitle: "夫妻宮 · 命中註定 · 感情的自由意志",
    oneLine: "命盤給出的是機率與時機，而不是劇本。",
    intro: "\"我們是不是命中註定？\"這是人們問命理師最多的問題之一。命理確實能看出一個人感情的整體模式——是容易遇到人還是容易錯過，是早婚還是晚婚，是一帆風順還是多磨。但它不能告訴你\"那個人是誰\"。本文講清命理能看什麼、不能看什麼，以及夫妻宮、婚姻時間點背後的邏輯。",
    ragQuery: { text: "夫妻宮 緣分 婚姻 命中註定 感情 桃花 天機 流年夫妻 婚期 貴人", topic: "格局" },
    related: ["taohua-yun", "fuqi-gong-kongwang", "tanlang-taohua"],
  },
  {
    name: "桃花煞",
    urlSlug: "taohua-sha",
    category: "八字感情",
    title: "桃花煞是什麼？八字裡的桃花與感情運",
    subtitle: "八字神煞 · 日支起桃花 · 好桃花與爛桃花的區別",
    oneLine: "桃花煞是八字裡最常見的感情神煞，但它到底是福還是禍，要看配合。",
    intro: "桃花煞（又稱沐浴、咸池）是八字裡專門代表感情、異性緣與魅力的神煞，由出生日支（地支）決定。有桃花煞的人通常有親和力、異性緣好；但桃花入兇（遇到劫煞、亡神、咸池等）則可能變成感情複雜甚至\"爛桃花\"。本文講清桃花煞的演算法、好壞判斷，以及流年桃花引動時會發生什麼。",
    ragQuery: { text: "桃花煞 八字 神煞 日支 沐浴 咸池 感情 異性緣 流年桃花 劫煞 亡神 爛桃花", topic: "格局" },
    related: ["taohua-yun", "tanlang-taohua", "fuqi-gong-kongwang"],
  },
  {
    name: "夫妻宮空亡",
    urlSlug: "fuqi-gong-kongwang",
    category: "紫微感情",
    title: "夫妻宮空亡是什麼意思？紫微斗數感情解析",
    subtitle: "紫微斗數 · 夫妻宮 · 空宮 · 感情的課題與應對",
    oneLine: "夫妻宮空亡不是感情無緣，而是感情模式有特定的課題要過。",
    intro: "\"夫妻宮空亡\"是紫微斗數裡讓人最擔心的幾個說法之一。很多人看到自己夫妻宮是空宮就開始焦慮。其實夫妻宮空亡並不等於註定單身或婚姻不幸——它更多指的是在感情裡容易\"等待\"、\"錯過\"，或者對感情有某種理想化的期待。本文講清楚空亡的真實含義，以及如何在命盤中綜合看待感情運。",
    ragQuery: { text: "夫妻宮 空宮 空亡 感情 婚姻 紫微斗數 對宮借星 夫妻 感情課題 天馬 太陰 天同", topic: "格局" },
    related: ["yuanfen-mingzhong", "taohua-yun", "tanlang-taohua"],
  },
  {
    name: "貪狼感情",
    urlSlug: "tanlang-taohua",
    category: "紫微感情",
    title: "貪狼坐命的感情世界：魅力、慾望與專一的拉鋸",
    subtitle: "紫微斗數 · 貪狼星 · 桃花主星 · 感情多彩與深情之間",
    oneLine: "貪狼是紫微斗數第一桃花星，感情豐富不等於薄情。",
    intro: "貪狼是紫微斗數十四主星裡公認的\"桃花星\"，魅力四射、慾望旺盛，在感情上往往吸引力強、異性緣旺。但貪狼坐命的人，感情世界遠比\"花心\"二字複雜——他們可以非常深情，也可以陷入感情的拉鋸和糾纏。本文講清貪狼在感情上的真實特質，在不同宮位、不同四化下的表現，以及如何經營感情。",
    ragQuery: { text: "貪狼 感情 桃花 夫妻 天姚 化忌 化祿 魅力 異性緣 紫微斗數 桃花星 命宮", topic: "格局" },
    related: ["taohua-yun", "fuqi-gong-kongwang", "yuanfen-mingzhong"],
  },

  // ── Phase 2 ────────────────────────────────────────────────────────────────
  {
    name: "紅鸞天喜",
    urlSlug: "hong-luan-tianxi",
    category: "桃花運勢",
    title: "紅鸞天喜是什麼意思？流年催婚的兩顆星",
    subtitle: "紫微斗數神煞 · 紅鸞天喜 · 感情與婚姻的吉期訊號",
    oneLine: "紅鸞天喜被稱為紫微斗數裡最強的婚姻催動訊號，流年逢之感情容易有進展。",
    intro: "紅鸞與天喜是紫微斗數裡的一對神煞，常被命理師視為感情、婚姻運動的訊號星。很多人在流年遇到紅鸞天喜的年份，感情會有明顯推進——相識、求婚或結婚都比平時更容易發生。本文講清紅鸞天喜的安星方法、在不同宮位的含義，以及如何判斷感情時機。",
    ragQuery: { text: "紅鸞 天喜 神煞 婚姻 感情 流年 催婚 夫妻宮 桃花 紫微斗數 婚期", topic: "格局" },
    related: ["taohua-yun", "hong-luan-tianxi", "liunian-fuqi-gong", "yuanfen-mingzhong"],
  },
  {
    name: "天姚星感情",
    urlSlug: "tianyao-xing",
    category: "桃花運勢",
    title: "天姚星是什麼？紫微斗數第一魅力星",
    subtitle: "紫微斗數輔星 · 天姚 · 桃花、風流與感情磁場",
    oneLine: "天姚星是紫微斗數裡公認的桃花輔星，代表魅力、風情與感情的主動吸引力。",
    intro: "天姚是紫微斗數輔星中最具桃花色彩的一顆，代表個人魅力、風情與感情的主動吸引力。命宮或夫妻宮有天姚的人，往往在感情上更有吸引力，但也容易在感情上多一點複雜性。本文講清天姚星的星性、在不同宮位的表現，以及流年天姚引動時會發生什麼。",
    ragQuery: { text: "天姚 桃花 感情 魅力 風情 夫妻宮 命宮 輔星 流年天姚 天姚星性", topic: "格局" },
    related: ["taohua-yun", "tanlang-taohua", "hong-luan-tianxi"],
  },
  {
    name: "咸池桃花",
    urlSlug: "xianchi",
    category: "八字感情",
    title: "咸池是什麼？八字裡最強的桃花神煞",
    subtitle: "八字神煞 · 咸池 · 異性磁場與感情的雙刃劍",
    oneLine: "咸池是八字裡桃花力量最強的神煞，代表強烈的異性吸引力——是福是禍取決於配合。",
    intro: "咸池（又稱敗地、桃花）是八字神煞中桃花力量最強的一個，由出生年支或日支起算。命局中有咸池的人，通常異性緣很旺、魅力突出；但咸池遇到凶神（劫煞、亡神），感情容易複雜甚至出現感情消耗與糾紛。本文講清咸池的演算法、好壞判斷，以及與八字桃花煞的區別。",
    ragQuery: { text: "咸池 桃花煞 八字 神煞 異性緣 感情 劫煞 亡神 流年咸池 沐浴 桃花 年支日支", topic: "格局" },
    related: ["taohua-sha", "taohua-yun", "bazi-hunyin"],
  },
  {
    name: "流年夫妻宮",
    urlSlug: "liunian-fuqi-gong",
    category: "紫微感情",
    title: "流年夫妻宮化忌或化祿，感情會怎樣？",
    subtitle: "紫微斗數流年 · 夫妻宮四化 · 感情年份判斷",
    oneLine: "流年夫妻宮的四化，是判斷當年感情運最直接的切入點之一。",
    intro: "在紫微斗數裡，流年夫妻宮的四化變化，是判斷當年感情運勢的重要訊號。化祿入流年夫妻宮，感情往往有順遂的進展；化忌則要留意感情中的波折與摩擦。但流年看感情需要結合三方四正與本命格局，單看一個宮位的四化往往只是線索。本文講清流年夫妻宮四化的判斷邏輯與實際含義。",
    ragQuery: { text: "流年夫妻宮 化忌 化祿 化權 化科 感情 婚姻 流年 三方四正 夫妻宮 四化 紫微斗數", topic: "格局" },
    related: ["fuqi-gong-kongwang", "hong-luan-tianxi", "yuanfen-mingzhong"],
  },
  {
    name: "傷官感情",
    urlSlug: "shangguan-qinggan",
    category: "八字感情",
    title: "八字傷官強，感情為什麼容易出問題？",
    subtitle: "八字十神 · 傷官 · 感情是非與婚姻挑戰",
    oneLine: "傷官是八字裡最聰明的十神，但在感情上容易帶來是非與不穩定——原因藏在日主的能量結構裡。",
    intro: "在八字裡，傷官是一個矛盾的十神：它代表才華、創意與突破，但在感情和婚姻上卻常常帶來挑戰。女命傷官旺容易克官（官星在八字裡代表丈夫），男命傷官重則財星（妻星）受傷。本文用現代視角講清傷官在感情上的真實含義，以及如何在命盤裡看傷官對婚姻的影響。",
    ragQuery: { text: "傷官 感情 婚姻 八字 十神 克官 財星 妻星 女命傷官 男命傷官 大運流年 感情是非", topic: "格局" },
    related: ["taohua-sha", "bazi-hunyin", "xianchi"],
  },
  {
    name: "滾浪桃花",
    urlSlug: "gunlang-taohua",
    category: "桃花運勢",
    title: "什麼是滾浪桃花？感情氾濫的命理特徵",
    subtitle: "桃花格局 · 感情複雜 · 如何化解滾浪桃花",
    oneLine: "滾浪桃花不是豔福，而是感情能量過於分散、難以專一的格局特徵。",
    intro: "滾浪桃花是八字命理裡描述桃花過盛、感情能量過於分散的說法，指在八字中多個地支都見到桃花符號（沐浴、咸池等），加上命局中感情星（財星、官星）同時旺盛的格局。有此特徵的人，異性緣極旺，但感情容易分散、難以專一，感情路也容易複雜。本文講清滾浪桃花的判斷方式與應對。",
    ragQuery: { text: "滾浪桃花 八字 桃花 感情 沐浴 咸池 財星 官星 感情複雜 專一 流年桃花 桃花格", topic: "格局" },
    related: ["taohua-sha", "xianchi", "taohua-yun"],
  },
  {
    name: "八字婚姻",
    urlSlug: "bazi-hunyin",
    category: "八字感情",
    title: "八字怎麼看婚姻？十神、宮位與婚姻層次",
    subtitle: "八字命理 · 婚姻 · 財官星 · 日支與夫妻宮",
    oneLine: "八字看婚姻，不只是看有沒有配偶星，而是看配偶星的質量與格局。",
    intro: "八字命理看婚姻有一套完整的判斷體系：男命看財星（妻星的位置、強弱、四化），女命看官星（夫星的狀態），結合日支（配偶宮）和大運流年來判斷婚姻時機與質量。本文從十神關係、日支資訊、大運時間軸三個維度，講清楚八字婚姻判斷的核心邏輯。",
    ragQuery: { text: "八字婚姻 財星 官星 妻星 夫星 日支 配偶宮 大運 流年 婚期 十神 婚姻層次 八字命理", topic: "格局" },
    related: ["hunyin-shijian", "shangguan-qinggan", "taohua-sha"],
  },
  {
    name: "婚姻時機",
    urlSlug: "hunyin-shijian",
    category: "緣分人生",
    title: "命理怎麼看婚姻時機？何時容易遇到對的人",
    subtitle: "紫微斗數 · 八字 · 婚期預測 · 感情流年",
    oneLine: "婚姻時機不是命中註定的某一年，而是命盤裡幾個訊號疊加的時間視窗。",
    intro: "命理裡預測婚姻時機，既不是算出一個固定的年份，也不是宿命式的判斷。它是在分析一個人的命盤格局後，找出哪些年份感情訊號最密集、桃花與婚期訊號疊加最明顯的時間視窗。本文講清楚紫微斗數和八字各自判斷婚期的方法，以及哪些訊號出現時感情最容易有進展。",
    ragQuery: { text: "婚期 婚姻時機 流年 大運 紅鸞天喜 夫妻宮化祿 桃花 財星 官星 感情進展 婚姻 紫微 八字", topic: "格局" },
    related: ["hong-luan-tianxi", "bazi-hunyin", "liunian-fuqi-gong"],
  },
  {
    name: "男女緣分",
    urlSlug: "nannv-yuanfen",
    category: "緣分人生",
    title: "男女命盤怎麼看緣分深淺？合盤的正確思路",
    subtitle: "紫微斗數 · 八字 · 合盤 · 兩人緣分與相處模式",
    oneLine: "合盤不是看兩人合不合，而是看兩人的能量如何互動、哪裡是共鳴、哪裡是摩擦。",
    intro: "男女合盤是命理裡最受關注的應用之一。但合盤的目的不是給出\"合\"或\"不合\"的單一結論，而是幫助兩個人理解各自的感情模式、彼此的能量互動，以及在感情裡容易出現的課題與優勢。本文講清楚紫微斗數和八字各自的合盤視角，以及什麼樣的命盤組合容易相處、什麼地方需要格外經營。",
    ragQuery: { text: "合盤 男女緣分 夫妻宮 感情 相處 八字合婚 紫微斗數 命盤互動 緣分深淺 納音 天干地支", topic: "格局" },
    related: ["yuanfen-mingzhong", "bazi-hunyin", "hunyin-shijian"],
  },
  {
    name: "華蓋感情",
    urlSlug: "huagai-qinggan",
    category: "緣分人生",
    title: "華蓋星對感情有影響嗎？孤獨與專一的兩面",
    subtitle: "八字神煞 · 華蓋 · 感情上的孤傲與難遇知音",
    oneLine: "華蓋重的人感情裡容易孤獨，不是因為不夠好，而是因為眼界與頻率太特別。",
    intro: "華蓋是八字神煞中帶有孤傲色彩的一顆，代表智慧、才華與宗教/藝術傾向，但在感情上往往容易讓人感到孤獨或難遇知音。華蓋重的人在感情裡常常有較高的精神要求，容易被普通的感情吸引力所忽視，但一旦遇到真正的知音，卻可以非常深情專一。",
    ragQuery: { text: "華蓋 感情 孤獨 知音 八字 神煞 才華 藝術 宗教 專一 感情模式 孤傲", topic: "格局" },
    related: ["yuanfen-mingzhong", "nannv-yuanfen", "tianyao-xing"],
  },
];

export function getQinggan(urlSlug: string): QingganEntry | undefined {
  return QINGGAN.find(e => e.urlSlug === urlSlug);
}
