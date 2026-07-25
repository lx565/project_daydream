import type { RagQuery } from "@/lib/rag";
import { PALACES } from "@/lib/starData";
import {
  JI_STEMS, SIHUA_HUAJI,
  LU_STEMS, SIHUA_HUALU,
  QUAN_STEMS, SIHUA_HUAQUAN,
  KE_STEMS, SIHUA_HUAKE,
} from "@/lib/sihuaData";

// ── 化×十二宮 (Phase 1: 化忌) ──────────────────────────────────────────────────
//
// One level deeper than lib/sihuaData.ts's 主星×四化 cluster (43 articles that
// stop at "太陽化忌", "武曲化忌" etc.). This cluster answers the next question a
// reader actually searches: "化忌入夫妻宮是什麼意思", "天同化忌在夫妻宮" — i.e.
// which of the 12 palaces the 化忌 star lands in, not just which star it is.
//
// IMPORTANT: which star carries 化忌 is fixed by the person's 生年幹 (see
// JI_STEMS / SIHUA_TABLE in sihuaData.ts) — but which PALACE that star sits in
// depends on the full birth chart (year/month/day/hour), not on the stem alone.
// So these articles do NOT claim "if you're 庚年生人 your 化忌 is in 夫妻宮" —
// that would be wrong. Instead each article explains the "宮位效應" (what it
// generally means for ANY star's 化忌 to land in this palace) layered with
// "星曜效應" (which of the 10 possible 化忌 stars colors this palace most
// distinctly, and why) — both layers grounded in facts already authored in
// sihuaData.ts's HUAJI_ARTICLES, never invented here.

export type SihuaPalaceHua = "忌" | "祿" | "權" | "科";

export interface SihuaPalaceEntry {
  name: string;            // display name, e.g. "化忌入夫妻宮"
  urlSlug: string;          // e.g. "huaji-fuqi-gong"
  hua: SihuaPalaceHua;
  huaName: string;          // "化忌"
  palace: string;           // full palace name w/ 宮 suffix, e.g. "夫妻宮"
  palaceUrlSlug: string;    // reuse PALACES[].urlSlug, e.g. "fuqi-gong"
  title: string;
  subtitle: string;
  oneLine: string;
  intro: string;
  grounding: string;        // authoritative facts injected verbatim into prompt
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];        // sibling palace slugs (this file) + parent pillar slug (sihuaData "hua-ji")
}

// 十干化忌總表 — reused verbatim from sihuaData.ts, never re-derived.
const JI_TABLE_BLOCK = Object.entries(JI_STEMS)
  .map(([star, stems]) => `${stems.join("、")}年 → ${star}化忌`)
  .join("\n");

function starOneLiner(starName: string): string {
  const e = SIHUA_HUAJI.find(s => s.star === starName);
  return e ? e.oneLine : "";
}

function palaceBrief(palaceName: string): string {
  const p = PALACES.find(p => p.name === palaceName);
  return p ? p.brief : "";
}

/** Shared grounding block: JI_STEMS table + palace definition + which stars' 化忌 matter most here (with reasons, lifted verbatim from each star's own 落宮變化 line in sihuaData.ts). */
function groundingBlock(palaceName: string, focusStars: { star: string; note: string }[]): string {
  const focusBlock = focusStars
    .map(f => `- ${f.star}化忌（${starOneLiner(f.star)}）→ ${f.note}`)
    .join("\n");

  return `【化忌入${palaceName}權威定義】
十干化忌總表（十天干各自對應化忌的主星，絕對準則，不得違背）：
${JI_TABLE_BLOCK}
（究竟命主是哪一年干生人、化忌落在哪顆星，由生年天干決定；但這顆化忌星實際落在命盤哪個宮位，取決於完整排盤結果——並非天干直接對應宮位。本文討論的是「無論哪顆星化忌，只要落在${palaceName}」這個宮位效應，並疊加最相關的星曜效應。）

${palaceName}宮位定義：${palaceBrief(palaceName)}

化忌入${palaceName}時，以下幾顆星的化忌尤其值得深入討論（依據其星性與已知落宮特質）：
${focusBlock}

寫作時只能使用以上列出的星曜與對應說明，不得為未列出的星曜編造${palaceName}相關的具體論斷。`;
}

// ── 化祿/化權/化科 × 十二宮 grounding helper ─────────────────────────────────
//
// Generalized version of groundingBlock() above (which is 化忌-only and kept
// unchanged to avoid touching the live Phase 1 cluster). Reuses LU_STEMS /
// QUAN_STEMS / KE_STEMS and the SIHUA_HUALU / SIHUA_HUAQUAN / SIHUA_HUAKE
// star arrays from sihuaData.ts verbatim — never re-derives the stem→star
// tables, same rule as the 化忌 cluster.

const HUA_STEMS_MAP: Record<"祿" | "權" | "科", Record<string, string[]>> = {
  祿: LU_STEMS,
  權: QUAN_STEMS,
  科: KE_STEMS,
};

const HUA_ARTICLES_MAP: Record<"祿" | "權" | "科", typeof SIHUA_HUALU> = {
  祿: SIHUA_HUALU,
  權: SIHUA_HUAQUAN,
  科: SIHUA_HUAKE,
};

function stemTableBlock(hua: "祿" | "權" | "科"): string {
  return Object.entries(HUA_STEMS_MAP[hua])
    .map(([star, stems]) => `${stems.join("、")}年 → ${star}化${hua}`)
    .join("\n");
}

function starOneLinerFor(hua: "祿" | "權" | "科", starName: string): string {
  const e = HUA_ARTICLES_MAP[hua].find(s => s.star === starName);
  return e ? e.oneLine : "";
}

/** Shared grounding block for 化祿/化權/化科 × 十二宮, mirroring groundingBlock() above. */
function groundingBlockFor(
  hua: "祿" | "權" | "科",
  palaceName: string,
  focusStars: { star: string; note: string }[]
): string {
  const focusBlock = focusStars
    .map(f => `- ${f.star}化${hua}（${starOneLinerFor(hua, f.star)}）→ ${f.note}`)
    .join("\n");

  return `【化${hua}入${palaceName}權威定義】
十干化${hua}總表（十天干各自對應化${hua}的星曜，絕對準則，不得違背）：
${stemTableBlock(hua)}
（究竟命主是哪一年干生人、化${hua}落在哪顆星，由生年天干決定；但這顆化${hua}星實際落在命盤哪個宮位，取決於完整排盤結果——並非天干直接對應宮位。本文討論的是「無論哪顆星化${hua}，只要落在${palaceName}」這個宮位效應，並疊加最相關的星曜效應。）

${palaceName}宮位定義：${palaceBrief(palaceName)}

化${hua}入${palaceName}時，以下幾顆星的化${hua}尤其值得深入討論（依據其星性與已知落宮特質）：
${focusBlock}

寫作時只能使用以上列出的星曜與對應說明，不得為未列出的星曜編造${palaceName}相關的具體論斷。`;
}

