export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL, ACCESSIBLE_LANGUAGE_INSTRUCTION } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowMonths } from "@/lib/flowMonths";

const MONTHS_AHEAD = 12;

export interface MonthlySummaryResult {
  summary: string;
}

const SYSTEM = `你是精通紫微斗數流月推斷的命理師。根據命主未來12個月的流月資料，寫一段全年運勢總覽，約150–200字。

內容需綜合全年趨勢：哪幾個月是機遇高峰、哪幾個月需特別留意、全年整體的行事節奏建議。不要逐月覆述細節，要提煉出跨月份的整體脈絡，給出具體、可操作的全年建議。

只輸出總覽本文，不要標題、不要前綴。所有內容一律純文字，不得使用任何Markdown語法（不得用**加粗**、#標題等符號）。繁體中文。` + ACCESSIBLE_LANGUAGE_INSTRUCTION + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "monthly-summary" })).allowed) {
    return rateLimitResponse();
  }

  let body: { ziwei: ZiweiResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const flows = await getFlowMonths(ziwei.birth, MONTHS_AHEAD);
  if (!flows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  const starPalaceMap: Record<string, string> = {};
  for (const p of ziwei.palaces ?? []) {
    for (const s of p.stars) if (s.type === "major") starPalaceMap[s.name] = p.name;
  }

  const monthLines = flows.map((f) => {
    const annotated = f.monthlyMutagen.map((m) => {
      const star = m.replace(/化[祿權科忌]$/, "");
      const pal = starPalaceMap[star];
      return pal ? `${m}（本命${pal}宮）` : m;
    });
    const isNow = flows[0] === f;
    return `${isNow ? "★本月★" : "      "} ${f.year}年${f.month}月 ${f.ganzhi}｜流月命宮：本命${f.flowSoulPalace}宮｜流月四化：${annotated.join("、") || "—"}`;
  }).join("\n");

  // Classical texts are rarely indexed specifically by "流月" — 流年 is the
  // closest indexed topic and covers the same 四化-in-palace mechanics, so it
  // retrieves meaningfully more grounding than a literal 流月 tag would.
  const ragStars = [...new Set(flows.flatMap((f) => [
    ...f.natalStars,
    ...f.monthlyMutagen.map((m) => m.replace(/化[祿權科忌]$/, "")),
  ]))].filter(Boolean).slice(0, 25);
  const { context } = await getKnowledge({ stars: ragStars, topic: "流年", topK: 8 });

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n未來12個月流月資料：\n${monthLines}\n\n參考資料：\n${context || "（暫無）"}\n\n請寫全年運勢總覽。`;

  let summary = "";
  try {
    summary = await callAI({
      system: SYSTEM,
      userMessage,
      maxTokens: 500,
      temperature: 0.7,
    });
  } catch {
    summary = "";
  }

  return Response.json({ summary: summary.trim() } satisfies MonthlySummaryResult);
}
