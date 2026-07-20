export const maxDuration = 60;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getFlowYears } from "@/lib/flowYears";
import { callAI } from "@/lib/callAI";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";

const YEARS_AHEAD = 10;

export interface YearScore {
  year: number;
  age: number;
  ganzhi: string;
  overall: number;  // 1–5
  career: number;   // 1–5
  romance: number;  // 1–5
  theme: string;
}

export interface FlowYearsScoresResult {
  scores: YearScore[];
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

const SYSTEM = `你是紫微斗數流年推算專家。根據命主命盤和未來${YEARS_AHEAD}年流年資料，為每年評分。

【評分標準 1–5分，5最優】
- 綜合運：整體順遂程度。流祿/流權落命/財/官宮加分；流忌落命/財/官扣分；
- 事業財：事業財運機遇。流年命宮或三方四正涉及官祿/財帛，且有化祿/化權→高分；化忌入官祿/財帛→扣分；
- 感情緣：感情婚姻運。流年涉及夫妻/子女宮且有化祿/化科→高分；化忌入夫妻→扣分。

主題詞：10–15字，凝練該年最主要運勢特徵。

只輸出合法 JSON（無程式碼塊標記、無多餘文字）：
{
  "scores": [
    {"year": 數字, "overall": 1-5, "career": 1-5, "romance": 1-5, "theme": "主題詞"}
  ]
}` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 8, keyPrefix: "flowyears-scores" })).allowed) {
    return rateLimitResponse();
  }

  let body: { ziwei: ZiweiResult; currentYear?: number; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const currentYear = body.currentYear ?? new Date().getFullYear();
  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const fromAge = currentYear - birthYear;
  const toAge = fromAge + YEARS_AHEAD - 1;

  const flows = await getFlowYears(ziwei.birth, fromAge, toAge);
  if (!flows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  const starPalaceMap = buildStarPalaceMap(ziwei.palaces);

  const yearLines = flows.map(f => {
    const annotated = f.yearlyMutagen.map(m => {
      const star = m.replace(/化[祿權科忌]$/, "");
      const pal = starPalaceMap[star];
      return pal ? `${m}（本命${pal}宮）` : m;
    });
    const isNow = f.year === currentYear;
    return `${isNow ? "★今年★" : "      "} ${f.year}年 ${f.ganzhi}（${f.age}歲）` +
      `｜流年命宮：本命${f.flowSoulPalace}宮` +
      `｜流年四化：${annotated.join("、") || "—"}` +
      (f.sanFang.career ? `｜流年官祿位：本命${f.sanFang.career}宮` : "") +
      (f.sanFang.wealth ? `｜流年財帛位：本命${f.sanFang.wealth}宮` : "");
  }).join("\n");

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage =
    `${nameStr}命格摘要：${ziwei.summary}\n\n未來${YEARS_AHEAD}年流年資料：\n${yearLines}\n\n` +
    `請為每年評分。`;

  try {
    const raw = await callAI({
      system: SYSTEM,
      userMessage,
      maxTokens: 2000,
      temperature: 0.5,
      jsonMode: true,
    });

    let parsed: {
      scores: Array<{ year: number; overall: number; career: number; romance: number; theme: string }>;
    };
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gm, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "parse_failed", raw: raw.slice(0, 300) }, { status: 500 });
    }

    const scoreMap = new Map(parsed.scores.map(s => [s.year, s]));
    const scores: YearScore[] = flows.map(f => {
      const s = scoreMap.get(f.year);
      return {
        year: f.year,
        age: f.age,
        ganzhi: f.ganzhi,
        overall: Math.min(5, Math.max(1, Math.round(s?.overall ?? 3))),
        career:  Math.min(5, Math.max(1, Math.round(s?.career  ?? 3))),
        romance: Math.min(5, Math.max(1, Math.round(s?.romance ?? 3))),
        theme: s?.theme ?? "",
      };
    });

    return Response.json({ scores } satisfies FlowYearsScoresResult);
  } catch {
    return Response.json({ error: "ai_failed" }, { status: 500 });
  }
}
