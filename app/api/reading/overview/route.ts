import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";

import { NextRequest } from "next/server";
import { getSharedRetrieval } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import type { Reference } from "@/lib/rag";
import { detectMingge } from "@/lib/detectMingge";
import { buildExampleGrounding } from "@/lib/minggeExampleUtils";
import { assistantStarBriefs } from "@/lib/assistantStarData";

const SYSTEM = `你是一位精通三合派、四化派與飛星派的紫微斗數命理師，像一位真誠、閱歷豐富的兄長為人說命——既講真話，也有溫度。

解讀原則：
1. 優點與不足都如實相告，不粉飾也不迴避，但出發點是理解與幫助，不是評判
2. 挑戰與風險要講清楚，同時點出可努力、可轉圜的方向，讓人有底氣面對
3. 引用具體星曜（**加粗**），言必有據，專業術語後以括號簡注，便於外行聽懂
4. 覆蓋命宮、財帛、官祿、夫妻、遷移、福德等關鍵宮位
5. 語氣坦誠而溫暖，像兄長對你說心裡話：該提醒就提醒，但落點在鼓勵與陪伴，不奉承也不嚇人
6. 各派只依據下方對應學派的典籍參考，不得張冠李戴

請嚴格按以下 Markdown 格式輸出（標記一字不差）：

## 三合派觀點

### 命宮格局
（命宮主星及輔星組合：核心性格特質、優勢與弱點，約100字）

### 宮位要點
（財帛宮財運特質、官祿宮事業格局、夫妻宮感情走向，每宮40-60字，須兼及利弊，共約150字）

### 人生主旋律
（一生主要機遇與挑戰，不迴避困難，約100字）

## 四化派觀點

### 四化脈絡
（命盤中化祿、化權、化科、化忌的飛化落宮，重點分析化忌的影響位置與風險，約150字）

### 格局定論
（四化派對財官感情健康的綜合判斷，好壞均陳，約80字）

## 飛星派觀點

### 飛星脈絡
（以飛星派方法：生年四化與命宮起飛、自化及飛宮四化的入宮路線，論能量流向與因果牽動，指出關鍵飛化與隱患，約130字）

## 倪師學派觀點

### 先天命格
（依據倪師典籍，從星曜格局與天干五行角度直判：命主的核心性格底色、優勢與弱點、一生主軸。風格直接務實，不繞圈子。須據典而言，不杜撰；若參考資料不足可簡短作答，約100字）

### 健康與因果
（倪師最重視的維度：依據命盤星曜與五行，指出對應臟腑的先天強弱、需注意的健康面向，以及背後的因果邏輯。須據典而言，不杜撰；若參考資料不足則簡述"倪師典籍對此命格著墨不多"，約80字）

## 小眾學派觀點

（綜合下方"小眾學派典籍參考"中三大主流之外各家名師的說法，補充一個旁參視角：他們對本命格的不同切入、獨到論斷或額外提醒。須據料而言、不杜撰，並點明這是小眾旁參、與主流三派互為參照而非定論，約110字。若參考資料不足以支撐，則簡述"此命格在小眾諸家中著墨不多"即可，不強行編造）

簡體中文。只用**加粗**單個星曜名稱和四化符號（如**武曲**、**化忌**），絕不用**包裹整句、短語或括號內說明文字。` + MODERN_INSTRUCTION;

// iztro names palaces with short forms (財帛/官祿/遷移…); only 命宮 carries 宮.
const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

const KEY_PALACES = ["命宮", "財帛", "官祿", "夫妻", "遷移", "福德"];

function buildPalaceTable(ziwei: ZiweiResult): string {
  return ziwei.palaces.map((p) => {
    const major = p.stars.filter((s) => s.type === "major")
      .map((s) => s.mutagen ? `${s.name}化${s.mutagen}` : s.name);
    const minor = p.stars.filter((s) => s.type === "minor").map((s) => s.name);
    const adj = p.stars.filter((s) => s.type === "adjective").map((s) => s.name);
    const tags = [p.isSoulPalace ? "★命宮" : "", p.isBodyPalace ? "☆身宮" : ""].filter(Boolean);
    return `【${pName(p.name)}】主星：${major.join("、") || "空宮"} | 輔星：${minor.join("、") || "無"}${adj.length ? ` | 雜耀：${adj.join("、")}` : ""} ${tags.join(" ")}`;
  }).join("\n");
}

function buildSanFangBlock(ziwei: ZiweiResult): string {
  const lines = KEY_PALACES.map((n) => {
    const s = ziwei.sanFangSiZheng?.[n];
    if (!s) return "";
    return `${pName(n)}：對宮${pName(s.opposite)}、財帛位${pName(s.wealth)}、官祿位${pName(s.career)}｜三方四正會照星曜：${s.stars.join("、") || "—"}`;
  }).filter(Boolean);
  return lines.length ? `三方四正（關鍵宮位的對宮與三合會照——務必據此論吉凶）：\n${lines.join("\n")}` : "";
}

function buildMinggeBlock(ziwei: ZiweiResult): string {
  try {
    const formations = detectMingge(ziwei.palaces);
    if (!formations.length) return "";

    const names = formations.map((f) => `${f.name}（${f.type}）：${f.brief}`).join("\n");
    const examples = formations
      .map((f) => buildExampleGrounding(f.slug, 2))
      .filter(Boolean)
      .join("\n\n");

    return `【命格自動識別 — 演算法已核實，以下格局在本命盤中成立】
${names}

${examples}

以上格局請在解讀中主動點明並展開，這是本命盤的核心命理亮點。`;
  } catch {
    return "";
  }
}

