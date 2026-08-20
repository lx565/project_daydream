import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowMonths, type FlowMonth } from "@/lib/flowMonths";

const MONTHS_AHEAD = 12;
const BATCH_SIZE = 4; // 3 calls of 4 months each — avoids the truncation risk of one 12-month call

const SYSTEM = `你是精通紫微斗數流月推斷的命理師，像一位真誠的兄長為命主細說近未來每月運勢——據盤論斷，落到具體星曜宮位，有據也有溫度。

以下是命主連續數月的流月資料，請針對每一個月逐一詳批，依月份先後排列：

### YYYY年MM月 干支月
（結合流月命宮所落本命宮位的主星、流月四化落點、流耀、三方四正會照，具體點出該月的機遇或需留意的風險，並給出1條可操作的建議，整合為一段連貫文字，約130字）

行文可引相關古訣一句為據。措辭專業平實而暖心，不誇飾、不空泛、不做絕對斷言。
【加粗規則】只用**加粗**單個星曜名稱或四化符號（1–6字），不得加粗片語、句子或標題標籤。繁體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "monthly" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; name?: string; batch: 1 | 2 | 3 };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei, name, batch } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });
  if (![1, 2, 3].includes(batch)) return Response.json({ error: "invalid_batch" }, { status: 400 });

  const flows = await getFlowMonths(ziwei.birth, MONTHS_AHEAD);
  if (!flows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  const batchFlows = flows.slice((batch - 1) * BATCH_SIZE, batch * BATCH_SIZE);
  if (!batchFlows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  // star name → natal palace (for annotating which 化祿/化權/化科/化忌 lands where)
  const starPalaceMap: Record<string, string> = {};
  for (const p of ziwei.palaces ?? []) {
    for (const s of p.stars) if (s.type === "major") starPalaceMap[s.name] = p.name;
  }

  const monthLines = batchFlows.map((f: FlowMonth) => {
    const annotated = f.monthlyMutagen.map((m) => {
      const star = m.replace(/化[祿權科忌]$/, "");
      const pal = starPalaceMap[star];
      return pal ? `${m}（本命${pal}宮）` : m;
    });
    const isNow = flows[0] === f;
    return `${isNow ? "★本月★" : "      "} ${f.year}年${f.month}月 ${f.ganzhi}` +
      `｜流月命宮：本命${f.flowSoulPalace}宮` +
      `｜流月四化：${annotated.join("、") || "—"}` +
      `｜流耀：${f.flowStars.join("、") || "—"}` +
      (f.sanFang.career ? `｜流月官祿位：本命${f.sanFang.career}宮` : "") +
      (f.sanFang.wealth ? `｜流月財帛位：本命${f.sanFang.wealth}宮` : "");
  }).join("\n");

  // Classical texts are rarely indexed specifically by "流月" — 流年 is the
  // closest indexed topic and covers the same 四化-in-palace mechanics, so it
  // retrieves meaningfully more grounding than a literal 流月 tag would.
  const ragStars = [...new Set(batchFlows.flatMap((f) => [
    ...f.natalStars,
    ...f.monthlyMutagen.map((m) => m.replace(/化[祿權科忌]$/, "")),
  ]))].filter(Boolean).slice(0, 25);
  const { context, refs } = await getKnowledge({ stars: ragStars, topic: "流年", topK: 8 });

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n本批流月資料：\n${monthLines}\n\n參考資料：\n${context || "（暫無）"}\n\n請針對上方每一個月逐一詳批。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 4 months × ~130字 each — scaled up from flowyear/route.ts's 3×150字/2400 tokens.
      maxTokens: 3200,
      // DeepSeek was observed exceeding the 35s callAI default while still
      // legitimately streaming on other routes — same wider deadline here.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "monthly" },
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
