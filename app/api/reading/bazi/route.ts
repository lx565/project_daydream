import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 60;
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextRequest } from "next/server";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { BaziResult } from "@/lib/bazi";

const SYSTEM = `你是精通子平八字的命理師。這是"總覽"的八字格局速讀——只聚焦命局的核心格局與用神方向，讓使用者先知道"這是什麼命"。性格底色、事業財運、婚姻六親的展開在"八字"標籤頁的深度詳批中，此處不重複那些內容。

請輸出**1段**簡潔的【八字格局速讀】，不分標題、不列表、約 130-160 字：
- 點出日主五行與旺衰方向（命局以何為病、以何為藥）
- 點明格局型別（正格/變格，格局層次高低，用神是否得位）
- 一句收束：最值得關注的命局結構特點或喜忌方向

專業術語後以括號簡注。簡體中文，**加粗**關鍵日主、十神與用神。**本段須能脫離上下文獨立閱讀。**

最後以一句話收尾，留一個具體的懸念：點出此命局中最值得展開細看的一處結構（如用神受制、某柱十神的深層作用），並說明"八字篇的深度詳批會完整拆解"。懸念須源於真實命局，不得空泛，不得出現"付費/解鎖/完整版"等字樣。` + MODERN_INSTRUCTION;

// Ten Gods (十神) of a stem relative to the day master.
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
  if (GENERATES[de] === oe) return samePolarity ? "食神" : "傷官";   // 我生
  if (CONTROLS[de] === oe) return samePolarity ? "偏財" : "正財";    // 我克
  if (GENERATES[oe] === de) return samePolarity ? "偏印" : "正印";   // 生我
  if (CONTROLS[oe] === de) return samePolarity ? "七殺" : "正官";    // 克我
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
請按要求給出 2-3 段連貫的八字綜合（不分小標題、約280-320字）。`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 5, keyPrefix: "bazi" })).allowed) return rateLimitResponse();

  let body: { bazi: BaziResult; gender: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { bazi, gender } = body;
  if (!bazi || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  const tenGods = [bazi.year.stem, bazi.month.stem, bazi.hour.stem].map((s) => tenGod(bazi.dayMaster, s)).filter(Boolean);
  const jqTerm = bazi.jieQiInfo?.prevJieQi ?? "";
  const { context, refs } = await getKnowledge({
    stars: ["日主", "用神", "十神", ...tenGods, bazi.dayMasterElement],
    text: `八字命理 ${bazi.summary} 日主旺衰 五行喜忌 喜用神 調候 用神 ${jqTerm} 性格 事業 財運`,
    school: "八字命理",
    strict: true,
    topK: 7,
    // 八字命理 has a single canonical book (淵海子平); don't let the per-book cap starve it
    maxPerBook: 7,
  });

  const userMessage = `${context ? `【八字典籍參考】\n${context}\n\n---\n\n` : ""}${buildMessage(bazi, gender)}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 1400,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
