// Phase 1: DeepSeek R1 writes 3 famous people 命格 analysis articles
// Usage: npx tsx --env-file=.env.local scripts/genFamousPeopleSEO.mjs

import fs from "fs";
import path from "path";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not set");

const subjects = [
  {
    name: "李小龙",
    formation: "府相朝垣格",
    type: "吉格",
    birth: "1940年11月27日 07:00",
    soulPalace: "未",
    mainStars: "天相",
    fiveElements: "水二局",
    achievements: "武术宗师、演员、哲学家",
    keywords: ["李小龙命盘", "府相朝垣格", "紫微斗数分析"],
  },
  {
    name: "莫扎特",
    formation: "杀破狼格",
    type: "凶格",
    birth: "1756年1月27日 20:00",
    soulPalace: "卯",
    mainStars: "廉贞·破军",
    fiveElements: "火贪格",
    achievements: "古典音乐作曲大师、音乐神童",
    keywords: ["莫扎特命盘", "杀破狼格", "紫微斗数"],
  },
  {
    name: "爱因斯坦",
    formation: "杀破狼格",
    type: "凶格",
    birth: "1879年3月14日 11:00",
    soulPalace: "酉",
    mainStars: "紫微·贪狼",
    fiveElements: "五行局",
    achievements: "物理学家、相对论创立者",
    keywords: ["爱因斯坦命盘", "杀破狼格", "紫微斗数分析"],
  },
];

async function generateArticle(subject) {
  const prompt = `你是紫微斗数资深研究者，现在为${subject.name}撰写一篇SEO命格分析文章。

【格局权威定盘资料】
人物：${subject.name}
出生时间：${subject.birth}
命宫：${subject.soulPalace}宫
主要星曜：${subject.mainStars}
格局名称：${subject.formation}（${subject.type}）
五行局：${subject.fiveElements}
人生成就：${subject.achievements}

【文章要求】
1. 结构清晰，包含以下章节：
   - 格局定义与成格条件（200字）
   - ${subject.name}的命运特质与人生轨迹（250字）
   - 格局强弱的影响因素（180字）
   - 不同宫位与四化的变化（150字）
   - 古籍论述与现代解读（150字）
   - 给你的提醒（3-4条，温暖具体）

2. 写作要求：
   - 准确严谨，每个星曜、宫位信息必须符合${subject.formation}的定义
   - 联系${subject.name}的真实人生事迹，说明命格如何影响其成就
   ${subject.type === "凶格" ? "   - 凶格写作：用现代视角重新诠释挑战，强调如何应对而非渲染恐惧\n" : ""}
   - 避免绝对化表述，保留人生选择的自由度
   - 引用古籍经典论述，附上出处

3. SEO优化：
   - 自然融入关键词：${subject.keywords.join("、")}
   - 标题吸引力强，包含人名与格局
   - 内容深度与学习价值兼顾

【输出格式】
使用Markdown格式，标题从##开始。最后输出总字数。`;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`DeepSeek API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const markdown = data.choices[0]?.message?.content || "";
  return { markdown, model: "deepseek-reasoner" };
}

async function main() {
  const outDir = path.join(process.cwd(), "content", "seo", "mingge_famous");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log("Phase 1: DeepSeek R1 generating 3 articles...\n");

  for (const subject of subjects) {
    console.log(`Generating: ${subject.name} (${subject.formation})...`);
    const { markdown } = await generateArticle(subject);
    const slug = subject.name.toLowerCase();
    const chars = markdown.length;
    const data = {
      label: `${subject.name}的${subject.formation}命格分析`,
      markdown,
      refs: [],
      chars,
      generatedAt: new Date().toISOString(),
      metadata: {
        person: subject.name,
        formation: subject.formation,
        birth: subject.birth,
      },
    };
    fs.writeFileSync(
      path.join(outDir, `${slug}.json`),
      JSON.stringify(data, null, 2),
    );
    console.log(`  ✓ Saved ${slug}.json (${chars} chars)\n`);
  }

  console.log("✓ Phase 1 complete. All articles saved to content/seo/mingge_famous/");
}

main().catch(console.error);
