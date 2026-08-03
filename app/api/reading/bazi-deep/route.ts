import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { NextRequest } from "next/server";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { BaziResult } from "@/lib/bazi";

// Deep 八字 reading (B1 · 八字 tab) — distinct from the lighter 八字綜合 summary
// (O3) on the 總覽 tab. Same engine facts, but more sections and depth.
const SYSTEM = `你是精通子平八字的資深命理師，像一位真誠、閱歷豐富的兄長為人深度解讀八字——既講真話，也有溫度。這是一份比"總覽速讀"更深入的完整命書。

原則：
1. 以日主強弱、五行喜忌（喜用神）為綱，層層論命局格局，比一般概述更細
2. 優點與不足都如實相告，但落點在理解、鼓勵與切實可行的建議
3. 專業術語（十神、用神、調候、格局等）後以括號簡注，便於外行聽懂
4. 據下方典籍參考與命局資料論斷，不空泛、不武斷、不嚇人
5. 命局中附有節氣資訊時，結合調候用神（《窮通寶鑑》）分析日主在該季節的寒暖燥溼，點明調候用神是什麼及為何重要
6. 反套路：直接針對本命局說話，不寫放之四海皆準的空話，不用"繞不開""返璞歸真""事半功倍"這類陳詞

請嚴格按以下 Markdown 格式輸出（比總覽更深入，每節都要落到本命局具體干支與十神）：

## 命局格局詳斷
（日主旺衰判定的依據、月令司權、五行流通與病藥、取用神的邏輯與喜忌方向，整體格局氣象與層次高低，約220字）

## 性格與心性
（從日主與十神組合、藏乾透幹看性格底色、思維方式、情緒模式與天賦所長，利弊並陳，約160字）

## 事業與財運
（從官殺、財星、食傷與五行喜忌看事業方向、求財方式與財運起伏的結構性特徵，機遇與課題並陳，約200字）

## 婚姻與六親
（從夫妻星（男看財、女看官）、配偶宮（日支）與六親十神看感情模式、配偶特質與親緣厚薄，客觀點出，約160字）

## 健康與調護
（從五行偏枯、受克之行看體質易損之處與調護方向，溫和提醒不嚇人，約120字）

## 給你的建議
（像兄長叮囑那樣，依據喜用神給出 4-6 條具體、可操作、生活化的建議——可含適合的行業屬性、有利方位與顏色、需補足的方向、相處與決策提醒，每條 - 開頭，暖心務實）

簡體中文。**加粗**關鍵十神、五行與用神。` + MODERN_INSTRUCTION;

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

function buildMessage(bazi: BaziResult, gender: string): string {
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
調候參考：日主${dm}${bazi.dayMasterElement}，生於${jq.season}季（${jq.prevJieQi}月），請結合調候用神理論分析`
    : "";
  return `【八字命局】
四柱：
${pillars.join("\n")}
日主：${dm}（${bazi.dayMasterElement}）
五行分佈：木${el.wood} 火${el.fire} 土${el.earth} 金${el.metal} 水${el.water}
性別：${gender === "male" ? "男" : "女"}
命局摘要：${bazi.summary}
${jqBlock}
請按格式深度解讀此八字命局，每節都要落到本命局的具體干支與十神，比總覽速讀更細緻。`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "bazi-deep" })).allowed) return rateLimitResponse();

  let body: { bazi: BaziResult; gender: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { bazi, gender } = body;
  if (!bazi || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  const tenGods = [bazi.year.stem, bazi.month.stem, bazi.hour.stem].map((s) => tenGod(bazi.dayMaster, s)).filter(Boolean);
  const jqTerm = bazi.jieQiInfo?.prevJieQi ?? "";

  const { context, refs } = await getKnowledge({
    stars: ["日主", "用神", "十神", "格局", "調候", ...tenGods, bazi.dayMasterElement],
    text: `八字命理 ${bazi.summary} 日主旺衰 五行喜忌 喜用神 調候 用神 格局 性格 事業 財運 婚姻 六親 健康 ${jqTerm}`,
    school: "八字命理",
    strict: true,
    topK: 9,
    maxPerBook: 9,
  });

  const revision = body.revisionNotes?.length
    ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${body.revisionNotes.join("\n")}`
    : "";
  const userMessage = `${context ? `【八字典籍參考】\n${context}\n\n---\n\n` : ""}${buildMessage(bazi, gender)}${revision}`;
  const allRefs = refs;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 3800,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "bazi-deep" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
