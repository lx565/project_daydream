import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowYears, type FlowYear } from "@/lib/flowYears";

const YEARS_AHEAD = 10; // same window as flowyears-scores, so the score grid and this critique line up
const HIGHLIGHT_COUNT = 3; // fixed, deterministic — an LLM asked to "pick 2-4" was observed under-selecting (often just 1)

// Palaces where a 四化 landing genuinely matters — mirrors lib/flowRisk.ts's
// CAUTION_PALACE_SCORES logic but symmetric: rewards opportunity (祿/權/科), not just risk (忌).
const NOTABLE_PALACES = new Set(["命宮", "財帛", "官祿", "夫妻", "疾厄"]);

/** Deterministic "how much does this year matter" score — which years get AI critique
 *  is decided by code (reliable), not by asking the AI to also judge quantity (was flaky). */
function scoreYear(f: FlowYear, starPalaceMap: Record<string, string>): number {
  let score = 0;
  for (const m of f.yearlyMutagen) {
    const star = m.replace(/化[祿權科忌]$/, "");
    const pal = starPalaceMap[star];
    if (!pal) continue;
    if (NOTABLE_PALACES.has(pal)) score += 2;
    else score += 0.5;
  }
  return score;
}

const SYSTEM = `你是精通紫微斗數流年推斷的命理師，像一位真誠的兄長為命主細說未來運勢——據盤論斷，落到具體星曜宮位，有據也有溫度。

以下已挑選出未來數年中最值得留意的年份（機遇最突出或風險最需留意者），請針對每一年深入詳批。

每個年份用以下格式（Markdown），依年份先後排列：

### YYYY年 干支（X歲）
（結合流年命宮所落本命宮位的主星、流年四化落點、流耀、三方四正會照，具體點出該年的機遇或需留意的風險，並給出1條可操作的建議，整合為一段連貫文字，約150字）

行文可引相關古訣一句為據。措辭專業平實而暖心，不誇飾、不空泛、不做絕對斷言。
【加粗規則】只用**加粗**單個星曜名稱或四化符號（1–6字），不得加粗片語、句子或標題標籤。繁體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "flowyear" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; birthYear: number; name?: string; currentYear?: number };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei, birthYear, name } = body;
  if (!ziwei?.birth?.solarDate || !birthYear) return Response.json({ error: "missing_fields" }, { status: 400 });

  const currentYear = body.currentYear ?? new Date().getFullYear();
  const fromAge = currentYear - birthYear;
  const toAge = fromAge + YEARS_AHEAD - 1;

  const flows = await getFlowYears(ziwei.birth, fromAge, toAge);
  if (!flows.length) return Response.json({ error: "compute_failed" }, { status: 500 });

  // star name → natal palace (for annotating which 化祿/化權/化科/化忌 lands where)
  const starPalaceMap: Record<string, string> = {};
  for (const p of ziwei.palaces ?? []) {
    for (const s of p.stars) if (s.type === "major") starPalaceMap[s.name] = p.name;
  }

  const ranked = [...flows].sort((a, b) => scoreYear(b, starPalaceMap) - scoreYear(a, starPalaceMap));
  const highlighted = ranked.slice(0, HIGHLIGHT_COUNT).sort((a, b) => a.year - b.year);

  const yearLines = highlighted.map((f) => {
    const annotated = f.yearlyMutagen.map((m) => {
      const star = m.replace(/化[祿權科忌]$/, "");
      const pal = starPalaceMap[star];
      return pal ? `${m}（本命${pal}宮）` : m;
    });
    const isNow = f.year === currentYear;
    return `${isNow ? "★今年★" : "      "} ${f.year}年 ${f.ganzhi}（${f.age}歲）` +
      `｜流年命宮：本命${f.flowSoulPalace}宮` +
      `｜流年四化：${annotated.join("、") || "—"}` +
      `｜流耀：${f.flowStars.join("、") || "—"}` +
      (f.sanFang.career ? `｜流年官祿位：本命${f.sanFang.career}宮` : "") +
      (f.sanFang.wealth ? `｜流年財帛位：本命${f.sanFang.wealth}宮` : "");
  }).join("\n");

  const ragStars = [...new Set(highlighted.flatMap((f) => [
    ...f.natalStars,
    ...f.yearlyMutagen.map((m) => m.replace(/化[祿權科忌]$/, "")),
  ]))].filter(Boolean).slice(0, 25);
  const { context, refs } = await getKnowledge({ stars: ragStars, topic: "流年", topK: 8 });

  const nameStr = name ? `命主：${name}\n` : "";
  const userMessage = `${nameStr}命格摘要：${ziwei.summary}\n\n已挑選的重點流年：\n${yearLines}\n\n參考資料：\n${context || "（暫無）"}\n\n請針對上方每一個年份深入詳批。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 3 years × ~150字 critique each — old single-year route used 1100 for ~340字 total,
      // so 3x that content needs meaningfully more than a flat 1400 (was observed truncating
      // mid-sentence on the 2nd of 3 years at 1400).
      maxTokens: 2400,
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
