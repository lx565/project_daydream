import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 60;
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";

import { NextRequest } from "next/server";
import { getSharedRetrieval } from "@/lib/rag";
import type { Reference } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是一位精通紫微斗數的命理師，融會三合派（宮位星曜格局）與飛星派（四化飛星脈絡）兩種視角。這是"總覽"頁的紫薇綜合結論——綜合兩派所見，讓使用者先知道"這是什麼命"。

請輸出**1段**獨立成文的綜合共識結論，**不加"##"標題**，約140-170字：
- 綜合三合派（宮位星曜格局）與飛星派（四化飛星脈絡）兩種視角，取其共同指向
- 直接點出命主命宮的核心星曜格局（格局名稱或主星組合）
- 點明全盤最有動能的宮位
- 點出最值得關注的一個化忌或煞星落點

**本段須獨立成文、能脫離上下文單獨閱讀**——不得以"綜上所述""綜合來看""兩派共同認可"之類承上啟下的字樣開頭，直接論命。各派只依據下方對應學派的典籍參考，不得張冠李戴。

簡體中文。只用**加粗**單個星曜名稱和四化符號（如**武曲**、**化忌**），絕不用**包裹整句、短語或括號內說明文字。不得出現"付費/解鎖/完整版"等字樣。` + MODERN_INSTRUCTION;

// iztro names palaces with short forms (財帛/官祿/遷移…); only 命宮 carries 宮.
const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

const KEY_PALACES = ["命宮", "財帛", "官祿", "夫妻", "遷移", "福德"];

function buildKeyPalaceLines(ziwei: ZiweiResult): string {
  return ziwei.palaces
    .filter((p) => p.isSoulPalace || KEY_PALACES.some((n) => pName(n) === pName(p.name)))
    .map((p) => {
      const major = p.stars.filter((s) => s.type === "major")
        .map((s) => s.mutagen ? `${s.name}化${s.mutagen}` : s.name);
      const tags = [p.isSoulPalace ? "★命宮" : "", p.isBodyPalace ? "☆身宮" : ""].filter(Boolean);
      return `【${pName(p.name)}】主星：${major.join("、") || "空宮"} ${tags.join(" ")}`;
    }).join("\n");
}

function buildMessage(ziwei: ZiweiResult, gender: string, name?: string): string {
  const mutagenStars = ziwei.palaces.flatMap((p) =>
    p.stars.filter((s) => s.mutagen).map((s) => `${p.name}宮${s.name}化${s.mutagen}`)
  );

  const personLine = [
    name ? `命主：${name}` : "命主：（未填寫）",
    `性別：${gender === "male" ? "男" : "女"}`,
  ].filter(Boolean).join(" · ");

  return `【命盤摘要】
五行局：${ziwei.fiveElementsClass}
命宮：${ziwei.soulPalace}宮 | 身宮：${ziwei.bodyPalace}宮
命主星：${ziwei.mainStar} | 身主星：${ziwei.bodyStar}
${personLine}

四化彙總：
${mutagenStars.length ? mutagenStars.join("、") : "無明顯四化"}

關鍵宮位：
${buildKeyPalaceLines(ziwei)}

請給出綜合共識結論。`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "consensus" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; gender: string; name?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziwei, gender, name } = body;
  if (!ziwei || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  const soulPalace = ziwei.palaces.find((p) => p.isSoulPalace);
  const soulStars  = soulPalace?.stars.filter((s) => s.type === "major").map((s) => s.name) ?? [];
  // 命宮 三方四正 會照星曜 — the trine/opposite stars that co-define the soul palace's structure.
  const sanFangStars = ziwei.sanFangSiZheng?.["命宮"]?.stars ?? [];

  // Two-school grounding so the "綜合" is genuine — 三合派 (宮位星曜格局) + 飛星派
  // (四化飛星脈絡). Far lighter than overview's 6 schools: one embed+scan, two cheap
  // in-memory slices, and still a single short conclusion (not 6 sections) to generate.
  const retrieval = await getSharedRetrieval({
    stars: [ziwei.mainStar, ...soulStars, ...sanFangStars].filter(Boolean),
    palaces: KEY_PALACES.map(pName),
  });
  const sanhe   = retrieval.select({ school: "三合派", strict: true, topK: 5, maxPerBook: 2 });
  const feixing = retrieval.select({ school: "飛星派", strict: true, topK: 5, maxPerBook: 2 });

  const refs: Reference[] = [...sanhe.refs, ...feixing.refs].filter(
    (r, i, arr) => arr.findIndex((x) => x.book === r.book) === i
  );
  const ragContext = [
    sanhe.context   ? `【三合派典籍參考】\n${sanhe.context}` : "",
    feixing.context ? `【飛星派典籍參考】\n${feixing.context}` : "",
  ].filter(Boolean).join("\n\n");

  const userMessage = `${ragContext ? `${ragContext}\n\n---\n\n` : ""}${buildMessage(ziwei, gender, name)}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 3000, not 1200: the conclusion itself is short (~150字), but DeepSeek's
      // reasoning_content ("thinking") is billed against this same budget and, on the
      // fast tier especially, can consume 1200 entirely BEFORE any visible token —
      // producing an empty reading (observed 2026-08-03: 紫薇綜合 rendered refs but no
      // body). Generous headroom so reasoning never starves the actual output.
      maxTokens: 3000,
      temperature: 0.5,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "consensus" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
