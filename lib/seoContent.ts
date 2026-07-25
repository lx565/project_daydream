import fs from "fs";
import path from "path";
import { getKnowledge } from "./rag";
import { synthesize } from "./synthesize";
import type { Reference } from "./rag";
import { MAJOR_STARS, PALACES } from "./starData";
import { starGroundingBlock } from "./starFacts";
import type { GuideTopic } from "./guideTopics";
import type { BookArticle } from "./bookArticles";
import type { ShishenEntry } from "./baziShishen";
import type { TianganEntry } from "./baziTiangan";
import type { GejuEntry } from "./baziGeju";
import type { BaziGuideEntry } from "./baziGuide";
import type { MinggeEntry } from "./minggeData";
import { minggeGroundingBlock } from "./minggeData";
import { buildExampleSection } from "./minggeExampleUtils";
import type { AssistantStarDef } from "./assistantStarData";
import { assistantStarGroundingBlock } from "./assistantStarData";
import type { QingganEntry } from "./qingganData";
import type { SihuaEntry } from "./sihuaData";
import type { SihuaPalaceEntry } from "./sihuaPalaceData";
import type { XiongEntry } from "./xiongData";
import type { LiuNianEntry } from "./liuNianData";
import type { HunyinEntry } from "./hunyinData";
import type { ShiyeEntry } from "./shiyeData";
import type { CaiyunEntry } from "./caiyunData";
import type { JibingEntry } from "./jibingData";
import type { BaziHunyinEntry } from "./baziHunyinData";
import type { BaziShiyeEntry } from "./baziShiyeData";
import type { BaziCaiyunEntry } from "./baziCaiyunData";
import type { BaziJibingEntry } from "./baziJibingData";
import type { ShenshaEntry } from "./shenshaData";
import type { SourceBook } from "./sourcesData";
import type { StarMbtiEntry, MbtiEntry, StarZodiacEntry, ZodiacZiweiEntry } from "./personalityData";
import { starMbtiGroundingBlock, mbtiZiweiGroundingBlock, starZodiacGroundingBlock, zodiacZiweiGroundingBlock } from "./personalityData";

// Pre-generated, proofread content store. When a reviewed file exists it is served
// verbatim (deterministic, no runtime AI). Missing file => fall back to live synth.
function readPregenerated(kind: "star" | "palace" | "guide" | "mingge" | "assistantstar" | "personality" | "book" | "sources" | "shishen" | "tiangan" | "geju" | "baziguide" | "zodiac" | "qinggan" | "sihua" | "sihua-palace" | "xiong" | "liunian" | "hunyin" | "shiye" | "caiyun" | "jibing" | "bazi-hunyin" | "bazi-shiye" | "bazi-caiyun" | "bazi-jibing" | "shensha", key: string): SeoContent | null {
  try {
    const file = path.join(process.cwd(), "content", "seo", kind, `${key}.json`);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { markdown?: string; refs?: Reference[] };
    if (!data.markdown || !data.markdown.trim()) return null;
    return { markdown: data.markdown, refs: data.refs ?? [] };
  } catch {
    return null;
  }
}

type StarDef = (typeof MAJOR_STARS)[number];
type PalaceDef = (typeof PALACES)[number];

// Deep teaching content uses DeepSeek's higher-capability tier: strong logic +
// best 紫微斗数 domain accuracy. Override with SEO_AI_MODEL. Separate from live
// readings. (2026-07-25: deepseek-reasoner was retired by DeepSeek in favor of
// deepseek-v4-pro/deepseek-v4-flash — see lib/synthesize.ts for the full note.)
const SEO_MODEL = process.env.SEO_AI_MODEL ?? "deepseek-v4-pro";

// Shared rules: synthesize ONLY readable modern 繁體中文, silently discarding any
// reference fragment that is non-Chinese, garbled, or off-topic.
const BASE_RULES = `你是命里平台的紫微斗數命理師，為面向大眾的知識科普頁面撰寫內容。

嚴格要求：
1. 全文必須是通順、現代的繁體中文（臺灣用語習慣）。絕對不要出現英文、簡體字、亂碼或古籍原文照抄。
2. 下方「典籍參考」僅供你提煉，其中可能混有無關、殘缺或非中文的片段——請自行甄別，只採用真正相關、可信的內容，無關片段一律忽略。
3. 用平實易懂的語言解釋，像懂行的朋友在講解，不堆砌術語；必須出現的術語用一句話點明含義。
4. 內容具體、有信息量，不空泛、不套話、不嚇人、不算命下定論，落點在幫助讀者理解自己。
5. 只輸出正文 Markdown，不要前言、不要「以下是」「希望對你有幫助」之類的話。`;

export interface SeoContent {
  markdown: string;
  refs: Reference[];
}

/** Star × Palace combination page. */
export async function getStarPalaceContent(star: StarDef, palace: PalaceDef, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("star", `${star.name}__${palace.name}`);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    stars: [star.name],
    palaces: [palace.name],
    topic: palace.topic,
    text: `${star.name} ${palace.name} 紫微斗数 庙旺 落陷 四化 同宫 性格 运势 格局 解读`,
    topK: 10,
    maxPerBook: 3,
  });

  const system = BASE_RULES + `

你正在撰写一篇深入的紫微斗数教学文章：「${star.name}在${palace.name}」。要有真正的命理逻辑与层次，逐步推演，绝不能泛泛而谈、堆砌套话。

输出结构（用 ## 二级标题，逐节展开，论述具体、有条理、互不重复）：
## 星性与宫义
（先点明${star.name}的星性本质——五行（属${star.element}）、阴阳、所属星系与核心象征；再说明它落入${palace.name}（主${palace.brief}）整体意味着什么。约160字）
## 星曜组合与庙旺
（严格依据下方"权威定盘资料"：${star.name}会因所在地支不同而呈现几种主要组合——或独坐、或与某主星同宫；说明这几种组合各自的特点，以及庙旺亮度强弱如何影响其在${palace.name}的发挥。只能使用资料中给出的同宫星与亮度，绝不可自行编造或调换。约200字）
## 性格与具体表现
（这一组合在${palace.brief}方面的具体表现：性格、行为模式、优势与隐患并陈，结合现实生活场景，让人能对号入座。约200字）
## 四化的影响
（严格依据下方资料中${star.name}"可参与的四化"：只讲${star.name}真正能化的那几种（化禄/权/科/忌）落入${palace.name}时的吉凶变化；若${star.name}不参与某一化，绝不可杜撰，可改为说明其他星曜之化飞入或冲照本宫的影响。约170字）
## 同宫与会照
（与吉星——左辅右弼、文昌文曲、天魁天钺——同宫或三方四正会照，与煞星——擎羊陀罗、火星铃星、地空地劫——同宫会照时，结果有何不同。约160字）
## 大限或流年走此宫
（当大限或流年行经${palace.name}、引动${star.name}时，该领域可能发生的事与需要注意之处。约120字）
## 给你的提醒
（3-4条具体、可操作、现代化的建议，每条用 - 开头，务实暖心）

最高原则：凡涉及${star.name}的同宫主星、庙旺亮度、可化四化，一律以下方"权威定盘资料"为准，不得矛盾、不得杜撰星曜或格名。典籍参考仅用于充实性格与吉凶论述。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主星】${star.name}（五行属${star.element}，${star.polarity}）：${star.brief}
【宫位】${palace.name}（主：${palace.brief}）

${starGroundingBlock(star.name)}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数通论严谨撰写）"}

请据此撰写「${star.name}在${palace.name}」的深入解读。`;

  const markdown = await synthesize({ tag: "star", system, prompt, model: SEO_MODEL, maxTokens: 3800 });
  return { markdown, refs };
}