const PALACE_HUAJI: SihuaPalaceEntry[] = [
  {
    name: "化忌入命宮",
    urlSlug: "huaji-ming-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "命宮",
    palaceUrlSlug: "ming-gong",
    title: "化忌入命宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 命宮篇 · 性格裡最執著的那一塊",
    oneLine: "化忌入命宮，是把課題直接刻在性格底色裡——不是缺陷，是最該用心的地方。",
    intro: "命宮是命盤的核心，代表一個人的性格、外在氣質與整體命運基調。化忌入命宮，意味著命主的性格裡天生帶著一份執著或不安——具體是哪一種，取決於化忌星是誰。本文講清化忌入命宮的核心含義，哪些星的化忌落在此宮最值得留意，以及如何與這份執著好好相處。",
    grounding: groundingBlock("命宮", [
      { star: "太陰", note: "內心容易不安，帶有憂鬱傾向，情緒起伏較敏感。" },
      { star: "貪狼", note: "慾望執念重，容易陷入沉溺（物質、感情或娛樂）。" },
      { star: "天同", note: "享樂執念重，容易懶散或沉溺於舒適，該做的事反而拖延。" },
      { star: "巨門", note: "性格偏執拗，說話容易招是非，內心多疑。" },
      { star: "廉貞", note: "性格容易走極端，對感情或某個執念難以放下。" },
    ]),
    ragQuery: { text: "化忌 命宮 性格 執著 太陰 貪狼 天同 巨門 廉貞 落命宮 課題", topic: "格局" },
    related: ["huaji-fuqi-gong", "huaji-fude-gong", "hua-ji"],
  },
  {
    name: "化忌入兄弟宮",
    urlSlug: "huaji-xiongdi-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "兄弟宮",
    palaceUrlSlug: "xiongdi-gong",
    title: "化忌入兄弟宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 兄弟宮篇 · 手足緣分與同輩資源的課題",
    oneLine: "化忌入兄弟宮，手足或同輩關係容易成為需要用心經營的一環。",
    intro: "兄弟宮除了代表手足緣分，也涉及同輩關係、合夥人與人脈資源。化忌入兄弟宮，代表這些領域容易出現波折或需要特別用心。本文講清化忌入兄弟宮的核心含義，以及哪顆星的化忌落在此宮最典型。",
    grounding: groundingBlock("兄弟宮", [
      { star: "天機", note: "手足姐妹緣薄或關係有波折，兄弟宮的化忌以天機最為典型——天機主變動，落在此宮容易讓同輩、合夥關係也跟著多變。" },
    ]),
    ragQuery: { text: "化忌 兄弟宮 手足 天機 同輩 合夥 人脈 落宮 課題", topic: "家庭" },
    related: ["huaji-fude-gong", "huaji-jiaoyou-gong", "hua-ji"],
  },
  {
    name: "化忌入夫妻宮",
    urlSlug: "huaji-fuqi-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "夫妻宮",
    palaceUrlSlug: "fuqi-gong",
    title: "化忌入夫妻宮是什麼意思？各星化忌在夫妻宮的影響",
    subtitle: "十二宮 × 化忌 · 夫妻宮篇 · 感情裡最需要面對的課題",
    oneLine: "化忌入夫妻宮，是十二宮裡最常被討論的組合——感情路上總有一份需要用心經營的課題。",
    intro: "夫妻宮代表婚姻品質、伴侶特質與感情走向，也是十二宮裡化忌落入時反應最豐富的一個宮位——天同化忌、武曲化忌、廉貞化忌等多顆星的化忌都在此宮有明確表現。「天同化忌在夫妻宮」「武曲化忌入夫妻宮」這類搜尋背後，問的都是同一件事：化忌落在感情宮位，究竟意味著什麼、該怎麼面對。本文逐一講清。",
    grounding: groundingBlock("夫妻宮", [
      { star: "廉貞", note: "婚姻有磨難或桃花是非，是夫妻宮化忌裡風險最直接的一種——廉貞主感情與是非，落陷此宮容易有感情糾紛或變故。" },
      { star: "武曲", note: "婚姻有孤克色彩（武曲本主孤，化忌更重），做事與相處都容易遇到阻力，需要雙方刻意經營才能磨合。" },
      { star: "天同", note: "感情路容易波折或遇人不淑，福星化忌後，容易對伴侶的付出總覺得「不夠」，陷入不滿足的循環。" },
      { star: "巨門", note: "伴侶之間容易爭吵、言語傷害，是非在夫妻宮裡具體表現為溝通方式的傷害性。" },
      { star: "貪狼", note: "感情糾纏複雜，慾望執念重時容易讓感情關係變得患得患失、難以簡單處理。" },
    ]),
    ragQuery: { text: "化忌 夫妻宮 婚姻 感情 廉貞 武曲 天同 巨門 貪狼 落宮 課題 相處", topic: "感情" },
    related: ["huaji-ming-gong", "huaji-fude-gong", "hua-ji"],
  },
  {
    name: "化忌入子女宮",
    urlSlug: "huaji-zinv-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "子女宮",
    palaceUrlSlug: "zinv-gong",
    title: "化忌入子女宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 子女宮篇 · 子女緣分與創造力的課題",
    oneLine: "化忌入子女宮，子女緣分或創造性的表達容易需要特別用心。",
    intro: "子女宮除了子女緣分，也關係到創造力與部屬關係。化忌入子女宮，代表這個領域容易出現課題，需要更多耐心經營。本文講清化忌入子女宮的核心含義。",
    grounding: groundingBlock("子女宮", [
      { star: "天同", note: "子女緣分偏薄或與子女關係有課題——天同主子女、福氣，化忌後容易在教養上過度縱容或過度焦慮，兩者都是「福氣」處理不當的表現。" },
    ]),
    ragQuery: { text: "化忌 子女宮 子女緣 教養 天同 創造力 落宮 課題", topic: "家庭" },
    related: ["huaji-fuqi-gong", "huaji-tianzhai-gong", "hua-ji"],
  },
  {
    name: "化忌入財帛宮",
    urlSlug: "huaji-caibo-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "財帛宮",
    palaceUrlSlug: "caibo-gong",
    title: "化忌入財帛宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 財帛宮篇 · 財務壓力與守財課題",
    oneLine: "化忌入財帛宮，財務容易出現壓力，守財是這一生要學的功課。",
    intro: "財帛宮代表財富積累方式與理財能力。化忌入財帛宮，是最直接影響「錢」的一種落宮方式——武曲化忌入財帛尤其典型。本文講清化忌入財帛宮的核心含義，哪些星的化忌落在此宮最需要注意。",
    grounding: groundingBlock("財帛宮", [
      { star: "武曲", note: "直接主財務壓力大，財星化忌落財帛宮，是十二宮中對「錢」影響最直接的一種組合，投資風險與大額破財都需留意。" },
      { star: "太陰", note: "財務有壓力、固定資產難積累，太陰主財富，化忌後偏向存不住、守不住。" },
      { star: "貪狼", note: "花錢在享樂上難守財，慾望驅動的消費容易超支。" },
      { star: "天同", note: "花錢大手大腳，享受型消費是財帛宮天同化忌的典型表現。" },
    ]),
    ragQuery: { text: "化忌 財帛宮 財運 武曲 太陰 貪狼 天同 守財 破財 落宮 課題", topic: "財運" },
    related: ["huaji-tianzhai-gong", "huaji-guanlu-gong", "hua-ji"],
  },
  {
    name: "化忌入疾厄宮",
    urlSlug: "huaji-jie-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "疾厄宮",
    palaceUrlSlug: "jie-gong",
    title: "化忌入疾厄宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 疾厄宮篇 · 健康需要留意的訊號",
    oneLine: "化忌入疾厄宮，提醒的是身體哪個部位需要多一份留意，不是判死刑。",
    intro: "疾厄宮代表健康狀況與身體易患部位。化忌入疾厄宮，是一種提醒而非定論——它指出的是需要多留意保養的方向。本文講清化忌入疾厄宮的核心含義，並提醒：命理的健康提示應作為留意方向，不能替代醫療診斷。",
    grounding: groundingBlock("疾厄宮", [
      { star: "廉貞", note: "血液、婦科（女命）或泌尿系統需留意，廉貞主血光，化忌落疾厄宮時這方面的健康訊號較明確。" },
      { star: "太陰", note: "與女性生殖系統或內分泌相關的健康需要留意，太陰主陰柔之氣，化忌後這類系統較易顯現亞健康訊號。" },
    ]),
    ragQuery: { text: "化忌 疾厄宮 健康 廉貞 太陰 血光 內分泌 落宮 提醒", topic: "健康" },
    related: ["huaji-fude-gong", "huaji-ming-gong", "hua-ji"],
  },
  {
    name: "化忌入遷移宮",
    urlSlug: "huaji-qianyi-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "遷移宮",
    palaceUrlSlug: "qianyi-gong",
    title: "化忌入遷移宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 遷移宮篇 · 外出、異地與公眾形象的課題",
    oneLine: "化忌入遷移宮，在外地、公眾場合或出行上容易多一份波折，需要多一份準備。",
    intro: "遷移宮代表出行運勢、外部社會形象與異鄉發展。化忌入遷移宮，意味著在外的際遇容易出現波折——可能是名譽、可能是意外、也可能只是計劃多變。本文講清化忌入遷移宮的核心含義。",
    grounding: groundingBlock("遷移宮", [
      { star: "太陽", note: "在外地工作受壓或名譽波折，太陽主公開事務，化忌落遷移宮時官非與名譽風險都需留意。" },
      { star: "廉貞", note: "出門有意外風險，廉貞主血光是非，落遷移宮時外出安全需多一份注意。" },
      { star: "文昌", note: "在外名聲有起伏，文書、契約在異地處理時容易出錯，需仔細審閱。" },
      { star: "天機", note: "出行變數多，計劃容易臨時生變，宜多備一手方案。" },
    ]),
    ragQuery: { text: "化忌 遷移宮 出行 太陽 廉貞 文昌 天機 異鄉 名譽 落宮 課題", topic: "事業" },
    related: ["huaji-guanlu-gong", "huaji-jiaoyou-gong", "hua-ji"],
  },
  {
    name: "化忌入交友宮",
    urlSlug: "huaji-jiaoyou-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "交友宮",
    palaceUrlSlug: "jiaoyou-gong",
    title: "化忌入交友宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 交友宮篇 · 朋友與同事關係的課題",
    oneLine: "化忌入交友宮，朋友與同事關係容易出現摩擦，看人的眼光需要多一份練習。",
    intro: "交友宮代表朋友質量、同事關係與貴人運。化忌入交友宮，容易在人際往來中遇到言語摩擦或識人不清的課題。本文講清化忌入交友宮的核心含義。",
    grounding: groundingBlock("交友宮", [
      { star: "巨門", note: "朋友關係有口舌，是非容易從言語摩擦開始，交友宮巨門化忌是十二宮中「因言生隙」最典型的組合。" },
      { star: "文曲", note: "朋友間言語摩擦，表達上的小誤會容易累積成關係裡的疙瘩。" },
    ]),
    ragQuery: { text: "化忌 交友宮 朋友 同事 巨門 文曲 口舌 人際 落宮 課題", topic: "貴人" },
    related: ["huaji-guanlu-gong", "huaji-xiongdi-gong", "hua-ji"],
  },
  {
    name: "化忌入官祿宮",
    urlSlug: "huaji-guanlu-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "官祿宮",
    palaceUrlSlug: "guanlu-gong",
    title: "化忌入官祿宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 官祿宮篇 · 事業裡最容易卡關的地方",
    oneLine: "化忌入官祿宮，事業路上容易多一份阻力，也是十二宮裡化忌表現最豐富的宮位之一。",
    intro: "官祿宮代表事業格局、職位成就與工作特質，是化忌落宮時反應最豐富的宮位之一——幾乎每顆化忌星都會在事業上留下印記。本文講清化忌入官祿宮的核心含義，以及哪些星的化忌在事業上最值得留意。",
    grounding: groundingBlock("官祿宮", [
      { star: "太陽", note: "事業容易受外界批評，官非風險偏高，太陽主名譽官貴，化忌落官祿宮時公開場合的壓力較明顯。" },
      { star: "巨門", note: "工作中言語風險大，表達與溝通容易被誤解，招惹是非。" },
      { star: "天機", note: "工作計劃多變、難守業，決策容易頻繁調整，難以貫徹到底。" },
      { star: "武曲", note: "事業資金週轉難，財星化忌落官祿宮，經營或投資項目的現金流需要格外謹慎。" },
    ]),
    ragQuery: { text: "化忌 官祿宮 事業 太陽 巨門 天機 武曲 工作壓力 官非 落宮 課題", topic: "事業" },
    related: ["huaji-caibo-gong", "huaji-qianyi-gong", "hua-ji"],
  },
  {
    name: "化忌入田宅宮",
    urlSlug: "huaji-tianzhai-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "田宅宮",
    palaceUrlSlug: "tianzhai-gong",
    title: "化忌入田宅宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 田宅宮篇 · 不動產與家宅的課題",
    oneLine: "化忌入田宅宮，置產與家宅穩定容易多一份波折，需要更謹慎規劃。",
    intro: "田宅宮代表房產不動產、家庭環境與祖業傳承。化忌入田宅宮，容易讓置產之路或家宅穩定出現波折。本文講清化忌入田宅宮的核心含義。",
    grounding: groundingBlock("田宅宮", [
      { star: "太陰", note: "家庭不穩定或搬遷多，太陰主田宅財富，化忌後置產與安家都容易多一層波折。" },
      { star: "武曲", note: "不動產難守，財星化忌落田宅宮，購置或保有不動產時需格外謹慎，避免衝動決策。" },
    ]),
    ragQuery: { text: "化忌 田宅宮 不動產 太陰 武曲 家宅 搬遷 置產 落宮 課題", topic: "財運" },
    related: ["huaji-caibo-gong", "huaji-zinv-gong", "hua-ji"],
  },
  {
    name: "化忌入福德宮",
    urlSlug: "huaji-fude-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "福德宮",
    palaceUrlSlug: "fude-gong",
    title: "化忌入福德宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 福德宮篇 · 內心安定與精神滿足的課題",
    oneLine: "化忌入福德宮，是最容易被忽略卻最深層的課題——內心的滿足感需要重新學習。",
    intro: "福德宮代表福氣底蘊、精神世界與內心滿足感。化忌入福德宮，影響的不是外在成就，而是內心是否容易安定、滿足。本文講清化忌入福德宮的核心含義。",
    grounding: groundingBlock("福德宮", [
      { star: "天機", note: "精神不易安定，思慮過重容易讓內心難以真正放鬆。" },
      { star: "天同", note: "內心不易滿足，福星化忌落福德宮，容易明明擁有卻仍感覺空虛，是最直接的「福氣被燙傷」表現。" },
      { star: "貪狼", note: "享樂執念影響心理平衡，慾望驅動的追求容易讓內心長期處於「還不夠」的狀態。" },
    ]),
    ragQuery: { text: "化忌 福德宮 內心 天機 天同 貪狼 精神滿足 焦慮 落宮 課題", topic: "格局" },
    related: ["huaji-ming-gong", "huaji-jie-gong", "hua-ji"],
  },
  {
    name: "化忌入父母宮",
    urlSlug: "huaji-fumu-gong",
    hua: "忌",
    huaName: "化忌",
    palace: "父母宮",
    palaceUrlSlug: "fumu-gong",
    title: "化忌入父母宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化忌 · 父母宮篇 · 長輩緣分與文書貴人的課題",
    oneLine: "化忌入父母宮，與長輩的緣分或文書往來容易多一份需要磨合的課題。",
    intro: "父母宮代表父母緣分、長上關係與文書貴人運。化忌入父母宮，容易讓與長輩、上司的關係，或文書契約的處理，需要多一份用心。本文講清化忌入父母宮的核心含義。",
    grounding: groundingBlock("父母宮", [
      { star: "太陽", note: "與父親緣薄或關係有波折，太陽主父緣，化忌落父母宮時這一層關係最需要主動經營。" },
      { star: "巨門", note: "與師長關係有誤解，溝通上的落差容易累積成隔閡。" },
      { star: "文曲", note: "與長輩溝通有誤解，表達方式需要多一份耐心調整。" },
      { star: "文昌", note: "與學校或長輩有矛盾，文書、契約往來時也需仔細審閱，避免遺漏。" },
    ]),
    ragQuery: { text: "化忌 父母宮 長輩 太陽 巨門 文曲 文昌 文書 父緣 落宮 課題", topic: "家庭" },
    related: ["huaji-xiongdi-gong", "huaji-qianyi-gong", "hua-ji"],
  },
];

