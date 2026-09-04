export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getNianduYear, nianduFactsFrom, type NianduSignal } from "@/lib/niandu";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL, ACCESSIBLE_LANGUAGE_INSTRUCTION } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";

export interface NianduPreviewResult {
  year: number;
  ganzhi: string;
  age: number;
  signals: NianduSignal[];
  teaser: string;
}

const TEASER_SYSTEM = `你是紫微斗數流年推算專家。根據命主今年的四化落點資料，寫一句話的年度提醒短評，約50–70字，作為付費完整年度解讀的免費試閱。
從提供的四化落點中，挑「化忌」優先（最值得提醒），沒有化忌則挑「化祿」或「化權」。
語氣真誠專業，據盤論斷，不誇飾。結尾自然帶出還有完整年度解讀的期待感，但不要生硬推銷。
只輸出短評本文，不要標題、不要前綴。繁體中文。` + ACCESSIBLE_LANGUAGE_INSTRUCTION + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "niandu-preview" })).allowed) {
    return rateLimitResponse();
  }

  let body: { ziwei: ZiweiResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const targetAge = new Date().getFullYear() - birthYear;

  const ny = await getNianduYear(ziwei, targetAge);
  if (!ny) return Response.json({ error: "compute_failed" }, { status: 500 });

  let teaser = "";
  try {
    const nameStr = name ? `命主：${name}\n` : "";
    const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n${nianduFactsFrom(ny)}\n\n請寫今年的一句話年度提醒短評。`;
    teaser = await callAI({
      system: TEASER_SYSTEM,
      userMessage,
      maxTokens: 300,
      temperature: 0.7,
    });
  } catch {
    // Teaser is a nice-to-have — the signal list is the core free value, so a
    // failed teaser call shouldn't fail the whole preview response.
  }

  return Response.json({
    year: ny.year, ganzhi: ny.ganzhi, age: ny.age, signals: ny.signals, teaser: teaser.trim(),
  } satisfies NianduPreviewResult);
}