/** Guide topic page. */
export async function getGuideContent(topic: GuideTopic, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("guide", topic.slug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...topic.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = BASE_RULES + `

这是一篇紫微斗数知识科普文章，标题为「${topic.title}」。要有真正的深度、逻辑与教学性，循序渐进地把道理讲透，绝不堆砌套话。

输出结构（用 ## 二级标题，4-6 节，每节约120-220字）：
- 开篇讲清这个概念"是什么"，给出清晰准确的定义
- 解释它"为什么重要 / 在命盘中如何运作"，把内在逻辑讲明白
- 举具体例子或常见情形帮助理解
- 指出初学者常见的误区或容易混淆之处
- 收束于如何实际应用

逻辑必须自洽；专业术语首次出现时用一句话点明含义；不要照抄下面的导语原文，要在其基础上展开、深化。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${topic.title}——${topic.subtitle}
【导语】${topic.intro}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数通论严谨撰写）"}

请撰写这篇科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

const ALL_STAR_NAMES = MAJOR_STARS.map((s) => s.name).join("、");

/** Palace hub page: overviews the palace + walks through all 14 major stars in it. */
export async function getPalaceHubContent(palace: PalaceDef, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("palace", palace.name);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    palaces: [palace.name],
    stars: MAJOR_STARS.map((s) => s.name),
    topic: palace.topic,
    text: `${palace.name} 十四主星 各星表现 庙旺 落陷 四化 怎么看 ${palace.brief}`,
    topK: 12,
    maxPerBook: 2,
  });

  const system = BASE_RULES + `

你正在撰写紫微斗数中「${palace.name}」的系统总览教学文章。${palace.name}主${palace.brief}。
要有逻辑、有层次地把这个宫位讲清楚，并系统概述十四主星落入此宫的不同表现，纲举目张，便于初学者对照学习。

输出结构（用 ## 二级标题）：
## ${palace.name}主管什么
（这个宫位在命盘中代表的人生领域、它能看出什么、判断时的着眼点，约170字）
## 怎么看${palace.name}
（解读一个宫位要综合哪些要素：主星庙旺、四化飞星、三方四正会照、煞星吉星——讲清方法逻辑，约170字）
## 十四主星在${palace.name}的表现
（依次简述 ${ALL_STAR_NAMES} 这十四颗主星落入${palace.name}时各自的关键特征，每颗星用"**星名**：……"开头独立成行，1-2句点出要害，务必十四颗齐全、各有分别、不可含糊雷同。约450字）
## 常见误区
（关于${palace.name}的常见误解或易错点，约110字）

逻辑必须自洽，典籍参考用于佐证，不足处依通论补充，但不可臆造不存在的星曜或断语。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【宫位】${palace.name}（主：${palace.brief}）

【典籍参考】
${context || "（无可用参考，请基于紫微斗数通论严谨撰写）"}

请撰写${palace.name}的系统总览，并逐一概述十四主星在此宫的表现。`;

  const markdown = await synthesize({ tag: "palace", system, prompt, model: SEO_MODEL, maxTokens: 4200 });
  return { markdown, refs };
}

/** 命格 (named destiny pattern / 格局) page. */
export async function getMinggeContent(entry: MinggeEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("mingge", entry.slug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    stars: entry.stars,
    topic: entry.topic,
    text: `${entry.name} ${entry.brief} 紫微斗数 格局 入格条件 命格 吉凶 特征`,
    topK: 12,
    maxPerBook: 3,
  });

  const grounding = minggeGroundingBlock(entry);

  const XIONGE_EXTRA = entry.type === "兇格" ? `

【凶格特别写作要求】
这是一个被古人归为"凶格"的格局，但现代人读到它时容易产生不必要的焦虑与恐惧。请务必做到：
1. 以关怀、理解、引导为主基调，像一位懂命理的朋友在开解你，而非算命师在宣判凶吉。
2. 用现代心理与行为科学的视角重新诠释"凶"的含义——这是一种特定的能量模式或人生课题，不是诅咒。
3. "给你的提醒"部分要特别温暖、具体、有可操作性，帮助读者把这个格局转化为自我认知与成长的资源。
4. 绝对不要渲染恐惧、不要堆叠灾祸描述、不要用"必然""一定"等断语来谈不利结果。
5. 可以诚实说明潜在挑战，但落点永远是"如何应对""如何善用""如何化解"。` : "";

  const system = BASE_RULES + `

你正在撰写一篇深入的紫微斗数科普文章：「${entry.name}」。这是一个${entry.type}，要从命理逻辑出发，把这个格局讲透讲准，帮助读者理解它的本质、成格条件与人生影响。
${XIONGE_EXTRA}
输出结构（用 ## 二级标题，逐节展开，论述具体、有条理、互不重复）：
## 格局定义与成格条件
（清晰说明${entry.name}的本质含义、需要哪些星曜在哪些位置满足什么条件才算入格；约200字）
## 入格者的命运特质
（入格者在性格、人生走向、事业财运等方面的典型表现，结合具体场景，有信息量；${entry.type==="兇格"?"重点写这些特质如何在现代生活中转化为自我认知的机会；":""}约200字）
## 格局强弱的影响因素
（哪些因素会让格局更强（如得吉星辅佐、庙旺之地）或更弱（如煞忌冲破、失陷）；约180字）
## 不同宫位与四化的变化
（格局因落入不同宫位（命宫/事业宫/财帛宫等）或遇化禄/化权/化科/化忌时，表现有何差异；约170字）
## 古籍论述与现代解读
（引用一条相关古诀并做现代翻译，结合当代生活场景举例说明；约150字）
## 给你的提醒
（3-4条具体可操作的建议，每条 - 开头，务实暖心，落点在"如何善用与应对"，适合有此格局的现代人参考）

最高原则：涉及星曜同宫、亮度、四化，以下方"格局权威定盘资料"为准；不可虚构入格条件或星曜组合；措辞平实暖心，不夸大吉凶。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const exampleSection = buildExampleSection(entry, 2);

  const prompt = `${grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数通论严谨撰写）"}
${exampleSection ? `\n${exampleSection}` : ""}
请据此撰写「${entry.name}」的深入解读。`;

  const markdown = await synthesize({ tag: "mingge", system, prompt, model: SEO_MODEL, maxTokens: 3800 });
  return { markdown, refs };
}

/** Assistant star (辅星) × Palace combination page. */
export async function getAssistantStarPalaceContent(star: AssistantStarDef, palace: PalaceDef, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("assistantstar", `${star.name}__${palace.name}`);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    stars: [star.name],
    palaces: [palace.name],
    topic: palace.topic,
    text: `${star.name} ${palace.name} 紫微斗数 辅星 贵人 煞星 同宫 影响 解读`,
    topK: 8,
    maxPerBook: 3,
  });

  const grounding = assistantStarGroundingBlock(star);

  const typeDesc = star.type === "auspicious" ? "吉星" : "煞星/耗星";

  const system = BASE_RULES + `

你正在撰写一篇深入的紫微斗数教学文章：「${star.name}在${palace.name}」。${star.name}是${star.group}，属${typeDesc}。要有真正的命理逻辑与层次，绝不能泛泛而谈。

注意：${star.name}是辅星，位置由出生时辰决定，没有固定的"庙旺亮度"表——文章不需要讨论庙旺度数，而要重点讲星性影响与宫位互动。

输出结构（用 ## 二级标题，逐节展开，论述具体、有条理、互不重复）：
## 星性概要
（先说明${star.name}的本质——它属于${star.group}、代表什么象征与能量、在紫微斗数中扮演什么角色；约160字）
## 落入${palace.name}的含义
（${star.name}进入${palace.name}（主${palace.brief}）时，会如何影响这一宫位的整体运势与人生领域；约200字）
## 与主星的互动
（${star.name}与${palace.name}中常见的主星同宫或会照时，各有什么具体影响——吉星与主星共处 vs 煞星如何削减主星之力；举2-3个典型主星组合说明；约200字）
## 四化与化忌的影响
（严格依据下方"权威定性资料"中四化规则：${star.name}是否可以参与四化？如可，${star.name}化忌时在${palace.name}有何影响；如不可，则讲其他宫位的四化飞入本宫时，${star.name}在此的加持或冲突；约170字）
## 大限或流年走此宫
（当大限或流年行经${palace.name}、引动${star.name}时，该领域可能发生的事与需要注意之处；约130字）
## 给你的提醒
（3-4条具体、可操作、现代化的建议，每条用 - 开头，务实暖心）

最高原则：凡涉及${star.name}的星性、四化参与规则、与其他星曜的固定互动，以下方"权威定性资料"为准，不得矛盾、不得杜撰。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【辅星】${star.name}（${star.group}，五行属${star.element}）：${star.brief}
【宫位】${palace.name}（主：${palace.brief}）

${grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数通论严谨撰写）"}

请据此撰写「${star.name}在${palace.name}」的深入解读。`;

  const markdown = await synthesize({ tag: "assistantstar", system, prompt, model: SEO_MODEL, maxTokens: 3200 });
  return { markdown, refs };
}

