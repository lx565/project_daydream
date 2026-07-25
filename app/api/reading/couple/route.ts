import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { calcCoupleScoreV2 } from "@/lib/couple";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通紫微斗数与八字子平的资深合盘命理师。本次合盘的关系类型会在用户信息中给出，请始终扣住该关系类型的侧重来解读（情侣谈感情、亲子谈教养、朋友谈默契，不要套同一模板）。

分析层次：
1. 独立看甲方在这段关系中的模式（不受乙方影响）
2. 独立看乙方
3. 两盘合观：契合、张力、相处之道
4. 时机：结合双方当前大运，点出关系的高峰/考验阶段

请严格按以下 Markdown 输出（标题照抄）：

## 四维详解
（逐条解释用户给出的四维得分各自因何而来，落到具体星曜/日主/五行；每维1-2句；**加粗**维度名）

## 甲方在这段关系中
（约160字：夫妻宫/相关宫主星与四化、感情星强弱、相处模式；**加粗**关键星曜）

## 乙方在这段关系中
（约160字，同框架）

## 飞化互入
（约140字：一方的生年四化/重要星曜落入对方命盘的哪个宫，说明彼此牵动的领域。注意命理规则：七杀/天相/天府不参与十干四化；紫微只化权/化科。）

## 合盘综析与三方四正
（约180字：双方相关宫位的三方四正牵引、日主生克、四柱合冲、五行互补结构；**加粗**关键论断）

## 缘分时机
（约120字：结合双方当前大运，点出关系的高峰期与需留心的阶段）

## 相处之道
（针对两人命盘，3-5条具体可操作建议；- 开头列表）
$PASTLIFE$

## 给你们的话
（温暖真诚的收尾寄语，约70字）

### 分享卡片
（严格按以下格式，方括号替换为实际内容，不加其他文字：）
✦ 命里合盘 ✦
[甲方称呼] × [乙方称呼]
$SHARELABEL$：[缘分类型标签]
[维度1名] [分] · [维度2名] [分] · [维度3名] [分] · [维度4名] [分]
"[一句12字内的缘分点睛，温暖且可截图分享]"
仅供传统文化学习参考 · mingli.study

简体中文。` + MODERN_INSTRUCTION;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRANCH_ZODIAC: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龙", 巳: "蛇",
  午: "马", 未: "羊", 申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

function zodiacRelation(branchA: string, branchB: string): string {
  const SAN_HE = [["子","辰","申"],["亥","卯","未"],["寅","午","戌"],["巳","酉","丑"]];
  const LIU_HE: [string,string][] = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  const CHONG: [string,string][] = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  const XING: [string,string,string][] = [["寅","巳","申"],["丑","戌","未"]];

  for (const g of SAN_HE) if (g.includes(branchA) && g.includes(branchB)) return "三合（天然契合，同气相求）";
  for (const [a,b] of LIU_HE) if ((a===branchA&&b===branchB)||(a===branchB&&b===branchA)) return "六合（相合融洽）";
  for (const [a,b] of CHONG) if ((a===branchA&&b===branchB)||(a===branchB&&b===branchA)) return "相冲（摩擦较多，需磨合）";
  for (const g of XING) if (g.includes(branchA) && g.includes(branchB)) return "三刑（相互磨砺，有缘有劫）";
  return "无特殊合冲（后天缘分为主，需彼此经营）";
}

// Describe a palace with all its stars
function palaceDesc(ziwei: ZiweiResult, palaceName: string): string {
  const p = ziwei.palaces.find(x => x.name === palaceName);
  if (!p) return `${palaceName}（无数据）`;
  const stars = p.stars
    .filter(s => s.type === "major" || s.type === "minor" || ["红鸾","天喜","天马","孤辰","寡宿"].includes(s.name))
    .map(s => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`)
    .join("、");
  const stem = p.heavenlyStem ? `[${p.heavenlyStem}干]` : "";
  return `${palaceName}${stem}：${stars || "空宫"}`;
}

