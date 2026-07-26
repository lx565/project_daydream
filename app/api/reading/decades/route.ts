import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getFlowYears } from "@/lib/flowYears";

const SYSTEM = `你是精通紫微斗數大限與流年推算的命理師，像一位真誠、閱歷豐富的兄長，據盤論斷、有據可依，也有溫度。

請嚴格按以下 Markdown 結構輸出（標題照抄，不能省略任何節）：

## 上一大限回顧（X歲～X歲）
（約100字：根據上一大限宮位的主星、輔星與三方四正，回顧那十年的主旋律——奠定了什麼基礎、留下什麼課題未竟，幫助命主理解「從哪裡來」；**加粗**關鍵星曜）

## 當前大限（X歲～X歲）· 整體格局
大限宮位：XXX宮　主星：　輔星：　大限干：
（約320-380字，分兩段：第一段講大限宮本身——主星（若空宮借對宮，須明確指出）、輔星、大限干四化各自飛入哪些宮位及各自意味著什麼、三方四正會照的格局（若構成任何已知格局如陽梁昌祿、機月同梁等須點名），論此十年的整體氣象與核心主題；第二段講運勢的具體高低節奏——十年內大致哪幾年是上升期、哪幾年較需沉潛（可結合大限干四化落宮與流年干支概略推論，不必逐年，但要给出可感知的節奏感，而非籠統地說「先苦後甜」）。**加粗**關鍵星曜，術語後以括號簡注）

## 事業 · 財運
（約160字：從官祿宮三方四正、大限財帛位、化祿化權落點，論此十年的事業方向與財運結構——有無貴人提攜、適合進取還是守成、財源穩定還是起伏；**加粗**關鍵星曜）

## 感情 · 六親
（約140字：從夫妻宮在大限格局中的位置、感情星強弱、紅鸞天喜動靜，論此十年感情走向與六親緣分——有無婚戀時機、家庭關係如何；**加粗**關鍵星曜）

## 身心健康
（約100字：從疾厄宮在大限格局中的狀況、化忌與煞星落位，溫和提示這十年需注意的身心面向；不嚇人、不武斷，落到具體調護方向；**加粗**關鍵星曜）

## 大限重點提醒
（約120字：這十年最需把握的1-2個機遇、最需規避的1-2個風險；結合煞星、化忌客觀羅列，每條以「·」開頭，直接落到具體宮位與星曜）

## 下一大限預告（X歲～X歲）
（約80字：下一大限宮位與主星的基本走勢，點出與當前大限的轉折方向，給命主做準備）

可引相關古訣為佐證。措辭專業平實而暖心，據盤論斷，給出實在的提醒與鼓勵，不誇飾、不空泛安慰、不做絕對斷言。繁體中文。` + MODERN_INSTRUCTION;

