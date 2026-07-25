import type { RagQuery } from "@/lib/rag";

// ── 2026丙午年 × 十二生肖流年運勢 ──────────────────────────────────────────
//
// New cluster (2026-07-25 SEO audit, P2). Distinct from lib/liuNianData.ts
// (pure 流年 THEORY: 流年怎麼看/流年命宮/流年四化 etc — kind: jichu/gongwei/sihua).
// That cluster was found bouncing hard (1-2s dwell) because "2026年運勢屬鼠"-type
// searchers land on theory instead of a direct answer. This cluster is the fix:
// one article per 生肖, answering the actual query.
//
// Route: /liunian-2026/[slug] (flat top-level route, NOT app/liunian/[year]/...).
// Next.js forbids two sibling dynamic folders with different param names at the
// same depth — app/liunian/[slug]/ already exists, so app/liunian/[year]/... or
// app/liunian/[shengxiao]/... would collide with it. Same lesson already applied
// when building /sihua-palace (kept flat, separate from /sihua/[slug]).
//
// ── Grounding: 2026 = 丙午年 (calendrically fixed, not invented) ───────────
// 2026 - 4 = 2022. 2022 mod 10 = 2 → 丙 (3rd heavenly stem, Yang Fire).
// 2022 mod 12 = 6  → 午 (7th earthly branch, zodiac Horse, element Fire).
// So 2026 is 丙午年 — stem AND branch both Fire ("雙火"), commonly called
// 火馬年 in folk usage. (60-cycle nayin for 丙午/丁未 is 天河水 — a deeper,
// less commonly cited detail; NOT the basis for "火馬" framing, which comes
// from stem+branch element only. Kept out of the per-animal grounding blocks
// to avoid confusing readers with two different "element" claims.)
//
// ── Grounding: each 生肖's relationship to 午 (2026's branch / 太歲) ────────
// Derived from the standard 地支 six-relationship system — verified against
// the classical pairings below, NOT the AI's invention:
//   六沖 (opposite pairs): 子午沖 丑未沖 寅申沖 卯酉沖 辰戌沖 巳亥沖
//   六合 (paired harmony): 子丑合 寅亥合 卯戌合 辰酉合 巳申合 午未合
//   三合 (trine, 4th apart): 申子辰 亥卯未 寅午戌 巳酉丑
//   三會 (directional trio, consecutive): 寅卯辰(東方木) 巳午未(南方火)
//                                          申酉戌(西方金) 亥子丑(北方水)
//   六害 (harm pairs): 子未害 丑午害 寅巳害 卯辰害 申亥害 酉戌害
//   六破 (destruction pairs): 子酉破 丑辰破 寅亥破 卯午破 巳申破 未戌破
//   自刑 (self-punishment, meets its own branch): 辰午酉亥
// Table for 午 specifically (this is the authoritative fact block — see each
// entry's `grounding` field below, which repeats only the relevant row):
//   子 鼠 → 沖太歲（子午沖）
//   丑 牛 → 害太歲（丑午害）
//   寅 虎 → 三合太歲（寅午戌三合火局）
//   卯 兔 → 破太歲（卯午破）
//   辰 龍 → 平順（辰與午無六合/三合/沖/害/破關係）
//   巳 蛇 → 三會太歲（巳午未三會南方火，方位相助）
//   午 馬 → 值太歲 / 本命年（與流年地支相同，且午為自刑支）
//   未 羊 → 六合太歲（午未合）
//   申 猴 → 平順（申與午無六合/三合/沖/害/破關係——申的三合在申子辰，與午無涉）
//   酉 雞 → 平順（酉與午無六合/三合/沖/害/破關係）
//   戌 狗 → 三合太歲（寅午戌三合火局）
//   亥 豬 → 平順（亥與午無六合/三合/沖/害/破關係）
// Note: earlier drafts of this cluster's brief loosely suggested "辰午自刑"
// and "申午半合" — both checked against the classical system above and found
// inaccurate (自刑 is a branch meeting ITSELF, i.e. only relevant to 午/馬
// itself; 申's trine partners are 子辰, not 午). Corrected here.

export type Liunian2026Relation =
  | "沖太歲"
  | "害太歲"
  | "三合太歲"
  | "六合太歲"
  | "三會太歲"
  | "破太歲"
  | "值太歲"
  | "平順";

