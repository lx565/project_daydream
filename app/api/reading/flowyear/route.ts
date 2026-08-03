import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowYears, flowYearFactsFrom } from "@/lib/flowYears";

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

const SYSTEM = `你是精通紫微斗數流年推斷的命理師，像一位真誠的兄長為命主細說某一年的運勢——據盤論斷，落到具體星曜宮位，有據也有溫度。
針對**單一流年**深入詳批，格式（Markdown）：

## 本年概覽
（結合流年命宮所落本命宮位的主星、輔星，概述該年主題與氣場，約120字）

## 機遇與風險
（結合流年四化的落點、流耀、以及流年命宮的三方四正會照，具體點出該年的機遇、需留意的風險與時機，約140字）

## 實用建議
（據上述給出可操作的建議，結合當代生活，約80字）

行文可引相關古訣一句為據。措辭專業平實而暖心，不誇飾、不空泛、不做絕對斷言。
【加粗規則】只用**加粗**單個星曜名稱或四化符號（1–6字），不得加粗片語、句子或標題標籤（如**機遇**：、**風險**：）。簡體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "flowyear" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; year: number };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei, year } = body;
  if (!ziwei?.birth?.solarDate || !year) return Response.json({ error: "missing_fields" }, { status: 400 });

  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const age = year - birthYear;
  if (age < 0 || age > 120) return Response.json({ error: "out_of_range" }, { status: 422 });

  const [flow] = await getFlowYears(ziwei.birth, age, age);
  if (!flow) return Response.json({ error: "compute_failed" }, { status: 500 });

  const facts = flowYearFactsFrom(flow);

  const ragStars = [...new Set([
    ...flow.natalStars,
    ...flow.yearlyMutagen.map((m) => m.replace(/化[祿權科忌]$/, "")),
    ...flow.sanFang.stars,
  ])].filter(Boolean).slice(0, 20);
  const ragPalaces = [...new Set([
    pName(flow.flowSoulPalace),
    pName(flow.sanFang.opposite),
    pName(flow.sanFang.wealth),
    pName(flow.sanFang.career),
  ])].filter(Boolean);
  const { context, refs } = await getKnowledge({ stars: ragStars, palaces: ragPalaces, topic: "流年", topK: 8 });

  const userMessage = `${facts}\n\n命格基礎：${ziwei.summary}\n\n參考資料：\n${context || "（暫無）"}\n\n請據上方流年資料，對 ${flow.year}年（${age}歲）這一年深入詳批。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 1100,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "flowyear" },
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
