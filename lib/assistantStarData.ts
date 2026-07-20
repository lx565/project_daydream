// 14 assistant stars (輔星) for Ziwei Doushu.
// Unlike the 14 major stars (which have fixed branch-based 安星法 positions),
// assistant stars are positioned by birth time and thus have no fixed brightness table.
// Grounding blocks focus on nature, rules, and 四化 interactions.

export const ASSISTANT_STARS = [
  {
    name: "左輔",
    urlSlug: "zuofu",
    group: "六吉星" as const,
    type: "auspicious" as const,
    element: "土",
    brief: "輔佐貴人之星，主團隊協作、領導力與貴人助力",
    sihua: [] as string[],
  },
  {
    name: "右弼",
    urlSlug: "youbi",
    group: "六吉星" as const,
    type: "auspicious" as const,
    element: "水",
    brief: "輔弼參謀之星，主智謀協助、女性貴人與幕後支援",
    sihua: [] as string[],
  },
  {
    name: "文昌",
    urlSlug: "wenchang",
    group: "六吉星" as const,
    type: "auspicious" as const,
    element: "金",
    brief: "文才學術之星，主考運、文章能力與科甲貴氣",
    sihua: ["化忌"] as string[],
  },
  {
    name: "文曲",
    urlSlug: "wenqu",
    group: "六吉星" as const,
    type: "auspicious" as const,
    element: "水",
    brief: "藝術口才之星，主才藝、表達力與浪漫氣質",
    sihua: ["化忌"] as string[],
  },
  {
    name: "天魁",
    urlSlug: "tiankui",
    group: "六吉星" as const,
    type: "auspicious" as const,
    element: "火",
    brief: "陽貴人之星，主高層提攜、上司援助與仕途助力",
    sihua: [] as string[],
  },
  {
    name: "天鉞",
    urlSlug: "tianyue",
    group: "六吉星" as const,
    type: "auspicious" as const,
    element: "火",
    brief: "陰貴人之星，主女性貴人、暗中相助與貴氣護佑",
    sihua: [] as string[],
  },
  {
    name: "祿存",
    urlSlug: "lucun",
    group: "祿存天馬" as const,
    type: "auspicious" as const,
    element: "土",
    brief: "財祿儲積之星，主保守穩健的財富積累與官祿",
    sihua: [] as string[],
  },
  {
    name: "天馬",
    urlSlug: "tianma",
    group: "祿存天馬" as const,
    type: "auspicious" as const,
    element: "火",
    brief: "驛馬奔波之星，主動態財祿、流動奔波與變遷機遇",
    sihua: [] as string[],
  },
  {
    name: "擎羊",
    urlSlug: "qingyang",
    group: "六煞星" as const,
    type: "inauspicious" as const,
    element: "金",
    brief: "刃煞衝動之星，主剛烈競爭、意外傷損與是非爭鬥",
    sihua: [] as string[],
  },
  {
    name: "陀羅",
    urlSlug: "tuoluo",
    group: "六煞星" as const,
    type: "inauspicious" as const,
    element: "金",
    brief: "截路拖滯之星，主拖延磨蹭、暗中阻礙與反覆糾纏",
    sihua: [] as string[],
  },
  {
    name: "火星",
    urlSlug: "huoxing",
    group: "六煞星" as const,
    type: "inauspicious" as const,
    element: "火",
    brief: "急爆突發之星，主衝動暴烈、驟然變故與意外衝擊",
    sihua: [] as string[],
  },
  {
    name: "鈴星",
    urlSlug: "lingxing",
    group: "六煞星" as const,
    type: "inauspicious" as const,
    element: "火",
    brief: "暗煞延遲之星，主暗中困擾、緩慢阻滯與拖延風險",
    sihua: [] as string[],
  },
  {
    name: "地空",
    urlSlug: "dikong",
    group: "空劫" as const,
    type: "inauspicious" as const,
    element: "火",
    brief: "虛耗理想之星，主資源虛耗、理想主義與精神損失",
    sihua: [] as string[],
  },
  {
    name: "地劫",
    urlSlug: "dijie",
    group: "空劫" as const,
    type: "inauspicious" as const,
    element: "火",
    brief: "錢財受劫之星，主財帛空耗、意外損失與劫難破財",
    sihua: [] as string[],
  },
] as const;

export type AssistantStarDef = (typeof ASSISTANT_STARS)[number];