/** 紫微×MBTI: Star → MBTI crossover article. */
export async function getStarMbtiContent(entry: StarMbtiEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("personality", entry.slug);
    if (pre) return pre;
  }

  const grounding = starMbtiGroundingBlock(entry);

  const system = BASE_RULES + `

你正在撰写一篇创新的跨文化人格分析文章：「${entry.starName}星命宫 × MBTI ${entry.primaryMbti}（${entry.primaryMbtiName}）」。
这是命里平台独家研究：用紫微斗数的星曜语言，对照西方MBTI人格框架，帮助读者用两套语言立体认识自己。

写作基调：平实、现代、像一位懂命理又懂心理学的朋友在分析；不是占卜，是自我认知工具；不强调吉凶，重点在于帮人理解自己的行为模式与人生倾向。

输出结构（用 ## 二级标题，逐节展开，论述具体有深度，互不重复）：
## ${entry.starName}星的性格底色
（先从紫微斗数视角，把${entry.starName}星在命宫时的性格特质讲清楚——五行底色、处世方式、典型行为模式；约180字）
## 为什么对应${entry.primaryMbti}（${entry.primaryMbtiName}）？
（从MBTI角度解释${entry.primaryMbti}是什么样的人，再逐一对比：两套系统在认知方式、行动风格、人际关系上如何不谋而合；举具体例子；约250字）
## ${entry.secondaryMbti}（${entry.secondaryMbtiName}）变体
（解释为什么同是${entry.starName}命宫，有时会更接近${entry.secondaryMbti}——是因为三方四正的星曜不同、还是化禄化忌的影响？让读者能自我对照；约160字）
## 人生印证：职业与感情
（从这两个系统共同指向的职业天赋、财富模式、感情风格展开，不泛谈，举具体方向；约180字）
## 用两套语言认识自己
（提示读者：紫微斗数看"天生底牌"，MBTI看"行为偏好"，两者结合比单一框架更立体；简短点出如何综合运用；约100字）
## 给你的提醒
（3-4条具体、可操作、现代化的建议，每条用 - 开头，针对${entry.primaryMbti}/${entry.starName}命宫者的实际痛点与成长方向）`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `${grounding}

请撰写「${entry.starName}星命宫 × MBTI ${entry.primaryMbti} ${entry.primaryMbtiName}」的深度分析文章。`;

  const markdown = await synthesize({ tag: "personality", system, prompt, model: SEO_MODEL, maxTokens: 3500 });
  return { markdown, refs: [] };
}

/** 紫微×MBTI: MBTI → 紫微 reverse-lookup article. */
export async function getMbtiZiweiContent(entry: MbtiEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("personality", entry.slug);
    if (pre) return pre;
  }

  const grounding = mbtiZiweiGroundingBlock(entry);

  const system = BASE_RULES + `

你正在撰写一篇创新的跨文化人格分析文章：「${entry.mbtiCode}（${entry.mbtiName}）的紫微斗数命盘画像」。
目标读者是已知自己MBTI类型的人，他们想知道：从紫微斗数角度，自己对应什么样的命盘？

写作基调：平实、现代、有洞察力；帮助读者用命理视角补充西方人格学的盲区，看到自己的"天生底牌"；不是算命，是自我认知的延伸。

输出结构（用 ## 二级标题，逐节展开，论述具体有深度）：
## ${entry.mbtiCode}是什么样的人？
（用平实的现代中文解释${entry.mbtiCode}的核心特征——认知方式、行为偏好、优势与盲点；约150字）
## 紫微斗数中的对应画像：${entry.primaryStar}星
（为什么${entry.primaryStar}星是${entry.mbtiCode}最典型的对应？从星性、五行、命宫特质逐一对比，让读者能"认出"自己；约250字）
${entry.secondaryStars.length ? `## 其他共鸣星曜：${entry.secondaryStars.join("、")}
（解释命盘中这些星曜出现时，同样能呈现${entry.mbtiCode}特质——什么情形下你是这些星的变体？约180字）` : ""}
## 典型命盘特征
（${entry.mbtiCode}者的命盘常有哪些规律？不是说每个人都一样，而是点出高频出现的星曜组合、宫位结构或四化模式；约180字）
## 职业天赋与财富结构
（两套系统共同指向的优势职业方向、赚钱方式，具体而非泛泛；约150字）
## 给你的提醒
（3-4条针对${entry.mbtiCode}/${entry.primaryStar}命宫者的具体建议，温暖、可操作，每条用 - 开头）`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `${grounding}

请撰写「${entry.mbtiCode}（${entry.mbtiName}）的紫微斗数命盘画像」分析文章。`;

  const markdown = await synthesize({ tag: "personality", system, prompt, model: SEO_MODEL, maxTokens: 3200 });
  return { markdown, refs: [] };
}

/** 紫微×星座: 主星 → 星座 原型对照 article. */
export async function getStarZodiacContent(entry: StarZodiacEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("zodiac", entry.slug);
    if (pre) return pre;
  }

  const grounding = starZodiacGroundingBlock(entry);

  const system = BASE_RULES + `

你正在撰写一篇跨文化性格对照文章：「${entry.starName}星命宫 × ${entry.primaryZodiac}」。
这是命里平台独家研究：用大家熟悉的西方星座，去类比、对照陌生的紫微斗数主星，帮读者用两套语言立体认识自己。

【铁则·贯穿全文】紫微主星与西方星座没有任何天文或历史渊源，是两套互不相干的系统。本文做的是"性格原型对照 / 异曲同工"，绝不能写成"${entry.starName}星=${entry.primaryZodiac}"这种等同句——那是事实错误。要用"很像 / 让人联想到 / 在原型上呼应"这类措辞，并主动点出两者的差异。

写作基调：平实、现代、像一位既懂命理又熟悉星座的朋友在聊；不是占卜，是自我认知工具；不强调吉凶，重点在帮人理解自己的行为模式与人生倾向。

输出结构（用 ## 二级标题，逐节展开，论述具体有深度，互不重复）：
## ${entry.starName}星的性格底色
（先从紫微斗数视角，把${entry.starName}星在命宫时的性格特质讲清楚——五行底色、处世方式、典型行为模式；约180字）
## 为什么让人联想到${entry.primaryZodiac}？
（先简述${entry.primaryZodiac}的性格原型，再逐一对照：两套系统在性格气质、行动风格、人际关系上哪些地方"异曲同工"；举具体例子；同时点明二者并非等同、各自的侧重差异；约250字）
## 也有${entry.secondaryZodiac}的影子
（解释为什么同是${entry.starName}命宫，有人会更接近${entry.secondaryZodiac}的原型——是三方四正的星曜不同、还是化禄化忌的影响？让读者自我对照；约160字）
## 性格落地：职业与感情
（从这种性格底色共同指向的职业天赋、相处与感情风格展开，不泛谈，举具体方向；约180字）
## 用两套语言认识自己
（提示读者：星座是大众熟悉的入口，紫微斗数能看到更细的"天生底牌"；两者是类比关系而非同一回事，结合着看更立体；约100字）
## 给你的提醒
（3-4条具体、可操作、现代化的建议，每条用 - 开头，针对${entry.starName}命宫者的实际成长方向）`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "")
    + ANTI_CLICHE;

  const prompt = `${grounding}

请撰写「${entry.starName}星命宫 × ${entry.primaryZodiac}」的性格原型对照文章。`;

  const markdown = await synthesize({ tag: "zodiac", system, prompt, model: SEO_MODEL, maxTokens: 3500 });
  return { markdown, refs: [] };
}

