export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { BaziResult, BaziDecade } from "@/lib/bazi";

const SYSTEM = `你是精通子平八字大運推演的命理師，為命主解讀一段大運——既有傳統典籍依據，又能給出現代生活視角的實用指引。使用者會提供這段大運目前是「已過」「當前」或「未來」，請據此調整語氣：已過大運用回顧視角談其已發生的影響與可借鑑之處；當前大運聚焦眼下可把握與因應之道；未來大運聚焦可提前準備的方向，切勿假裝其已經發生或正在發生。

請嚴格按以下格式輸出：

## 大運概覽
（開頭先點明這是已過/當前/未來大運，接著說明大運干支的五行屬性、對日主喜忌的作用與整體氣場，約100字）

## 這十年的核心主題
（這一大運對事業、財運、感情、健康的綜合影響，點明最值得把握的機遇與需注意的挑戰，約150字）

## 大運內部的階段差異
（大運前段（天干主導）與後段（地支主導）在氣場與重點上的差異，以及整段大運中結構性的轉折點——依干支生剋變化推斷，不得杜撰具體流年干支或年份，約120字）

## 給你的建議
（3-4條具體、可操作的建議——已過大運給「可汲取的經驗」，當前/未來大運給「順勢而為、化解不利、五行補充」的行動建議，每條 - 開頭）

繁體中文。**加粗**關鍵十神與五行名稱（單個片語，禁止用**包裹整句或整段）。不空泛，不嚇人，落點在幫助命主理解並善用這段運勢。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  // BaziDecades.tsx preloads all ~8-9 decades concurrently on a single unlocked
  // page view — a limit anywhere near that count guarantees several 429s on
  // every legitimate visit (was 5/day, i.e. broken by design). Matches the
  // validate/validate-bazi/validate-flowyear routes' 40/day, which are sized
  // the same way for the same reason (many calls per real session).
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "bazi-decade" })).allowed) {
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

  const gan = decade.ganZhi[0];
  const zhi = decade.ganZhi[1];

  const { context, refs } = await getKnowledge({
    stars: ["日主", "大運", "用神", "十神", "調候", bazi.dayMasterElement, gan, zhi],
    text: `八字大運 ${decade.ganZhi} 日主${bazi.dayMaster}${bazi.dayMasterElement} 喜用神 十年運勢 大運流年`,
    school: "八字命理",
    strict: true,
    topK: 8,
    maxPerBook: 2,
  });

  // iztro-independent: derive from the decade's own age/year pair (每個 BaziDecade
  // carries its own startAge/startYear, so birthYear is always reconstructible —
  // no need for a separate birthYear field on the request).
  const currentYear = new Date().getFullYear();
  const birthYear = decade.startYear - decade.startAge;
  const currentAge = currentYear - birthYear;
  const status: "已過" | "當前" | "未來" =
    currentYear > decade.endYear ? "已過" : currentYear < decade.startYear ? "未來" : "當前";

  const nameStr = name ? `命主：${name}\n` : "";
  const userMsg = `${nameStr}性別：${gender === "male" ? "男" : "女"}
日主：${bazi.dayMaster}（${bazi.dayMasterElement}）
命局摘要：${bazi.summary}
四柱：年柱${bazi.year.stem}${bazi.year.branch} 月柱${bazi.month.stem}${bazi.month.branch} 日柱${bazi.day.stem}${bazi.day.branch} 時柱${bazi.hour.stem}${bazi.hour.branch}
五行分佈：木${bazi.elements.wood} 火${bazi.elements.fire} 土${bazi.elements.earth} 金${bazi.elements.metal} 水${bazi.elements.water}

【${status}大運】${decade.ganZhi}（天干${gan}·地支${zhi}）
運期：${decade.startAge}歲 – ${decade.endAge}歲（${decade.startYear}年 – ${decade.endYear}年）
現在是${currentYear}年，命主現年約${currentAge}歲。

【典籍參考】
${context || "（無可用參考，請基於八字命理通論嚴謹推演）"}

請解讀此${status}大運對命主的影響與建議，並在「大運概覽」開頭明確點出這是「${status}大運」。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
      refs,
      maxTokens: 1800,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "bazi-decade" },
      temperature: 0.6,
    })
  );
}