// Key interaction rules per star name — injected into AI grounding blocks
const STAR_RULES: Record<string, string[]> = {
  左輔: [
    "六吉星之一，象徵貴人援助、團隊協作與領導輔佐力",
    "與右弼同宮或對宮（左右拱照），力量大增，稱「左右夾命」或「左右同宮」，主極佳的貴人緣與團隊運",
    "單獨落宮時貴人助力仍在，但多依賴他人支援而缺獨立性",
    "不參與任何四化，但可受他宮四化飛入本宮加持",
    "與主星同宮時，提升主星的穩定性與吉性；與煞星同宮則削弱煞星破壞力",
  ],
  右弼: [
    "六吉星之一，象徵幕後參謀、智謀輔助與女性貴人援助",
    "與左輔同宮或對宮，力量大增；單獨落宮時擅長幕後操盤、智慧謀劃",
    "主女性貴人、合作伙伴與秘書助手一類的支援力量",
    "不參與任何四化，但可受他宮四化飛入本宮加持",
    "與主星同宮時發揮智謀輔助效果；落命宮多見有得力助手或依賴他人之象",
  ],
  文昌: [
    "六吉星之一，象徵文才、學術能力與科甲貴氣",
    "參與四化：可化忌（文昌化忌）。文昌化忌時考運受損、檔案出錯、學業受挫，需特別注意",
    "與文曲同宮或同處三方四正，文才與藝術雙全，稱「昌曲同宮」或「昌曲夾命」",
    "落宮時提升該宮位的文化素養、學習能力與表達精準度",
    "與天魁、天鉞同處時，貴人提攜學業或文職仕途的力量更強",
  ],
  文曲: [
    "六吉星之一，象徵藝術才華、口才與浪漫氣質",
    "參與四化：可化忌（文曲化忌）。文曲化忌時口舌是非增多、藝術才華受阻、情感糾紛易起",
    "與文昌同宮或三方相逢，稱「昌曲同宮」或「昌曲夾命」，文藝才華與學術能力兼備",
    "落宮時提升該宮位的口才、表達力、藝術審美與浪漫情調",
    "與煞星同宮時，口才轉為爭辯，藝術才華因化忌更易受損",
  ],
  天魁: [
    "六吉星之一，稱「陽貴人」，象徵高層提攜、上司援助與仕途助力",
    "與天鉞同宮或三方四正相照，貴人力量極強，稱「魁鉞夾命」或「魁鉞同宮」，主高貴命格",
    "不參與四化，但落宮時直接提升貴人緣、長輩助力與升遷機會",
    "落官祿宮或命宮時，仕途貴人助力最為明顯",
    "與主星同宮提升主星的仕途貴氣；與煞星同宮可部分化解煞氣",
  ],
  天鉞: [
    "六吉星之一，稱「陰貴人」，象徵女性貴人、暗中相助與護佑力量",
    "與天魁同宮或三方四正相照，貴人力量極強；單獨落宮時多見女性貴人或母系力量的援助",
    "不參與四化，但落宮時直接提升陰性貴人緣、異性助力與隱性資源",
    "落夫妻宮或兄弟宮時，女性人脈與感情緣分的貴氣尤為明顯",
    "與主星同宮提升主星的陰性貴氣；性質較天魁柔和，不易衝突",
  ],
  祿存: [
    "祿存本身不參與四化，但祿存落宮代表該宮位有穩定財祿與物質積累",
    "祿存所落宮位，前一宮必有擎羊，後一宮必有陀羅——稱「羊陀夾祿」，是祿存的固定規律，不得違背",
    "天馬與祿存同宮或對宮，稱「祿馬交馳格」，是極吉的財祿格局，主財祿奔流、動中得財",
    "祿存保守穩健，適合積累與守成；單獨落宮時財祿有保障，但偏被動，需主動出擊",
    "與四化祿（化祿飛入）同宮，財祿力量更雄厚；與空劫同宮則財祿被耗",
  ],
  天馬: [
    "天馬本身不參與四化，但天馬落宮代表該宮位有驛動奔波與變動機遇",
    "天馬落在寅、申、巳、亥（四馬地）時，驛動力量最強，主遷移、出行、奔波中得財",
    "祿存與天馬同宮或對宮，稱「祿馬交馳格」，主財祿動態流通、奔波中發財，是極吉財祿格局",
    "大限或流年天馬入命，主該期有明顯變動、遷移或奔波；若同時有化祿，則變動中帶來財源",
    "與四煞同宮時，奔波變動帶來損耗而非收穫；單獨落宮時變動是中性的，吉凶視三方格局",
  ],
  擎羊: [
    "六煞星之一，稱「羊刃」，主剛烈衝動、是非競爭與意外傷損",
    "祿存的前一宮必有擎羊（固定規律）——稱「祿前羊後」，是排盤固定佈局，不得違背",
    "與廉貞或七殺同宮，剛烈之氣更甚，競爭衝突風險上升",
    "落命宮時性格剛直好勝，競爭力強但也易招是非；落疾厄宮時注意手術、外傷風險",
    "與吉星（左輔右弼、魁鉞）同宮可化解部分煞氣，擎羊轉為積極競爭力而非傷害力",
  ],
  陀羅: [
    "六煞星之一，稱「截路」，主拖延磨蹭、暗中阻滯與反覆糾纏",
    "祿存的後一宮必有陀羅（固定規律）——稱「祿後陀先」，是排盤固定佈局，不得違背",
    "與化忌同宮，稱「忌陀同宮」或「化忌被陀羅夾」，主事情一再拖延、纏綿不清，難以解脫",
    "落命宮時做事風格偏慢熱、執著甚至固執；落官祿宮時職業發展可能屢遭拖滯",
    "與吉星同宮可減輕拖滯之力，但陀羅的糾纏特質難以完全消除",
  ],
  火星: [
    "六煞星之一，主急爆衝動、驟然變故與意外衝擊",
    "與貪狼同宮或對宮（三方四正相照），稱「火貪格」，主驟然得意、意外橫財或突發名利，是特殊吉格",
    "落命宮時性格急爆、行動力強但缺乏耐性；落財帛宮時財運起伏大，得財方式偏突然",
    "與鈴星同時在三方四正內，稱「火鈴齊照」，煞氣疊加，主生命中有重大突發事件或意外",
    "與殺破狼三方相遇，煞氣互激，破格之力更強；與吉星同宮可部分化解急爆衝擊",
  ],
  鈴星: [
    "六煞星之一，主暗煞延遲、暗中困擾與緩慢阻滯",
    "與貪狼同宮或對宮（三方四正相照），稱「鈴貪格」，主驟然得意、突發名利，與火貪格性質相似",
    "落命宮時性格內斂但有暗中蓄積的爆發力；落疾厄宮時注意慢性病或難以察覺的健康問題",
    "與火星同時在三方四正內，稱「火鈴齊照」，兩煞共振，突發風險極高",
    "鈴星危險相對隱蔽——不如火星急爆，而是慢慢侵蝕，需更注意長期積累的損耗",
  ],
  地空: [
    "空劫之一，主資源虛耗、理想主義與精神層面的損失",
    "與地劫同宮或對宮（三方四正），稱「空劫夾命」，主財祿極度虛耗、人生起伏大，需避免投機冒險",
    "落財帛宮或官祿宮時，財祿或事業成果容易無形中流失；落福德宮時精神世界豐富但物質匱乏",
    "與化祿同宮，財祿被耗，得財不易留存；與貪狼同宮則貪狼的慾望被架空，轉向精神追求",
    "地空的核心是「虛」——帶來空靈、理想主義與超然，正面看是高度的精神追求，負面是不實際",
  ],
  地劫: [
    "空劫之一，主錢財受劫、意外損失與物質層面的耗散",
    "與地空同宮或對宮（三方四正），稱「空劫夾命」，主財祿極度虛耗、意外破財，風險極高",
    "落財帛宮時財來財去，守財能力弱；落命宮時人生多有意外變故，需培養危機意識",
    "與化祿同宮，財祿受劫，辛苦所得易被外力奪去；流年地劫飛入財帛宮需防意外破財",
    "地劫的核心是「劫」——帶來外來的錢財損耗與意外衝擊，比地空更具物質層面的破壞力",
  ],
};

