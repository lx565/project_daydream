import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getSharedRetrieval } from "@/lib/rag";
import type { Reference } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是紫微斗數典籍編纂者，以各命理門派視角分別解讀此命盤，風格嚴謹客觀、忠於原典。

規則：
1. 每個門派只能依據該門派下方提供的典籍原文，不得借用其他門派的論斷
2. 若某門派原文較少，寧可簡短，不可編造
3. 只用**加粗**單個星曜名稱與四化符號（如**武曲**、**化忌**），不得加粗片語或句子；專業術語後可加括號簡注，便於外行理解
4. 措辭專業平實而親切，據典論斷、利弊並陳，語氣有溫度，不奉承也不浮誇
5. 各門派之後寫綜合共識

嚴格按此格式輸出（標記一字不差）：

### 【三合派】
（依據三合派原文，從宮位星曜組合角度解讀，約120字）

### 【四化派】
（依據四化派原文，從四化飛星脈絡角度解讀，約120字）

### 【飛星派】
（依據飛星派原文，從飛星入宮角度解讀，約100字）

### 【古籍經典】
（依據古籍原文，引用傳統論斷，約80字）

### 【倪師學派】
（依據倪師典籍，先直判命格星曜格局與天干五行，再指出臟腑健康與因果提醒，風格直接務實，約150字）

### 【小眾學派】
（綜合三大主流之外各家名師的說法，補充一個旁參視角：獨到論斷或額外提醒，約90字。若參考資料不足，簡述「此命格在小眾諸家中著墨不多」即可，不強行編造）

## 綜合共識
（融合各派觀點，客觀陳述命格核心——優勢與侷限並陳，約100字）` + MODERN_INSTRUCTION;

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);
const keyPalaces = ["命宮", "財帛", "官祿", "夫妻", "遷移", "福德"];

function buildChartData(ziwei: ZiweiResult, gender: string): string {
  const mutagenStars = ziwei.palaces.flatMap((p) =>
    p.stars.filter((s) => s.mutagen).map((s) => `${p.name}${s.name}${s.mutagen}`)
  );
  const palaceLines = ziwei.palaces
    .filter((p) => keyPalaces.includes(p.name))
    .map((p) => {
      const major = p.stars
        .filter((s) => s.type === "major")
        .map((s) => `${s.name}${s.mutagen || ""}`)
        .join("、");
      const minor = p.stars.filter((s) => s.type === "minor").map((s) => s.name).join("、");
      const sf = ziwei.sanFangSiZheng?.[p.name];
      const sfTxt = sf ? `｜三方四正會照：${sf.stars.join("、") || "—"}` : "";
      return `${pName(p.name)}[${p.heavenlyStem}]：主星${major || "空宮"}｜輔星${minor || "無"}${sfTxt}`;
    });
  return [
    `五行局：${ziwei.fiveElementsClass}  命宮：${ziwei.soulPalace}  身宮：${ziwei.bodyPalace}`,
    `命主：${ziwei.mainStar}  身主：${ziwei.bodyStar}  性別：${gender === "male" ? "男" : "女"}`,
    mutagenStars.length ? `四化：${mutagenStars.join("、")}` : "四化：無",
    ...palaceLines,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 3, keyPrefix: "perspectives" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; gender: string; name?: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const { ziwei, gender, name } = body;
  if (!ziwei || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  const birthYear = ziwei.birth?.solarDate ? parseInt(ziwei.birth.solarDate.split("-")[0]) : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;

  const soulP = ziwei.palaces.find((p) => p.isSoulPalace);
  const soulStars = soulP?.stars.filter((s) => s.type === "major").map((s) => s.name) ?? [];
  const soulMinor = soulP?.stars.filter((s) => s.type === "minor").map((s) => s.name) ?? [];
  const sanFangStars = ziwei.sanFangSiZheng?.["命宮"]?.stars ?? [];
  const allMajorStars = [...new Set(
    ziwei.palaces.flatMap((p) => p.stars.filter((s) => s.type === "major").map((s) => s.name))
  )].filter(Boolean);

  // One embed + one scan, then strict per-school slices — same pattern and same
  // per-school topK tuning as overview.ts, so 眾說 retrieves at parity with 紫微綜合
  // instead of a flat topK=5 that starved several schools down to zero chunks.
  const retrieval = await getSharedRetrieval({
    stars: [ziwei.mainStar, ...soulStars, ...soulMinor, ...sanFangStars, ...allMajorStars].filter(Boolean),
    palaces: keyPalaces.map(pName),
  });
  const sanhe   = retrieval.select({ school: "三合派", strict: true, topK: 6, maxPerBook: 2 });
  const sihua   = retrieval.select({ school: "四化派", strict: true, topK: 5, maxPerBook: 2 });
  const feixing = retrieval.select({ school: "飛星派", strict: true, topK: 5, maxPerBook: 2 });
  const guji    = retrieval.select({ school: "古籍經典", strict: true, topK: 3, maxPerBook: 2 });
  const nixi    = retrieval.select({ school: "倪師學派", strict: true, topK: 4, maxPerBook: 2 });
  const niche   = retrieval.select({ school: "其他名家", strict: true, topK: 4, maxPerBook: 2 });

  const schoolResults = [
    { label: "三合派", ...sanhe },
    { label: "四化派", ...sihua },
    { label: "飛星派", ...feixing },
    { label: "古籍經典", ...guji },
    { label: "倪師學派", ...nixi },
    { label: "小眾學派", ...niche },
  ];

  // Each school's chunks are in their own labeled block so the model can't cross-attribute
  const fullContext = schoolResults.map((r) =>
    r.chunkCount > 0
      ? `【${r.label} · 典籍原文（${r.chunkCount}條）】\n${r.context}`
      : `【${r.label}】\n（本派典籍對此命格著墨不多，請簡短作答）`
  ).join("\n\n---\n\n");

  const allRefs: Reference[] = schoolResults
    .flatMap((r) => r.refs)
    .filter((r, i, arr) => arr.findIndex((x) => x.book === r.book) === i);

  const revision = body.revisionNotes?.length ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}` : "";
  const personLine = [name ? `命主：${name}` : "", age ? `約${age}歲` : ""].filter(Boolean).join(" · ");
  const userMessage = `${fullContext}\n\n---\n\n命盤資料：\n${personLine ? personLine + "\n" : ""}${buildChartData(ziwei, gender)}\n\n請按格式從各門派視角分別解讀此命盤。${revision}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 4000,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: allRefs,
    })
  );
}