const PALACE_HUALU: SihuaPalaceEntry[] = [
  {
    name: "化祿入命宮",
    urlSlug: "hualu-ming-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "命宮",
    palaceUrlSlug: "ming-gong",
    title: "化祿入命宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 命宮篇 · 性格自帶的順遂與人緣",
    oneLine: "化祿入命宮，是把好運與人緣直接寫進性格底色裡——天生討喜，機會也容易靠近。",
    intro: "命宮是命盤的核心，代表性格、外在氣質與整體命運基調。化祿入命宮，意味著命主天生帶著一份討喜的氣質與流動的好運——具體是哪一種順遂，取決於化祿星是誰。本文講清化祿入命宮的核心含義，哪些星的化祿落在此宮最值得留意，以及如何把這份天生的好運轉化成長期的實力。",
    grounding: groundingBlockFor("祿", "命宮", [
      { star: "廉貞", note: "魅力人緣佳，異性緣與人際手腕天生活絡，社交場合容易吃得開。" },
      { star: "天同", note: "樂天知足、人緣好，福星化祿落命，是十二宮中最像「天生好命」的組合。" },
      { star: "太陰", note: "財祿自隨、人緣佳，性格溫潤細膩，容易得長輩與異性好感。" },
      { star: "太陽", note: "陽光有人緣、機遇多，個性大方博愛，容易成為人群裡受歡迎的焦點。" },
      { star: "貪狼", note: "魅力交際、機會多，慾望與人緣轉為機遇，社交手腕活絡。" }
    ]),
    ragQuery: { text: "化祿 命宮 人緣 廉貞 天同 太陰 太陽 貪狼 落宮 順遂 機遇", topic: "格局" },
    related: ["hualu-fuqi-gong", "hualu-caibo-gong", "hua-lu"],
  },
  {
    name: "化祿入兄弟宮",
    urlSlug: "hualu-xiongdi-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "兄弟宮",
    palaceUrlSlug: "xiongdi-gong",
    title: "化祿入兄弟宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 兄弟宮篇 · 手足情誼與同輩助力",
    oneLine: "化祿入兄弟宮，手足與同輩關係容易成為順遂的助力來源。",
    intro: "兄弟宮除了手足緣分，也涉及同輩關係、合夥人與人脈資源。化祿入兄弟宮，代表這些領域容易帶來機遇與助力。本文講清化祿入兄弟宮的核心含義，以及哪顆星的化祿落在此宮最典型。",
    grounding: groundingBlockFor("祿", "兄弟宮", [
      { star: "天機", note: "手足朋友帶來機會，天機主機變靈活，落在兄弟宮時同輩與合夥關係也容易跟著活絡起來。" }
    ]),
    ragQuery: { text: "化祿 兄弟宮 手足 天機 同輩 合夥 機遇 落宮", topic: "家庭" },
    related: ["hualu-fude-gong", "hualu-jiaoyou-gong", "hua-lu"],
  },
  {
    name: "化祿入夫妻宮",
    urlSlug: "hualu-fuqi-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "夫妻宮",
    palaceUrlSlug: "fuqi-gong",
    title: "化祿入夫妻宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 夫妻宮篇 · 感情裡最受期待的順遂",
    oneLine: "化祿入夫妻宮，是十二宮裡最受歡迎的組合之一——感情路上總有一份自然而然的甜。",
    intro: "夫妻宮代表婚姻品質、伴侶特質與感情走向，也是十二宮裡化祿落入時反應最豐富的一個宮位——廉貞化祿、天同化祿、太陰化祿等多顆星的化祿都在此宮有明確表現。本文逐一講清哪些星的化祿落在此宮最典型，以及該如何珍惜這份順遂而不流於安逸。",
    grounding: groundingBlockFor("祿", "夫妻宮", [
      { star: "廉貞", note: "感情緣分旺、異性追求多，廉貞主情慾與魅力，化祿落夫妻宮是十二宮中桃花人緣最直接的一種組合。" },
      { star: "天同", note: "感情溫和順遂，福星化祿落夫妻宮，容易遇到體貼包容的伴侶，相處輕鬆自在。" },
      { star: "太陰", note: "感情溫潤、得賢內助，太陰主溫柔細膩，化祿後伴侶多半體貼顧家。" },
      { star: "貪狼", note: "異性緣旺、感情豐富，需留意慾望驅動下的選擇是否流於一時新鮮。" },
      { star: "巨門", note: "感情靠溝通經營，化祿後原本容易招是非的口舌化為坦誠溝通的能力，感情反而更穩固。" }
    ]),
    ragQuery: { text: "化祿 夫妻宮 感情 廉貞 天同 太陰 貪狼 巨門 順遂 桃花 落宮", topic: "感情" },
    related: ["hualu-ming-gong", "hualu-fude-gong", "hua-lu"],
  },
  {
    name: "化祿入子女宮",
    urlSlug: "hualu-zinv-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "子女宮",
    palaceUrlSlug: "zinv-gong",
    title: "化祿入子女宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 子女宮篇 · 子女緣分與創造力的加持",
    oneLine: "化祿入子女宮，子女緣分與創造性的表達都容易多一份福氣。",
    intro: "子女宮除了子女緣分，也關係到創造力與部屬關係。化祿入子女宮，代表這個領域容易得到滋潤與福氣。本文講清化祿入子女宮的核心含義。",
    grounding: groundingBlockFor("祿", "子女宮", [
      { star: "天同", note: "與子女緣厚、有口福，福星化祿落子女宮，親子相處輕鬆愉快，也容易在飲食生活上有共同樂趣。" }
    ]),
    ragQuery: { text: "化祿 子女宮 子女緣 天同 創造力 口福 落宮", topic: "家庭" },
    related: ["hualu-fuqi-gong", "hualu-tianzhai-gong", "hua-lu"],
  },
  {
    name: "化祿入財帛宮",
    urlSlug: "hualu-caibo-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "財帛宮",
    palaceUrlSlug: "caibo-gong",
    title: "化祿入財帛宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 財帛宮篇 · 財源流通與收穫",
    oneLine: "化祿入財帛宮，是最直接影響「錢」的順遂組合，財源容易活絡流通。",
    intro: "財帛宮代表財富積累方式與理財能力。化祿入財帛宮，是十二宮裡對「財」最直接的加持——武曲化祿、太陰化祿等多顆星的化祿都在此宮有明確表現。本文講清化祿入財帛宮的核心含義，哪些星的化祿落在此宮最需要留意（並提醒：祿主流動不主固定財，仍需搭配理財紀律才能真正積累）。",
    grounding: groundingBlockFor("祿", "財帛宮", [
      { star: "武曲", note: "正財豐厚、求財力強，財星化祿落財帛宮，是十二宮中對「錢」影響最直接的一種組合。" },
      { star: "太陰", note: "財源穩定豐潤，太陰主財富，化祿後偏向積累與儲蓄有成。" },
      { star: "貪狼", note: "偏財或交際財旺，應酬人脈帶來額外財源，但需留意消費是否同步擴大。" },
      { star: "巨門", note: "口舌生財、飲食業得利，靠專業與口才變現是這個組合的典型表現。" },
      { star: "天機", note: "財源靈活多元、偏動財，適合企劃、中介或多元收入的路線。" }
    ]),
    ragQuery: { text: "化祿 財帛宮 財運 武曲 太陰 貪狼 巨門 天機 財源 落宮", topic: "財運" },
    related: ["hualu-tianzhai-gong", "hualu-guanlu-gong", "hua-lu"],
  },
  {
    name: "化祿入疾厄宮",
    urlSlug: "hualu-jie-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "疾厄宮",
    palaceUrlSlug: "jie-gong",
    title: "化祿入疾厄宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 疾厄宮篇 · 體質的緩和與貴人化解",
    oneLine: "化祿入疾厄宮，體質容易得到滋潤，遇到健康波折時也較容易逢凶化吉。",
    intro: "疾厄宮代表健康狀況與身體易患部位。化祿入疾厄宮，帶來的是一種緩和的力量——體質相對容易調養，遇到狀況時也較容易得到協助。本文講清化祿入疾厄宮的核心含義，並提醒：命理的健康提示應作為留意方向，不能替代醫療診斷。",
    grounding: groundingBlockFor("祿", "疾厄宮", [
      { star: "天梁", note: "逢兇有解、貴人化險，蔭星化祿落疾厄宮，遇到健康課題時較容易得到良醫或貴人相助。" }
    ]),
    ragQuery: { text: "化祿 疾厄宮 健康 天梁 貴人化險 體質 落宮", topic: "健康" },
    related: ["hualu-fude-gong", "hualu-ming-gong", "hua-lu"],
  },
  {
    name: "化祿入遷移宮",
    urlSlug: "hualu-qianyi-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "遷移宮",
    palaceUrlSlug: "qianyi-gong",
    title: "化祿入遷移宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 遷移宮篇 · 外出、異地與貴人機遇",
    oneLine: "化祿入遷移宮，在外地、異鄉或出行途中容易遇到機會與貴人。",
    intro: "遷移宮代表出行運勢、外部社會形象與異鄉發展。化祿入遷移宮，意味著在外的際遇容易順遂——可能是機會、可能是貴人相助，也可能只是計劃格外順利。本文講清化祿入遷移宮的核心含義。",
    grounding: groundingBlockFor("祿", "遷移宮", [
      { star: "天機", note: "外出/異地有機遇，計劃靈活、善於把握流動性的機會。" },
      { star: "武曲", note: "在外求財得利，行動務實，出門在外反而容易談成生意。" },
      { star: "太陽", note: "在外發展得貴人，名聲隨行，容易在異地或公眾場合得到提攜。" },
      { star: "巨門", note: "在外靠交涉與專業發展，口才與專業在異地格外吃香。" },
      { star: "破軍", note: "異地或外出開創得利，敢闖敢變，適合到外地開拓新局。" }
    ]),
    ragQuery: { text: "化祿 遷移宮 出行 天機 武曲 太陽 巨門 破軍 異鄉 機遇 落宮", topic: "事業" },
    related: ["hualu-guanlu-gong", "hualu-jiaoyou-gong", "hua-lu"],
  },
  {
    name: "化祿入交友宮",
    urlSlug: "hualu-jiaoyou-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "交友宮",
    palaceUrlSlug: "jiaoyou-gong",
    title: "化祿入交友宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 交友宮篇 · 朋友與貴人運的加持",
    oneLine: "化祿入交友宮，朋友與同事關係容易帶來實際的助力與好人緣。",
    intro: "交友宮代表朋友質量、同事關係與貴人運。化祿入交友宮，容易在人際往來中得到助力，朋友圈也容易成為機會的來源。本文講清化祿入交友宮的核心含義。",
    grounding: groundingBlockFor("祿", "交友宮", [
      { star: "廉貞", note: "人際手腕活絡，廉貞主公關交際，化祿後容易在朋友與同事圈裡左右逢源。" },
      { star: "貪狼", note: "交際應酬生財、人脈變現，貪狼化祿的核心就在人脈的流動，落在交友宮時這層效果最直接。" }
    ]),
    ragQuery: { text: "化祿 交友宮 朋友 廉貞 貪狼 人脈 貴人 落宮", topic: "貴人" },
    related: ["hualu-guanlu-gong", "hualu-xiongdi-gong", "hua-lu"],
  },
  {
    name: "化祿入官祿宮",
    urlSlug: "hualu-guanlu-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "官祿宮",
    palaceUrlSlug: "guanlu-gong",
    title: "化祿入官祿宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 官祿宮篇 · 事業裡最受期待的機遇",
    oneLine: "化祿入官祿宮，事業路上容易多一份機遇，是十二宮裡化祿表現最豐富的宮位之一。",
    intro: "官祿宮代表事業格局、職位成就與工作特質，是化祿落宮時反應最豐富的宮位之一——多顆化祿星都會在事業上留下明顯的加分。本文講清化祿入官祿宮的核心含義，以及哪些星的化祿在事業上最值得留意。",
    grounding: groundingBlockFor("祿", "官祿宮", [
      { star: "廉貞", note: "事業靠人脈與手腕，公關交際能力是這個組合的最大資產。" },
      { star: "太陽", note: "事業名聲旺、易升遷，適合公眾、公職、需要曝光與影響力的領域。" },
      { star: "巨門", note: "事業靠口才或專業，教學、法律、業務、主播都適合。" },
      { star: "武曲", note: "事業帶財、適合掌財，實幹務實把業績做出來。" },
      { star: "天梁", note: "事業得提攜、宜清貴行業，長輩貴人相助明顯，但常伴隨責任。" }
    ]),
    ragQuery: { text: "化祿 官祿宮 事業 廉貞 太陽 巨門 武曲 天梁 機遇 落宮", topic: "事業" },
    related: ["hualu-caibo-gong", "hualu-qianyi-gong", "hua-lu"],
  },
  {
    name: "化祿入田宅宮",
    urlSlug: "hualu-tianzhai-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "田宅宮",
    palaceUrlSlug: "tianzhai-gong",
    title: "化祿入田宅宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 田宅宮篇 · 置產與家宅的順遂",
    oneLine: "化祿入田宅宮，置產與家宅穩定容易多一份順遂，家道也較容易興旺。",
    intro: "田宅宮代表房產不動產、家庭環境與祖業傳承。化祿入田宅宮，容易讓置產之路走得順、家宅氛圍也較安穩。本文講清化祿入田宅宮的核心含義。",
    grounding: groundingBlockFor("祿", "田宅宮", [
      { star: "太陰", note: "易置產、家道興，太陰主田宅財富，化祿後最利不動產的累積。" },
      { star: "武曲", note: "積財置產，財星化祿落田宅宮，購置不動產的行動力與財力都到位。" },
      { star: "破軍", note: "易搬遷但能破舊立新置產，變動中反而抓住換屋或升級的時機。" }
    ]),
    ragQuery: { text: "化祿 田宅宮 不動產 太陰 武曲 破軍 家宅 置產 落宮", topic: "財運" },
    related: ["hualu-caibo-gong", "hualu-zinv-gong", "hua-lu"],
  },
  {
    name: "化祿入福德宮",
    urlSlug: "hualu-fude-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "福德宮",
    palaceUrlSlug: "fude-gong",
    title: "化祿入福德宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 福德宮篇 · 內心滿足與享受的加持",
    oneLine: "化祿入福德宮，是最貼近「幸福感」本身的落宮方式——內心容易感到滿足與享受。",
    intro: "福德宮代表福氣底蘊、精神世界與內心滿足感。化祿入福德宮，影響的不是外在成就，而是內心是否容易感到富足、放鬆。本文講清化祿入福德宮的核心含義。",
    grounding: groundingBlockFor("祿", "福德宮", [
      { star: "天同", note: "精神享受、心寬，福星化祿落福德宮，是十二宮中最直接的「知足常樂」組合。" },
      { star: "廉貞", note: "懂享受、重情調，生活品味與情感生活都容易帶來滿足感。" },
      { star: "貪狼", note: "懂享受、慾望強，容易在物質與感官享受上得到滿足，需留意適度。" }
    ]),
    ragQuery: { text: "化祿 福德宮 內心 天同 廉貞 貪狼 精神享受 滿足 落宮", topic: "格局" },
    related: ["hualu-ming-gong", "hualu-jie-gong", "hua-lu"],
  },
  {
    name: "化祿入父母宮",
    urlSlug: "hualu-fumu-gong",
    hua: "祿",
    huaName: "化祿",
    palace: "父母宮",
    palaceUrlSlug: "fumu-gong",
    title: "化祿入父母宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化祿 · 父母宮篇 · 長輩緣分與文書順遂",
    oneLine: "化祿入父母宮，與長輩的緣分或文書往來容易多一份順遂與助力。",
    intro: "父母宮代表父母緣分、長上關係與文書貴人運。化祿入父母宮，容易讓與長輩、上司的關係更融洽，文書契約的處理也較順利。本文講清化祿入父母宮的核心含義。",
    grounding: groundingBlockFor("祿", "父母宮", [
      { star: "太陰", note: "與母親緣厚受助，太陰主母親與女性長輩，化祿後這層關係格外溫潤。" },
      { star: "太陽", note: "與父親或上司緣佳受助，太陽主父緣，化祿後容易得到男性長輩的提攜。" },
      { star: "天梁", note: "受長輩庇廕，蔭星化祿落父母宮，長輩的照顧與資源相對充足。" }
    ]),
    ragQuery: { text: "化祿 父母宮 長輩 太陰 太陽 天梁 文書 父緣 落宮", topic: "家庭" },
    related: ["hualu-xiongdi-gong", "hualu-qianyi-gong", "hua-lu"],
  },
];

