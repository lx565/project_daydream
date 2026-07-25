import type { RagQuery } from "@/lib/rag";
import { PALACES } from "@/lib/starData";
import { JI_STEMS, SIHUA_HUAJI } from "@/lib/sihuaData";

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

export const SIHUA_PALACE: SihuaPalaceEntry[] = [...PALACE_HUAJI];

export function getSihuaPalace(urlSlug: string): SihuaPalaceEntry | undefined {
  return SIHUA_PALACE.find(e => e.urlSlug === urlSlug);
}

// Exported per-hua slice so future batches (化祿/化權/化科 × 十二宮) can be
// appended to SIHUA_PALACE the same way sihuaData.ts stacks its five arrays —
// just add PALACE_HUALU / PALACE_HUAQUAN / PALACE_HUAKE arrays below and spread
// them into SIHUA_PALACE.
export const SIHUA_PALACE_HUAJI = PALACE_HUAJI;