export interface Liunian2026Entry {
  name: string;              // e.g. "2026年屬鼠運勢"
  urlSlug: string;            // pinyin, e.g. "shu"
  animal: string;             // "鼠"
  branch: string;             // "子"
  relation: Liunian2026Relation;
  relationNote: string;       // one-line classical basis, e.g. "子午沖"
  title: string;
  subtitle: string;
  oneLine: string;
  intro: string;
  grounding: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];          // sibling slugs (this file) or theory slugs (liuNianData.ts, resolved as /liunian/<slug>)
}

const BINGWU_FACTS = `【2026丙午年權威定盤資料】
干支計算：2026年為農曆丙午年（六十甲子第43年）。丙為十天干第3位，五行屬陽火；午為十二地支第7位，生肖屬馬，五行屬火。天干地支雙火疊加，民間習稱「火馬年」——不是指命主個人五行，而是指這一年本身的曆法能量偏向火：行動力強、變化快、也容易急躁上火，是這一年的整體基調，不因個人命盤而改變。
太歲：農曆年份的地支即當年「太歲」，2026年太歲為午（馬）。十二生肖與太歲的關係（沖/合/害/破/值太歲/平順）由地支間固定的六合、三合、六沖、六害、六破、自刑規則決定——這是曆法規則，對所有人一體適用，不因個人命盤不同而改變；但這層關係只回答「今年的大環境對你的生肖屬性有什麼牽動」，並不能取代個人命盤（生辰八字、紫微斗數排盤）才能給出的具體吉凶判斷。`;

function relationExplainer(relation: Liunian2026Relation, animal: string, note: string): string {
  switch (relation) {
    case "沖太歲":
      return `${animal}年生人與2026年太歲午構成「${note}」——地支相沖，是六種關係中牽動最直接的一種。傳統上，沖太歲的年份代表變動性較高：搬家、換工作、人際或健康上容易出現需要主動應對的變化。這不等於「倒楣」，而是提醒這一年做重大決定前多一份謹慎、留意情緒管理，變動期往往也是重新整理、汰舊換新的契機。`;
    case "害太歲":
      return `${animal}年生人與2026年太歲午構成「${note}」——地支相害，傳統上多指人際或溝通層面容易出現誤解、口舌是非，或原本以為穩妥的合作、關係出現一些需要磨合的小摩擦。影響通常較沖太歲溫和，重點在於這一年與人相處、簽約、承諾時多一份確認與耐心。`;
    case "破太歲":
      return `${animal}年生人與2026年太歲午構成「${note}」——地支相破，傳統上偏向計劃、進度層面的破壞或延宕：原本排定的安排容易生變、需要重新調整。應對方式是為重要計劃多留一手備案，而不是全部押在單一時間表上。`;
    case "三合太歲":
      return `${animal}年生人與2026年太歲午構成「${note}」——地支三合，是六種關係中相對順遂的一種，傳統上代表這一年的大環境對這個生肖較為助力：機會、人脈、合作較容易出現。但三合帶來的是「機會」而非「保證」，仍需要主動把握，並留意火年本身節奏偏快、宜穩中求進，不宜躁進擴張。`;
    case "六合太歲":
      return `${animal}年生人與2026年太歲午構成「${note}」——地支六合，傳統上代表這一年與太歲較為投緣，整體氛圍偏向平順融洽，人際與合作上較容易得到善意回應。六合的力道比三合更細膩、偏向「潤滑」而非「大爆發」，適合穩紮穩打地推進原本的計劃。`;
    case "三會太歲":
      return `${animal}年生人與2026年太歲午構成「${note}」——地支三會（同屬南方火的方位相助關係），傳統上代表這一年整體氛圍偏向活絡、行動力提升，做事節奏容易加快。三會不是財運或機遇的直接保證，更像是「風向一致」，宜順勢而為，同時留意雙火交疊時容易出現的急躁、上火傾向，行事宜快但不宜躁。`;
    case "值太歲":
      return `${animal}年生人本命地支即為午，2026年即「本命年」——與流年太歲地支相同，民間稱「值太歲」；同時午也是十二支中的「自刑」支之一（辰午酉亥自刑，即該地支與自身相遇時的疊加效應），傳統上本命年常被提醒「諸事宜謹慎」。這不是詛咒式的凶年，而是提醒本命年容易把個人特質（無論優點或需要留意的習慣）放大呈現，宜多一份自省與穩定作息，避免把「本命年」當成焦慮的理由。`;
    case "平順":
      return `${animal}年生人與2026年太歲午之間，在六合、三合、六沖、六害、六破的固定規則中沒有落入任何一組——即沒有特別的牽動關係，傳統上稱為「平順」或「與太歲無涉」。這不代表這一年平淡無事，而是說「生肖與太歲」這一層對你的直接影響較小，這一年的具體走向更多取決於你自己的大運與命盤格局，而非年份本身的生肖效應。`;
  }
}

