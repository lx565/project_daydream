import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { PALACE_ALIASES, isRealPalace, palaceDesc } from "@/lib/couple";
import { detectMingge } from "@/lib/detectMingge";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通紫微斗數宮位分析的資深合盤命理師，像一位真誠的兄長，逐宮把兩人在這段關係中真正相關的宮位攤開來講——有據可循，也有溫度。

本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重（情侶談感情吸引、親子談教養與牽絆、朋友談默契與互補，不要套同一模板）。

分析原則：
1. 只針對下方【相關宮位】清單逐一分析，不擴及其他宮位
2. 每個宮位都要明確比較雙方在該宮的主星配置——契合之處具體點出星曜組合為何相輔，磨合之處具體點出星曜組合為何容易產生張力，不可籠統帶過
3. 若【命格自動識別】清單中有格局涉及這些宮位，可自然帶出並說明對這段關係的意義；清單之外不可自創格局名稱
4. 加粗所有星曜名稱與四化名稱
5. 術語後以括號簡注，便於外行理解

請對【相關宮位】清單中的每一個宮位，嚴格按以下格式輸出一節（宮位數量依清單而定，通常3-4個）：

## [宮位名稱] · 雙方比較
**${"{甲方稱呼}"}**：[該宮主星，空宮則寫"空宮（借對宮XX）"]
**${"{乙方稱呼}"}**：[該宮主星，空宮則寫"空宮（借對宮XX）"]
[比較段落：約120-150字，具體指出兩人在此宮位的星曜組合是相輔還是磨合，落到本宮位對應的生活面向（如夫妻宮談感情相處、田宅宮談家庭共同生活、交友宮談社交默契），並給一條具體可行的建議]

全部宮位分析完後，加一節：

## 宮位總結
（約100字：綜合以上各宮，指出雙方整體而言哪個宮位最契合、哪個宮位最需要磨合，給一句總體建議）

繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-palaces" })).allowed) return rateLimitResponse();

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

  // Only the palaces this relationship type actually cares about (filters out
  // coupleTypes.ts's non-palace labels like sibling's "六亲" via isRealPalace).
  const relevantPalaces = cfg.palaces.filter(isRealPalace);

  const relevantStars = relevantPalaces.flatMap(pName => {
    const resolved = PALACE_ALIASES[pName] ?? pName;
    const starsA = ziweiA.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    const starsB = ziweiB.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    return [...starsA, ...starsB];
  });
  const allStars = [...new Set(relevantStars)];

  const { context, refs } = await getKnowledge({
    stars: allStars,
    palaces: relevantPalaces,
    topic: cfg.ragTopic,
    topK: 10,
    text: `宮位比較 ${relevantPalaces.join("宮 ")}宮 ${cfg.label}`,
  });

  const palaceComparison = relevantPalaces
    .map(p => `${labelA}${palaceDesc(ziweiA, p)}　|　${labelB}${palaceDesc(ziweiB, p)}`)
    .join("\n");

  const minggeA = detectMingge(ziweiA.palaces);
  const minggeB = detectMingge(ziweiB.palaces);
  const minggeBlock = [
    minggeA.length ? `${labelA}：${minggeA.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelA}：無明顯特殊格局`,
    minggeB.length ? `${labelB}：${minggeB.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelB}：無明顯特殊格局`,
  ].join("\n");

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}
【相關宮位清單】${relevantPalaces.join("、")}

【甲方基本資訊】${labelA}　${genderA === "male" ? "男" : "女"}　八字：${baziPillars(baziA)}
【乙方基本資訊】${labelB}　${genderB === "male" ? "男" : "女"}　八字：${baziPillars(baziB)}

【宮位並列（雙方相同宮位，供逐宮比較使用）】
${palaceComparison}

【命格自動識別（僅可引用此清單中的格局名稱，清單之外不可自創）】
${minggeBlock}

【典籍參考】
${context || "（暫無）"}

請針對【相關宮位清單】中的每一個宮位，逐一輸出比較段落，最後加一節宮位總結。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3500,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-palaces" },
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
