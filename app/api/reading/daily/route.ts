export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import { chinaToday } from "@/lib/huangli";
import { inputGuard } from "@/lib/inputLimits";
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
  { const bad = inputGuard(body); if (bad) return bad; }
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
      // 300 → 800 (2026-10-04): extra margin even with reasoningEffort:"none"
      // below — see lib/sseWriter.ts's DEEPSEEK_MAX_OUTPUT_TOKENS note.
      maxTokens: 800,
      temperature: 0.7,
      rateLimit: { ip: clientIp(request), keyPrefix: "daily" },
      reasoningEffort: "none", // FREE public 黃曆 — speed over a reasoning pass
      // This route's `maxDuration = 30` (top of file) is far under the 180s
      // routes' default two-phase deadline (lib/sseWriter.ts) — without these
      // explicit overrides it would inherit those defaults and the truncation-
      // retry budget check (hasTimeForAnotherAttempt) could let a retry start
      // too late for Vercel's 30s ceiling to let it finish. Sized to fit well
      // inside 30s, matching this route's prior effective behavior (old
      // defaults were attemptTimeoutMs 35_000/retryTimeoutMs 15_000).
      routeMaxDurationMs: 30_000,
      firstContentTimeoutMs: 12_000,
      attemptTimeoutMs: 20_000,
      retryTimeoutMs: 12_000,
      timeoutErrorMessage: "這次解讀未能及時完成，請點『重試』再試一次。",
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    })
  );
}