function buildMessage(ziwei: ZiweiResult, gender: string, name?: string): string {
  const mutagenStars = ziwei.palaces.flatMap((p) =>
    p.stars.filter((s) => s.mutagen).map((s) => `${p.name}宮${s.name}化${s.mutagen}`)
  );

  const minggeBlock = buildMinggeBlock(ziwei);

  const birthYear = ziwei.birth?.solarDate ? parseInt(ziwei.birth.solarDate.split("-")[0]) : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const personLine = [
    name ? `命主：${name}` : "命主：（未填寫）",
    age ? `約${age}歲` : "",
    `生於${birthYear ?? "不詳"}年`,
    `性別：${gender === "male" ? "男" : "女"}`,
  ].filter(Boolean).join(" · ");

  return `【命盤完整資訊】
五行局：${ziwei.fiveElementsClass}
命宮：${ziwei.soulPalace}宮 | 身宮：${ziwei.bodyPalace}宮
命主星：${ziwei.mainStar} | 身主星：${ziwei.bodyStar}
${personLine}

四化彙總：
${mutagenStars.length ? mutagenStars.join("、") : "無明顯四化"}

十二宮詳情：
${buildPalaceTable(ziwei)}

${buildSanFangBlock(ziwei)}

${assistantStarBriefs([...new Set(ziwei.palaces.flatMap((p) => p.stars.filter((s) => s.type === "minor").map((s) => s.name)))])}
${minggeBlock ? `\n${minggeBlock}` : ""}
請用三合派、四化派、飛星派三個視角，對以上命盤進行深入全面的解讀。
三合派重點分析命宮格局、各宮主星輔星組合及三方四正會照（不可只看本宮單星，須結合對宮與三合宮的星曜論斷）；四化派重點分析生年四化飛化落宮；飛星派重點分析飛星入宮的能量流向與因果牽動。
輔星（左輔右弼、文昌文曲、天魁天鉞、祿存、煞星擎羊陀羅火星鈴星地空地劫等）對格局有實質影響，請結合其落宮一併論述，不可略過。`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "overview" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; gender: string; name?: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziwei, gender, name } = body;
  if (!ziwei || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  const soulPalace = ziwei.palaces.find((p) => p.isSoulPalace);
  const soulStars  = soulPalace?.stars.filter((s) => s.type === "major").map((s) => s.name) ?? [];
  const soulMinor  = soulPalace?.stars.filter((s) => s.type === "minor").map((s) => s.name) ?? [];
  const allMajorStars = [...new Set(
    ziwei.palaces.flatMap((p) => p.stars.filter((s) => s.type === "major").map((s) => s.name))
  )].filter(Boolean);
  // 命宮 三方四正 會照星曜 — surfaces assistant-star & trine knowledge the old query missed.
  const sanFangStars = ziwei.sanFangSiZheng?.["命宮"]?.stars ?? [];

  // One embed + one scan, then strict per-school slices (三合 / 四化 / 飛星 / 古籍)
  const retrieval = await getSharedRetrieval({
    stars: [ziwei.mainStar, ...soulStars, ...soulMinor, ...sanFangStars, ...allMajorStars].filter(Boolean),
    palaces: KEY_PALACES.map(pName),
  });
  const sanhe   = retrieval.select({ school: "三合派", strict: true, topK: 6, maxPerBook: 2 });
  const sihua   = retrieval.select({ school: "四化派", strict: true, topK: 5, maxPerBook: 2 });
  const feixing = retrieval.select({ school: "飛星派", strict: true, topK: 5, maxPerBook: 2 });
  const guji    = retrieval.select({ school: "古籍經典", strict: true, topK: 3, maxPerBook: 2 });
  // 倪師學派 — 倪海廈直傳典籍（天紀紫微斗數筆記等），實戰風格旁參。
  const nixi    = retrieval.select({ school: "倪師學派", strict: true, topK: 4, maxPerBook: 2 });
  // 小眾學派 — the large 其他名家 pool, otherwise never surfaced, framed as a niche-schools aside.
  const niche   = retrieval.select({ school: "其他名家", strict: true, topK: 4, maxPerBook: 2 });

  const allRefs: Reference[] = [...sanhe.refs, ...sihua.refs, ...feixing.refs, ...guji.refs, ...nixi.refs, ...niche.refs].filter(
    (r, i, arr) => arr.findIndex((x) => x.book === r.book) === i
  );

  const ragContext = [
    sanhe.context   ? `【三合派典籍參考】\n${sanhe.context}` : "",
    sihua.context   ? `【四化派典籍參考】\n${sihua.context}` : "",
    feixing.context ? `【飛星派典籍參考】\n${feixing.context}` : "",
    guji.context    ? `【古籍綜合參考】\n${guji.context}` : "",
    nixi.context    ? `【倪師學派典籍參考】\n${nixi.context}` : "",
    niche.context   ? `【小眾學派典籍參考】\n${niche.context}` : "",
  ].filter(Boolean).join("\n\n");

  const revision = body.revisionNotes?.length
    ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}`
    : "";
  const userMessage = `${ragContext}\n\n---\n\n${buildMessage(ziwei, gender, name)}${revision}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 5000,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "overview" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: allRefs,
    })
  );
}
