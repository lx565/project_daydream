import type { RagQuery } from "@/lib/rag";

// 十神 (Ten Gods) — the core relational vocabulary of 八字/子平 analysis.
// Each is the relationship between the day master (日主) and another stem.
export interface ShishenEntry {
  name: string;        // 十神名，如「正官」
  urlSlug: string;     // pinyin URL slug
  pair: string;        // 陰陽對，如「正官·七殺」屬同類
  title: string;
  subtitle: string;
  oneLine: string;     // 一句話定義，用於 hub 卡片
  intro: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];   // urlSlugs of related 十神
}

export const SHISHEN: ShishenEntry[] = [
  {
    name: "正官",
    urlSlug: "zhengguan",
    pair: "官殺",
    title: "正官詳解：八字裡的責任、地位與約束",
    subtitle: "克我而陰陽相異 · 代表規矩、名分與自律",
    oneLine: "克我有情，主名分、責任與自我約束。",
    intro: "正官是剋制日主、且與日主陰陽相異的十神，代表規則、責任、名分與社會地位。正官得用的人往往自律、守序、重視聲譽；但正官過旺無制，也可能變成壓力與拘束。本文講清正官的含義、喜忌、在不同十神配合下的表現，以及如何在命局中判斷它是助力還是負擔。",
    ragQuery: { text: "正官 十神 八字 日主 克我 名分 責任 官星 喜忌 格局 用神", topic: "格局" },
    related: ["qisha", "zhengyin", "shangguan"],
  },
  {
    name: "七殺",
    urlSlug: "qisha",
    pair: "官殺",
    title: "七殺詳解：壓力、魄力與翻身的力量",
    subtitle: "克我而陰陽相同 · 代表權威、壓力與開創",
    oneLine: "克我無情，主魄力、壓力與突破。",
    intro: "七殺（偏官）是剋制日主、且與日主陰陽相同的十神，力量比正官更猛。它代表壓力、競爭、魄力與開創精神。七殺有制（食神制殺、印化殺）則成大器，無制則易衝動招災。本文講清七殺的雙面性、制化之道，以及它在事業格局中扮演的關鍵角色。",
    ragQuery: { text: "七殺 偏官 十神 八字 克我無情 制殺 食神制殺 印化殺 魄力 格局", topic: "格局" },
    related: ["zhengguan", "shishen", "pianyin"],
  },
  {
    name: "正印",
    urlSlug: "zhengyin",
    pair: "印星",
    title: "正印詳解：庇護、學識與內在安全感",
    subtitle: "生我而陰陽相異 · 代表母愛、學問與靠山",
    oneLine: "生我有情，主庇護、學識與名譽。",
    intro: "正印是生扶日主、且與日主陰陽相異的十神，代表母親、師長、學問、貴人與精神庇護。正印得用的人有福氣、重涵養、易得長輩助力；但印過重則依賴、懶散、缺乏行動力。本文講清正印的含義、喜忌，以及「印多為病」與「官印相生」等關鍵格局。",
    ragQuery: { text: "正印 印星 十神 八字 生我 母愛 學問 貴人 官印相生 印多 格局", topic: "格局" },
    related: ["pianyin", "zhengguan", "zhengcai"],
  },
  {
    name: "偏印",
    urlSlug: "pianyin",
    pair: "印星",
    title: "偏印詳解：偏才、敏銳與孤高的梟神",
    subtitle: "生我而陰陽相同 · 又名梟神 · 代表偏門智慧",
    oneLine: "生我無情，主偏才、靈感與孤獨。",
    intro: "偏印（梟神）是生扶日主、且與日主陰陽相同的十神。它代表非主流的智慧、技藝、靈感與敏銳直覺，常見於研究、玄學、藝術之人。偏印逢食神為「梟印奪食」，是需要注意的組合。本文講清偏印的特質、與正印的差異，以及它何時是天賦、何時是隱患。",
    ragQuery: { text: "偏印 梟神 十神 八字 生我無情 偏才 靈感 梟印奪食 食神 格局", topic: "格局" },
    related: ["zhengyin", "shishen", "qisha"],
  },
  {
    name: "正財",
    urlSlug: "zhengcai",
    pair: "財星",
    title: "正財詳解：穩定收入、務實與持家",
    subtitle: "我克而陰陽相異 · 代表正當之財與配偶（男命）",
    oneLine: "我克有情，主正當之財、務實與家庭。",
    intro: "正財是被日主所克、且與日主陰陽相異的十神，代表通過勞動得來的正當財富、務實態度，男命中也常代表妻子。正財得用主人勤儉可靠、財源穩定；但身弱財旺則「財多身弱」，反主辛勞。本文講清正財的含義、身財平衡，以及與偏財的根本差異。",
    ragQuery: { text: "正財 財星 十神 八字 我克 正當之財 妻 財多身弱 身財平衡 格局", topic: "格局" },
    related: ["piancai", "zhengguan", "bijian"],
  },
  {
    name: "偏財",
    urlSlug: "piancai",
    pair: "財星",
    title: "偏財詳解：橫財、人緣與慷慨手腕",
    subtitle: "我克而陰陽相同 · 代表流動之財與機遇",
    oneLine: "我克無情，主橫財、人緣與商業手腕。",
    intro: "偏財是被日主所克、且與日主陰陽相同的十神，代表流動的、非固定的財富，如投資、生意、意外之財，也主慷慨大方、人緣與社交手腕。偏財得用者善於把握機會、財來財去；身弱難任則機會變風險。本文講清偏財的特質、喜忌與經商命的判斷。",
    ragQuery: { text: "偏財 財星 十神 八字 我克無情 橫財 流動財 經商 人緣 身弱 格局", topic: "格局" },
    related: ["zhengcai", "shishen", "jiecai"],
  },
  {
    name: "食神",
    urlSlug: "shishen",
    pair: "食傷",
    title: "食神詳解：才華、口福與溫和的輸出",
    subtitle: "我生而陰陽相同 · 代表才藝、表達與福氣",
    oneLine: "我生有情，主才華、口福與從容。",
    intro: "食神是日主所生、且與日主陰陽相同的十神，代表才藝、表達、享受與溫和的創造力，被視為吉神，主福氣與壽元。食神生財是經典的富貴組合；但食神逢偏印（梟印奪食）則福氣受損。本文講清食神的含義、喜忌，以及它與傷官在性格輸出上的微妙差異。",
    ragQuery: { text: "食神 食傷 十神 八字 我生 才藝 食神生財 梟印奪食 福氣 格局", topic: "格局" },
    related: ["shangguan", "piancai", "pianyin"],
  },
  {
    name: "傷官",
    urlSlug: "shangguan",
    pair: "食傷",
    title: "傷官詳解：才氣、叛逆與鋒芒畢露",
    subtitle: "我生而陰陽相異 · 代表創造力、表現欲與衝勁",
    oneLine: "我生無情，主才氣、叛逆與表現欲。",
    intro: "傷官是日主所生、且與日主陰陽相異的十神，力量比食神張揚。它代表強烈的才華、創造力、表現欲與不服管束的個性。「傷官見官」傳統視為大忌，但「傷官配印」「傷官生財」則能化才氣為成就。本文講清傷官的雙面性、關鍵配合與如何讓鋒芒成為助力。",
    ragQuery: { text: "傷官 食傷 十神 八字 我生無情 才氣 傷官見官 傷官配印 傷官生財 格局", topic: "格局" },
    related: ["shishen", "zhengguan", "zhengyin"],
  },
  {
    name: "比肩",
    urlSlug: "bijian",
    pair: "比劫",
    title: "比肩詳解：自我、獨立與同道之力",
    subtitle: "同我而陰陽相同 · 代表自尊、合作與競爭",
    oneLine: "同我同類，主獨立、自尊與幫身。",
    intro: "比肩是與日主同類、且陰陽相同的十神，代表自我、獨立、意志力與同輩、合夥人。身弱時比肩幫身得力，主有靠山、能堅持；身強時比肩過旺則「比劫奪財」，主破財、爭奪與人際摩擦。本文講清比肩的含義、身強身弱下的不同作用，以及與劫財的差異。",
    ragQuery: { text: "比肩 比劫 十神 八字 同我 獨立 幫身 比劫奪財 身強身弱 格局", topic: "格局" },
    related: ["jiecai", "zhengcai", "zhengyin"],
  },
  {
    name: "劫財",
    urlSlug: "jiecai",
    pair: "比劫",
    title: "劫財詳解：魄力、合夥與破財的雙刃",
    subtitle: "同我而陰陽相異 · 代表競爭、衝勁與得失",
    oneLine: "同我異性，主魄力、合夥與爭奪。",
    intro: "劫財是與日主同類、且陰陽相異的十神，比比肩更具進取與爭奪性。它代表魄力、行動力、合夥與競爭，也常與破財、衝動相關。身弱逢劫財幫身可成事；身強劫財旺則需財官制約，否則易因人破財。本文講清劫財的特質、喜忌，以及「羊刃駕殺」等關鍵組合。",
    ragQuery: { text: "劫財 比劫 十神 八字 同我異性 魄力 合夥 破財 羊刃駕殺 格局", topic: "格局" },
    related: ["bijian", "piancai", "qisha"],
  },
];

export function getShishen(urlSlug: string): ShishenEntry | undefined {
  return SHISHEN.find(s => s.urlSlug === urlSlug);
}
