// Quick targeted review of specific famous people articles
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const DIR = path.join(process.cwd(), "content", "seo", "mingge_famous");

const TARGETS = [
  { name: "李小龙", formation: "府相朝垣格", soulPalace: "未宫(天相得)", known: "武术宗师33岁去世，迁移宫紫微·破军，福德宫武曲·七杀" },
  { name: "爱因斯坦", formation: "杀破狼格+极居卯酉格", soulPalace: "酉宫(紫微·贪狼)", known: "物理学家，流亡美国，官禄宫廉贞·七杀，夫妻宫天府" },
];

for (const t of TARGETS) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, `${t.name}.json`), "utf8"));
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let result;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await model.generateContent(`
你是紫微斗数内容审核专家。审核以下文章。

【权威基准】
姓名：${t.name} | 格局：${t.formation} | ${t.soulPalace}
已知正确数据：${t.known}

【文章内容】
${d.markdown.slice(0, 2000)}

只判断：
1. 格局与成格条件描述是否正确？
2. 已知宫位星曜是否与基准一致？
3. 有无明显虚构的古籍引用？

仅输出一行：PASS 或 REVISE: <问题>`);
      result = r.response.text().trim();
      break;
    } catch (e) {
      if (attempt < 3) { await new Promise(r => setTimeout(r, 5000)); }
      else result = `ERROR: ${e.message?.slice(0,60)}`;
    }
  }
  console.log(`[${t.name}] ${result}`);
  await new Promise(r => setTimeout(r, 3000));
}
