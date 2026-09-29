import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通紫微斗數大限推算的資深合盤命理師，像一位真誠的兄長，把兩人各自的十年大限拿來對照——哪些年份兩人同步向上、哪些年份一方順一方逆，據盤論斷，也有溫度。

本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重。

請嚴格按以下 Markdown 結構輸出（標題照抄）：

## 雙方目前大限
（約140字：分別點出甲乙雙方目前大限宮位、主星、對應西元年份區間，客觀陳述，不需展開論斷）

## 同步或錯位
（約200字：結合下方提供的【重疊年份資訊】，論斷兩人目前是否處於同步的順/逆階段，或一方正旺一方正弱的錯位階段；若重疊，說明這段共同時期對關係的意義；若錯位，說明其中一方可能需要多體諒對方目前的處境）

## 關鍵轉折年份
（約150字：根據下方【大限交界資訊】，指出未來幾年內誰的大限會率先轉換，這個轉折點對這段關係代表什麼機會或需要留意之處）

## 這段時期的相處建議
（3條具體可行建議，每條先點出這段大限交疊期最可能出現的具體摩擦或機會，再給化解或把握的做法；- 開頭列表）

可引相關古訣為佐證。措辭專業平實而暖心，不誇飾、不做絕對斷言。繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

function parseAgeRange(range: string): [number, number] {
  const parts = range.split(/[~\-～]/).map((s) => parseInt(s.trim(), 10));
  return parts.length >= 2 ? [parts[0], parts[1]] : [0, 0];
}

interface DecadeWindow {
  palaceName: string;
  stars: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
}

function currentDecadeWindow(ziwei: ZiweiResult, birthYear: number): DecadeWindow | null {
  const age = new Date().getFullYear() - birthYear;
  const palace = ziwei.palaces.find((p) => {
    if (!p.decadalAge) return false;
    const [start, end] = parseAgeRange(p.decadalAge);
    return age >= start && age <= end;
  });
  if (!palace) return null;
  const [startAge, endAge] = parseAgeRange(palace.decadalAge!);
  const major = palace.stars.filter((s) => s.type === "major").map((s) => s.name).join("、") || "空宮";
  return { palaceName: palace.name, stars: major, startAge, endAge, startYear: birthYear + startAge, endYear: birthYear + endAge };
}

function overlapYears(a: DecadeWindow, b: DecadeWindow): { startYear: number; endYear: number } | null {
  const start = Math.max(a.startYear, b.startYear);
  const end = Math.min(a.endYear, b.endYear);
  return start <= end ? { startYear: start, endYear: end } : null;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-decades" })).allowed) return rateLimitResponse();

  let body: {
    ziweiA: ZiweiResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziweiA, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  if (!ziweiA?.birth?.solarDate || !ziweiB?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const birthYearA = parseInt(ziweiA.birth.solarDate.slice(0, 4), 10);
  const birthYearB = parseInt(ziweiB.birth.solarDate.slice(0, 4), 10);

  const decadeA = currentDecadeWindow(ziweiA, birthYearA);
  const decadeB = currentDecadeWindow(ziweiB, birthYearB);
  if (!decadeA || !decadeB) return Response.json({ error: "compute_failed" }, { status: 500 });

  const overlap = overlapYears(decadeA, decadeB);
  const overlapDesc = overlap
    ? `${overlap.startYear}年～${overlap.endYear}年（共${overlap.endYear - overlap.startYear + 1}年）重疊`
    : `無重疊——${labelA}大限${decadeA.startYear}-${decadeA.endYear}年，${labelB}大限${decadeB.startYear}-${decadeB.endYear}年，兩人目前不在同一大限窗口`;

  // Whichever person's current decade ends first is the next transition point.
  const nextTransition = decadeA.endYear <= decadeB.endYear
    ? `${labelA}將於${decadeA.endYear}年（西元）大限轉換`
    : `${labelB}將於${decadeB.endYear}年（西元）大限轉換`;

  const { context, refs } = await getKnowledge({
    stars: [],
    topic: "大限",
    text: `大限 交疊 ${cfg.label}`,
    topK: 6,
  });

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}

【甲方大限】${labelA}：${decadeA.palaceName}宮（${decadeA.startAge}-${decadeA.endAge}歲，西元${decadeA.startYear}-${decadeA.endYear}年）主星：${decadeA.stars}
【乙方大限】${labelB}：${decadeB.palaceName}宮（${decadeB.startAge}-${decadeB.endAge}歲，西元${decadeB.startYear}-${decadeB.endYear}年）主星：${decadeB.stars}

【重疊年份資訊】${overlapDesc}
【大限交界資訊】${nextTransition}

參考資料：
${context || "（暫無）"}

請根據以上資料，按系統要求的四個標題逐段輸出。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3000,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-decades" },
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
