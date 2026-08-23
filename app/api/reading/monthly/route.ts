export const maxDuration = 60;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowMonths, type FlowMonth } from "@/lib/flowMonths";

const MONTHS_AHEAD = 12;
const BATCH_SIZE = 4; // 3 calls of 4 months each — avoids the truncation risk of one 12-month call

export interface MonthlyDetail {
  year: number;
  month: number;
  headline: string; // "" if the AI omitted/malformed this month — client falls back to the free-preview theme
  good: string;
  caution: string;
  advice: string;
}

export interface MonthlyBatchResult {
  months: MonthlyDetail[];
}

const FALLBACK_GOOD = "（本次未取得，可稍後重新整理）";
const FALLBACK_CAUTION = "（本次未取得，可稍後重新整理）";
const FALLBACK_ADVICE = "（本次未取得詳細建議，其餘月份不受影響）";

const SYSTEM = `你是精通紫微斗數流月推斷的命理師，據盤論斷，用詞專業平實而有溫度。

以下是命主連續數月的流月資料。請針對每一個月，輸出四個欄位：
- headline：本月最值得留意的一句話重點，需具體點出星曜或宮位（15–20字）
- good：一件本月適合做的具體事（10–15字，例如「洽談合作」「主動溝通」，避免空泛詞如「保持樂觀」）
- caution：一件本月需留意之處（10–15字，具體到情境，例如「文件契約需多確認」）
- advice：整合本月機遇與風險的1–2句可操作建議（40–60字），需結合流月命宮星曜、四化落點具體展開，不可空泛、不可只是重複headline

所有欄位一律輸出純文字，不得使用任何Markdown語法（不得用**加粗**、#標題、-條列等符號），這些欄位會直接以純文字顯示。繁體中文。

只輸出合法JSON（無程式碼區塊標記、無多餘文字）：
{
  "months": [
    {"year": 數字, "month": 數字, "headline": "...", "good": "...", "caution": "...", "advice": "..."}
  ]
}` + SAFETY_GUARDRAIL;

interface RawMonthEntry {
  year?: unknown;
  month?: unknown;
  headline?: unknown;
  good?: unknown;
  caution?: unknown;
  advice?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

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
  const { context } = await getKnowledge({ stars: ragStars, topic: "流年", topK: 8 });

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n本批流月資料：\n${monthLines}\n\n參考資料：\n${context || "（暫無）"}\n\n請針對上方每一個月輸出JSON欄位。`;

  // ~150–160 chars of JSON (content + structural overhead) per month × 4
  // months, generously budgeted — start here, bump if live testing shows
  // truncation (same methodology used to tune every other maxTokens in this
  // codebase: start from an estimate, verify against real output).
  let raw = "";
  try {
    raw = await callAI({
      system: SYSTEM,
      userMessage,
      maxTokens: 2200,
      temperature: 0.7,
      jsonMode: true,
    });
  } catch {
    raw = "";
  }

  let parsedMonths: RawMonthEntry[] = [];
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
    const parsed = JSON.parse(cleaned) as { months?: RawMonthEntry[] };
    if (Array.isArray(parsed.months)) parsedMonths = parsed.months;
  } catch {
    console.error("[monthly] JSON parse failed, raw:", raw.slice(0, 300));
    parsedMonths = [];
  }

  // Key by (year, month), never trust array position/order/count from the AI.
  const byKey = new Map<string, RawMonthEntry>();
  for (const m of parsedMonths) {
    if (typeof m.year === "number" && typeof m.month === "number") {
      byKey.set(`${m.year}-${m.month}`, m);
    }
  }

  const months: MonthlyDetail[] = batchFlows.map((f) => {
    const entry = byKey.get(`${f.year}-${f.month}`);
    return {
      year: f.year,
      month: f.month,
      headline: isNonEmptyString(entry?.headline) ? entry.headline : "",
      good: isNonEmptyString(entry?.good) ? entry.good : FALLBACK_GOOD,
      caution: isNonEmptyString(entry?.caution) ? entry.caution : FALLBACK_CAUTION,
      advice: isNonEmptyString(entry?.advice) ? entry.advice : FALLBACK_ADVICE,
    };
  });

  return Response.json({ months } satisfies MonthlyBatchResult);
}