// Find which palace a named star sits in
function findStarPalace(ziwei: ZiweiResult, starName: string): string {
  for (const p of ziwei.palaces) {
    const s = p.stars.find(x => x.name === starName);
    if (s) return `${p.name}${s.mutagen ? `化${s.mutagen}` : ""}`;
  }
  return "（未见）";
}

// Describe the four bazi pillars compactly
function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 时${bazi.hour.stem}${bazi.hour.branch}`;
}

// Detect simple stem combinations between two bazi sets
function stemRelations(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const HE_STEMS: [string,string][] = [["甲","己"],["乙","庚"],["丙","辛"],["丁","壬"],["戊","癸"]];
  const relations: string[] = [];
  const stemsA = [baziA.year.stem, baziA.month.stem, baziA.day.stem, baziA.hour.stem];
  const stemsB = [baziB.year.stem, baziB.month.stem, baziB.day.stem, baziB.hour.stem];
  const pillarNames = ["年干","月干","日干","时干"];
  for (const [i, sa] of stemsA.entries()) {
    for (const [j, sb] of stemsB.entries()) {
      for (const [ha, hb] of HE_STEMS) {
        if ((sa===ha&&sb===hb)||(sa===hb&&sb===ha)) {
          relations.push(`${labelA}${pillarNames[i]}${sa} 合 ${labelB}${pillarNames[j]}${sb}`);
        }
      }
    }
  }
  return relations.length ? relations.join("；") : "天干无明显合化";
}

function branchRelations(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const CHONG: [string,string][] = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  const LIU_HE: [string,string][] = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  const relations: string[] = [];
  const branchesA = [baziA.year.branch, baziA.month.branch, baziA.day.branch, baziA.hour.branch];
  const branchesB = [baziB.year.branch, baziB.month.branch, baziB.day.branch, baziB.hour.branch];
  const names = ["年支","月支","日支","时支"];
  for (const [i,ba] of branchesA.entries()) {
    for (const [j,bb] of branchesB.entries()) {
      for (const [a,b] of CHONG) {
        if ((ba===a&&bb===b)||(ba===b&&bb===a)) relations.push(`${labelA}${names[i]}${ba} 冲 ${labelB}${names[j]}${bb}`);
      }
      for (const [a,b] of LIU_HE) {
        if ((ba===a&&bb===b)||(ba===b&&bb===a)) relations.push(`${labelA}${names[i]}${ba} 合 ${labelB}${names[j]}${bb}`);
      }
    }
  }
  return relations.length ? relations.slice(0,4).join("；") : "地支无明显合冲";
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 3, keyPrefix: "couple" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;

  const cfg = getRelationshipConfig(relationshipType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);

  // Per-relationship 前世缘 section + share-card label injected into SYSTEM.
  const pastLifeSection = cfg.hasPastLife
    ? "\n## 前世缘分（命理故事）\n（约120字：以来因宫/夫妻宫星曜组合为依据，写一段富画面感的“前世今生”小叙事，开头注明这是命理意象、非史实；温暖动人，适合分享）"
    : "";
  const systemPrompt = SYSTEM
    .replace("$PASTLIFE$", pastLifeSection)
    .replace("$SHARELABEL$", cfg.shareLabel);

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const branchA = baziA.year.branch;
  const branchB = baziB.year.branch;

  // Wedding palace stars for RAG
  const wStarsA = ziweiA.palaces.find(p=>p.name==="夫妻")?.stars.filter(s=>s.type==="major").map(s=>s.name) ?? [];
  const wStarsB = ziweiB.palaces.find(p=>p.name==="夫妻")?.stars.filter(s=>s.type==="major").map(s=>s.name) ?? [];
  // Also include children palace stars and 红鸾
  const childStarsA = ziweiA.palaces.find(p=>p.name==="子女")?.stars.filter(s=>s.type==="major").map(s=>s.name) ?? [];
  const childStarsB = ziweiB.palaces.find(p=>p.name==="子女")?.stars.filter(s=>s.type==="major").map(s=>s.name) ?? [];
  const allStars = [...new Set([...wStarsA, ...wStarsB, ...childStarsA, ...childStarsB])];

  const { context, refs } = await getKnowledge({
    stars: allStars,
    topic: cfg.ragTopic,
    topK: 8,
    text: `合盘 夫妻宫 子女宫 红鸾 天喜 感情缘分 ${cfg.label}`,
  });

  const dmRelHint = (() => {
    const G: Record<string,string> = {木:"火",火:"土",土:"金",金:"水",水:"木"};
    const dmA = baziA.dayMasterElement, dmB = baziB.dayMasterElement;
    if (G[dmA]===dmB) return `${labelA}日主${dmA}生${labelB}日主${dmB}（有扶持滋养之情）`;
    if (G[dmB]===dmA) return `${labelB}日主${dmB}生${labelA}日主${dmA}（有扶持滋养之情）`;
    if (dmA===dmB) return `双方同为${dmA}日主（同气，志趣相近）`;
    const C: Record<string,string> = {木:"土",土:"水",水:"火",火:"金",金:"木"};
    if (C[dmA]===dmB) return `${labelA}日主${dmA}克${labelB}日主${dmB}（需注意主导与压制）`;
    if (C[dmB]===dmA) return `${labelB}日主${dmB}克${labelA}日主${dmA}（需注意主导与压制）`;
    return "日主无直接生克";
  })();

  const elA = baziA.elements, elB = baziB.elements;

  const userMessage = `
