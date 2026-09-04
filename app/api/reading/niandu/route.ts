import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { getNianduYear, nianduFactsFrom } from "@/lib/niandu";

const SYSTEM = `你是紫微斗數命理師，像一位關心你的朋友，把命主今年真正值得留意的幾件事說清楚——不是「本週水逆」那種通用文案，每一點都要能回推到命盤上一個具體的星曜落點。

只輸出以下板塊（Markdown），不要增加其他標題：

## 今年關鍵提醒
（根據提供的四化落點資料，逐一展開每個訊號——用 ### 小標題（格式：領域名稱，如「感情」「事業」「財務」），每點先點出對應的四化星曜與落宮，再具體說明這對命主今年的影響與一條可操作建議。化忌類訊號如實提醒不迴避，化祿化權化科類訊號說明可以怎麼把握。語氣溫和關切、據盤論斷，不誇大不嚇人，不使用「水逆」「能量」等空泛用語。每點約120字。）

可引相關古訣為據。措辭專業、溫和、關切。繁體中文。` + MODERN_INSTRUCTION;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "niandu" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; name?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { ziwei, name } = body;
  if (!ziwei?.birth?.solarDate) return Response.json({ error: "missing_fields" }, { status: 400 });

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

參考資料：\n${context || "（暫無）"}

請根據以上四化落點資料，寫今年關鍵提醒。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 1800,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "niandu" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
