import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { calcBaziCoupleScore } from "@/lib/baziCouple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import type { BaziResult } from "@/lib/bazi";

const SYSTEM = `你是資深八字命理師。以下給你兩人的八字要點與緣分得分。
請只輸出以下三塊，簡短克制，不要展開長篇（這是免費預覽，要留白吊起好奇）：

## 日主相見 · 緣分底色
（只說兩人日主是何五行、生克關係如何，以及這決定了什麼相處底色；2-3句，**加粗**日主五行）

## 各自的八字性情
**[甲方稱呼]**：1-2行，從日主與格局看ta在這段關係中的性情底色。
**[乙方稱呼]**：同樣1-2行。

最後單獨一行，以「——」開頭，寫一句「鉤子」，戛然而止引人想看下文，例如：
——兩人的大運交匯期，似乎藏著一個意想不到的時機……

繁體中文。不要出現「付費/解鎖/完整版」等字樣。` + MODERN_INSTRUCTION;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 3, keyPrefix: "bazi-couple-preview" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult;
    baziB: BaziResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, baziB, nameA, nameB, genderA, genderB, relationshipType } = body;
  const cfg = getRelationshipConfig(relationshipType);
  const score = calcBaziCoupleScore(baziA, baziB, cfg.key);

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const userMessage = `
【關係類型】${cfg.label}

【確定性得分】緣分類型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【甲方】稱呼：${labelA}　日主：${baziA.dayMaster}（${baziA.dayMasterElement}）　命格：${baziA.summary}
【乙方】稱呼：${labelB}　日主：${baziB.dayMaster}（${baziB.dayMasterElement}）　命格：${baziB.summary}
日主關係：${score.dayMasterDesc}

請按系統要求輸出三塊。稱呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 500,
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: [],
    })
  );
}