function buildEntry(opts: {
  animal: string;
  branch: string;
  pinyin: string;
  relation: Liunian2026Relation;
  relationNote: string;
  oneLine: string;
  introTail: string;
  ragExtra: string;
  related: string[];
}): Liunian2026Entry {
  const { animal, branch, pinyin, relation, relationNote, oneLine, introTail, ragExtra, related } = opts;
  return {
    name: `2026年屬${animal}運勢`,
    urlSlug: pinyin,
    animal,
    branch,
    relation,
    relationNote,
    title: `2026丙午年屬${animal}運勢：與太歲${relation === "值太歲" ? "本命年" : `「${relationNote}」`}詳解`,
    subtitle: `丙午年 · 生肖${animal} × 午 · ${relation} · 2026年運勢重點`,
    oneLine,
    intro: `2026年是農曆丙午年，太歲屬馬（午）。屬${animal}的你，本命地支${branch}與今年的午構成「${relationNote || relation}」——${introTail}本文從這層曆法關係講起，說明傳統上這代表什麼、2026年實際生活中可以留意的方向，以及怎麼理性看待、而不被「生肖運勢」四個字嚇到。`,
    grounding: BINGWU_FACTS + `

【屬${animal}與2026年太歲的關係】
生肖${animal}對應地支${branch}，2026年太歲為午。${branch}與午的關係：${relation}${relationNote ? `（${relationNote}）` : ""}。
${relationExplainer(relation, animal, relationNote)}
寫作時只能使用以上關係與說明，不得為屬${animal}的太歲關係編造沖/合/害/破以外的其他曆法論斷；具體到感情、財運、事業、健康等面向的判斷，必須誠實說明「生肖只是流年判斷的其中一層，完整吉凶仍需結合個人命盤大運」，不可用生肖本身直接下絕對結論。`,
    ragQuery: { text: `2026年 丙午年 生肖${animal} 太歲 流年 運勢 ${ragExtra}`, topic: "格局" },
    related,
  };
}