/** 紫微×星座: 星座 → 紫微 reverse-lookup article. */
export async function getZodiacZiweiContent(entry: ZodiacZiweiEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("zodiac", entry.slug);
    if (pre) return pre;
  }

  const grounding = zodiacZiweiGroundingBlock(entry);

  const system = BASE_RULES + `

你正在撰写一篇跨文化性格对照文章：「${entry.zodiacName}的紫微斗数命盘原型」。
目标读者是已经熟悉自己星座的人，他们想知道：换成紫微斗数的语言，自己的性格原型最像哪颗星？

【铁则·贯穿全文】西方星座与紫微主星没有任何天文或历史渊源，是两套互不相干的系统。本文做的是"性格原型对照"，绝不能写成"${entry.zodiacName}=${entry.primaryStar}星"这种等同句——那是事实错误。要用"在原型上接近 / 让人联想到"这类措辞，并主动点出两者的差异。

写作基调：平实、现代、有洞察力；帮读者用命理视角补充星座的盲区，看到自己的"天生底牌"；不是算命，是自我认知的延伸。

输出结构（用 ## 二级标题，逐节展开，论述具体有深度）：
## ${entry.zodiacName}是什么样的人？
（用平实的现代中文讲清${entry.zodiacName}的性格原型——气质、行为偏好、优势与盲点；约150字）
## 紫微斗数里的对照画像：${entry.primaryStar}星
（为什么${entry.primaryStar}星的性格原型最接近${entry.zodiacName}？从星性、五行、命宫特质逐一对照，让读者"认出"自己；同时点明二者并非等同、各有侧重；约250字）
${entry.secondaryStars.length ? `## 其他相近的星曜：${entry.secondaryStars.join("、")}
（解释命盘中这些星曜出现时，同样能呈现接近${entry.zodiacName}的气质——什么情形下你更像这些星？约180字）` : ""}
## 典型命盘特征
（性格原型接近${entry.zodiacName}的人，命盘常有哪些规律？不是说每个人都一样，而是点出高频出现的星曜组合或宫位结构；约160字）
## 职业天赋与相处之道
（这种性格原型共同指向的优势职业方向、相处与感情风格，具体而非泛泛；约150字）
## 给你的提醒
（3-4条针对${entry.zodiacName}/${entry.primaryStar}命宫原型者的具体建议，温暖、可操作，每条用 - 开头）`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "")
    + ANTI_CLICHE;

  const prompt = `${grounding}

请撰写「${entry.zodiacName}的紫微斗数命盘原型」对照文章。`;

  const markdown = await synthesize({ tag: "zodiac", system, prompt, model: SEO_MODEL, maxTokens: 3200 });
  return { markdown, refs: [] };
}