const PALACE_HUAQUAN: SihuaPalaceEntry[] = [
  {
    name: "化權入命宮",
    urlSlug: "huaquan-ming-gong",
    hua: "權",
    huaName: "化權",
    palace: "命宮",
    palaceUrlSlug: "ming-gong",
    title: "化權入命宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 命宮篇 · 性格裡與生俱來的主導力",
    oneLine: "化權入命宮，是把主見與掌控欲直接刻進性格底色裡——天生有主張，也天生想說了算。",
    intro: "命宮是命盤的核心，代表性格、外在氣質與整體命運基調。化權入命宮，意味著命主的性格裡天生帶著一份強勢與主導欲——具體是哪一種強勢，取決於化權星是誰。本文講清化權入命宮的核心含義，哪些星的化權落在此宮最值得留意，以及如何把這份主導力用在對的地方。",
    grounding: groundingBlockFor("權", "命宮", [
      { star: "紫微", note: "領導氣度、掌控欲強，帝星化權落命，天生帶一份當家氣場。" },
      { star: "破軍", note: "個性強悍有魄力，敢做敢當，是十二宮中氣勢最外顯的化權組合之一。" },
      { star: "太陽", note: "領導氣場、愛主導，個性大方，天生容易站到人前領頭。" },
      { star: "武曲", note: "剛毅決斷、有威嚴，行事雷厲風行，不拖泥帶水。" },
      { star: "巨門", note: "口才犀利、有主見，說話有分量，容易用言語說服他人。" }
    ]),
    ragQuery: { text: "化權 命宮 性格 紫微 破軍 太陽 武曲 巨門 主導 掌控 落宮", topic: "格局" },
    related: ["huaquan-guanlu-gong", "huaquan-fuqi-gong", "hua-quan"],
  },
  {
    name: "化權入兄弟宮",
    urlSlug: "huaquan-xiongdi-gong",
    hua: "權",
    huaName: "化權",
    palace: "兄弟宮",
    palaceUrlSlug: "xiongdi-gong",
    title: "化權入兄弟宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 兄弟宮篇 · 在同輩裡的主導位置",
    oneLine: "化權入兄弟宮，在手足或同輩團隊裡，容易自然而然站到主導的位置。",
    intro: "兄弟宮除了手足緣分，也涉及同輩關係、合夥人與團隊角色。化權入兄弟宮，代表命主在這些關係裡容易居於主導、拍板的位置。本文講清化權入兄弟宮的核心含義。",
    grounding: groundingBlockFor("權", "兄弟宮", [
      { star: "天機", note: "在團隊中出謀主導，天機化權善謀善斷，落在兄弟宮時容易成為同輩或合夥裡出主意的那一個。" }
    ]),
    ragQuery: { text: "化權 兄弟宮 手足 天機 團隊 主導 落宮", topic: "家庭" },
    related: ["huaquan-fude-gong", "huaquan-jiaoyou-gong", "hua-quan"],
  },
  {
    name: "化權入夫妻宮",
    urlSlug: "huaquan-fuqi-gong",
    hua: "權",
    huaName: "化權",
    palace: "夫妻宮",
    palaceUrlSlug: "fuqi-gong",
    title: "化權入夫妻宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 夫妻宮篇 · 感情裡的主導與強勢",
    oneLine: "化權入夫妻宮，感情裡容易出現一方（或雙方）較強勢主導的格局，需要學會分寸。",
    intro: "夫妻宮代表婚姻品質、伴侶特質與感情走向。化權入夫妻宮，容易讓感情關係裡帶有主導、掌控的色彩——這不必然是壞事，但需要留意分寸與平衡。本文逐一講清哪些星的化權落在此宮最典型，以及該如何避免主導變成壓迫。",
    grounding: groundingBlockFor("權", "夫妻宮", [
      { star: "破軍", note: "感情中主導強勢，行事大開大合，容易主導感情關係的節奏。" },
      { star: "太陰", note: "配偶或自己掌家，內斂而堅持，家中大小事常由此方主導。" },
      { star: "貪狼", note: "感情中強勢主導，慾望與野心也會帶進感情關係裡。" },
      { star: "武曲", note: "感情中剛強主導，行事務實剛毅，較少浪漫的一面。" },
      { star: "紫微", note: "感情中主導、配偶需能配合，帝星化權入夫妻宮氣場強，需要另一半願意支持。" }
    ]),
    ragQuery: { text: "化權 夫妻宮 感情 破軍 太陰 貪狼 武曲 紫微 主導 強勢 落宮", topic: "感情" },
    related: ["huaquan-ming-gong", "huaquan-fude-gong", "hua-quan"],
  },
  {
    name: "化權入子女宮",
    urlSlug: "huaquan-zinv-gong",
    hua: "權",
    huaName: "化權",
    palace: "子女宮",
    palaceUrlSlug: "zinv-gong",
    title: "化權入子女宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 子女宮篇 · 教養裡的原則與主導",
    oneLine: "化權入子女宮，教養子女或帶領部屬時，容易展現出清楚的原則與主導風格。",
    intro: "子女宮除了子女緣分，也關係到創造力與部屬關係。化權入子女宮，代表命主在教養或帶人時容易展現主導風格與明確原則。本文講清化權入子女宮的核心含義。",
    grounding: groundingBlockFor("權", "子女宮", [
      { star: "天同", note: "教養有原則，福星化權落子女宮，難得地在寬容之外多了一份堅持與規矩。" }
    ]),
    ragQuery: { text: "化權 子女宮 教養 天同 原則 主導 部屬 落宮", topic: "家庭" },
    related: ["huaquan-fuqi-gong", "huaquan-tianzhai-gong", "hua-quan"],
  },
  {
    name: "化權入財帛宮",
    urlSlug: "huaquan-caibo-gong",
    hua: "權",
    huaName: "化權",
    palace: "財帛宮",
    palaceUrlSlug: "caibo-gong",
    title: "化權入財帛宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 財帛宮篇 · 理財的主動與掌控",
    oneLine: "化權入財帛宮，理財態度會變得主動積極，也更想親自掌控財務決策權。",
    intro: "財帛宮代表財富積累方式與理財能力。化權入財帛宮，帶來的是理財上的主導欲與行動力——親自掌控財務、主動求財，而非被動等待。本文講清化權入財帛宮的核心含義，哪些星的化權落在此宮最需要留意。",
    grounding: groundingBlockFor("權", "財帛宮", [
      { star: "破軍", note: "理財大開大合、敢投敢撤，投資風格偏積極甚至激進。" },
      { star: "天梁", note: "理財穩健有原則，雖主動掌財但行事守正、不走偏門。" },
      { star: "太陰", note: "掌財、理財主動，善於運作財務且堅持己見。" },
      { star: "武曲", note: "積極掌財、理財強勢，財星化權，是十二宮中掌控財務欲望最強的組合之一。" },
      { star: "紫微", note: "大格局理財、主導財政，習慣掌握全局而非瑣碎細節。" }
    ]),
    ragQuery: { text: "化權 財帛宮 理財 破軍 天梁 太陰 武曲 紫微 掌財 落宮", topic: "財運" },
    related: ["huaquan-tianzhai-gong", "huaquan-guanlu-gong", "hua-quan"],
  },
  {
    name: "化權入疾厄宮",
    urlSlug: "huaquan-jie-gong",
    hua: "權",
    huaName: "化權",
    palace: "疾厄宮",
    palaceUrlSlug: "jie-gong",
    title: "化權入疾厄宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 疾厄宮篇 · 面對健康課題的掌控力",
    oneLine: "化權入疾厄宮，面對健康狀況時，容易展現出較強的掌控力與行動力去積極處理。",
    intro: "疾厄宮代表健康狀況與身體易患部位。化權入疾厄宮，帶來的不是額外的健康風險，而是一種積極面對、主動處理的態度。本文講清化權入疾厄宮的核心含義，並提醒：命理的健康提示應作為留意方向，不能替代醫療診斷。",
    grounding: groundingBlockFor("權", "疾厄宮", [
      { star: "天梁", note: "逢兇掌控力強、化險，蔭星化權落疾厄宮，面對健康課題時較能主動安排、積極處理。" }
    ]),
    ragQuery: { text: "化權 疾厄宮 健康 天梁 掌控 化險 落宮", topic: "健康" },
    related: ["huaquan-fude-gong", "huaquan-ming-gong", "hua-quan"],
  },
  {
    name: "化權入遷移宮",
    urlSlug: "huaquan-qianyi-gong",
    hua: "權",
    huaName: "化權",
    palace: "遷移宮",
    palaceUrlSlug: "qianyi-gong",
    title: "化權入遷移宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 遷移宮篇 · 在外的強勢與掌局能力",
    oneLine: "化權入遷移宮，在外地、異鄉或公開場合裡，容易展現出強勢、能掌局的一面。",
    intro: "遷移宮代表出行運勢、外部社會形象與異鄉發展。化權入遷移宮，意味著命主在外的表現容易帶有主導性與影響力——出門在外反而更強勢。本文講清化權入遷移宮的核心含義。",
    grounding: groundingBlockFor("權", "遷移宮", [
      { star: "天機", note: "在外靠智謀掌局，善於用策略在異地或陌生環境中站穩腳步。" },
      { star: "武曲", note: "在外強勢掌局，行動力強，出門在外也能雷厲風行。" },
      { star: "太陽", note: "在外有影響力，公眾形象強，容易在異地建立威望。" },
      { star: "紫微", note: "在外為領袖型，走到哪都容易被視為主事者。" },
      { star: "巨門", note: "在外靠交涉專業掌局，口才與專業在異地成為主導優勢。" }
    ]),
    ragQuery: { text: "化權 遷移宮 出行 天機 武曲 太陽 紫微 巨門 掌局 影響力 落宮", topic: "事業" },
    related: ["huaquan-guanlu-gong", "huaquan-jiaoyou-gong", "hua-quan"],
  },
  {
    name: "化權入交友宮",
    urlSlug: "huaquan-jiaoyou-gong",
    hua: "權",
    huaName: "化權",
    palace: "交友宮",
    palaceUrlSlug: "jiaoyou-gong",
    title: "化權入交友宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 交友宮篇 · 朋友圈裡的主導角色",
    oneLine: "化權入交友宮，在朋友圈或團隊裡，容易自然成為拿主意、扛責任的那一個。",
    intro: "交友宮代表朋友質量、同事關係與貴人運。化權入交友宮，容易讓命主在人際往來中居於主導或領頭的位置。本文講清化權入交友宮的核心含義。",
    grounding: groundingBlockFor("權", "交友宮", [
      { star: "天梁", note: "有原則、能服眾、敢擔當，天梁化權的核心特質延伸到交友宮，容易在朋友或團隊中扮演可靠的帶頭者。" },
      { star: "紫微", note: "領導欲與掌控力強，落在交友宮時容易成為朋友圈裡的核心人物，但仍需朋友、夥伴的配合才能長久。" }
    ]),
    ragQuery: { text: "化權 交友宮 朋友 天梁 紫微 主導 領導 落宮", topic: "貴人" },
    related: ["huaquan-guanlu-gong", "huaquan-xiongdi-gong", "hua-quan"],
  },
  {
    name: "化權入官祿宮",
    urlSlug: "huaquan-guanlu-gong",
    hua: "權",
    huaName: "化權",
    palace: "官祿宮",
    palaceUrlSlug: "guanlu-gong",
    title: "化權入官祿宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 官祿宮篇 · 事業裡最直接的主導力",
    oneLine: "化權入官祿宮，事業路上容易掌握主導權，是十二宮裡化權表現最豐富的宮位之一。",
    intro: "官祿宮代表事業格局、職位成就與工作特質，是化權落宮時反應最豐富的宮位之一——幾乎每顆化權星都會在事業上留下明顯的主導印記。本文講清化權入官祿宮的核心含義，以及哪些星的化權在事業上最值得留意。",
    grounding: groundingBlockFor("權", "官祿宮", [
      { star: "紫微", note: "事業掌大權、宜居高位，帝星化權落官祿宮，是十二宮中掌權欲望最強烈的組合。" },
      { star: "破軍", note: "事業主導變革、掌實權，適合創業、改革與開拓型崗位。" },
      { star: "武曲", note: "掌財權或實權、宜管理，行動務實，執行力狠。" },
      { star: "太陽", note: "事業掌權、宜公職或領導，公眾影響力強，適合站臺面。" },
      { star: "天梁", note: "事業掌權、宜管理監察，以長者或權威姿態掌局。" }
    ]),
    ragQuery: { text: "化權 官祿宮 事業 紫微 破軍 武曲 太陽 天梁 掌權 落宮", topic: "事業" },
    related: ["huaquan-caibo-gong", "huaquan-qianyi-gong", "hua-quan"],
  },
  {
    name: "化權入田宅宮",
    urlSlug: "huaquan-tianzhai-gong",
    hua: "權",
    huaName: "化權",
    palace: "田宅宮",
    palaceUrlSlug: "tianzhai-gong",
    title: "化權入田宅宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 田宅宮篇 · 家務與不動產的主導權",
    oneLine: "化權入田宅宮，在家務決策或不動產運作上，容易展現出明顯的主導權。",
    intro: "田宅宮代表房產不動產、家庭環境與祖業傳承。化權入田宅宮，容易讓命主在置產決策或家務安排上握有主導權。本文講清化權入田宅宮的核心含義。",
    grounding: groundingBlockFor("權", "田宅宮", [
      { star: "太陰", note: "主導不動產或家務，太陰化權落田宅宮，理財置產的決策權多半握在此人手上。" }
    ]),
    ragQuery: { text: "化權 田宅宮 不動產 太陰 家務 主導 落宮", topic: "財運" },
    related: ["huaquan-caibo-gong", "huaquan-zinv-gong", "hua-quan"],
  },
  {
    name: "化權入福德宮",
    urlSlug: "huaquan-fude-gong",
    hua: "權",
    huaName: "化權",
    palace: "福德宮",
    palaceUrlSlug: "fude-gong",
    title: "化權入福德宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 福德宮篇 · 精神世界裡的主張與堅持",
    oneLine: "化權入福德宮，內心的想法容易特別堅定，對自己想要的生活方式有清楚的主張。",
    intro: "福德宮代表福氣底蘊、精神世界與內心滿足感。化權入福德宮，影響的不是外在成就，而是命主對內心生活方式的主導欲——知道自己要什麼，也堅持去經營。本文講清化權入福德宮的核心含義。",
    grounding: groundingBlockFor("權", "福德宮", [
      { star: "天同", note: "懂經營生活、精神有主張，福星化權落福德宮，難得地在安逸之外多了主動經營生活的意志。" },
      { star: "貪狼", note: "慾望旺、追求刺激，對精神與感官上的滿足有明確主張，也敢主動追求。" }
    ]),
    ragQuery: { text: "化權 福德宮 內心 天同 貪狼 主張 精神生活 落宮", topic: "格局" },
    related: ["huaquan-ming-gong", "huaquan-jie-gong", "hua-quan"],
  },
  {
    name: "化權入父母宮",
    urlSlug: "huaquan-fumu-gong",
    hua: "權",
    huaName: "化權",
    palace: "父母宮",
    palaceUrlSlug: "fumu-gong",
    title: "化權入父母宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化權 · 父母宮篇 · 與長輩關係裡的主導拉鋸",
    oneLine: "化權入父母宮，與長輩、上司的相處裡容易出現主導權的拉鋸，需要多一份互相尊重。",
    intro: "父母宮代表父母緣分、長上關係與文書貴人運。化權入父母宮，容易讓命主與長輩、上司的關係裡帶有主導或較勁的色彩。本文講清化權入父母宮的核心含義。",
    grounding: groundingBlockFor("權", "父母宮", [
      { star: "天梁", note: "與長輩關係主導，蔭星化權落父母宮，容易在長輩面前也有自己的堅持與主張。" },
      { star: "太陰", note: "與母親關係主導，內斂而堅持己見，母女或母子相處裡常見拉鋸。" },
      { star: "太陽", note: "與父親或上司關係主導，容易與父輩或上司在觀點上互不相讓。" }
    ]),
    ragQuery: { text: "化權 父母宮 長輩 天梁 太陰 太陽 主導 關係 落宮", topic: "家庭" },
    related: ["huaquan-xiongdi-gong", "huaquan-qianyi-gong", "hua-quan"],
  },
];

