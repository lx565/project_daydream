export const maxDuration = 60;
import { NextRequest } from "next/server";
import type { ZiweiResult } from "@/lib/ziwei";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const SYSTEM_BASE = `你是精通紫微斗數的命理師，像一位穩重、溫暖、親切的老師，就使用者的命盤為他耐心解惑。
回答簡短（約120-180字），直接針對問題，據盤而論、利弊並陳，給出實用、可操作的提醒或建議；不空泛安慰、不恐嚇、不做極端斷言。
結合命盤中具體的宮位與星曜來談（如夫妻宮、命宮的主星組合），並用 Markdown **加粗** 關鍵的星曜、宮位與重點提醒。專業術語後以括號簡注，便於外行理解。
簡體中文，語氣穩重、友好、親切、溫暖——像老師對學生那樣，既專業又有溫度，循循善誘。` + SAFETY_GUARDRAIL;

const MAX_MESSAGES = 5;

interface ChatMessage { role: "user" | "assistant"; content: string }

export async function POST(request: NextRequest) {
  // Server-side abuse cap. remainingQuestions below is client UX only and must
  // never be trusted for billing protection — this is the real limit.
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "chat" })).allowed) {
    return rateLimitResponse();
  }

  let body: { ziwei: Partial<ZiweiResult>; messages: ChatMessage[]; remainingQuestions: number; backgroundReadings?: Record<string, string>; name?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziwei, messages, remainingQuestions, backgroundReadings, name } = body;
  if (!ziwei || !messages || messages.length === 0) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  if (remainingQuestions <= 0) {
    return Response.json({ error: "limit_reached", message: "本次解讀已達對話上限（5條），感謝使用！" }, { status: 429 });
  }

  // Trim history and normalize so the turn list starts with a user message
  // (required by Anthropic/Gemini; safest for DeepSeek too).
  let trimmed = messages.slice(-MAX_MESSAGES * 2);
  const firstUser = trimmed.findIndex((m) => m.role === "user");
  trimmed = firstUser >= 0 ? trimmed.slice(firstUser) : [];
  if (trimmed.length === 0) return Response.json({ error: "missing_fields" }, { status: 400 });

  // RAG: retrieve a little context for the latest question
  const lastQuestion = [...trimmed].reverse().find((m) => m.role === "user")?.content ?? "";
  const stars = [ziwei.mainStar, ziwei.bodyStar].filter(Boolean) as string[];
  let ragContext = "";
  try {
    const k = await getKnowledge({ stars, text: lastQuestion, topK: 4, maxPerBook: 1 });
    ragContext = k.context;
  } catch { /* lexical/empty fallback is fine */ }

  // Build background context from all completed readings
  const READING_LABELS: Record<string, string> = {
    overview: "命格總覽（三合·四化·飛星三派）",
    palaces:  "十二宮位逐宮解讀",
    decades:  "大運流年解讀",
    bazi:     "八字命理解讀",
    cautions: "特別注意事項",
  };
  const readingContext = backgroundReadings
    ? Object.entries(backgroundReadings)
        .filter(([, v]) => v && v.trim().length > 100)
        .map(([k, v]) => `=== ${READING_LABELS[k] ?? k} ===\n${v.slice(0, 1200)}`)
        .join("\n\n")
    : "";

  const birthYear = ziwei.birth?.solarDate ? parseInt(ziwei.birth.solarDate.split("-")[0]) : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const personCtx = [name ? `命主：${name}` : "", age ? `約${age}歲` : ""].filter(Boolean).join(" · ");

  const system = [
    SYSTEM_BASE,
    personCtx ? `\n${personCtx}` : "",
    ziwei.summary ? `\n命盤摘要：${ziwei.summary}` : "",
    readingContext
      ? `\n\n【已完成的命盤分析——請以這些結論為基礎回答追問，保持一致性，不要重複已有內容，直接深化或補充】\n${readingContext}`
      : "",
    ragContext ? `\n\n【典籍參考】\n${ragContext}` : "",
  ].join("");

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 600,
      system,
      messages: trimmed,
    })
  );
}
