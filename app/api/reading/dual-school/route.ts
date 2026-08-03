export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getSharedRetrieval } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { SAFETY_GUARDRAIL } from "@/lib/modernInstruction";
import type { ZiweiResult } from "@/lib/ziwei";
import type { Reference } from "@/lib/rag";

const SYSTEM = `你是精通三合派、四化派与飞星派的紫微斗数命理师，为命主做三派深度解读。
请严格按以下格式输出（标记不得改动），用简体中文：

## 三合派观点
从宫位星曜组合角度深度解读此命盘：
- 命宫星曜组合的性格底色与能量特质
- 财帛、官禄、夫妻、迁移、福德等关键宫位的具体配置与吉凶
- 三方四正会照的星曜互动，格局强弱如何判断
- 此盘在三合派视角下最突出的优势与人生课题
可引古诀为据；约400字，**加粗**关键星曜与宫位

## 四化派观点
从四化飞星脉络角度深度解读此命盘：
- 本命盘各宫天干引动的四化（禄/权/科/忌）落宫与含义
- 命宫天干自化或入宫对命主性格与人生走向的影响
- 关键四化的相互作用，形成何种人生格局
- 忌星落宫对财运、感情、事业的具体影响及化解方向
可引古诀为据；约400字，**加粗**关键四化与宫位

## 飞星派观点
从飞星入宫脉络角度深度解读此命盘：
- 核心飞星格局及吉煞星的宫位落点
- 三方四正的飞星会聚对命格的影响
- 此盘最值得关注的飞星互动与人生提示
可引古诀为据；约300字，**加粗**关键星与宫位

## 综合共识
三派共同认可的命格核心：综合三派视角，指出最确定的性格特质、人生优势、核心课题与实用建议；约200字

行文专业而有温度，据盘论断，利弊并陈，不奉承也不浮夸。` + SAFETY_GUARDRAIL;

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

  const revision = body.revisionNotes?.length ? `\n\n【重要·上一版校验发现以下问题，请务必修正后重新输出】\n${body.revisionNotes.join("\n")}` : "";
  const userMessage = `命盘资料：\n${buildChartSummary(ziwei)}\n\n三合派参考：\n${sanhe.context || "（暂无）"}\n\n四化派参考：\n${sihua.context || "（暂无）"}\n\n飞星派参考：\n${feixing.context || "（暂无）"}\n\n请按格式做三派深度解读，最后给出综合共识。${revision}`;

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