export const LIUNIAN_2026: Liunian2026Entry[] = [
  buildEntry({
    animal: "鼠", branch: "子", pinyin: "shu",
    relation: "沖太歲", relationNote: "子午沖",
    oneLine: "屬鼠沖太歲，2026年變動性較高，是主動整理人生方向的一年，而非需要恐慌的一年。",
    introTail: "地支相沖，是六種關係裡牽動最直接的一種，",
    ragExtra: "沖太歲 子午沖 變動 搬家 換工作",
    related: ["ma", "niu", "liunian-sihua"],
  }),
  buildEntry({
    animal: "牛", branch: "丑", pinyin: "niu",
    relation: "害太歲", relationNote: "丑午害",
    oneLine: "屬牛害太歲，2026年人際與合作上宜多一份確認，避免因誤解累積摩擦。",
    introTail: "地支相害，傳統上多指人際溝通層面的小摩擦，",
    ragExtra: "害太歲 丑午害 人際 溝通 合作",
    related: ["ma", "shu", "liunian-ganqing"],
  }),
  buildEntry({
    animal: "虎", branch: "寅", pinyin: "hu",
    relation: "三合太歲", relationNote: "寅午戌三合火局",
    oneLine: "屬虎三合太歲，2026年大環境較為助力，機會值得主動把握，但仍宜穩中求進。",
    introTail: "地支三合，是相對順遂的一種關係，",
    ragExtra: "三合太歲 寅午戌 三合火局 機遇",
    related: ["gou", "ma", "liunian-guanlu"],
  }),
  buildEntry({
    animal: "兔", branch: "卯", pinyin: "tu",
    relation: "破太歲", relationNote: "卯午破",
    oneLine: "屬兔破太歲，2026年計劃容易生變，建議重要安排多留一手備案。",
    introTail: "地支相破，偏向計劃、進度層面的延宕變化，",
    ragExtra: "破太歲 卯午破 計劃生變 備案",
    related: ["ma", "long", "liunian-dayun"],
  }),
  buildEntry({
    animal: "龍", branch: "辰", pinyin: "long",
    relation: "平順", relationNote: "",
    oneLine: "屬龍與太歲無特殊牽動關係，2026年運勢走向更多取決於個人大運與命盤格局。",
    introTail: "在六合、三合、六沖、六害、六破的固定規則裡都沒有落入任何一組，",
    ragExtra: "平順 無特殊關係 大運 命盤",
    related: ["tu", "she", "liunian-jieshao"],
  }),
  buildEntry({
    animal: "蛇", branch: "巳", pinyin: "she",
    relation: "三會太歲", relationNote: "巳午未三會南方火",
    oneLine: "屬蛇與太歲三會南方火，2026年氛圍偏向活絡、行動力提升，但也要留意火旺帶來的急躁。",
    introTail: "地支三會，是方位相助的一種關係，",
    ragExtra: "三會太歲 巳午未 南方火 三會方",
    related: ["yang", "long", "liunian-sihua"],
  }),
  buildEntry({
    animal: "馬", branch: "午", pinyin: "ma",
    relation: "值太歲", relationNote: "本命年 · 自刑",
    oneLine: "屬馬值太歲，2026年是本命年，宜穩定作息、多一份自省，而不是被「本命年」三個字嚇到。",
    introTail: "與流年地支相同，即「值太歲」的本命年，",
    ragExtra: "值太歲 本命年 自刑 安太歲",
    related: ["shu", "yang", "liunian-jieshao"],
  }),
  buildEntry({
    animal: "羊", branch: "未", pinyin: "yang",
    relation: "六合太歲", relationNote: "午未合",
    oneLine: "屬羊六合太歲，2026年整體氛圍偏向融洽平順，適合穩紮穩打推進既定計劃。",
    introTail: "地支六合，力道細膩、偏向潤滑而非爆發，",
    ragExtra: "六合太歲 午未合 融洽 平順",
    related: ["ma", "she", "liunian-caibo"],
  }),
  buildEntry({
    animal: "猴", branch: "申", pinyin: "hou",
    relation: "平順", relationNote: "",
    oneLine: "屬猴與太歲無特殊牽動關係，2026年不必特別緊張生肖效應，重點仍在個人命盤與大運。",
    introTail: "在六合、三合、六沖、六害、六破的固定規則裡都沒有落入任何一組，",
    ragExtra: "平順 無特殊關係 大運 命盤",
    related: ["ji", "zhu", "liunian-guanlu"],
  }),
  buildEntry({
    animal: "雞", branch: "酉", pinyin: "ji",
    relation: "平順", relationNote: "",
    oneLine: "屬雞與太歲無特殊牽動關係，2026年宜把重心放回自己的大運與命盤格局判斷。",
    introTail: "在六合、三合、六沖、六害、六破的固定規則裡都沒有落入任何一組，",
    ragExtra: "平順 無特殊關係 大運 命盤",
    related: ["hou", "gou", "liunian-caibo"],
  }),
  buildEntry({
    animal: "狗", branch: "戌", pinyin: "gou",
    relation: "三合太歲", relationNote: "寅午戌三合火局",
    oneLine: "屬狗三合太歲，2026年是機會相對較多的一年，主動把握比被動等待更關鍵。",
    introTail: "地支三合，是相對順遂的一種關係，",
    ragExtra: "三合太歲 寅午戌 三合火局 機遇",
    related: ["hu", "ma", "liunian-guiren"],
  }),
  buildEntry({
    animal: "豬", branch: "亥", pinyin: "zhu",
    relation: "平順", relationNote: "",
    oneLine: "屬豬與太歲無特殊牽動關係，2026年運勢重點仍在個人命盤，不必因生肖標籤而焦慮。",
    introTail: "在六合、三合、六沖、六害、六破的固定規則裡都沒有落入任何一組，",
    ragExtra: "平順 無特殊關係 大運 命盤",
    related: ["hou", "tu", "liunian-jibing"],
  }),
];

export function getLiunian2026(urlSlug: string): Liunian2026Entry | undefined {
  return LIUNIAN_2026.find(e => e.urlSlug === urlSlug);
}
