import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowYears } from "@/lib/flowYears";
import { buildStarPalaceMap, pickRiskYears } from "@/lib/flowRisk";

const SYSTEM = `你是紫微斗數命理師，像一位關心你的兄長，把命盤裡需要留意的地方如實說清楚。煞星、化忌、刑衝會照之處該提醒就提醒、不迴避不淡化——但出發點是關心，語氣溫和、就事論事，不誇大也不嚇人，且每點風險都給出可行的應對，讓人安心而非焦慮。

只輸出以下兩個板塊（Markdown），不要增加其他標題：

## 一生需特別注意
（命盤中化忌、煞星（擎羊/陀羅/火星/鈴星/空劫）的具體落宮位置與潛在影響——這是此板塊獨有的內容，聚焦星曜的具體宮位落點與現實風險，不要重述命主性格概括或人生方向總結（那已在總覽與眾說中呈現）。列出最顯著的3點，每點指明所涉星曜與宮位、可能的負面影響；專業術語後以括號簡注。每點後隨附1條具體可行的應對建議。約220字）

## 近年需格外留意
（根據流年四化資料，針對提供的風險流年，每年用 ### 小標題（格式：YYYY年 干支（X歲）），指明核心化忌落宮、可能受影響的人生面向，隨附1條可操作的應對建議。措辭溫和關切，不誇大不嚇人。約200字）

可引相關古訣為據。措辭專業、溫和、關切，重在提醒與給出對策，讓人讀完更有底氣。簡體中文。` + MODERN_INSTRUCTION;

const CAUTION_STARS = ["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫", "化忌", "破軍", "七殺", "廉貞"];

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 5, keyPrefix: "cautions" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; birthYear: number; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { ziwei, birthYear, name } = body;
  if (!ziwei?.birth?.solarDate || !birthYear) return Response.json({ error: "missing_fields" }, { status: 400 });

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // Natal chart caution stars
  const cautionPalaces = ziwei.palaces.filter((p) =>
    p.stars.some((s) => CAUTION_STARS.includes(s.name) || s.mutagen === "化忌")
  );
  const cautionLines = cautionPalaces.map((p) => {
    const major = p.stars.filter((s) => s.type === "major").map((s) => s.name);
    const notable = p.stars.filter((s) => CAUTION_STARS.includes(s.name) || s.mutagen === "化忌");
    const majorStr = major.length ? `主星：${major.join("、")} ｜ ` : "";
    return `${p.name}：${majorStr}注意：${notable.map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`).join("、")}`;
  });
  const allCautionStarNames = ziwei.palaces.flatMap((p) =>
    p.stars.filter((s) => CAUTION_STARS.includes(s.name)).map((s) => s.name)
  );

  // Flow year risk detection: next 20 years
  const flows = await getFlowYears(ziwei.birth, age, age + 19);
  const starPalaceMap = buildStarPalaceMap(ziwei.palaces);
  const riskYears = pickRiskYears(flows, starPalaceMap, 3);

  const riskYearLines = riskYears.map((r) => {
    const igList = r.yearlyMutagen.filter(m => m.endsWith('化忌'));
    const lukList = r.yearlyMutagen.filter(m => m.endsWith('化祿') || m.endsWith('化權'));
    return `${r.year}年 ${r.ganzhi}（${r.age}歲）｜流年命宮：本命${r.flowSoulPalace}宮｜化忌：${igList.join('、') || '—'}｜化祿/權：${lukList.join('、') || '—'}`;
  }).join('\n');

  // RAG: risk-year stars + natal caution stars
  const riskYearStars = riskYears.flatMap(r => [
    ...r.yearlyMutagen.map(m => m.replace(/化[祿權科忌]$/, '')),
    ...r.natalStars,
  ]).filter(Boolean);

  const { context, refs } = await getKnowledge({
    stars: [...new Set([...riskYearStars, ...allCautionStarNames])],
    topic: "格局",
    topK: 5,
  });

  const nameStr = name ? `命主：${name} · ` : "";
  const userMessage = `${nameStr}${age}歲  當前年份：${currentYear}年
命格：${ziwei.summary}
${cautionLines.length > 0 ? `命盤注意宮位：\n${cautionLines.join("\n")}` : "命盤整體較為平穩"}

近二十年流年風險年份：
${riskYearLines}

參考資料：\n${context || "（暫無）"}

請分兩個板塊：① 一生需特別注意；② 近年需格外留意。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 1800,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