【关系类型】${cfg.label}　侧重：${cfg.focusHint}
【四维得分（确定性，请据此解释）】缘分类型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【甲方基本信息】
姓名/称呼：${labelA}　性别：${genderA==="male"?"男":"女"}
生肖：${BRANCH_ZODIAC[branchA]??branchA}（${baziA.year.stem}${branchA}年）
八字四柱：${baziPillars(baziA)}
日主：${baziA.dayMaster}（${baziA.dayMasterElement}）
五行：木${elA.wood} 火${elA.fire} 土${elA.earth} 金${elA.metal} 水${elA.water}
命格：${baziA.summary}

【甲方紫微宫位】
${palaceDesc(ziweiA,"命宮")}
${palaceDesc(ziweiA,"夫妻")}
${palaceDesc(ziweiA,"子女")}
红鸾星：${findStarPalace(ziweiA,"红鸾")}　天喜星：${findStarPalace(ziweiA,"天喜")}

【乙方基本信息】
姓名/称呼：${labelB}　性别：${genderB==="male"?"男":"女"}
生肖：${BRANCH_ZODIAC[branchB]??branchB}（${baziB.year.stem}${branchB}年）
八字四柱：${baziPillars(baziB)}
日主：${baziB.dayMaster}（${baziB.dayMasterElement}）
五行：木${elB.wood} 火${elB.fire} 土${elB.earth} 金${elB.metal} 水${elB.water}
命格：${baziB.summary}

【乙方紫微宫位】
${palaceDesc(ziweiB,"命宮")}
${palaceDesc(ziweiB,"夫妻")}
${palaceDesc(ziweiB,"子女")}
红鸾星：${findStarPalace(ziweiB,"红鸾")}　天喜星：${findStarPalace(ziweiB,"天喜")}

【合盘数据】
生肖缘分：${BRANCH_ZODIAC[branchA]}与${BRANCH_ZODIAC[branchB]} → ${zodiacRelation(branchA,branchB)}
日主关系：${dmRelHint}
天干合化：${stemRelations(baziA,baziB,labelA,labelB)}
地支合冲：${branchRelations(baziA,baziB,labelA,labelB)}

【典籍参考】
${context||"（暂无）"}

请按系统要求的标题逐段完成合盘解读，扣住关系类型「${cfg.label}」的侧重，并结合上方四维得分展开。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 2800,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
