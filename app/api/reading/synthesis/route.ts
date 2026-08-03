import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";

import { NextRequest } from "next/server";
import { getSharedRetrieval, getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { buildChartFacts } from "@/lib/validateReading";
import type { ZiweiResult } from "@/lib/ziwei";
import type { BaziResult } from "@/lib/bazi";
import type { Reference } from "@/lib/rag";

const SYSTEM = `你是一位同時精通紫微斗數與八字命理的命理師，像一位真誠、閱歷豐富的兄長為人說命——既講真話，也有溫度。你的任務是把【紫微】與【八字】兩套獨立的命理體系融會貫通，給出一份跨體系的綜合總覽。

【硬性底線 · 務必遵守】
1. 紫微的主星（紫微、天府、七殺、貪狼等）是斗數星曜，絕不是星座、行星或八字十神，兩套體系各成系統、互不隸屬，不得互相套換名詞或強行對應。
2. 只有當紫微命盤事實與八字命局事實【真正一致】時，才能說"兩系共識"；當兩邊指向不同時，要如實點出這種張力（例如紫微顯剛、八字顯柔），這恰恰是更真實的洞察，絕不可為了湊"共識"而編造對應關係。
3. 只依據下方提供的兩套命盤事實與典籍參考論斷，言必有據，不杜撰格局、不張冠李戴。

【行文要求 · 反套路】
- 直接針對這一張命盤說話，具體到本盤的星曜/日主/十神，不要寫放之四海皆準的空話。
- 嚴禁套路化開場與陳詞濫調：不要"繞不開""據傳""返璞歸真""事半功倍""承前啟後"這類口水話，不要每段都用同一個模板骨架。
- 專業術語後用括號簡注，便於外行聽懂；語氣坦誠而溫暖。

【輸出形式】
輸出一段融會貫通、連貫成文的【混合解讀】，**只聚焦"紫微與八字兩套體系的交叉印證"這一獨有視角**，不要分小標題、不要分板塊、不要列表：
- 對照紫微命宮格局與八字日主格局，提煉 2-3 個兩套體系都真正支援的高置信主題（性格底色、人生主軸、核心優勢或課題）——正因兩套獨立體系都指向同一點，這些結論才格外可信；
- 若兩係指向不同，如實點出這處張力（例如紫微顯剛、八字顯柔），並說明這種分歧本身揭示了什麼。

【重要邊界】不要在此段單獨描述紫微命盤或八字命局本身——那是"紫薇綜合""八字綜合"兩個獨立板塊的內容。這裡**只講兩者交匯處**的洞察，避免與它們重複。通篇為流暢敘述，2-3 個自然段，約 280-340 字，不得使用 ## 小標題。

簡體中文。**加粗**關鍵星曜、日主、十神與五行。

最後以一句話收尾，留一個具體的懸念指向後續深度章節：點出此命最值得深究的一個時機或轉折問題（例如哪步大運是關鍵轉折），但不展開答案，僅說明"大運篇會逐年拆解"。懸念須源於此人真實命局，不得空泛套話，不得出現"付費/解鎖/完整版"等字樣。` + MODERN_INSTRUCTION;

const KEY_PALACES = ["命宮", "財帛", "官祿", "夫妻", "遷移", "福德"];
const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

// Ten Gods (十神) of a stem relative to the day master. (copied from bazi route)
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const GENERATES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

function tenGod(dayStem: string, other: string): string {
  const di = STEMS.indexOf(dayStem), oi = STEMS.indexOf(other);
  if (di < 0 || oi < 0) return "";
  const de = STEM_ELEM[di], oe = STEM_ELEM[oi];
  const samePolarity = di % 2 === oi % 2;
  if (de === oe) return samePolarity ? "比肩" : "劫財";
  if (GENERATES[de] === oe) return samePolarity ? "食神" : "傷官";
  if (CONTROLS[de] === oe) return samePolarity ? "偏財" : "正財";
  if (GENERATES[oe] === de) return samePolarity ? "偏印" : "正印";
  if (CONTROLS[oe] === de) return samePolarity ? "七殺" : "正官";
  return "";
}

function buildBaziFacts(bazi: BaziResult, gender: string): string {
  const dm = bazi.dayMaster;
  const pillars = [
    `年柱：${bazi.year.stem}${bazi.year.branch}（${tenGod(dm, bazi.year.stem)}）`,
    `月柱：${bazi.month.stem}${bazi.month.branch}（${tenGod(dm, bazi.month.stem)}）`,
    `日柱：${bazi.day.stem}${bazi.day.branch}（日主${bazi.dayMasterElement}）`,
    `時柱：${bazi.hour.stem}${bazi.hour.branch}（${tenGod(dm, bazi.hour.stem)}）`,
  ];
  const el = bazi.elements;
  const jq = bazi.jieQiInfo;
  const jqBlock = jq
    ? `節氣資訊：生於【${jq.prevJieQi}】後第${jq.daysFromPrev}天（距${jq.nextJieQi}還有${jq.daysToNext}天）${jq.isNearBoundary ? "——節交日前後，命局變數較大" : ""}
調候參考：日主${dm}${bazi.dayMasterElement}，生於${jq.season}季（${jq.prevJieQi}月）`
    : "";
  return `【八字命局】
四柱：
${pillars.join("\n")}
日主：${dm}（${bazi.dayMasterElement}）
五行分佈：木${el.wood} 火${el.fire} 土${el.earth} 金${el.metal} 水${el.water}
性別：${gender === "male" ? "男" : "女"}
命局摘要：${bazi.summary}
${jqBlock}`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "synthesis" })).allowed) return rateLimitResponse();

  let body: { ziwei: ZiweiResult; bazi: BaziResult; gender: string; name?: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { ziwei, bazi, gender, name } = body;
  if (!ziwei || !bazi || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  // ── 紫微 facts ───────────────────────────────────────────────────────────────
  const ziweiFacts = buildChartFacts(ziwei);

  // ── 八字 facts ───────────────────────────────────────────────────────────────
  const baziFacts = buildBaziFacts(bazi, gender);

  // ── Dual RAG retrieval ───────────────────────────────────────────────────────
  // 紫微: mainStar + soul-palace majors + 命宮 三方四正 stars; lean per-school slices.
  const soulPalace = ziwei.palaces.find((p) => p.isSoulPalace);
  const soulStars  = soulPalace?.stars.filter((s) => s.type === "major").map((s) => s.name) ?? [];
  const sanFangStars = ziwei.sanFangSiZheng?.["命宮"]?.stars ?? [];

  const retrieval = await getSharedRetrieval({
    stars: [ziwei.mainStar, ...soulStars, ...sanFangStars].filter(Boolean),
    palaces: KEY_PALACES.map(pName),
  });
  const sanhe = retrieval.select({ school: "三合派", strict: true, topK: 4, maxPerBook: 2 });
  const guji  = retrieval.select({ school: "古籍經典", strict: true, topK: 4, maxPerBook: 2 });

  // 八字: 日主旺衰 / 五行喜忌 / 用神 / 十神.
  const tenGods = [bazi.year.stem, bazi.month.stem, bazi.hour.stem].map((s) => tenGod(bazi.dayMaster, s)).filter(Boolean);
  const baziKnowledge = await getKnowledge({
    stars: ["日主", "用神", "十神", ...tenGods, bazi.dayMasterElement],
    text: `八字 日主旺衰 五行喜忌 用神`,
    school: "八字命理",
    strict: true,
    topK: 5,
    maxPerBook: 5,
  });

  // Merge + dedupe refs by book.
  const allRefs: Reference[] = [...sanhe.refs, ...guji.refs, ...baziKnowledge.refs].filter(
    (r, i, arr) => arr.findIndex((x) => x.book === r.book) === i
  );

  const ragContext = [
    sanhe.context          ? `【紫微·三合派典籍參考】\n${sanhe.context}` : "",
    guji.context           ? `【紫微·古籍綜合參考】\n${guji.context}` : "",
    baziKnowledge.context  ? `【八字典籍參考】\n${baziKnowledge.context}` : "",
  ].filter(Boolean).join("\n\n");

  const birthYear = ziwei.birth?.solarDate ? parseInt(ziwei.birth.solarDate.split("-")[0]) : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const personLine = [
    name ? `命主：${name}` : "命主：（未填寫）",
    age ? `約${age}歲` : "",
    `性別：${gender === "male" ? "男" : "女"}`,
  ].filter(Boolean).join(" · ");

  const revision = body.revisionNotes?.length
    ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}`
    : "";

  const userMessage = `${ragContext ? `${ragContext}\n\n---\n\n` : ""}${personLine}

==== 紫微命盤事實（確定性演算法 iztro 計算，不可更改）====
${ziweiFacts}

==== 八字命局事實（確定性演算法計算，不可更改）====
${baziFacts}

請對照以上【紫微】與【八字】兩套獨立命盤，給出一段連貫成文的混合解讀，**只講兩套體系的交叉印證（共識與張力）**，不要單獨複述紫微命盤或八字命局本身（那是另外兩個板塊的內容）。務必只在兩邊事實真正吻合時才說"共識"，絕不為湊共識而編造對應。${revision}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3200,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "synthesis" },
      temperature: 0.5,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: allRefs,
    })
  );
}
