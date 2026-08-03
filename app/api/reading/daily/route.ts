export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";

const HEAVENLY_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// Reference epoch: 2000-01-01 = 戊辰日 (stem 4, branch 4)
function dateToGanzhi(date: Date): { year: string; month: string; day: string } {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  const yearStem   = HEAVENLY_STEMS[(y - 4) % 10];
  const yearBranch = EARTHLY_BRANCHES[(y - 4) % 12];

  // Month heavenly stem offset based on year stem
  const yearStemIdx = (y - 4) % 10;
  const monthStemBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearStemIdx]; // 寅月 base
  const monthStemIdx = (monthStemBase + ((m - 1 + 2) % 12)) % 10;
  const monthBranchIdx = (m - 1 + 2) % 12;
  const monthStem   = HEAVENLY_STEMS[monthStemIdx];
  const monthBranch = EARTHLY_BRANCHES[monthBranchIdx];

  const ref = new Date(2000, 0, 1);
  const days = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  const dayStem   = HEAVENLY_STEMS[(4 + days) % 10];
  const dayBranch = EARTHLY_BRANCHES[(4 + days) % 12];

  return {
    year:  `${yearStem}${yearBranch}年`,
    month: `${monthStem}${monthBranch}月`,
    day:   `${dayStem}${dayBranch}日`,
  };
}

const SYSTEM = `你是紫微斗數命理師，每日為命主提供流日運勢小卡。
根據命主命盤氣場與今日干支，給出一則溫暖有力的今日能量提示（120字以內）。

嚴格按格式：
**今日能量**：（一句話，帶情緒色彩，說今日氣場的總體方向）
**今日重點**：（結合命盤的一個具體方向——感情/事業/財運/健康，30字）
**今日提示**：（一個輕鬆可執行的小建議，20字，積極語氣）

簡體中文，溫暖，有畫面感，像每天早上發給朋友的一段話。` + SAFETY_GUARDRAIL;

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

  const today = new Date();
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
