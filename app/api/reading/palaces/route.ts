import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextRequest } from "next/server";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是紫微斗數命理師，三合派與四化派功底深厚，像一位真誠的兄長為你逐宮講解——有據可循，也有溫度。

請對命盤十二宮逐一解讀，每宮：
1. 列出該宮主要星曜
2. 闡釋星曜在此宮的含義，專業術語後以括號簡注，便於外行理解（如：化忌（兇化，主阻滯）），利弊並陳，約50-80字
3. 如有化祿/化權/化科/化忌，說明其作用
4. 必須結合該宮的輔星與三方四正（對宮及三合宮的會照星曜）綜合論斷，不可只看本宮主星；空宮或無主星者，借對宮與三方會照之星論之
5. 行文中可引一句相關古訣（簡短，不超一句），以增依據
6. 遇標註[身宮]之宮，須額外點明身宮之義：身宮主後天努力方向與中晚年（約35歲後）際遇之所重，命宮定先天、身宮顯後修，二者合參
7. 遇標註[來因宮]之宮，須點明來因宮之義：來因宮乃生年天干所落之宮，是本命四化飛星的源頭、此生福分因果與天賦資源之所自來，宜結合該宮星曜說明命主的助力從何而來、宜守何方

**加粗**所有星曜與四化名稱。措辭專業平實而親切，優缺點如實道來並給予理解與鼓勵，不浮誇也不空洞奉承。簡體中文。

格式（每宮嚴格兩部分：先一行主星，再一段解讀。**不要**單列"三方四正"那一行，也不要加"解讀："之類字首）：
## 命宮 · [地支]宮
**主星**：[本宮主星，空宮則寫"空宮（借對宮XX）"]
[解讀段落：結合本宮輔星、四化與三方四正會照綜合論斷——三方四正之星在行文中自然帶出即可，不單獨成行；約50-80字，可引一句古訣]

## 兄弟宮 · [地支]宮
...（以此類推，完整覆蓋全部十二宮）` + MODERN_INSTRUCTION;

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

function buildPalaceDetail(ziwei: ZiweiResult): string {
  return ziwei.palaces.map((p) => {
    const major = p.stars.filter((s) => s.type === "major")
      .map((s) => s.mutagen ? `${s.name}（${s.mutagen}）` : s.name);
    const minor = p.stars.filter((s) => s.type === "minor").map((s) => s.name);
    const adj   = p.stars.filter((s) => s.type === "adjective").map((s) => s.name);
    const sf = ziwei.sanFangSiZheng?.[p.name];
    const sfLine = sf
      ? `\n  三方四正：對宮${pName(sf.opposite)}、財帛位${pName(sf.wealth)}、官祿位${pName(sf.career)}（會照星曜：${sf.stars.join("、") || "—"}）`
      : "";
    const tags  = [
      p.isSoulPalace ? "命宮" : "",
      p.isBodyPalace ? "身宮" : "",
      p.name === ziwei.laiYinPalace ? "來因宮" : "",
    ].filter(Boolean);
    return `【${pName(p.name)}】地支：${p.earthlyBranch} 天干：${p.heavenlyStem}${tags.length ? ` [${tags.join("/")}]` : ""}
  主星：${major.join("、") || "空宮"}
  輔星：${minor.join("、") || "無"}
  雜曜：${adj.join("、") || "無"}${sfLine}`;
  }).join("\n\n");
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 3, keyPrefix: "palaces" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; name?: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziwei, name } = body;
  if (!ziwei) return Response.json({ error: "missing_fields" }, { status: 400 });

  // Birth year + age for age-appropriate modern framing
  const birthYear = ziwei.birth?.solarDate ? parseInt(ziwei.birth.solarDate.split("-")[0]) : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const personLine = [
    name ? `命主：${name}` : "",
    age ? `約${age}歲` : "",
    birthYear ? `生於${birthYear}年` : "",
  ].filter(Boolean).join(" · ");

  // Full-corpus RAG: query all 12 palaces' major stars so every palace has grounding
  const allStars = [...new Set(ziwei.palaces.flatMap((p) => p.stars.filter((s) => s.type === "major").map((s) => s.name)))].filter(Boolean);
  const allMinor = [...new Set(ziwei.palaces.flatMap((p) => p.stars.filter((s) => s.type === "minor").map((s) => s.name)))].filter(Boolean);
  const allPalaceNames = ziwei.palaces.map((p) => pName(p.name));

  const { context, refs } = await getKnowledge({
    // Lead with 身宮/來因宮 so their grounding (145/597 chunks) isn't sliced off.
    stars: [...new Set(["身宮", "來因宮", ...allStars, ...allMinor])].slice(0, 18),
    palaces: allPalaceNames,
    topK: 14,
  });

  const userMessage = `【命盤基本資訊】
五行局：${ziwei.fiveElementsClass}
${personLine}
命主星：${ziwei.mainStar} | 身主星：${ziwei.bodyStar}

【典籍參考】
${context || "（無匹配典籍）"}

---

【十二宮詳情，請逐宮解讀】
${buildPalaceDetail(ziwei)}

請按上述格式，完整解讀全部十二宮，不要遺漏任何一宮。${body.revisionNotes?.length ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}` : ""}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 4500,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