const PALACE_HUAKE: SihuaPalaceEntry[] = [
  {
    name: "化科入命宮",
    urlSlug: "huake-ming-gong",
    hua: "科",
    huaName: "化科",
    palace: "命宮",
    palaceUrlSlug: "ming-gong",
    title: "化科入命宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 命宮篇 · 氣質裡與生俱來的溫文與名聲",
    oneLine: "化科入命宮，是把氣質與名聲直接寫進性格底色裡——溫文有禮，容易給人好印象。",
    intro: "命宮是命盤的核心，代表性格、外在氣質與整體命運基調。化科入命宮，意味著命主天生帶著一份溫文、有內涵的氣質，容易給人留下好印象、累積好名聲——具體是哪一種氣質，取決於化科星是誰。本文講清化科入命宮的核心含義，哪些星的化科落在此宮最值得留意。",
    grounding: groundingBlockFor("科", "命宮", [
      { star: "紫微", note: "氣度不凡、有名望，帝星化科落命，舉手投足間自帶一份清貴氣質。" },
      { star: "文昌", note: "有文采、氣質書卷，談吐與外在都帶有正統學問的底蘊。" },
      { star: "天機", note: "機智有口碑、氣質靈秀，聰明才智容易外顯為讓人欣賞的談吐。" },
      { star: "太陰", note: "氣質佳、有柔性名望，溫柔細膩，容易給人溫潤舒服的印象。" },
      { star: "武曲", note: "務實有口碑、氣質穩重，不張揚但踏實可靠的形象深入人心。" }
    ]),
    ragQuery: { text: "化科 命宮 氣質 紫微 文昌 天機 太陰 武曲 名聲 落宮", topic: "格局" },
    related: ["huake-guanlu-gong", "huake-fumu-gong", "hua-ke"],
  },
  {
    name: "化科入兄弟宮",
    urlSlug: "huake-xiongdi-gong",
    hua: "科",
    huaName: "化科",
    palace: "兄弟宮",
    palaceUrlSlug: "xiongdi-gong",
    title: "化科入兄弟宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 兄弟宮篇 · 在同輩裡受敬重的智謀",
    oneLine: "化科入兄弟宮，在手足或團隊裡，容易因為智謀或見識而受到敬重。",
    intro: "兄弟宮除了手足緣分，也涉及同輩關係、合夥人與團隊角色。化科入兄弟宮，代表命主在這些關係裡容易以見識或才智贏得敬重。本文講清化科入兄弟宮的核心含義。",
    grounding: groundingBlockFor("科", "兄弟宮", [
      { star: "天機", note: "在團隊中以智謀受敬，天機化科落兄弟宮，容易在同輩或合夥人中以聰明才智服人。" }
    ]),
    ragQuery: { text: "化科 兄弟宮 手足 天機 智謀 敬重 落宮", topic: "家庭" },
    related: ["huake-jiaoyou-gong", "huake-fude-gong", "hua-ke"],
  },
  {
    name: "化科入夫妻宮",
    urlSlug: "huake-fuqi-gong",
    hua: "科",
    huaName: "化科",
    palace: "夫妻宮",
    palaceUrlSlug: "fuqi-gong",
    title: "化科入夫妻宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 夫妻宮篇 · 感情裡的緣分與品味",
    oneLine: "化科入夫妻宮，感情裡容易多一份細水長流的緣分與品味，相處起來體面而有情調。",
    intro: "夫妻宮代表婚姻品質、伴侶特質與感情走向。化科入夫妻宮，容易讓感情關係走得溫和有緣、彼此扶持。本文講清化科入夫妻宮的核心含義，哪些星的化科落在此宮最典型。",
    grounding: groundingBlockFor("科", "夫妻宮", [
      { star: "右弼", note: "感情有助力、易得對方相助，輔星化科落夫妻宮，伴侶常是默默支持的那一個。" },
      { star: "文曲", note: "感情浪漫有情調，才藝與口才為感情增添不少情趣。" },
      { star: "左輔", note: "感情穩、得對方助力，相處踏實，關鍵時刻對方靠得住。" }
    ]),
    ragQuery: { text: "化科 夫妻宮 感情 右弼 文曲 左輔 助力 情調 落宮", topic: "感情" },
    related: ["huake-ming-gong", "huake-fude-gong", "hua-ke"],
  },
  {
    name: "化科入子女宮",
    urlSlug: "huake-zinv-gong",
    hua: "科",
    huaName: "化科",
    palace: "子女宮",
    palaceUrlSlug: "zinv-gong",
    title: "化科入子女宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 子女宮篇 · 子女教養裡的文雅與名聲",
    oneLine: "化科入子女宮，子女或創造性的表達，容易多一份文雅氣質與被肯定的機會。",
    intro: "子女宮除了子女緣分，也關係到創造力與部屬關係。化科入子女宮，代表這個領域容易帶有文雅、受肯定的色彩——子女的學業或才藝表現容易讓人欣賞。本文講清化科入子女宮的核心含義。",
    grounding: groundingBlockFor("科", "子女宮", [
      { star: "文昌", note: "文昌主考試、學業與文書，化科落子女宮時，最常見的表現是子女學業運佳、文書手續（如求學、證件）較順利。" },
      { star: "太陰", note: "太陰主女性與審美柔情，化科的柔性氣質延伸到子女宮，容易讓親子關係或子女的才藝表現多一份文雅細膩。" }
    ]),
    ragQuery: { text: "化科 子女宮 子女 文昌 太陰 學業 才藝 落宮", topic: "家庭" },
    related: ["huake-fuqi-gong", "huake-fumu-gong", "hua-ke"],
  },
  {
    name: "化科入財帛宮",
    urlSlug: "huake-caibo-gong",
    hua: "科",
    huaName: "化科",
    palace: "財帛宮",
    palaceUrlSlug: "caibo-gong",
    title: "化科入財帛宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 財帛宮篇 · 財中帶名的穩健",
    oneLine: "化科入財帛宮，賺錢的方式容易帶有專業與名聲的色彩，穩健而不張揚。",
    intro: "財帛宮代表財富積累方式與理財能力。化科入財帛宮，帶來的不是暴發式的財運，而是靠專業、聲譽、知識穩健生財的模式。本文講清化科入財帛宮的核心含義，哪些星的化科落在此宮最需要留意。",
    grounding: groundingBlockFor("科", "財帛宮", [
      { star: "武曲", note: "理財有聲譽、穩健，以務實專業贏得財務上的好口碑。" },
      { star: "太陰", note: "財中帶名、宜文創或地產，柔性的財富累積方式，適合細水長流。" },
      { star: "文昌", note: "以文字、證照或知識生財，靠考試、寫作或專業證照變現。" },
      { star: "天梁", note: "正途得名利、不宜偏門，財來得穩，但不宜投機或走捷徑。" },
      { star: "紫微", note: "以身份或聲望生財，靠地位與人脈變現而非蠻力賺錢。" }
    ]),
    ragQuery: { text: "化科 財帛宮 財運 武曲 太陰 文昌 天梁 紫微 穩健 名聲 落宮", topic: "財運" },
    related: ["huake-tianzhai-gong", "huake-guanlu-gong", "hua-ke"],
  },
  {
    name: "化科入疾厄宮",
    urlSlug: "huake-jie-gong",
    hua: "科",
    huaName: "化科",
    palace: "疾厄宮",
    palaceUrlSlug: "jie-gong",
    title: "化科入疾厄宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 疾厄宮篇 · 遇險時的貴人與化解",
    oneLine: "化科入疾厄宮，遇到健康狀況時，較容易得到專業或貴人相助而化險為夷。",
    intro: "疾厄宮代表健康狀況與身體易患部位。化科入疾厄宮，帶來的是一種緩衝與化解的力量——遇到健康課題時，較容易遇到對的醫師或貴人。本文講清化科入疾厄宮的核心含義，並提醒：命理的健康提示應作為留意方向，不能替代醫療診斷。",
    grounding: groundingBlockFor("科", "疾厄宮", [
      { star: "武曲", note: "逢險有專業相助化解，遇到健康或意外狀況時，容易得到專業人士的及時協助。" },
      { star: "天梁", note: "逢兇有貴人或良醫化解，蔭星化科落疾厄宮，是十二宮中「遇險有救」色彩最明顯的組合之一。" }
    ]),
    ragQuery: { text: "化科 疾厄宮 健康 武曲 天梁 貴人 化解 落宮", topic: "健康" },
    related: ["huake-fude-gong", "huake-ming-gong", "hua-ke"],
  },
  {
    name: "化科入遷移宮",
    urlSlug: "huake-qianyi-gong",
    hua: "科",
    huaName: "化科",
    palace: "遷移宮",
    palaceUrlSlug: "qianyi-gong",
    title: "化科入遷移宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 遷移宮篇 · 在外得貴人抬舉的名聲",
    oneLine: "化科入遷移宮，在外地、異鄉或公開場合裡，容易憑名聲或氣質得到貴人抬舉。",
    intro: "遷移宮代表出行運勢、外部社會形象與異鄉發展。化科入遷移宮，意味著命主在外的表現容易帶來好名聲，也較容易遇到願意提攜的貴人。本文講清化科入遷移宮的核心含義。",
    grounding: groundingBlockFor("科", "遷移宮", [
      { star: "武曲", note: "在外以專業得貴人，務實的專業能力在異地也容易被看見。" },
      { star: "紫微", note: "在外得貴人抬舉，氣度與身份容易讓人主動釋出善意。" },
      { star: "天機", note: "在外以才智得貴人，靈活的應變與見識在陌生環境裡格外加分。" }
    ]),
    ragQuery: { text: "化科 遷移宮 出行 武曲 紫微 天機 貴人 名聲 落宮", topic: "事業" },
    related: ["huake-guanlu-gong", "huake-jiaoyou-gong", "hua-ke"],
  },
  {
    name: "化科入交友宮",
    urlSlug: "huake-jiaoyou-gong",
    hua: "科",
    huaName: "化科",
    palace: "交友宮",
    palaceUrlSlug: "jiaoyou-gong",
    title: "化科入交友宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 交友宮篇 · 朋友圈裡的口碑與貴人",
    oneLine: "化科入交友宮，朋友與同事之間容易累積良好口碑，貴人也常從這個圈子出現。",
    intro: "交友宮代表朋友質量、同事關係與貴人運。化科入交友宮，容易讓命主在朋友圈或職場人際裡累積穩健的好口碑，貴人緣也隨之增加。本文講清化科入交友宮的核心含義。",
    grounding: groundingBlockFor("科", "交友宮", [
      { star: "右弼", note: "朋友貴人多、口碑佳，輔星化科落交友宮，是十二宮中人緣與口碑表現最直接的組合之一。" },
      { star: "左輔", note: "朋友貴人多、信譽佳，忠厚可靠的形象讓人願意主動相助。" }
    ]),
    ragQuery: { text: "化科 交友宮 朋友 右弼 左輔 貴人 口碑 落宮", topic: "貴人" },
    related: ["huake-guanlu-gong", "huake-xiongdi-gong", "hua-ke"],
  },
  {
    name: "化科入官祿宮",
    urlSlug: "huake-guanlu-gong",
    hua: "科",
    huaName: "化科",
    palace: "官祿宮",
    palaceUrlSlug: "guanlu-gong",
    title: "化科入官祿宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 官祿宮篇 · 事業裡最典型的名聲加持",
    oneLine: "化科入官祿宮，事業容易靠專業與口碑贏得認可，是十二宮裡化科表現最豐富的宮位之一。",
    intro: "官祿宮代表事業格局、職位成就與工作特質，是化科落宮時反應最豐富的宮位之一——幾乎每顆化科星都會在事業上留下清楚的名聲印記。本文講清化科入官祿宮的核心含義，以及哪些星的化科在事業上最值得留意。",
    grounding: groundingBlockFor("科", "官祿宮", [
      { star: "紫微", note: "事業有聲譽、得高層賞識，適合形象、聲望、管理層的角色。" },
      { star: "文昌", note: "靠學歷、文書或考試立業，以正統學問與證照打底。" },
      { star: "天機", note: "以謀略或企劃得名，靠腦力與創意贏得業界口碑。" },
      { star: "太陰", note: "以品味、細膩或文藝得名，適合文創、設計、需要審美的領域。" },
      { star: "武曲", note: "事業以專業得名，靠務實可靠的執行力贏得信任。" }
    ]),
    ragQuery: { text: "化科 官祿宮 事業 紫微 文昌 天機 太陰 武曲 名聲 認可 落宮", topic: "事業" },
    related: ["huake-caibo-gong", "huake-qianyi-gong", "hua-ke"],
  },
  {
    name: "化科入田宅宮",
    urlSlug: "huake-tianzhai-gong",
    hua: "科",
    huaName: "化科",
    palace: "田宅宮",
    palaceUrlSlug: "tianzhai-gong",
    title: "化科入田宅宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 田宅宮篇 · 家宅清雅與置產名聲",
    oneLine: "化科入田宅宮，家宅環境容易帶有清雅氣質，置產過程也較順利有口碑。",
    intro: "田宅宮代表房產不動產、家庭環境與祖業傳承。化科入田宅宮，容易讓家宅氛圍清雅、置產或裝修過程較順利，也較不容易在文書環節出紕漏。本文講清化科入田宅宮的核心含義。",
    grounding: groundingBlockFor("科", "田宅宮", [
      { star: "太陰", note: "家宅清雅有名，太陰化科落田宅宮，居家環境容易營造出溫潤有品味的氛圍。" }
    ]),
    ragQuery: { text: "化科 田宅宮 家宅 太陰 清雅 置產 落宮", topic: "財運" },
    related: ["huake-caibo-gong", "huake-zinv-gong", "hua-ke"],
  },
  {
    name: "化科入福德宮",
    urlSlug: "huake-fude-gong",
    hua: "科",
    huaName: "化科",
    palace: "福德宮",
    palaceUrlSlug: "fude-gong",
    title: "化科入福德宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 福德宮篇 · 精神世界裡的品味與從容",
    oneLine: "化科入福德宮，內心世界容易多一份文雅品味，遇事也較從容不慌。",
    intro: "福德宮代表福氣底蘊、精神世界與內心滿足感。化科入福德宮，影響的不是外在成就，而是命主精神生活的質感——重視品味、遇事從容，內心相對安定。本文講清化科入福德宮的核心含義。",
    grounding: groundingBlockFor("科", "福德宮", [
      { star: "文昌", note: "重精神文雅，文昌化科落福德宮，內心世界偏好書卷、藝文一類的滋養。" },
      { star: "文曲", note: "精神生活豐富有品味，對美感與才藝有較高的內在追求。" }
    ]),
    ragQuery: { text: "化科 福德宮 內心 文昌 文曲 品味 從容 落宮", topic: "格局" },
    related: ["huake-ming-gong", "huake-jie-gong", "hua-ke"],
  },
  {
    name: "化科入父母宮",
    urlSlug: "huake-fumu-gong",
    hua: "科",
    huaName: "化科",
    palace: "父母宮",
    palaceUrlSlug: "fumu-gong",
    title: "化科入父母宮是什麼意思？紫微斗數十二宮詳解",
    subtitle: "十二宮 × 化科 · 父母宮篇 · 與長輩的清貴緣分與文書順利",
    oneLine: "化科入父母宮，與長輩、上司的關係容易清貴融洽，文書契約的往來也較順利。",
    intro: "父母宮代表父母緣分、長上關係與文書貴人運。化科入父母宮，容易讓命主與長輩、上司之間維持一份清貴、互相欣賞的關係，文書與學業上的往來也較少波折。本文講清化科入父母宮的核心含義。",
    grounding: groundingBlockFor("科", "父母宮", [
      { star: "紫微", note: "與長輩或上司關係清貴，彼此相處帶有一份互相尊重的距離感。" },
      { star: "文昌", note: "利文書契約與學業，與學校、機構往來時文件手續較順利。" },
      { star: "右弼", note: "得長輩或貴人扶持，容易在成長過程中遇到願意提攜的長輩。" },
      { star: "太陰", note: "與母親緣佳、受女性長輩助，母女或母子關係溫潤和睦。" }
    ]),
    ragQuery: { text: "化科 父母宮 長輩 紫微 文昌 右弼 太陰 文書 清貴 落宮", topic: "家庭" },
    related: ["huake-xiongdi-gong", "huake-qianyi-gong", "hua-ke"],
  },
];

export const SIHUA_PALACE: SihuaPalaceEntry[] = [
  ...PALACE_HUAJI,
  ...PALACE_HUALU,
  ...PALACE_HUAQUAN,
  ...PALACE_HUAKE,
];

export function getSihuaPalace(urlSlug: string): SihuaPalaceEntry | undefined {
  return SIHUA_PALACE.find(e => e.urlSlug === urlSlug);
}

export const SIHUA_PALACE_HUAJI = PALACE_HUAJI;
export const SIHUA_PALACE_HUALU = PALACE_HUALU;
export const SIHUA_PALACE_HUAQUAN = PALACE_HUAQUAN;
export const SIHUA_PALACE_HUAKE = PALACE_HUAKE;
