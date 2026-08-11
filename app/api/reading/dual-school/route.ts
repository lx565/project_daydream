export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getSharedRetrieval } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";
import type { Reference } from "@/lib/rag";

const SYSTEM = `你是精通三合派、四化派與飛星派的紫微斗數命理師，為命主做三派深度解讀。
請嚴格按以下格式輸出（標記不得改動），用繁體中文（臺灣用語）：

## 三合派觀點
從宮位星曜組合角度深度解讀此命盤：
- 命宮星曜組合的性格底色與能量特質
- 財帛、官祿、夫妻、遷移、福德等關鍵宮位的具體配置與吉凶
- 三方四正會照的星曜互動，格局強弱如何判斷
- 此盤在三合派視角下最突出的優勢與人生課題
可引古訣為據；約400字，**加粗**關鍵星曜與宮位

## 四化派觀點
從四化飛星脈絡角度深度解讀此命盤：
- 本命盤各宮天干引動的四化（祿/權/科/忌）落宮與含義
- 命宮天干自化或入宮對命主性格與人生走向的影響
- 關鍵四化的相互作用，形成何種人生格局
- 忌星落宮對財運、感情、事業的具體影響及化解方向
可引古訣為據；約400字，**加粗**關鍵四化與宮位

## 飛星派觀點
從飛星入宮脈絡角度深度解讀此命盤：
- 核心飛星格局及吉煞星的宮位落點
- 三方四正的飛星會聚對命格的影響
- 此盤最值得關注的飛星互動與人生提示
可引古訣為據；約300字，**加粗**關鍵星與宮位

## 綜合共識
三派共同認可的命格核心：綜合三派視角，指出最確定的性格特質、人生優勢、核心課題與實用建議；約200字

行文專業而有溫度，據盤論斷，利弊並陳，不奉承也不浮誇。` + SAFETY_GUARDRAIL;

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

const KEY_PALACES = ["命宮", "財帛", "官祿", "夫妻", "遷移", "福德", "疾厄", "兄弟", "田宅"];

function buildChartSummary(ziwei: ZiweiResult): string {
  const lines: string[] = [
    `五行局：${ziwei.fiveElementsClass}  命宮：${ziwei.soulPalace}  身宮：${ziwei.bodyPalace}`,
    `命主：${ziwei.mainStar}  身主：${ziwei.bodyStar}`,
    "",
    "【各宮配置】",
  ];
  for (const palace of ziwei.palaces) {
    const major = palace.stars.filter((s) => s.type === "major")
      .map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`).join("、");
    const minor = palace.stars.filter((s) => s.type === "minor").map((s) => s.name).join("、");
    const sf = ziwei.sanFangSiZheng?.[palace.name];
    const sfTxt = sf ? `｜三方四正：${sf.stars.join("、") || "—"}` : "";
    lines.push(`${pName(palace.name)}[${palace.heavenlyStem}]：主星${major || "空宮"}｜輔星${minor || "無"}${sfTxt}`);
  }
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "dualschool" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei } = body;
  if (!ziwei) return Response.json({ error: "missing_fields" }, { status: 400 });

  const soulP = ziwei.palaces.find((p) => p.isSoulPalace);
  const soulStars = soulP?.stars.filter((s) => s.type === "major").map((s) => s.name) ?? [];
  const soulMinor = soulP?.stars.filter((s) => s.type === "minor").map((s) => s.name) ?? [];
  const sanFangStars = ziwei.sanFangSiZheng?.["命宮"]?.stars ?? [];
  const allMajorStars = ziwei.palaces.flatMap((p) => p.stars.filter((s) => s.type === "major").map((s) => s.name));

  const retrieval = await getSharedRetrieval({
    stars: [...soulStars, ...soulMinor, ...sanFangStars, ...allMajorStars].filter(Boolean),
    palaces: KEY_PALACES.map(pName),
  });
  const sanhe   = retrieval.select({ school: "三合派",  strict: true, topK: 8, maxPerBook: 3 });
  const sihua   = retrieval.select({ school: "四化派",  strict: true, topK: 8, maxPerBook: 3 });
  const feixing = retrieval.select({ school: "飛星派",  strict: true, topK: 6, maxPerBook: 3 });

  const seen = new Set<string>();
  const allRefs: Reference[] = [...sanhe.refs, ...sihua.refs, ...feixing.refs].filter((r) => {
    if (seen.has(r.book)) return false;
    seen.add(r.book);
    return true;
  });

  const revision = body.revisionNotes?.length ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}` : "";
  const userMessage = `命盤資料：\n${buildChartSummary(ziwei)}\n\n三合派參考：\n${sanhe.context || "（暫無）"}\n\n四化派參考：\n${sihua.context || "（暫無）"}\n\n飛星派參考：\n${feixing.context || "（暫無）"}\n\n請按格式做三派深度解讀，最後給出綜合共識。${revision}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3000,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "dualschool" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: allRefs,
    })
  );
}
