export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import { chinaToday } from "@/lib/huangli";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require("lunar-javascript") as {
  Solar: {
    fromYmd: (y: number, m: number, d: number) => {
      getLunar: () => {
        getYearInGanZhiByLiChun: () => string; // flips at 立春, not Jan 1
        getMonthInGanZhiExact: () => string;   // true 節氣 boundaries, not calendar month + 2
        getDayInGanZhi: () => string;
      };
    };
  };
};

// `today` must already be in Taipei (UTC+8) wall-clock time — see chinaToday() in lib/huangli.ts.
function dateToGanzhi(today: Date): { year: string; month: string; day: string } {
  const lunar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate()).getLunar();
  return {
    year:  `${lunar.getYearInGanZhiByLiChun()}年`,
    month: `${lunar.getMonthInGanZhiExact()}月`,
    day:   `${lunar.getDayInGanZhi()}日`,
  };
}

const SYSTEM = `你是紫微斗數命理師，每日為命主提供流日運勢小卡。
根據命主命盤氣場與今日干支，給出一則溫暖有力的今日能量提示（120字以內）。

嚴格按格式：
**今日能量**：（一句話，帶情緒色彩，說今日氣場的總體方向）
**今日重點**：（結合命盤的一個具體方向——感情/事業/財運/健康，30字）
**今日提示**：（一個輕鬆可執行的小建議，20字，積極語氣）

繁體中文，溫暖，有畫面感，像每天早上發給朋友的一段話。` + SAFETY_GUARDRAIL;

interface DailyBody {
  summary: string;
  soulPalace: string;
  mainStar: string;
  fiveElementsClass: string;
  gender: string;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 20, keyPrefix: "daily" })).allowed) return rateLimitResponse();

  let body: DailyBody;
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { summary, soulPalace, mainStar, fiveElementsClass, gender } = body;
  if (!summary) return Response.json({ error: "missing_fields" }, { status: 400 });

  const today = chinaToday(); // Taipei (UTC+8) wall-clock "today" — server runs in UTC
  const { year, month, day } = dateToGanzhi(today);
  const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;

  const userMessage = `今日：${dateStr}（${year}${month}${day}）
命主：${fiveElementsClass}，命宮${soulPalace}，命主星${mainStar}，${gender === "male" ? "男命" : "女命"}
命盤摘要：${summary}

請給出今日運勢提示。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      tier: "fast",
      maxTokens: 300,
      temperature: 0.7,
      rateLimit: { ip: clientIp(request), keyPrefix: "daily" },
      reasoningEffort: "none", // FREE public 黃曆 — speed over a reasoning pass
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    })
  );
}