function parseAgeRange(range: string): [number, number] {
  const parts = range.split(/[~\-～]/).map((s) => parseInt(s.trim(), 10));
  return parts.length >= 2 ? [parts[0], parts[1]] : [0, 0];
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 5, keyPrefix: "decades" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; birthYear?: number; name?: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziwei, name } = body;
  if (!ziwei || !ziwei.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  // birthYear: prefer the value embedded in the chart, fall back to the legacy field.
  const birthYear = parseInt(ziwei.birth?.solarDate?.slice(0, 4) ?? "", 10) || body.birthYear;
  if (!birthYear) return Response.json({ error: "missing_fields" }, { status: 400 });
  const age = new Date().getFullYear() - birthYear;

  // Locate current & next 大限 palaces.
  const currentPalace = ziwei.palaces.find((p) => {
    if (!p.decadalAge) return false;
    const [start, end] = parseAgeRange(p.decadalAge);
    return age >= start && age <= end;
  });
  const currentIdx = currentPalace ? ziwei.palaces.findIndex((p) => p.name === currentPalace.name) : -1;
  const nextPalace = currentIdx >= 0 ? ziwei.palaces[(currentIdx + 1) % 12] : undefined;
  const prevPalace = currentIdx >= 0 ? ziwei.palaces[(currentIdx - 1 + 12) % 12] : undefined;

  function palaceSummary(palace: typeof currentPalace, label: string): string {
    if (!palace) return "";
    const major = palace.stars.filter((s) => s.type === "major")
      .map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`).join("、") || "空宮";
    const minor = palace.stars.filter((s) => s.type === "minor").map((s) => s.name).join("、") || "無";
    const sf = ziwei.sanFangSiZheng?.[palace.name];
    const sfDesc = sf ? `對宮${sf.opposite}、財帛位${sf.wealth}、官祿位${sf.career}（三方四正：${sf.stars.join("、") || "—"}）` : "—";
    return `${label}：${palace.name}（${palace.decadalAge}歲）[${palace.heavenlyStem}幹]\n  主星：${major}　輔星：${minor}\n  三方四正：${sfDesc}`;
  }

  // Decade palace description — now includes 輔星 + 三方四正.
  let decadeDesc = "大限資料計算中";
  let startAge = age, endAge = age;
  if (currentPalace) {
    [startAge, endAge] = parseAgeRange(currentPalace.decadalAge);
  }
  const prevDesc = palaceSummary(prevPalace, "上一大限");
  const currDesc = palaceSummary(currentPalace, "當前大限");
  const nextDesc = palaceSummary(nextPalace, "下一大限");
  decadeDesc = [prevDesc, currDesc].filter(Boolean).join("\n\n");

  // Real per-year 流年 data from iztro — still feeds RAG enrichment (the per-year
  // 詳批 itself now lives in the FlowYearDetail table, lazily generated on click).
  const flowYears = await getFlowYears(ziwei.birth, startAge, endAge);

  // Enrich the RAG query: decade major+minor stars + flow-year 四化 stars + 三方四正 stars.
  const decadeStars = currentPalace?.stars.filter((s) => s.type === "major" || s.type === "minor").map((s) => s.name) ?? [];
  const flowStarSet = new Set<string>(decadeStars);
  for (const fy of flowYears) {
    fy.yearlyMutagen.forEach((m) => flowStarSet.add(m.replace(/化[祿權科忌]$/, "")));
    fy.sanFang.stars.forEach((s) => flowStarSet.add(s));
  }
  const ragStars = [...flowStarSet].filter(Boolean).slice(0, 30);
  const { context, refs } = await getKnowledge({ stars: ragStars, topic: "流年大限", topK: 8 });

  const revision = body.revisionNotes?.length
    ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}`
    : "";
  const nameStr = name ? `命主：${name} · ` : "";
  const userMessage = `${nameStr}當前年齡：${age}歲（${birthYear}年生）

【宮位資料】
${decadeDesc}
${nextDesc}

命格基礎：${ziwei.summary}

參考資料：
${context || "（暫無）"}

請嚴格按系統要求的七個標題逐段輸出，每段落到具體星曜宮位，不可籠統。上一大限回顧重在「奠定了什麼、留下了什麼」；當前大限事業財運感情健康各成一節；下一大限預告點轉折方向即可。${revision}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 6000, not 4000: the current-decade section was expanded (2026-07-26) and
      // DeepSeek's v4-pro/v4-flash models emit reasoning_content that counts
      // against this same budget (see lib/synthesize.ts's note on the same
      // 2026-07-25 model change) — 4000 was already observed truncating the
      // final section (下一大限預告) before this change made the target longer.
      maxTokens: 6000,
      // This route declares maxDuration=90 (vs the usual 60) specifically because
      // its output is long — streamWithRefs's default 35s/15s deadlines don't
      // know that and were observed killing legitimately-in-progress generations
      // mid-stream once the current-decade section was expanded. 55s/20s leaves
      // 15s margin under the 90s ceiling for the KV check, retry, and SSE close.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