/** Authoritative nature-and-rules grounding block for assistant star × palace articles. */
export function assistantStarGroundingBlock(star: AssistantStarDef): string {
  const rules = STAR_RULES[star.name] ?? [];
  const sihuaLine =
    star.sihua.length > 0
      ? `${star.name}可參與的四化：${star.sihua.join("、")}。其餘四化與${star.name}無關，嚴禁杜撰。`
      : `${star.name}不參與任何四化（不化祿、不化權、不化科、不化忌）。如需談四化影響，只能說其他星曜之化飛入本宮，嚴禁寫出「${star.name}化祿」等不存在的表述。`;

  return `【${star.name}·權威定性資料 — 以下為紫微斗數固定規則，必須嚴格遵循，絕不可違背或杜撰】
· 星曜分類：${star.group}，五行屬${star.element}，星性：${star.type === "auspicious" ? "吉星" : "煞星/耗星"}
· 核心象徵：${star.brief}
· 四化規則：${sihuaLine}
· 關鍵規則：
${rules.map((r, i) => `  ${i + 1}. ${r}`).join("\n")}

凡文中涉及${star.name}的星性、四化參與、與其他星曜的互動規則，均必須與上面完全一致，不得矛盾、不得編造。`;
}

/**
 * Compact grounding: one short authoritative line per assistant star present.
 * Lighter than assistantStarGroundingBlock — for token-limited readings.
 */
export function assistantStarBriefs(names: string[]): string {
  const seen = new Set<string>();
  const lines = names
    .map((n) => ASSISTANT_STARS.find((s) => s.name === n))
    .filter((s): s is typeof ASSISTANT_STARS[number] => !!s)
    .filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)))
    .map((s) => `· ${s.name}：${s.brief}${s.sihua.length ? `（可${s.sihua.join("、")}）` : ""}`);
  return lines.length ? `【輔星釋義（據此論斷，勿編造）】\n${lines.join("\n")}` : "";
}
