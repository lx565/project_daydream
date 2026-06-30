// 免费预览：确定性算出四维分 + 缘分类型，AI 只写"感情模式（各2行）+ 钩子句"。
// 不做解锁检查。钩子句对有前世缘的关系类型做截断，吊起付费欲望。
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是资深命理师。下面会给你两个人的命盘要点与一个"关系类型"。
请只输出以下三块，简短克制，不要展开长篇（这是免费预览，要留白吊起好奇）：

## 各自的感情模式
**[甲方称呼]**：用2行描述这个人在该关系里的相处模式与情感倾向（落到具体星曜/日主，不空泛）。
**[乙方称呼]**：同样2行。

## 缘分一瞥
用1-2句点出两人关系的最大亮点或张力（不下吉凶定论）。

最后单独一行，以"——"开头写一句"钩子"，戛然而止、引人想看下文，例如：
——你们之间，似乎有一段更早的渊源……

简体中文。不要出现"付费/解锁/完整版"等字样。` + MODERN_INSTRUCTION;

const BRANCH_ZODIAC: Record<string, string> = {
  子:"鼠",丑:"牛",寅:"虎",卯:"兔",辰:"龙",巳:"蛇",午:"马",未:"羊",申:"猴",酉:"鸡",戌:"狗",亥:"猪",
};

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

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const userMessage = `
【关系类型】${cfg.label}（侧重：${cfg.focusHint}）

【确定性得分】缘分类型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【${labelA}】生肖${BRANCH_ZODIAC[baziA.year.branch] ?? ""}，日主${baziA.dayMaster}（${baziA.dayMasterElement}），命格：${baziA.summary}
夫妻宫主星：${score.weddingStarsA.join("、") || "（空宫）"}

【${labelB}】生肖${BRANCH_ZODIAC[baziB.year.branch] ?? ""}，日主${baziB.dayMaster}（${baziB.dayMasterElement}），命格：${baziB.summary}
夫妻宫主星：${score.weddingStarsB.join("、") || "（空宫）"}

请按系统要求输出"各自的感情模式 + 缘分一瞥 + 钩子句"。称呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 700,
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: [],
    })
  );
}
