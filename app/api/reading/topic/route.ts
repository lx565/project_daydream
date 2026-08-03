import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { assistantStarBriefs } from "@/lib/assistantStarData";

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

const SYSTEM = `你是精通三合派與四化派的紫微斗數命理師，像一位真誠的兄長為人答疑——坦誠有據，也有溫度。針對命主所選話題深入解讀。
格式（Markdown）：
## 三合派視角
（從宮位星曜組合論此話題，利弊並陳，專業術語後以括號簡注；約150字，**加粗**關鍵星曜）
## 四化派視角
（從四化飛星脈絡論此話題，約150字，**加粗**關鍵四化）
## 實用建議
（據上述分析給出可行建議，結合當代生活；約100字）
行文可引相關古訣一句為據。措辭專業平實而親切，客觀中肯並給出理解與實用建議，不奉承也不空泛。簡體中文。` + MODERN_INSTRUCTION;

// Palace names must match iztro's short form (財帛/官祿/…); only 命宮 carries 宮.
const TOPIC_MAP: Record<string, { palaces: string[]; label: string; topic: string }> = {
  wealth:  { palaces: ["財帛", "田宅", "官祿"], label: "財運", topic: "財運" },
  love:    { palaces: ["夫妻", "子女", "福德"], label: "感情", topic: "感情" },
  career:  { palaces: ["官祿", "遷移", "命宮"], label: "事業", topic: "事業" },
  health:  { palaces: ["疾厄", "福德", "命宮"], label: "健康", topic: "健康" },
  annual:  { palaces: ["命宮", "財帛", "官祿"], label: "流年", topic: "大限" },
};

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 10, keyPrefix: "topic" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; topic: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei, topic } = body;
  if (!ziwei || !topic) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = TOPIC_MAP[topic] ?? TOPIC_MAP.career;
  const targetPalaces = ziwei.palaces.filter((p) => cfg.palaces.includes(p.name));
  const palaceLines = targetPalaces.map((p) => {
    const major = p.stars.filter((s) => s.type === "major").map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`).join("、");
    const minor = p.stars.filter((s) => s.type === "minor").map((s) => s.name).join("、");
    const sf = ziwei.sanFangSiZheng?.[p.name];
    const sfTxt = sf ? `｜三方四正會照：${sf.stars.join("、") || "—"}` : "";
    return `${pName(p.name)}[${p.heavenlyStem}]：主星${major || "空宮"}｜輔星${minor || "無"}${sfTxt}`;
  });
  // Stars driving retrieval: major + minor in target palaces + their 三方四正 會照.
  const relevantStars = [...new Set([
    ...targetPalaces.flatMap((p) => p.stars.filter((s) => s.type === "major" || s.type === "minor").map((s) => s.name)),
    ...targetPalaces.flatMap((p) => ziwei.sanFangSiZheng?.[p.name]?.stars ?? []),
  ])].filter(Boolean);
  const minorNames = [...new Set(targetPalaces.flatMap((p) => p.stars.filter((s) => s.type === "minor").map((s) => s.name)))];
  const grounding = assistantStarBriefs(minorNames);

  const { context, refs } = await getKnowledge({ stars: relevantStars, palaces: cfg.palaces.map(pName), topic: cfg.topic, topK: 8 });

  const userMessage = `話題：${cfg.label}\n宮位（含輔星與三方四正會照，論斷須兼顧）：\n${palaceLines.join("\n") || "（無資料）"}\n命格：${ziwei.summary}\n${grounding ? `\n${grounding}\n` : ""}\n參考資料：\n${context || "（暫無）"}\n\n請深入解讀「${cfg.label}」，須結合主星、輔星與三方四正會照綜合論斷，不可只看本宮主星。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 1024,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "topic" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