/** 命理书单 — book article page. */
export async function getBookContent(article: BookArticle, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("book", article.slug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...article.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const categoryInstruction = {
    "書單推薦": `这是一篇书单推荐文章，帮助读者选择适合自己的命理典籍。
要点：
- 清晰说明每本推荐书的核心价值与适合读者群体
- 给出明确的阅读顺序建议，并解释顺序的理由
- 指出初学者常见的选书错误
- 结尾给出可操作的第一步建议`,
    "書籍對比": `这是一篇书籍对比文章，帮助读者在两个选项之间做出选择。
要点：
- 清晰呈现两者的核心区别（理论体系、难度、适合人群）
- 不要说"各有优劣"然后含糊其辞——要给出具体的推荐结论
- 解释在什么情况下该选哪本/哪派
- 避免假装两边完全对等，要帮读者做决策`,
    "書籍深度解讀": `这是一篇书籍深度解读文章，帮助读者理解一本命理典籍的核心价值。
要点：
- 准确介绍书的成书背景（作者、年代、历史意义）——对不确定的细节用「据传」或「史料记载有限」等表述，不得虚构
- 清楚解释这本书的核心理论是什么
- 说明这本书对后世命理学的影响
- 给出具体的阅读建议：该配合哪些书一起读、难度如何、哪些章节最重要`,
    "作者人物傳": `这是一篇命理作者人物传记文章，介绍一位命理大师的生平与思想。
要点：
- 对生平细节谨慎处理——史料有限时明确说明「史料极少」或「据传」，绝不虚构出生年月、具体事迹或引语
- 重点在思想贡献：他的命理体系有何独特之处？解决了什么问题？
- 说明他在命理史上的地位与后续影响
- 推荐1-2本最能代表其思想的著作，并说明从哪里入手`,
  }[article.category];

  const system = BASE_RULES + `

这是一篇命理书单知识科普文章，标题为「${article.title}」，类别为「${article.category}」。

${categoryInstruction}

通用要求：
- 内容必须准确：对不确定的历史细节（如出生年月、具体引语、确切年代），用「据传」「史料记载有限」等表述，绝不虚构
- 对比类文章不要两边都夸、含糊其辞，要给出明确结论和推荐
- 每个段落必须有具体信息，不说废话、不套话
- 结尾给读者一条可操作的建议

输出结构（用 ## 二级标题，4-6 节，每节约120-200字）：
- 开篇清楚界定主题（这本书/这位作者/这个比较的核心是什么）
- 中段深入展开（核心理论、历史背景、影响、差异）
- 实用建议收束（如何选择、如何阅读、从哪里开始）`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${article.title}——${article.subtitle}
【类别】${article.category}
【导语】${article.intro}

【典籍参考】
${context || "（无可用参考，请基于命理历史通论严谨撰写）"}

请撰写这篇命理书单文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// Anti-AI-tell rules — shared by 八字 content + the book de-template pass.
// Targets the templated skeleton + filler phrases that make text read as AI.
export const ANTI_CLICHE = `
【反套路 · 务必遵守，否则视为不合格】
1. 不要套用固定模板。不要每篇都按"是什么→核心理论→历史影响→阅读建议→可操作建议"的同一套骨架走；根据这个主题本身最该讲什么来组织，章节标题要具体、有信息量，不要千篇一律。
2. 禁止以下陈词滥调与口头禅（出现即扣分）：「绕不开」「不可或缺」「举足轻重」「承前启后」「返璞归真」「事半功倍」「从猜到算 / 从猜谜到解题」「值得一提的是」「总而言之」「淋漓尽致」「了如指掌」「字字珠玑」；「据传」「史料极少 / 记载有限」只在确实不确定时才用一次，不要当口头禅反复出现。
3. 不要每篇都用加粗的「给你的可操作建议 / 一句话建议」当结尾——可以收在一个具体的观点、判断或例子上。
4. 用具体的例子、对比和细节代替泛泛而谈。要有自己的观点和取舍，像一个真正读懂了的人在跟朋友讲，而不是百科词条式的中立罗列。`;

// Shared rules for 八字 content (BASE_RULES is 紫微-specific).
const BAZI_BASE_RULES = `你是命里平台的八字（子平）命理師，為面向大眾的知識科普頁面撰寫內容。

嚴格要求：
1. 全文必須是通順、現代的繁體中文（臺灣用語習慣）。絕對不要出現英文、簡體字、亂碼或古籍原文照抄。
2. 下方「典籍參考」僅供你提煉，其中可能混有無關、殘缺或非中文的片段——請自行甄別，只採用真正相關、可信的內容，無關片段一律忽略。
3. 用平實易懂的語言解釋，像懂行的朋友在講解，不堆砌術語；必須出現的術語用一句話點明含義。
4. 內容具體、有信息量，不空泛、不套話、不嚇人、不算命下定論，落點在幫助讀者理解自己。
5. 只輸出正文 Markdown，不要前言、不要「以下是」「希望對你有幫助」之類的話。` + ANTI_CLICHE;

/** 八字 十神 (Ten Gods) explainer page. */
export async function getShishenContent(entry: ShishenEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("shishen", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = BAZI_BASE_RULES + `

这是一篇八字十神科普文章，主题为「${entry.name}」（属${entry.pair}）。

【十神定义务必准确】「${entry.name}」是日主与某一天干之间的关系：${entry.oneLine}务必把"生克同"与"阴阳异同"讲对，不得张冠李戴。

要点：
- 先用一两句把"${entry.name}"是什么关系讲清楚（谁生谁、谁克谁、阴阳同异），并翻译成生活化的含义
- 讲它得用（吉）与为忌（凶）时分别是什么样的人、什么样的处境，避免一味说好或说坏
- 点明它与同类十神（如${entry.pair}里的另一个）的关键差异
- 介绍1-2个与它相关的经典组合或格局（如正官→官印相生、伤官→伤官见官/伤官配印），组合名称必须真实存在，不得虚构
- 结尾给读者一条"如何在自己八字里看这个十神"的可操作建议

输出结构（用 ## 二级标题，4-6 节，每节约120-200字）。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【典籍参考】
${context || "（无可用参考，请基于八字命理通论严谨撰写）"}

请撰写这篇八字十神科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

/** 八字 十天干日主 (day master) explainer page. */
export async function getTianganContent(entry: TianganEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("tiangan", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = BAZI_BASE_RULES + `

这是一篇八字"日主天干"科普文章，主题为「${entry.gan}${entry.element}日主」（${entry.yinyang}${entry.element}，物象：${entry.image}）。

【五行属性务必准确】「${entry.gan}」是${entry.yinyang}${entry.element}，不得写错五行或阴阳。用「${entry.image}」这个物象来帮助读者理解它的性情。

要点：
- 先把"${entry.gan}${entry.element}"是什么（${entry.yinyang}${entry.element}、物象、基本性情）讲清楚，并落到这种人现实里的性格
- 讲它的优势与短板两面，避免一味夸赞
- 讲它的喜用与忌讳（需要什么五行来配合才能发挥、怕什么），用具体天干举例（如丙火、庚金、壬水……）
- 点明它与同五行另一天干（${entry.element}的另一个，如甲↔乙、丙↔丁）的气质差异
- 帮读者把"日主"这个概念落地：怎么知道自己是不是这个日主、它意味着什么

输出结构（用 ## 二级标题，4-6 节，每节约120-200字）。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【典籍参考】
${context || "（无可用参考，请基于八字命理通论严谨撰写）"}

请撰写这篇日主天干科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

/** 八字 格局 (chart pattern) explainer page. */
export async function getGejuContent(entry: GejuEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("geju", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = BAZI_BASE_RULES + `

这是一篇八字格局科普文章，主题为「${entry.name}」（${entry.kind}）。

【格局定义务必准确】「${entry.name}」的取格依据：${entry.takeFrom}。成格、破格的条件有严格规定，必须讲对，不得张冠李戴、不得虚构不存在的成败条件。

要点：
- 先讲清"${entry.name}"是怎么取的（从月令哪里取、什么算成格）
- 讲"成格"（什么配合下是好格、主什么）与"破格"（什么情况下被破、有什么问题）——这是格局文章的核心，务必具体
- 介绍这个格最关键的1-2个配合或经典组合（如七杀格→食神制杀/杀印相生），名称必须真实存在
- 提醒读者：格局只是骨架，还要结合日主旺衰、大运流年来看，不要一看成格就断大富大贵
- 落到读者怎么在自己八字里判断是不是这个格

输出结构（用 ## 二级标题，4-6 节，每节约120-200字）。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【典籍参考】
${context || "（无可用参考，请基于八字命理通论严谨撰写）"}

请撰写这篇八字格局科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

/** 八字基础 guide (foundational concept) explainer page. */
export async function getBaziGuideContent(entry: BaziGuideEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("baziguide", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = BAZI_BASE_RULES + `

这是一篇八字入门基础科普文章，主题为「${entry.name}」。读者多半是零基础或刚入门，目标是把这个概念讲到"看完就懂、能上手"。

要点：
- 用最朴素的语言和生活化的比喻，把"${entry.name}"这个概念讲清楚，必要时举具体的干支例子
- 讲清它在整个八字推命里处在什么位置、为什么重要（它解决什么问题、是哪一步）
- 纠正初学者最容易踩的一个误区（如"生一定好、克一定坏""身强就富贵""犯太岁就倒霉"之类）
- 凡涉及具体规则（五行生克顺序、藏干、起运顺逆等）必须准确，不得写错
- 落到读者怎么在自己八字里实际用上这个概念

输出结构（用 ## 二级标题，4-6 节，每节约120-200字）。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【典籍参考】
${context || "（无可用参考，请基于八字命理通论严谨撰写）"}

请撰写这篇八字入门基础科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// Shared base for 感情/桃花 content — cross-school (紫微 + 八字).
const QINGGAN_BASE_RULES = `你是命里平台的命理师，精通紫微斗数与八字，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。绝对不要出现英文、繁体、乱码或古籍原文照抄。
2. 下方"典籍参考"仅供你提炼，其中可能混有无关、残缺或非中文的片段——请自行甄别，只采用真正相关、可信的内容，无关片段一律忽略。
3. 语气像懂行的朋友在讲解，温暖不生硬；必须出现的术语用一句话点明含义。
4. 内容具体、有信息量，不空泛、不套话、不吓人、不下绝对结论，落点在帮助读者理解自己的感情模式与应对方式。
5. 凶象（化忌、煞星、空亡、烂桃花）的写法：诚实说明挑战，但落点永远在"这意味着什么课题、如何应对"，不渲染恐惧。
6. 只输出正文 Markdown，不要前言、不要"以下是""希望对你有帮助"之类的话。` + ANTI_CLICHE;

/** 感情与桃花 topic page. */
export async function getQingganContent(entry: QingganEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("qinggan", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = QINGGAN_BASE_RULES + `

这是一篇命理感情科普文章，主题为「${entry.name}」（${entry.subtitle}）。

要点：
- 先把"${entry.name}"这个命理概念讲清楚：它是什么、怎么在命盘里体现
- 讲清楚它对感情运势的实际影响：好的一面和需要注意的一面都要说
- 如果涉及具体星曜/宫位/神煞，必须准确；紫微和八字各有不同说法时，分别说明
- 流年/大运引动时会有什么变化
- 结尾给读者1-2条可操作的感情建议，温暖具体

输出结构（用 ## 二级标题，4-6 节，每节约120-180字）。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数/八字命理通论严谨撰写）"}

请撰写这篇感情命理科普文章的正文。`;

  const markdown = await synthesize({ tag: "qinggan", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 四化详解 content ──────────────────────────────────────────────────────────

// Shared base for 四化 content (pillars + 主星×化忌 articles).
const SIHUA_BASE_RULES = `你是命里平台的命理师，精通紫微斗数四化理论，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。绝对不要出现英文、繁体、乱码或古籍原文照抄。
2. 下方"典籍参考"仅供你提炼，其中可能混有无关、残缺或非中文的片段——请自行甄别，只采用真正相关、可信的内容，无关片段一律忽略。
3. 语气像懂行的朋友在讲解，温暖不生硬；必须出现的术语用一句话点明含义。
4. 内容具体、有信息量，不空泛、不套话、不吓人、不下绝对结论，落点在帮助读者理解命盘特质与应对方向。
5. 凶象（化忌、化忌落宫、化忌冲对）的写法：诚实说明挑战，但落点永远在"这意味着什么课题、如何面对"，不渲染恐惧。
6. 【极重要】下方会给出一个"权威定盘资料"块，其中十干四化表所列的星曜组合是最高准则，绝对不得违背。若典籍参考中有冲突，以权威定盘资料为准。
7. 只输出正文 Markdown，不要前言、不要"以下是""希望对你有帮助"之类的话。` + ANTI_CLICHE;

/** 四化详解 article (pillar or 主星×化忌). */
export async function getSihuaContent(entry: SihuaEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("sihua", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const isPillar = entry.kind === "pillar";
  const systemSuffix = isPillar
    ? `这是一篇四化基础概念科普文章，主题为「${entry.name}」。

要点：
- 先把"${entry.name}"这个四化概念讲清楚：它是什么、对命盘意味着什么
- 重点讲落在不同宫位时各自的含义（命/财/官/夫妻/疾厄 等重点宫位）
- 流年/大运引动时会有什么变化
- 与其他三化的比较（如"化忌 vs 化禄""化权 vs 化科"）
- 给读者1-2条实际应用提示

输出结构（用 ## 二级标题，4-6 节，每节约130-180字）。`
    : `这是一篇「${entry.name}」命理科普文章（${entry.sihua ? "化忌" : ""}系列），面向有一定基础的读者。

要点：
- 先说清楚哪些人的命盘有"${entry.name}"（${entry.stems ? entry.stems.join("、") : ""}年生人）以及这颗星化忌的基本含义
- 重点讲落在不同宫位的不同表现（至少点到命/财/官/夫妻/疾厄，各1-3句话）
- 流年引动时（流年宫位被化忌冲对时）需要注意什么
- 现代视角：把"化忌"的能量转化成可应对的课题而非宿命
- 落点温暖：给读者有用的提醒，不吓人

输出结构（用 ## 二级标题，4-6 节，每节约130-180字）。`;

  const system = SIHUA_BASE_RULES + "\n\n" + systemSuffix
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威定盘资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数四化理论严谨撰写）"}

请撰写这篇四化科普文章的正文。`;

  const markdown = await synthesize({ tag: "sihua", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 四化×十二宮 content ───────────────────────────────────────────────────────
//
// One level deeper than getSihuaContent: 化X入XX宮 articles (e.g. 化忌入夫妻宮).
// NOTE: this content must be output in Traditional Chinese (繁體中文/台灣用語),
// unlike SIHUA_BASE_RULES above which currently still says 简体中文 pending a
// separate cleanup pass — do not rely on that constant here, state the script
// requirement explicitly so this new cluster is correct regardless of when
// that other fix lands.
const SIHUA_PALACE_BASE_RULES = `你是命裡平台的命理師，精通紫微斗數四化理論，為面向大眾的知識科普頁面撰寫內容。

嚴格要求：
1. 全文必須是通順、現代的繁體中文（臺灣用語習慣）。絕對不要出現英文、簡體字、亂碼或古籍原文照抄。
2. 下方「典籍參考」僅供你提煉，其中可能混有無關、殘缺或非中文的片段——請自行甄別，只採用真正相關、可信的內容，無關片段一律忽略。
3. 語氣像懂行的朋友在講解，溫暖不生硬；必須出現的術語用一句話點明含義。
4. 內容具體、有信息量，不空泛、不套話、不嚇人、不下絕對結論，落點在幫助讀者理解命盤特質與應對方向。
5. 化忌落宮的寫法：誠實說明挑戰，但落點永遠在「這意味著什麼課題、如何面對」，不渲染恐懼。
6. 【極重要】下方會給出一個「權威定盤資料」塊，其中十干化忌總表與列出的星曜落宮特質是最高準則，絕對不得違背——只能討論資料中明確列出的星曜，不得為未列出的星曜編造此宮位的具體論斷。
7. 只輸出正文 Markdown，不要前言、不要「以下是」「希望對你有幫助」之類的話。` + ANTI_CLICHE;

/** 化×十二宮 article (Phase 1: 化忌 × 12 palaces; 化祿/化權/化科 follow the same function later). */
export async function getSihuaPalaceContent(entry: SihuaPalaceEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("sihua-palace", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = SIHUA_PALACE_BASE_RULES + `

這是一篇「${entry.name}」命理科普文章，面向有一定基礎、想深入了解自己命盤的讀者。這篇文章比一般「XX星化忌」文章更進一步：它專門討論「當化忌落在${entry.palace}這個宮位時」代表什麼——不限定是哪顆星。

要點（用 ## 二級標題，5 節，每節約150-200字，總長約900-1000字）：
## ${entry.huaName}入${entry.palace}是什麼意思
先講清楚「宮位效應」：無論是十顆化忌星裡的哪一顆落在${entry.palace}，這個宮位本身代表的領域為何會因此承受阻滯或課題。
## 哪些星的化忌落在${entry.palace}最需要留意
依據下方「權威定盤資料」逐一點出最相關的幾顆星（只能用資料中列出的星曜與說明），具體講清每顆星的化忌落在此宮時各自的側重與差異。
## ${entry.palace}化忌的常見人生模式
結合真實生活場景，講清這個組合具體會怎麼表現、當事人常見的心理或行為模式。
## 流年或大運引動時的信號
當流年/大限走到這個宮位或其化忌被冲對時，通常會出現什麼徵兆。
## 如何與這個課題好好相處
給讀者具體、溫暖、可操作的應對方向，不空泛不說教，落點在「怎麼做」而非單純安慰。`
    + (revisionNote ? `\n\n【本次修訂要求（最高優先級，務必逐條滿足）】\n${revisionNote}` : "");

  const prompt = `【主題】${entry.title}
【副標題】${entry.subtitle}
【導語】${entry.intro}

【權威定盤資料】
${entry.grounding}

【典籍參考】
${context || "（無可用參考，請基於紫微斗數四化理論嚴謹撰寫）"}

請撰寫這篇「${entry.huaName}入${entry.palace}」科普文章的正文。`;

  const markdown = await synthesize({ tag: "sihua-palace", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 凶象与空亡 content ────────────────────────────────────────────────────────

const XIONG_BASE_RULES = `你是命里平台的命理师，精通紫微斗数煞星与格局，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。绝对不要出现英文、繁体、乱码或古籍原文照抄。
2. 下方"典籍参考"仅供你提炼，其中可能混有无关、残缺或非中文的片段——请自行甄别，只采用真正相关、可信的内容，无关片段一律忽略。
3. 语气像懂行的朋友在讲解，温暖不生硬；必须出现的术语用一句话点明含义。
4. 【极重要】下方会给出一个"权威定盘资料"块，其中的星性与宫位定义是最高准则，绝对不得违背。若典籍参考与之冲突，以权威定盘资料为准。
5. 凶象/煞星的写法（最重要的基调要求）：
   - 诚实说明挑战与风险，但落点永远是"这意味着什么课题、如何面对"——不渲染恐惧
   - 用现代心理/行为视角重新诠释"凶"的含义：强烈的能量需要正确引导，不是诅咒
   - 必须给读者1-2条温暖、具体、可操作的应对提示
   - 绝对不堆叠灾祸描述，不让读者看完感到绝望
6. 只输出正文 Markdown，不要前言、不要"以下是""希望对你有帮助"之类的话。` + ANTI_CLICHE;

/** 凶象与空亡 article. */
export async function getXiongContent(entry: XiongEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("xiong", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const kindNote = entry.kind === "kongwang"
    ? `这是一篇关于"空宫/空亡"的科普文章，主题为「${entry.name}」。重点是讲清楚空宫的真实含义（不等于凶），以及正确的读盘方法（借对宫星）。`
    : entry.kind === "shaxing"
    ? `这是一篇关于煞星格局的科普文章，主题为「${entry.name}」。重点是讲清楚这颗煞星或组合的能量特质，以及坐命/入宫时的具体表现。`
    : `这是一篇关于特殊格局的科普文章，主题为「${entry.name}」。重点是讲清楚格局的成格条件、能量含义，以及现代应对思路。`;

  const system = XIONG_BASE_RULES + `

${kindNote}

输出结构（用 ## 二级标题，4-6 节，每节约130-180字）：
- 第一节：讲清楚这个星/格局是什么，不要开场白
- 中间节：具体表现（性格、事业、感情、健康等相关维度，只讲真正受影响的）
- 倒数第二节：流年/大运引动时的信号
- 最后一节：现代视角与应对提示（温暖具体，不空洞）`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威定盘资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数通论严谨撰写）"}

请撰写这篇凶象/空亡科普文章的正文。`;

  const markdown = await synthesize({ tag: "xiong", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 流年运势 content ──────────────────────────────────────────────────────────

const LIUNIAN_BASE_RULES = `你是命里平台的命理师，精通紫微斗数流年推算，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。
2. 典籍参考中可能有无关片段，请自行甄别只采用相关内容。
3. 语气像懂行的朋友在讲解，温暖不生硬；术语需简单注释。
4. 权威定盘资料块中的流年判断规则是最高准则，不得违背。
5. 内容要实用、有信息量：读者最想知道今年的XX方面怎么样，给出具体的判断逻辑而非泛泛而谈。
6. 只输出正文 Markdown，不要任何前言或收尾客套话。` + ANTI_CLICHE;

export async function getLiuNianContent(entry: LiuNianEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("liunian", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 10,
    maxPerBook: 3,
  });

  const system = LIUNIAN_BASE_RULES + `

这是一篇流年运势科普文章，主题为「${entry.name}」（${entry.subtitle}）。

要点：
- 先讲清楚这个概念/宫位在流年判断中的作用
- 给出具体的判断逻辑（什么四化/组合代表什么信号）
- 举例说明什么情况是好信号、什么是需要注意的信号
- 结尾给1-2条实用建议（流年运势不好时怎么应对）

输出结构（用 ## 二级标题，4-6 节，每节约130-180字）。` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威定盘资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数流年推算通论严谨撰写）"}

请撰写这篇流年运势科普文章的正文。`;

  const markdown = await synthesize({ tag: "liunian", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 婚姻宫位 content ──────────────────────────────────────────────────────────

const HUNYIN_BASE_RULES = `你是命里平台的命理师，精通紫微斗数夫妻宫断法，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。
2. 典籍参考中可能有无关片段，请自行甄别只采用相关内容。
3. 语气像懂行的朋友在讲解，温暖不生硬；术语需简单注释。
4. 权威定盘资料块中的星曜特性是最高准则，不得违背。
5. 内容聚焦婚姻感情：配偶特质、感情模式、婚姻稳定度、常见课题与应对。
6. 只输出正文 Markdown，不要任何前言或收尾客套话。` + ANTI_CLICHE;

export async function getHunyinContent(entry: HunyinEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("hunyin", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = HUNYIN_BASE_RULES + `

这是一篇夫妻宫星曜科普文章，主题为「${entry.name}在夫妻宫」（${entry.subtitle}）。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 星性与夫妻宫的关系——这颗星坐夫妻宫的核心含义
2. 配偶特质——性格、外貌、才能、行事风格
3. 感情模式——相处模式、沟通方式、常见磨合点
4. 婚姻稳定度——有利因素与需要留意的风险
5. 四化变化——化禄/权/科/忌时婚姻的不同走向
6. 给你的提醒——2-3条具体可操作的建议` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.name}在夫妻宫
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威星曜资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数夫妻宫断法通论严谨撰写）"}

请撰写这篇婚姻宫位科普文章的正文。`;
  const markdown = await synthesize({ tag: "hunyin", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 事业宫位 content ──────────────────────────────────────────────────────────

const SHIYE_BASE_RULES = `你是命里平台的命理师，精通紫微斗数官禄宫断法，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。
2. 典籍参考中可能有无关片段，请自行甄别只采用相关内容。
3. 语气像懂行的朋友在讲解，温暖不生硬；术语需简单注释。
4. 权威定盘资料块中的星曜特性是最高准则，不得违背。
5. 内容聚焦事业前途：职业特质、适合行业、职场表现、升迁模式、事业挑战。
6. 只输出正文 Markdown，不要任何前言或收尾客套话。` + ANTI_CLICHE;

export async function getShiyeContent(entry: ShiyeEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("shiye", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = SHIYE_BASE_RULES + `

这是一篇官禄宫星曜科普文章，主题为「${entry.name}在官禄宫」（${entry.subtitle}）。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 星性与官禄宫的关系——这颗星坐官禄宫的核心含义
2. 职业方向——适合的行业、岗位、工作风格
3. 职场特质——工作态度、与同事/上司的关系、升迁模式
4. 事业发展轨迹——成长路径与人生事业高峰期
5. 四化变化——化禄/权/科/忌时事业的不同走向
6. 给你的提醒——2-3条具体可操作的职业建议` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.name}在官禄宫
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威星曜资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数官禄宫断法通论严谨撰写）"}

请撰写这篇事业宫位科普文章的正文。`;
  const markdown = await synthesize({ tag: "shiye", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 财运宫位 content ──────────────────────────────────────────────────────────

const CAIYUN_BASE_RULES = `你是命里平台的命理师，精通紫微斗数财帛宫断法，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。
2. 典籍参考中可能有无关片段，请自行甄别只采用相关内容。
3. 语气像懂行的朋友在讲解，温暖不生硬；术语需简单注释。
4. 权威定盘资料块中的星曜特性是最高准则，不得违背。
5. 内容聚焦财运财富：财运特质、进财方式、理财风格、破财风险、积累路径。
6. 只输出正文 Markdown，不要任何前言或收尾客套话。` + ANTI_CLICHE;

export async function getCaiyunContent(entry: CaiyunEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("caiyun", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = CAIYUN_BASE_RULES + `

这是一篇财帛宫星曜科普文章，主题为「${entry.name}在财帛宫」（${entry.subtitle}）。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 星性与财帛宫的关系——这颗星坐财帛宫的核心含义
2. 财运特质——进财方式、财运稳定度、财源来向
3. 理财风格——消费习惯、储蓄能力、投资倾向
4. 财运发展轨迹——早年、中年、晚年的财运变化
5. 四化变化——化禄/权/科/忌时财运的不同走向
6. 给你的提醒——2-3条具体可操作的理财建议` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.name}在财帛宫
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威星曜资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数财帛宫断法通论严谨撰写）"}

请撰写这篇财运宫位科普文章的正文。`;
  const markdown = await synthesize({ tag: "caiyun", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 健康安全 content ──────────────────────────────────────────────────────────

const JIBING_BASE_RULES = `你是命里平台的命理师，精通紫微斗数疾厄宫断法，为面向大众的知识科普页面撰写内容。

严格要求：
1. 全文必须是通顺、现代的简体中文。
2. 典籍参考中可能有无关片段，请自行甄别只采用相关内容。
3. 语气像懂行的朋友在讲解，温暖不生硬；术语需简单注释。
4. 权威定盘资料块中的星曜特性是最高准则，不得违背。
5. 内容聚焦健康与安全：体质特征、易患疾病方向、意外风险、养生建议。
6. 绝不渲染恐惧，不堆叠灾祸描述；落点永远是预防与调养，而非宣判。
7. 只输出正文 Markdown，不要任何前言或收尾客套话。` + ANTI_CLICHE;

export async function getJibingContent(entry: JibingEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("jibing", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = JIBING_BASE_RULES + `

这是一篇疾厄宫星曜科普文章，主题为「${entry.name}在疾厄宫」（${entry.subtitle}）。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 星性与疾厄宫的关系——这颗星坐疾厄宫的核心含义
2. 体质特征——先天体质优势与薄弱点
3. 健康注意方向——容易出现问题的身体系统或器官
4. 意外风险——与该星性相关的意外类型（若有）
5. 四化变化——化禄/权/科/忌时健康的不同走向
6. 养生建议——2-3条具体可操作的调养方向` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.name}在疾厄宫
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威星曜资料】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于紫微斗数疾厄宫断法通论严谨撰写）"}

请撰写这篇健康安全科普文章的正文。`;
  const markdown = await synthesize({ tag: "jibing", system, prompt, model: SEO_MODEL, maxTokens: 4000 });
  return { markdown, refs };
}

// ── 八字看婚姻 (BaZi applied: marriage) ───────────────────────────────────────

export async function getBaziHunyinContent(entry: BaziHunyinEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("bazi-hunyin", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = BAZI_BASE_RULES + `

这是一篇「八字看婚姻」主题科普文章，主题为「${entry.name}」（${entry.subtitle}）。这是从八字（子平）角度看感情婚姻，区别于紫微夫妻宫——务必用八字术语（配偶星、日支夫妻宫、十神、五行喜忌），不要写成紫微星曜。

【八字断婚务必准确】男命以财星（正财偏财）为妻、女命以官杀（正官七杀）为夫；日支（日柱地支）为夫妻宫；配偶星的清浊、旺衰、远近与刑冲合害定婚姻吉凶；比劫夺财（男）、官杀混杂（女）为感情波折之象。以上为命理通则，不得张冠李戴、不得虚构断法。语气温暖、客观，婚姻倾向是「需经营的提示」而非宿命定论。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 这个主题在八字里指什么——核心概念点清楚（如配偶星怎么找、日支怎么读）
2. 怎么看吉凶／好坏——成立、有利的结构 vs 需要留意的结构，具体讲
3. 男命与女命的不同（如涉及配偶星，须分男女讲）
4. 大运流年的影响——什么时段会被引动、加强或减弱
5. 常见误区或客观提醒——破除「一看到某结构就断离婚」之类的迷思
6. 给你的提醒——2-3条具体、可落地的建议（以 bullet 收尾）` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威八字资料（最高准则，不得违背）】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于八字论婚通论严谨撰写）"}

请撰写这篇「八字看婚姻」科普文章的正文。`;
  const markdown = await synthesize({ tag: "bazi-hunyin", system, prompt, model: SEO_MODEL, maxTokens: 3800 });
  return { markdown, refs };
}

// ── 八字看事业 (BaZi applied: career) ─────────────────────────────────────────

export async function getBaziShiyeContent(entry: BaziShiyeEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("bazi-shiye", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = BAZI_BASE_RULES + `

这是一篇「八字看事业」主题科普文章，主题为「${entry.name}」（${entry.subtitle}）。从八字（子平）角度看事业，区别于紫微官禄宫——务必用八字术语（用神五行定行业、官杀格、食伤生财、身旺任财、大运），不要写成紫微星曜。

【八字断事业务必准确】用神所属五行对应择业方向；官杀代表事业权力、贵在有制有化、身能任官；食伤生财是靠才华变现、需身能任；身旺能任财官者成就大，身弱不胜则反成压力；行用神运、引动官财运（身能任）为事业高峰，行忌神运、伤官见官、比劫夺财为瓶颈。以上为通则，不得虚构。语气务实、鼓励，落点在帮人找对发力方向。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 这个主题在八字里指什么——核心概念点清楚
2. 具体怎么看／怎么判断——把判断方法讲到能上手
3. 不同结构的不同走向——成立有利 vs 需要留意，举例对比
4. 大运流年的影响——事业的高峰与瓶颈时段
5. 客观提醒——破除「格局高就一定大富贵」之类的迷思，强调身旺衰与大运配合
6. 给你的提醒——2-3条具体、可落地的职业/事业建议（以 bullet 收尾）` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威八字资料（最高准则，不得违背）】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于八字论事业通论严谨撰写）"}

请撰写这篇「八字看事业」科普文章的正文。`;
  const markdown = await synthesize({ tag: "bazi-shiye", system, prompt, model: SEO_MODEL, maxTokens: 3800 });
  return { markdown, refs };
}

// ── 八字看财运 (BaZi applied: wealth) ─────────────────────────────────────────

export async function getBaziCaiyunContent(entry: BaziCaiyunEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("bazi-caiyun", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = BAZI_BASE_RULES + `

这是一篇「八字看财运」主题科普文章，主题为「${entry.name}」（${entry.subtitle}）。从八字（子平）角度看财运，区别于紫微财帛宫——务必用八字术语（正财偏财、财格、身财平衡、食伤生财、比劫夺财、用神调候、大运），不要写成紫微星曜。

【八字断财务必准确】正财=稳定正当之财、偏财=流动偏门投机之财；财即「我克者」；发财关键在「身能任财」——身财两旺为富格，财多身弱为「富屋贫人」反被财累；比劫夺财是最典型破财结构、喜官杀制比劫或食伤通关；行财运/食伤生财运且身能任为发财时机。以上为通则，不得虚构。涉及投资储蓄须强调仅为命理风险偏好参考、不构成投资建议。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 这个主题在八字里指什么——核心概念点清楚
2. 具体怎么看／怎么判断——讲到能对照自己的八字
3. 有利结构 vs 需要留意的结构——尤其强调「身能否任财」，举例对比
4. 大运流年的影响——旺财与破财的时段
5. 客观提醒——破除「财星多就有钱」的迷思；涉及理财投资须提示风险、非投资建议
6. 给你的提醒——2-3条具体、可落地的理财/求财建议（以 bullet 收尾）` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威八字资料（最高准则，不得违背）】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于八字论财通论严谨撰写）"}

请撰写这篇「八字看财运」科普文章的正文。`;
  const markdown = await synthesize({ tag: "bazi-caiyun", system, prompt, model: SEO_MODEL, maxTokens: 3800 });
  return { markdown, refs };
}

// ── 八字看健康安全 (BaZi applied: health & safety) ────────────────────────────

export async function getBaziJibingContent(entry: BaziJibingEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("bazi-jibing", entry.urlSlug);
    if (pre) return pre;
  }
  const { context, refs } = await getKnowledge({ ...entry.ragQuery, topK: 12, maxPerBook: 4 });
  const system = BAZI_BASE_RULES + `

这是一篇「八字看健康安全」主题科普文章，主题为「${entry.name}」（${entry.subtitle}）。从八字（子平）角度看健康，区别于紫微疾厄宫——务必用八字术语（五行配五脏、忌神、用神调候、刑冲、七杀羊刃、大运流年），不要写成紫微星曜。

【八字论健康务必准确且负责】五行对应五脏：金—肺、木—肝、水—肾、火—心、土—脾；命中过弱或被克的五行所属脏腑为先天较需养护处；忌神所属脏腑、行忌神运为需多关注的方向；七杀无制、羊刃旺、刑冲多为传统「注意安全」信号。

【绝对底线 · 健康主题特别要求】：
1. 全程支持、积极、可操作，落点永远在「预防、调养、提高安全意识」，绝不渲染恐惧、绝不堆叠灾祸、绝不预言具体疾病或灾厄。
2. 必须明确：这是体质倾向与关注方向的传统参考，不是医学诊断，不能替代现代医疗，任何不适应及时就医。
3. 把传统信号转译成正向的生活建议（作息、饮食、运动、情绪、安全习惯、定期体检），而不是吓人的断语。

结构（用 ## 二级标题，5-6节，每节130-180字）：
1. 这个主题在八字里指什么——核心概念（五行脏腑/忌神/信号）讲清楚
2. 怎么对照自己的八字看——温和、客观
3. 对应需要关注的方向——具体到脏腑/系统/安全方面，但用「值得多留意保养」的措辞
4. 大运流年的影响——哪些时段宜多体检、多保养（温和提醒，非灾年预言）
5. 重要边界——明确不是诊断、不是预言，强调科学生活与就医
6. 给你的提醒／养生建议——2-3条具体、正向、可落地的保养或安全建议（以 bullet 收尾）` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级，务必逐条满足）】\n${revisionNote}` : "");
  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}

【权威八字资料（最高准则，不得违背）】
${entry.grounding}

【典籍参考】
${context || "（无可用参考，请基于八字与五行养生通论严谨撰写）"}

请撰写这篇「八字看健康安全」科普文章的正文，全程支持性、不吓人。`;
  const markdown = await synthesize({ tag: "bazi-jibing", system, prompt, model: SEO_MODEL, maxTokens: 3800 });
  return { markdown, refs };
}

/** Corpus source book page — about a specific book used in the 命里 knowledge base. */
export async function getSourceContent(book: SourceBook, excerpt?: string, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    // Files renamed to urlSlug (pinyin) on 2026-07-18; fall back to slug for any edge cases
    const pre = readPregenerated("sources", book.urlSlug) ?? readPregenerated("sources", book.slug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    text: `${book.title} ${book.author} ${book.tags.join(" ")} ${book.school}`,
    school: book.school.startsWith("八字") ? "八字命理" : undefined,
    strict: false,
    topK: 8,
    maxPerBook: 3,
  });

  const eraNote = book.era === "古代" ? "注意：这是古代典籍，对不确定的历史细节用「据传」或「史料记载有限」，绝不虚构生平年份或具体引语。" :
    book.era === "近現代" ? "注意：这是近现代著作，对不确定细节用「据传」或「史料记载有限」，不得虚构。" :
    "这是当代著作，作者生平信息相对可查，仅引述确认信息。";

  const system = BASE_RULES + `

这是一篇关于命理典籍的深度介绍文章，主题书目为「${book.title}」，属于「${book.school}」流派。

${eraNote}

写作要求：
- 准确介绍这本书的核心内容、理论体系与在该流派中的地位
- 说明它与同流派其他典籍的关系与区别
- 解释这本书解决了什么命理问题，对学习者有什么具体帮助
- 给出阅读建议：难度、配合书目、最值得关注的章节或概念
- 如有书中内容摘录，可引用1-2处有代表性的原文（用引用格式），但不要照抄大段

${ANTI_CLICHE}

输出结构（用 ## 二级标题，4-6节，每节约120-200字，全文800-1200字）：
- 开篇：这本书是什么，属于哪个流派，有什么独特性
- 核心内容：主要讲什么理论，体系结构
- 流派地位：在该派中的位置，与其他典籍的关系
- 对读者的价值：具体帮读者解决什么问题
- 阅读建议：难度、前置知识、配合书目` +
    (revisionNote ? `\n\n【修订要求】\n${revisionNote}` : "");

  const excerptSection = excerpt ? `\n\n【书中内容摘录（仅供参考，勿大量照抄）】\n${excerpt.slice(0, 1200)}` : "";

  const prompt = `【书名】${book.title}
【作者】${book.author || "佚名"}
【流派】${book.school}
【年代】${book.era}
【关键词】${book.tags.join("、")}
【简介】${book.intro}

【命理典籍参考】
${context || "（无可用参考，请基于该流派通论严谨撰写）"}${excerptSection}

请撰写这篇典籍介绍文章的正文，帮助读者了解这本书的价值与阅读方法。`;

  const markdown = await synthesize({ tag: "sources", system, prompt, model: SEO_MODEL, maxTokens: 3500 });
  return { markdown, refs };
}

/** 八字神煞 (divine stars) explainer page. */
export async function getShenshaContent(entry: ShenshaEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("shensha", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 8,
    maxPerBook: 2,
  });

  const system = BAZI_BASE_RULES + `

【严格限制】本文讲八字神煞，不是紫微斗数。若"典籍参考"中出现紫微斗数（命宫/夫妻宫/疾厄宫/紫微/天机/天同等宫位星曜）的内容，一律忽略，不得引用、不得混入。只采用八字（子平命理）相关的内容（天干地支/八字四柱/神煞/格局/用神/大运）。若典籍参考全部无关，请基于八字命理通论严谨撰写，不得引入紫微概念。

这是一篇八字神煞科普文章，主题为「${entry.name}」（${entry.category}类）。

【推算方法务必准确】${entry.derivation}

要点：
- 先用一两句讲清这是什么神煞（${entry.category}类），以及最简单的推算方法
- 讲清命中有此神煞时的主要影响：吉神讲吉处与不足，凶煞讲凶处与化解之道
- 具体说明它落在哪些宫位（命宫/夫妻宫/财帛宫/官禄宫）时的差别意义
- 讲清流年/大运逢此神煞时的应期与注意事项
- 结尾给读者一条"如何在自己八字里应用这个知识"的可操作建议

输出结构（用 ## 二级标题，4-6节，每节约100-180字）。禁止：虚构神煞推算表、捏造典籍名称、空泛恐吓（"必主大凶"）。` +
    (revisionNote ? `\n\n【本次修订要求（最高优先级）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}
【推算方法】${entry.derivation}

【典籍参考】
${context || "（无可用参考，请基于八字命理通论严谨撰写）"}

请撰写这篇八字神煞科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 3500 });
  return { markdown, refs };
}
