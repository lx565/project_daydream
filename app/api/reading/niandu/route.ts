import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import type { BaziResult } from "@/lib/bazi";
import { getNianduYear, nianduFactsFrom } from "@/lib/niandu";

const SYSTEM = `你是紫微斗數命理師，像一位關心你的朋友，把命主今年真正值得留意的幾件事說清楚——不是「本週水逆」那種通用文案，每一點都要能回推到命盤上一個具體的星曜落點。

只輸出以下板塊（Markdown），不要增加其他標題：

## 今年關鍵提醒
（根據提供的四化落點資料，逐一展開每個訊號——用 ### 小標題（格式：領域名稱，如「感情」「事業」「財務」）。每個小標題底下必須包含兩個版本，順序固定：

1. 命理版：先點出對應的四化星曜與落宮，再具體說明這對命主今年的影響與一條可操作建議。化忌類訊號如實提醒不迴避，化祿化權化科類訊號說明可以怎麼把握。語氣溫和關切、據盤論斷，不誇大不嚇人，不使用「水逆」「能量」等空泛用語。約120字。

2. 白話版：緊接著命理版之後，用完全不懂紫微斗數／八字的人也能聽懂的話，把同一點重新講一遍——不用任何專業術語（不出現星曜名、宮位名、「化祿／化權／化科／化忌」這類字眼），只講「這對你今年的生活/決定意味著什麼」，語氣像朋友聊天，可以呼應命理版給的建議，但不是逐字翻譯。約80-120字。用以下標記包住，半形方括號，標籤一字不差：
[白話]
（白話版內容）
[/白話]

每一個小標題都必須同時有命理版和白話版，不能省略任一個。）

## 八字流年開運
（命理版：依據命主的日主五行與喜用神，對照下方提供的今年干支，給出具體可操作的開運建議，須連續成段包含以下三點（不加小標題）：
1. 顏色——今年適合多穿戴、多使用哪些顏色（對應喜用神五行），哪些顏色今年宜少用
2. 方位——居家擺設、辦公座位、出行或睡眠方向上，哪個方位對今年較為有利
3. 其他開運提醒——可涵蓋適合的飾品材質、居家小物，或一個具體可行的生活習慣調整
須據五行生克而言，語氣務實像朋友給生活建議，不誇大不神化。約180字。

白話版：緊接著命理版之後，用完全不懂八字的人也能懂的話，把上面三點重新講一遍——不出現「喜用神」「日主」「五行」「干支」這類術語，直接說「今年適合穿/用什麼顏色」「哪個方位對你有利」「還可以做點什麼」，語氣像朋友聊天給建議。約120-150字。用以下標記包住，半形方括號，標籤一字不差：
[白話]
（白話版內容）
[/白話]
）

【加粗規則】只允許用**加粗**標註單個星曜名稱、宮位名、四化符號、五行或顏色方位名稱（1–6字以內的單個術語）。絕對禁止加粗整句話、短語或標題標籤。白話版內文不加粗（因為白話版本來就不含術語）。

【直接開始】直接從第一個 ## 標題開始輸出，不要任何開場白、問候或結尾客套話。

可引相關古訣為據（僅命理版）。措辭專業、溫和、關切。繁體中文。` + SAFETY_GUARDRAIL;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "niandu" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; bazi: BaziResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { ziwei, bazi, name } = body;
  if (!ziwei?.birth?.solarDate || !bazi?.summary) return Response.json({ error: "missing_fields" }, { status: 400 });

  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const targetAge = new Date().getFullYear() - birthYear;

  const ny = await getNianduYear(ziwei, targetAge);
  if (!ny) return Response.json({ error: "compute_failed" }, { status: 500 });

  const { context, refs } = await getKnowledge({
    stars: ny.signals.map((s) => s.star),
    topic: "大限",
    topK: 5,
  });

  const nameStr = name ? `命主：${name} · ` : "";
  const userMessage = `${nameStr}命格：${ziwei.summary}
${nianduFactsFrom(ny)}

【八字資料（用於「八字流年開運」板塊）】
${bazi.summary}
今年干支：${ny.ganzhi}

參考資料：\n${context || "（暫無）"}

請根據以上四化落點資料寫今年關鍵提醒，並根據八字資料寫八字流年開運。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 3800, not 3200: added the 八字流年開運 section (one more dual 命理/白話
      // block) on top of the per-domain 四化 signals — bumped for headroom
      // against DeepSeek's reasoning_content eating into this same budget (see
      // couple/route.ts's maxTokens comment for the documented pattern).
      maxTokens: 3800,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "niandu" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
