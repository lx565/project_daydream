export const maxDuration = 60;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { BaziResult, BaziDecade } from "@/lib/bazi";

const SYSTEM = `你是精通子平八字大運推演的命理師，為命主解讀當前大運與未來走勢——既有傳統典籍依據，又能給出現代生活視角的實用指引。

請嚴格按以下格式輸出：

## 當前大運概覽
（大運干支的五行屬性，對日主喜忌的作用，整體氣場，約100字）

## 這十年的核心主題
（這一大運對事業、財運、感情、健康的綜合影響，點明最值得把握的機遇與需注意的挑戰，約150字）

## 接下來五年重點（流年視角）
（結合大運干支，指出大運前段與後段的節奏差異，以及近五年值得特別注意的時間節點或方向轉變，約120字）

## 給你的建議
（3-4條具體、可操作的建議——順勢而為、化解不利、五行補充，每條 - 開頭）

簡體中文。**加粗**關鍵十神與五行名稱（單個片語，禁止用**包裹整句或整段）。不空泛，不嚇人，落點在幫助命主理解並善用這段運勢。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 5, keyPrefix: "bazi-decade" })).allowed) {
    return rateLimitResponse();
  }

  let body: { bazi: BaziResult; decade: BaziDecade; name?: string; gender: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { bazi, decade, name, gender } = body;
  if (!bazi?.dayMaster || !decade?.ganZhi) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const { context, refs } = await getKnowledge({
    text: `八字大運 ${decade.ganZhi} 日主${bazi.dayMaster}${bazi.dayMasterElement} 喜用神 十年運勢 大運流年`,
    topic: "格局",
    topK: 8,
    maxPerBook: 2,
  });

  const gan = decade.ganZhi[0];
  const zhi = decade.ganZhi[1];
  const nameStr = name ? `命主：${name}\n` : "";
  const userMsg = `${nameStr}性別：${gender === "male" ? "男" : "女"}
日主：${bazi.dayMaster}（${bazi.dayMasterElement}）
命局摘要：${bazi.summary}
四柱：年柱${bazi.year.stem}${bazi.year.branch} 月柱${bazi.month.stem}${bazi.month.branch} 日柱${bazi.day.stem}${bazi.day.branch} 時柱${bazi.hour.stem}${bazi.hour.branch}
五行分佈：木${bazi.elements.wood} 火${bazi.elements.fire} 土${bazi.elements.earth} 金${bazi.elements.metal} 水${bazi.elements.water}

【當前大運】${decade.ganZhi}（天干${gan}·地支${zhi}）
運期：${decade.startAge}歲 – ${decade.endAge}歲（${decade.startYear}年 – ${decade.endYear}年）

【典籍參考】
${context || "（無可用參考，請基於八字命理通論嚴謹推演）"}

請解讀此大運對命主的影響與建議。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
      refs,
      maxTokens: 1800,
      temperature: 0.6,
    })
  );
}
