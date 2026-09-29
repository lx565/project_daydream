import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { PALACE_ALIASES, isRealPalace } from "@/lib/couple";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是紫微斗數命理師，像一位關心你的兄長，把兩人相處中需要留意的地方如實說清楚。煞星、化忌落在相關宮位之處該提醒就提醒、不迴避不淡化——但出發點是關心，語氣溫和、就事論事，不誇大也不嚇人，且每點風險都給出可行的應對，讓人安心而非焦慮。

本次合盤的關係類型會在使用者資訊中給出，請扣住該關係類型常見的衝突模式（情侶談吸引力落差或安全感、朋友談界線或競爭、親子談教養觀念差異，不要套同一模板）。

只輸出以下兩個板塊（Markdown），不要增加其他標題：

## 需要磨合之處
（列出最顯著的2-3點：依下方【雙方相關宮位煞星化忌】資料，指出雙方在哪些相關宮位存在煞星或化忌的交互張力，具體點出星曜與宮位、可能造成的相處摩擦；每點後隨附1條具體可行的化解建議。專業術語後以括號簡注。約220字）

## 這個關係類型常見的衝突模式
（約150字：結合關係類型側重，描述這類關係最常見的1-2個衝突模式——不是泛泛而談的「多溝通」，而是具體到這個關係類型會遇到的張力來源，並給出化解方向）

可引相關古訣為據。措辭專業、溫和、關切，重在提醒與給出對策，讓人讀完更有底氣。繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

const CAUTION_STARS = ["擎羊", "陀羅", "火星", "鈴星", "地空", "地劫"];

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

function cautionLine(ziwei: ZiweiResult, palaceName: string, label: string): string {
  const resolved = PALACE_ALIASES[palaceName] ?? palaceName;
  const p = ziwei.palaces.find(x => x.name === palaceName || x.name === resolved);
  if (!p) return "";
  const notable = p.stars.filter(s => CAUTION_STARS.includes(s.name) || s.mutagen === "化忌");
  if (!notable.length) return "";
  const names = notable.map(s => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`).join("、");
  return `${label}${palaceName}宮：${names}`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-cautions" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  if (!ziweiA?.palaces?.length || !ziweiB?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const relevantPalaces = cfg.palaces.filter(isRealPalace);

  const cautionLines = relevantPalaces
    .flatMap(p => [cautionLine(ziweiA, p, labelA), cautionLine(ziweiB, p, labelB)])
    .filter(Boolean);

  const cautionStarNames = relevantPalaces.flatMap(p => {
    const resolved = PALACE_ALIASES[p] ?? p;
    const notableA = ziweiA.palaces.find(x => x.name === p || x.name === resolved)?.stars.filter(s => CAUTION_STARS.includes(s.name)).map(s => s.name) ?? [];
    const notableB = ziweiB.palaces.find(x => x.name === p || x.name === resolved)?.stars.filter(s => CAUTION_STARS.includes(s.name)).map(s => s.name) ?? [];
    return [...notableA, ...notableB];
  });

  const { context, refs } = await getKnowledge({
    stars: [...new Set(cautionStarNames)],
    topic: "格局",
    topK: 5,
  });

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}

【甲方】${labelA}　${genderA === "male" ? "男" : "女"}　八字：${baziPillars(baziA)}
【乙方】${labelB}　${genderB === "male" ? "男" : "女"}　八字：${baziPillars(baziB)}

【雙方相關宮位煞星化忌】
${cautionLines.length ? cautionLines.join("\n") : "雙方相關宮位整體較為平穩，無明顯煞星化忌"}

參考資料：
${context || "（暫無）"}

請分兩個板塊：① 需要磨合之處；② 這個關係類型常見的衝突模式。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 2000,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-cautions" },
      temperature: 0.5,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
