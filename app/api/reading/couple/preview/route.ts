// 免费预览：确定性算出四维分 + 缘分类型，AI 只写"感情模式（各2行）+ 钩子句"。
// 不做解锁检查。钩子句对有前世缘的关系类型做截断，吊起付费欲望。
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { yearBranchAffinity, dayBranchAffinity, dayStemCombination } from "@/lib/bazi-affinity";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const BRANCH_ZODIAC: Record<string, string> = {
  子:"鼠",丑:"牛",寅:"虎",卯:"兔",辰:"龙",巳:"蛇",午:"马",未:"羊",申:"猴",酉:"鸡",戌:"狗",亥:"猪",
};

function buildSystem(hasPastLife: boolean): string {
  const pastLifeBlock = hasPastLife ? `

## 前世缘分
用1句话，借用生肖/干支合冲的意象，写一句有画面感的"前世缘"联想（例如"生肖三合，像是宿世的牵绊"），温暖、不夸张，不作迷信断言，只作浪漫化的文学联想。` : "";

  return `你是资深命理师，同时懂一些心理学的沟通/依恋风格语言。下面会给你两个人的命盘要点、一个"关系类型"，以及几条已经算好的确定性信号（生肖合冲、日支合冲、日干合等）。
请只输出以下几块，简短克制，不要展开长篇（这是免费预览，要留白吊起好奇）。**必须紧扣给出的确定性信号来写，不要脱离信号泛泛而谈**：

## 各自的感情模式
**[甲方称呼]**：用2行描述这个人在该关系里的相处模式与情感倾向（落到具体星曜/日主，不空泛，可用一点依恋风格式的心理学语言，比如"更倾向在关系里主动付出"）。
**[乙方称呼]**：同样2行。

## 相处之道
用1-2句，基于给出的合冲信号，讲两人日常相处会呈现的具体样子（不是空泛的"要多沟通"，要落到"因为XX信号，你们更容易在YY场景里合拍"这样的具体描述）。

## 会遇到的磨合
用1句话，温和地指出两人可能需要磨合的地方——**绝不用"冲突/危险/不合"这类字眼**，永远搭配一个正向的化解视角（例如"偶尔步调不一致，但这恰好是让彼此更了解的机会"）。
${pastLifeBlock}

## 缘分一瞥
用1-2句点出两人关系的最大亮点（不下吉凶定论）。

最后单独一行，以"——"开头写一句"钩子"，戛然而止、引人想看下文，例如：
——你们之间，似乎有一段更早的渊源……

简体中文。不要出现"付费/解锁/完整版"等字样。` + MODERN_INSTRUCTION;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 3, keyPrefix: "couple-preview" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string; genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  const cfg = getRelationshipConfig(relationshipType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);

  const yb = yearBranchAffinity(baziA, baziB);
  const db = dayBranchAffinity(baziA, baziB);
  const ds = dayStemCombination(baziA, baziB);

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const userMessage = `
【关系类型】${cfg.label}（侧重：${cfg.focusHint}）

【确定性得分】缘分类型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【确定性信号】${yb.desc}；${db.desc}；${ds.desc}

【${labelA}】生肖${BRANCH_ZODIAC[baziA.year.branch] ?? ""}，日主${baziA.dayMaster}（${baziA.dayMasterElement}），命格：${baziA.summary}
夫妻宫主星：${score.weddingStarsA.join("、") || "（空宫）"}

【${labelB}】生肖${BRANCH_ZODIAC[baziB.year.branch] ?? ""}，日主${baziB.dayMaster}（${baziB.dayMasterElement}），命格：${baziB.summary}
夫妻宫主星：${score.weddingStarsB.join("、") || "（空宫）"}

请按系统要求输出各块。称呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 900,
      temperature: 0.7,
      system: buildSystem(cfg.hasPastLife),
      messages: [{ role: "user", content: userMessage }],
      refs: [],
    })
  );
}
