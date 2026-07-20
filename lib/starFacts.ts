import data from "./starFactsData.json";

// Ground-truth 安星(co-location) + 廟旺(brightness) table per major star per branch,
// derived from iztro (scripts/deriveStarFacts.mjs). Used to ground SEO generation so
// the model cannot hallucinate these fixed lookup-table facts.
type BranchInfo = { with: string[]; bright: string[] };
const STAR_FACTS = data as Record<string, Record<string, BranchInfo>>;

const BRANCH_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ALL_HUA = ["化祿", "化權", "化科", "化忌"];

// 四化 participation — standard 十干四化 (which transformations each major star can take).
const SIHUA: Record<string, string[]> = {
  紫微: ["化權", "化科"],
  天機: ["化祿", "化權", "化科", "化忌"],
  太陽: ["化祿", "化權", "化忌"],
  武曲: ["化祿", "化權", "化科", "化忌"],
  天同: ["化祿", "化權", "化忌"],
  廉貞: ["化祿", "化忌"],
  天府: [],
  太陰: ["化祿", "化權", "化科", "化忌"],
  貪狼: ["化祿", "化權", "化忌"],
  巨門: ["化祿", "化權", "化忌"],
  天相: [],
  天梁: ["化祿", "化權", "化科"],
  七殺: [],
  破軍: ["化祿", "化權"],
};

/** Authoritative facts block injected into the star×palace prompt. */
export function starGroundingBlock(star: string): string {
  const facts = STAR_FACTS[star];
  if (!facts) return "";

  const has = SIHUA[star] ?? [];
  const not = ALL_HUA.filter((h) => !has.includes(h));
  const sihuaLine = has.length
    ? `${star}只參與：${has.join("、")}；不參與：${not.join("、")}。嚴禁寫出${not.map((h) => `「${star}${h}」`).join("、")}。`
    : `${star}不參與任何四化——不化祿、不化權、不化科、不化忌。嚴禁出現「${star}化祿/化權/化科/化忌」之類表述（如需談四化，只能說其他星曜化祿/忌飛入或衝照本宮）。`;

  const rows = BRANCH_ORDER.map((b) => {
    const info = facts[b];
    const comp = info.with.length ? `與${info.with.join("、")}同宮` : "獨坐";
    const bright = info.bright.join("/") || "—";
    return `${b}宮${comp}（${bright}）`;
  }).join("；");

  return `【${star}·權威定盤資料 — 以下為標準排盤的固定事實，必須嚴格遵循，絕不可改動或杜撰】
· 四化：${sihuaLine}
· ${star}在十二地支的星曜組合與廟旺亮度：${rows}。
凡文中涉及${star}的同宮主星、廟旺亮度、可化四化，都必須與上面完全一致；不得出現矛盾、張冠李戴或編造。`;
}
