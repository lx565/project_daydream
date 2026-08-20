export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getFlowMonths, flowMonthFactsFrom, type FlowMonth } from "@/lib/flowMonths";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";

const MONTHS_AHEAD = 12;

// Palaces where a 四化 landing genuinely matters — same set flowyear/route.ts
// uses for its deterministic year-ranking (NOTABLE_PALACES).
const NOTABLE_PALACES = new Set(["命宮", "財帛", "官祿", "夫妻", "疾厄"]);

export interface MonthScore {
  year: number;
  month: number;
  ganzhi: string;
  overall: number;  // 1–5
  career: number;   // 1–5
  romance: number;  // 1–5
  theme: string;
}

export interface MonthlyPreviewResult {
  months: MonthScore[];
  teaser: string;
}

// star name → natal palace name (major stars only)
function buildStarPalaceMap(palaces: ZiweiResult["palaces"]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of palaces ?? []) {
    for (const s of p.stars) {
      if (s.type === "major") map[s.name] = p.name;
    }
  }
  return map;
}

interface MonthSignal { star: string; type: "祿" | "權" | "科" | "忌"; palace: string }

function parseMutagen(m: string): { star: string; type: MonthSignal["type"] } | null {
  const match = m.match(/^(.+)化([祿權科忌])$/);
  if (!match) return null;
  return { star: match[1], type: match[2] as MonthSignal["type"] };
}

// Deterministic score/theme per month — no AI call, so the overview grid is
// free with zero AI cost. Only mutagen landing in a NOTABLE_PALACES natal
// palace moves the needle; 祿/權 are +1, 科 is +0.5, 忌 is -1.
function scoreMonth(f: FlowMonth, starPalaceMap: Record<string, string>): MonthScore {
  const signals: MonthSignal[] = f.monthlyMutagen
    .map(parseMutagen)
    .filter((s): s is { star: string; type: MonthSignal["type"] } => !!s)
    .map((s) => ({ ...s, palace: starPalaceMap[s.star] ?? "" }))
    .filter((s) => NOTABLE_PALACES.has(s.palace));

  let overall = 3, career = 3, romance = 3;
  for (const s of signals) {
    const delta = s.type === "忌" ? -1 : s.type === "祿" || s.type === "權" ? 1 : 0.5;
    overall += delta;
    if (s.palace === "財帛" || s.palace === "官祿") career += delta;
    if (s.palace === "夫妻") romance += delta;
  }

  // Theme: a 忌 in a notable palace takes priority (caution beats opportunity
  // for what's worth flagging to the user), else the best 祿/權, else neutral.
  const caution = signals.find((s) => s.type === "忌");
  const opportunity = signals.find((s) => s.type === "祿" || s.type === "權");
  let theme = "運勢平穩，按部就班";
  if (caution) theme = `${caution.palace}宮值${caution.star}化忌，宜謹慎`;
  else if (opportunity) theme = `${opportunity.palace}宮迎${opportunity.star}化${opportunity.type}，機會浮現`;

  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  return {
    year: f.year, month: f.month, ganzhi: f.ganzhi,
    overall: clamp(overall), career: clamp(career), romance: clamp(romance), theme,
  };
}

const TEASER_SYSTEM = `你是紫微斗數流月推算專家。根據命主本月的流月資料，寫一段簡短的本月運勢短評，約60–80字，作為付費完整逐月解讀的免費試閱。
語氣真誠專業，據盤論斷，不誇飾。結尾自然帶出還有完整12個月解讀的期待感，但不要生硬推銷。
只輸出短評本文，不要標題、不要前綴。繁體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "monthly-preview" })).allowed) {
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

  const starPalaceMap = buildStarPalaceMap(ziwei.palaces);
  const months = flows.map((f) => scoreMonth(f, starPalaceMap));

  let teaser = "";
  try {
    const nameStr = name ? `命主：${name}\n` : "";
    const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n${flowMonthFactsFrom(flows[0])}\n\n請寫本月短評。`;
    teaser = await callAI({
      system: TEASER_SYSTEM,
      userMessage,
      maxTokens: 300,
      temperature: 0.7,
    });
  } catch {
    // Teaser is a nice-to-have — the score grid is the core free value, so a
    // failed teaser call shouldn't fail the whole preview response.
  }

  return Response.json({ months, teaser: teaser.trim() } satisfies MonthlyPreviewResult);
}
