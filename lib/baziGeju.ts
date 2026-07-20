import type { RagQuery } from "@/lib/rag";

// 八字格局 — the "pattern" a chart forms, usually taken from 月令 (month branch).
// 正格 = the eight standard 十神 patterns; 變格 = special patterns (從/化/祿/刃).
export interface GejuEntry {
  name: string;        // 格局名，如「正官格」
  urlSlug: string;     // pinyin slug, e.g. "zhengguan-ge"
  kind: string;        // 「正格」｜「變格」
  takeFrom: string;    // 取格依據，如「月令藏正官透幹」
  title: string;
  subtitle: string;
  oneLine: string;
  intro: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];
}

export const GEJU: GejuEntry[] = [
  {
    name: "正官格", urlSlug: "zhengguan-ge", kind: "正格", takeFrom: "月令本氣為正官，或藏正官透幹",
    title: "正官格：貴氣與名分的正統格局",
    subtitle: "月令正官成格 · 喜財印護、忌傷官衝破",
    oneLine: "月令取正官，主名分、貴氣與社會地位。",
    intro: "正官格是以月令正官為用的正格，傳統視為貴格。成格的關鍵是正官清純不雜、有財生印護；最忌傷官來克（傷官見官）或七殺混雜（官殺混雜）。本文講清正官格的成格條件、破格情形，以及它落在不同身強身弱命局中的高低之別。",
    ragQuery: { text: "正官格 八字 格局 月令 正官 成格 破格 傷官見官 官殺混雜 財官印 用神", topic: "格局" },
    related: ["qisha-ge", "zhengyin-ge", "shangguan-ge"],
  },
  {
    name: "七殺格", urlSlug: "qisha-ge", kind: "正格", takeFrom: "月令本氣為七殺，或藏七殺透幹",
    title: "七殺格：魄力與權威的將帥格局",
    subtitle: "月令七殺成格 · 貴在有制有化",
    oneLine: "月令取七殺，主魄力、權威與開創，貴在制化。",
    intro: "七殺格以月令七殺為用，是最具魄力也最需駕馭的格局。成格關鍵在「有制」（食神制殺）或「有化」（印化殺），制化得宜則掌權成器；無制無化則殺重攻身、多災多險。本文講清七殺格的成敗、食神制殺與殺印相生兩條主路，以及身弱擔殺的風險。",
    ragQuery: { text: "七殺格 偏官格 八字 格局 月令 七殺 食神制殺 殺印相生 有制有化 身弱擔殺", topic: "格局" },
    related: ["zhengguan-ge", "shishen-ge", "yangren-ge"],
  },
  {
    name: "正財格", urlSlug: "zhengcai-ge", kind: "正格", takeFrom: "月令本氣為正財，或藏正財透幹",
    title: "正財格：務實持家的穩健財格",
    subtitle: "月令正財成格 · 喜身旺任財、忌比劫奪財",
    oneLine: "月令取正財，主務實、穩健與正當之財。",
    intro: "正財格以月令正財為用，主務實、勤儉、財源穩定。成格關鍵是身旺能任財、有食傷生財；最忌身弱財重（財多身弱）或比劫林立奪財。本文講清正財格的成敗、身財平衡之道，以及財格配官、財格配印的不同走向。",
    ragQuery: { text: "正財格 八字 格局 月令 正財 身旺任財 財多身弱 比劫奪財 食傷生財 用神", topic: "格局" },
    related: ["piancai-ge", "zhengguan-ge", "jianlu-ge"],
  },
  {
    name: "偏財格", urlSlug: "piancai-ge", kind: "正格", takeFrom: "月令本氣為偏財，或藏偏財透幹",
    title: "偏財格：慷慨善賈的機遇財格",
    subtitle: "月令偏財成格 · 主商場人緣與流動之財",
    oneLine: "月令取偏財，主商業手腕、人緣與流動之財。",
    intro: "偏財格以月令偏財為用，主慷慨、善社交、長於經營，是典型的「財來財去」生意命。成格關鍵同樣是身旺能任、不被比劫劫奪；偏財喜見官星護財（財生官）。本文講清偏財格的成敗、與正財格「固定 vs 流動」的差異，以及經商命的判斷要點。",
    ragQuery: { text: "偏財格 八字 格局 月令 偏財 經商 身旺任財 財生官 比劫奪財 人緣 用神", topic: "格局" },
    related: ["zhengcai-ge", "shishen-ge", "qisha-ge"],
  },
  {
    name: "正印格", urlSlug: "zhengyin-ge", kind: "正格", takeFrom: "月令本氣為正印，或藏正印透幹",
    title: "正印格：學識庇護的清貴格局",
    subtitle: "月令正印成格 · 喜官生印、忌財破印",
    oneLine: "月令取正印，主學識、名譽與長輩庇護。",
    intro: "正印格以月令正印為用，主有福、好學、得貴人提攜，常見於文教、研究之人。成格關鍵是官星生印（官印相生）、印不被財壞；最忌財星壞印（貪財壞印）或印過重而身懶。本文講清正印格的成敗、官印相生的貴氣組合，以及「印多為病」的反作用。",
    ragQuery: { text: "正印格 八字 格局 月令 正印 官印相生 貪財壞印 印多 學識 用神", topic: "格局" },
    related: ["pianyin-ge", "zhengguan-ge", "shangguan-ge"],
  },
  {
    name: "偏印格", urlSlug: "pianyin-ge", kind: "正格", takeFrom: "月令本氣為偏印，或藏偏印透幹",
    title: "偏印格：偏才靈感的梟神格局",
    subtitle: "月令偏印成格 · 又名梟神格 · 忌梟印奪食",
    oneLine: "月令取偏印，主偏才、技藝與敏銳直覺。",
    intro: "偏印格（梟神格）以月令偏印為用，主非主流的智慧、技藝、靈感，多見於玄學、藝術、研究之人。成格關鍵是有官殺生身、偏印轉吉；最忌「梟印奪食」（偏印克倒食神，福氣受損）。本文講清偏印格的成敗、與正印格的差異，以及它何時是天賦、何時是隱患。",
    ragQuery: { text: "偏印格 梟神格 八字 格局 月令 偏印 梟印奪食 食神 偏才 技藝 用神", topic: "格局" },
    related: ["zhengyin-ge", "shishen-ge", "qisha-ge"],
  },
  {
    name: "食神格", urlSlug: "shishen-ge", kind: "正格", takeFrom: "月令本氣為食神，或藏食神透幹",
    title: "食神格：才藝福氣的溫和富格",
    subtitle: "月令食神成格 · 喜食神生財、忌梟神奪食",
    oneLine: "月令取食神，主才藝、口福與溫和的福氣。",
    intro: "食神格以月令食神為用，是公認的吉格，主才藝、享受、衣食無憂。成格關鍵是食神生財（財源由才華而來）或食神制殺（化壓力為成就）；最忌偏印奪食。本文講清食神格的成敗、食神生財與食神制殺兩條富貴路，以及與傷官格的微妙差異。",
    ragQuery: { text: "食神格 八字 格局 月令 食神 食神生財 食神制殺 梟印奪食 才藝 用神", topic: "格局" },
    related: ["shangguan-ge", "piancai-ge", "qisha-ge"],
  },
  {
    name: "傷官格", urlSlug: "shangguan-ge", kind: "正格", takeFrom: "月令本氣為傷官，或藏傷官透幹",
    title: "傷官格：才氣鋒芒的雙刃格局",
    subtitle: "月令傷官成格 · 喜配印生財、忌傷官見官",
    oneLine: "月令取傷官，主才氣、表現欲與鋒芒。",
    intro: "傷官格以月令傷官為用，主才華橫溢、表現欲強、不服管束。成格關鍵在「傷官配印」（印製傷、化才氣為修養）或「傷官生財」（才華變現）；最忌「傷官見官」，傳統視為大忌。本文講清傷官格的成敗、配印與生財兩條路，以及如何讓鋒芒成為助力而非禍根。",
    ragQuery: { text: "傷官格 八字 格局 月令 傷官 傷官見官 傷官配印 傷官生財 才氣 用神", topic: "格局" },
    related: ["shishen-ge", "zhengguan-ge", "zhengyin-ge"],
  },
  {
    name: "建祿格", urlSlug: "jianlu-ge", kind: "變格", takeFrom: "月令為日主的臨官（祿）之地，即比肩當令",
    title: "建祿格：自立自強的祿劫格局",
    subtitle: "月令逢祿 · 身旺需財官洩秀、忌無依比劫",
    oneLine: "月令逢祿（比肩當令），主自立、根基厚、需財官引導。",
    intro: "建祿格（祿劫格之一）指月令正是日主的祿位、比肩當令，日主天生身旺有根。因比肩本身不是可取的「用」，建祿格須另尋財、官、食傷來洩秀引導，身旺有財官則能自立成業；若滿盤比劫無財官，則易破財、孤立。本文講清建祿格的取用思路與成敗關鍵。",
    ragQuery: { text: "建祿格 祿劫格 八字 格局 月令 臨官 比肩 身旺 財官 洩秀 用神", topic: "格局" },
    related: ["yangren-ge", "zhengcai-ge", "qisha-ge"],
  },
  {
    name: "羊刃格", urlSlug: "yangren-ge", kind: "變格", takeFrom: "月令為日主的帝旺之地，即劫財當令（多見陽幹）",
    title: "羊刃格：剛猛魄力的駕殺格局",
    subtitle: "月令逢刃 · 喜七殺駕刃、忌刃旺無制",
    oneLine: "月令逢刃（劫財當令），剛猛有魄力，貴在七殺駕馭。",
    intro: "羊刃格指月令為日主帝旺、劫財當令，氣勢剛猛過旺。羊刃最經典的組合是「羊刃駕殺」——以七殺駕馭羊刃，剛柔相濟則成將帥之才、能成大事；若刃旺無制（無官殺約束），則易衝動、招刑傷、破財。本文講清羊刃格的成敗與「刃殺兩停」的貴格條件。",
    ragQuery: { text: "羊刃格 陽刃格 八字 格局 月令 帝旺 劫財 羊刃駕殺 七殺 剛猛 用神", topic: "格局" },
    related: ["jianlu-ge", "qisha-ge", "shangguan-ge"],
  },
  {
    name: "從格", urlSlug: "congge", kind: "變格", takeFrom: "日主極弱無根，棄命順從全域性最旺之勢",
    title: "從格：棄命相從的特殊格局",
    subtitle: "日主無根 · 順勢則貴、逢生扶反兇",
    oneLine: "日主極弱無根，棄命順從旺神，順之則吉、逆之則兇。",
    intro: "從格是日主極弱、全無根氣時，乾脆「棄命相從」最強的那股勢力，常見從財、從殺（從官）、從兒（從食傷）、從強從旺等。從格斷法與常規相反：順從旺神為吉，逢印比生扶反而破格招災。本文講清從格的成立條件（真從 vs 假從）、各類從格的取用，以及最容易誤判的地方。",
    ragQuery: { text: "從格 八字 格局 日主無根 棄命相從 從財 從殺 從兒 真從假從 用神", topic: "格局" },
    related: ["huaqi-ge", "piancai-ge", "qisha-ge"],
  },
  {
    name: "化氣格", urlSlug: "huaqi-ge", kind: "變格", takeFrom: "日主與月時幹相合且逢化神當令，合化成功別成一氣",
    title: "化氣格：合化成象的玄妙格局",
    subtitle: "天干合化成功 · 真化為貴、化神受克則破",
    oneLine: "日主合化成另一五行（如甲己合化土），化真則貴。",
    intro: "化氣格指日主天干與相鄰之幹相合（甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火），且化神得月令之氣，合化成功而別成一氣。真化得令、化神不受克則為貴格；若化神被克或日主有根不肯化，則為「假化」多波折。本文講清化氣格的成立條件、真化假化之別與判斷要點。",
    ragQuery: { text: "化氣格 八字 格局 天干合化 甲己合土 化神得令 真化假化 月令 用神", topic: "格局" },
    related: ["congge", "zhengyin-ge", "shishen-ge"],
  },
];

export function getGeju(urlSlug: string): GejuEntry | undefined {
  return GEJU.find(g => g.urlSlug === urlSlug);
}
