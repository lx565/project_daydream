// Phase 2+3 QA for famous people 命格 articles.
// Pass 1: Gemini 2.5 Flash reviews content accuracy
// Pass 2: DeepSeek R1 adjudicates any REVISE flags
// Usage: npx tsx --env-file=.env.local scripts/reviewFamousPeople.mjs

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });

const CONTENT_DIR = path.join(process.cwd(), "content", "seo", "mingge_famous");

const SUBJECTS = [
  {
    name: "李小龙",
    formation: "府相朝垣格",
    type: "吉格",
    birth: "1940年11月27日 卯时（约07:00）",
    soulPalace: "未宫",
    mainStars: "天相（庙）",
    fiveElements: "水二局",
    knownFacts: "武术宗师、演员、截拳道创始人、《龙争虎斗》主演，33岁离世",
  },
  {
    name: "莫扎特",
    formation: "杀破狼格",
    type: "凶格",
    birth: "1756年1月27日 戌时（约20:00）",
    soulPalace: "卯宫",
    mainStars: "廉贞·破军",
    fiveElements: "火六局",
    knownFacts: "古典音乐神童，5岁作曲，一生作600余部，35岁去世，晚年贫困",
  },
  {
    name: "爱因斯坦",
    formation: "杀破狼格（紫微贪狼坐命）",
    type: "凶格",
    birth: "1879年3月14日 午时（约11:00）",
    soulPalace: "酉宫",
    mainStars: "紫微·贪狼",
    fiveElements: "木三局",
    knownFacts: "相对论、诺贝尔奖得主，1905奇迹年四论文，两段婚姻皆不圆满，流亡美国",
  },
];

const GEMINI_REVIEW_PROMPT = (subj, markdown) => `
你是紫微斗数内容审核专家。请审核以下名人命格分析文章。

【名人基础资料（权威基准）】
姓名：${subj.name}
格局：${subj.formation}（${subj.type}）
命宫：${subj.soulPalace}，主星 ${subj.mainStars}
五行局：${subj.fiveElements}
出生时间：${subj.birth}
真实事迹：${subj.knownFacts}

【文章内容】
${markdown}

审核要点：
1. 格局定义（${subj.formation}）与入格条件是否准确？
2. 命宫主星（${subj.mainStars}）、五行局（${subj.fiveElements}）描述是否与基准一致？
3. 与名人真实生平事迹（${subj.knownFacts}）的对应是否合理？有无明显张冠李戴？
4. 古籍引用是否真实可信？有无无中生有的虚假引文？
5. 文章是否完整覆盖格局定义、命运特质、古籍论述、给读者的提醒？

只有存在真实问题时才判 REVISE。仅输出一行：
PASS
或
REVISE: <最多两条关键问题，简短>
`;

const ADJUDICATOR_PROMPT = (subj, flag, excerpt) => `
你是紫微斗数权威审核员。请判断以下 Gemini 标记是否为真实错误。

名人：${subj.name}，格局：${subj.formation}，命宫：${subj.soulPalace} ${subj.mainStars}

Gemini 标记的问题：${flag}

相关文章片段：
${excerpt}

请查阅你的紫微斗数知识，判断 Gemini 的标记是否属实：
- 如果确实有误：REVISE: <精确问题描述>
- 如果 Gemini 误报：PASS: <解释为何无误>

只输出一行。
`;

async function geminiReview(subj) {
  const file = path.join(CONTENT_DIR, `${subj.name}.json`);
  if (!fs.existsSync(file)) { console.log(`[SKIP] ${subj.name}: 文件不存在`); return null; }
  const d = JSON.parse(fs.readFileSync(file, "utf8"));

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(GEMINI_REVIEW_PROMPT(subj, d.markdown));
  const text = result.response.text().trim();
  console.log(`[Gemini] ${subj.name}: ${text}`);
  return text;
}

async function deepseekAdjudicate(subj, flag) {
  const file = path.join(CONTENT_DIR, `${subj.name}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  // Extract first 800 chars of markdown as context
  const excerpt = d.markdown.slice(0, 800);

  const resp = await deepseek.chat.completions.create({
    model: "deepseek-reasoner",
    messages: [{ role: "user", content: ADJUDICATOR_PROMPT(subj, flag, excerpt) }],
    max_tokens: 300,
  });
  const text = resp.choices[0].message.content.trim();
  console.log(`[DeepSeek] ${subj.name}: ${text}`);
  return text;
}

console.log("=== Phase 2: Gemini Review ===\n");
const geminiResults = [];
for (const subj of SUBJECTS) {
  const result = await geminiReview(subj);
  geminiResults.push({ subj, result });
  await new Promise(r => setTimeout(r, 1500)); // rate limit
}

const reviseFlags = geminiResults.filter(r => r.result && r.result.startsWith("REVISE"));
console.log(`\nGemini: ${SUBJECTS.length - reviseFlags.length} PASS, ${reviseFlags.length} REVISE\n`);

if (reviseFlags.length > 0) {
  console.log("=== Phase 3: DeepSeek Adjudication ===\n");
  for (const { subj, result } of reviseFlags) {
    const flag = result.replace("REVISE:", "").trim();
    await deepseekAdjudicate(subj, flag);
    await new Promise(r => setTimeout(r, 2000));
  }
} else {
  console.log("✅ All articles PASS — no adjudication needed.");
}

console.log("\n=== Review Complete ===");
