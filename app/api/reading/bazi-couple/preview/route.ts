import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { calcBaziCoupleScore } from "@/lib/baziCouple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import type { BaziResult } from "@/lib/bazi";

function buildSystem(hasPastLife: boolean): string {
  const pastLifeBlock = hasPastLife ? `

## 前世緣分
用1句話，借用干支合沖的意象，寫一句有畫面感的「前世緣」聯想（溫暖、不誇張，不作迷信斷言，只作浪漫化的文學聯想）。` : "";

  return `你是資深八字命理師，同時懂一些心理學的溝通/依戀風格語言。以下給你兩人的八字要點與緣分得分（含干支合沖信號）。
請只輸出以下幾塊，簡短克制，不要展開長篇（這是免費預覽，要留白吊起好奇）。**必須緊扣給出的確定性信號來寫**：

## 日主相見 · 緣分底色
（只說兩人日主是何五行、生克關係如何，以及這決定了什麼相處底色；2-3句，**加粗**日主五行）

## 各自的八字性情
**[甲方稱呼]**：1-2行，從日主與格局看ta在這段關係中的性情底色（可用一點依戀風格式的心理學語言）。
**[乙方稱呼]**：同樣1-2行。

## 相處之道
用1-2句，基於給出的干支合沖信號，講兩人日常相處會呈現的具體樣子。

## 會遇到的磨合
用1句話，溫和地指出可能需要磨合的地方——**絕不用「衝突/危險/不合」這類字眼**，永遠搭配正向的化解視角。
${pastLifeBlock}

最後單獨一行，以「——」開頭，寫一句「鉤子」，戛然而止引人想看下文，例如：
——兩人的大運交匯期，似乎藏著一個意想不到的時機……

繁體中文。不要出現「付費/解鎖/完整版」等字樣。` + MODERN_INSTRUCTION;
}

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

請按系統要求輸出各塊。稱呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 700,
      temperature: 0.7,
      system: buildSystem(cfg.hasPastLife),
      messages: [{ role: "user", content: userMessage }],
      refs: [],
    })
  );
}
