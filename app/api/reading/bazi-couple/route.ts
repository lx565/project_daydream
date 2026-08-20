import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { calcBaziCoupleScore } from "@/lib/baziCouple";
import { getFlowYears } from "@/lib/flowYears";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通子平八字的資深命理師，以純八字視角做雙人合盤——不涉及紫微斗數，完全在子平框架內論斷。

原則：
1. 以兩人日主的五行生克關係為綱，展開十神互動，點出相處底色
2. 獨立分析甲方八字在這段關係中的模式，再獨立分析乙方
3. 落到具體干支、十神、格局，不空泛、不套話
4. 合觀時：干支合衝刑害、五行互補/相悖、喜用神匹配、大運交匯
5. 結合雙方當前大運（近十年），點出關係高峰期與需留心的階段
6. 言語溫和有溫度，利弊並陳，落點在理解與可操作的建議

請嚴格按以下 Markdown 格式輸出（標題照抄）：

## 日主相見 · 緣分底色
（甲方日主與乙方日主的五行生克關係，說明這段關係的先天底色與最自然的互動方式；**加粗**日主與十神；約130字）

## 甲方八字在這段關係中
（從日主旺衰、月令司權、格局用神看ta在該關係中的模式——ta如何投入、如何表達、容易在哪裡出問題；**加粗**關鍵十神與干支；約160字）

## 乙方八字在這段關係中
（同框架，約160字）

## 天干合化 · 陰陽牽引
（逐一點出兩人天干有無合化（甲己合/乙庚合/丙辛合/丁壬合/戊癸合），及天干間的生克互動；說明象徵意義；**加粗**關鍵干支；約140字）

## 地支合衝刑害 · 緣分結構
（逐一分析四柱地支的三合、六合、六沖、三刑，點出最具象徵意義的組合；**加粗**關鍵支與合衝類型；約150字）

## 五行互補 · 喜用神匹配
（甲方喜用神五行 vs 乙方五行分布：乙方的強勢五行是否補足甲方所缺？反之亦然？落到具體干支；**加粗**喜用神；約130字）

## 大運時機 · 關係高峰與考驗
（先用1-2句結合雙方當前大運的天干地支，點出近幾年對這段關係最有利的時間視窗，以及需留心的階段；接著依下方【今明兩年干支】資料，具體點出今年與明年的干支對雙方日主分別是生扶還是剋洩，這兩年對關係推進的實際影響；**加粗**年份與干支；約160字）

## 相處之道
（針對兩人八字特點，給出4條具體、可操作的建議；每條先用一句話點出兩人最可能遇到的具體摩擦——十神互動或五行失衡帶來的溝通/情緒模式差異，而非籠統建議——再給出化解方式；- 開頭列表）

## 給你們的話
（溫暖真誠的收尾寄語，約60字）

### 分享卡片
（嚴格按以下格式，方括號替換為實際內容，不加其他文字：）
✦ 命裡八字合盤 ✦
[甲方稱呼] × [乙方稱呼]
$SHARELABEL$：[緣分類型標籤]
[維度1名] [分] · [維度2名] [分] · [維度3名] [分] · [維度4名] [分]
"[一句14字內的緣分點睛，溫暖且可截圖分享]"
僅供傳統文化學習參考 · mingli.study

繁體中文。**加粗**關鍵十神、五行與干支。` + MODERN_INSTRUCTION;

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const GENERATES: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const CONTROLS: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

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

// Current decade info for each person
function currentDecadeDesc(bazi: BaziResult): string {
  if (!bazi.decades || bazi.decades.length === 0) return "（大運未知）";
  const now = new Date().getFullYear();
  const current = bazi.decades.find(d => d.startYear <= now && d.endYear >= now);
  if (!current) return "（大運未知）";
  return `當前大運 ${current.ganZhi}（${current.startYear}–${current.endYear}）`;
}

// Describe element distribution compactly
function elementDesc(bazi: BaziResult): string {
  const e = bazi.elements;
  const parts: string[] = [];
  if (e.wood > 0) parts.push(`木${e.wood}`);
  if (e.fire > 0) parts.push(`火${e.fire}`);
  if (e.earth > 0) parts.push(`土${e.earth}`);
  if (e.metal > 0) parts.push(`金${e.metal}`);
  if (e.water > 0) parts.push(`水${e.water}`);
  return parts.join(" ");
}

// Stem-to-stem ten-god description across two charts
function stemInteractions(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const stemsA = [baziA.year.stem, baziA.month.stem, baziA.day.stem, baziA.hour.stem];
  const stemsB = [baziB.year.stem, baziB.month.stem, baziB.day.stem, baziB.hour.stem];
  const pillarNames = ["年", "月", "日", "時"];

  const TIAN_GAN_HE: [string, string, string][] = [
    ["甲", "己", "土"], ["乙", "庚", "金"], ["丙", "辛", "水"], ["丁", "壬", "木"], ["戊", "癸", "火"],
  ];

  const combos: string[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const sa = stemsA[i], sb = stemsB[j];
      for (const [x, y, el] of TIAN_GAN_HE) {
        if ((x === sa && y === sb) || (x === sb && y === sa)) {
          combos.push(`${labelA}${pillarNames[i]}干${sa}與${labelB}${pillarNames[j]}干${sb}合化${el}`);
          break;
        }
      }
    }
  }

  // Day master ten-god relationship
  const dayTg = tenGod(baziA.day.stem, baziB.day.stem);
  const dayTgRev = tenGod(baziB.day.stem, baziA.day.stem);
  const dmInteraction = dayTg
    ? `${labelA}日主${baziA.day.stem}對${labelB}日主${baziB.day.stem}為【${dayTg}】，${labelB}對${labelA}為【${dayTgRev}】`
    : `日主${baziA.day.stem}與${baziB.day.stem}無十神關係`;

  const result = combos.length > 0
    ? `天干合化：${combos.join("；")}\n日主十神：${dmInteraction}`
    : `天干無合化\n日主十神：${dmInteraction}`;
  return result;
}

// Branch interactions across two charts
function branchInteractions(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const branchesA = [baziA.year.branch, baziA.month.branch, baziA.day.branch, baziA.hour.branch];
  const branchesB = [baziB.year.branch, baziB.month.branch, baziB.day.branch, baziB.hour.branch];
  const pillarNames = ["年", "月", "日", "時"];

  const SAN_HE = [["子", "辰", "申"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"]];
  const LIU_HE: [string, string][] = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  const LIU_CHONG: [string, string][] = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  const SAN_XING: [string, string, string][] = [["寅","巳","申"],["丑","戌","未"]];

  const results: string[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const ba = branchesA[i], bb = branchesB[j];
      const pA = `${labelA}${pillarNames[i]}支${ba}`, pB = `${labelB}${pillarNames[j]}支${bb}`;
      for (const g of SAN_HE) {
        if (g.includes(ba) && g.includes(bb)) { results.push(`${pA}與${pB}三合`); break; }
      }
      for (const [x, y] of LIU_HE) {
        if ((x===ba&&y===bb)||(x===bb&&y===ba)) { results.push(`${pA}與${pB}六合`); break; }
      }
      for (const [x, y] of LIU_CHONG) {
        if ((x===ba&&y===bb)||(x===bb&&y===ba)) { results.push(`${pA}與${pB}六沖`); break; }
      }
      for (const g of SAN_XING) {
        if (g.includes(ba) && g.includes(bb)) { results.push(`${pA}與${pB}相刑`); break; }
      }
    }
  }
  return results.length > 0 ? results.join("；") : "地支無特殊合衝刑害";
}

function dmRelationHint(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const dmA = baziA.dayMasterElement, dmB = baziB.dayMasterElement;
  if (GENERATES[dmA] === dmB) return `${labelA}日主${dmA}生${labelB}日主${dmB}，有滋養扶持之情`;
  if (GENERATES[dmB] === dmA) return `${labelB}日主${dmB}生${labelA}日主${dmA}，有滋養扶持之情`;
  if (dmA === dmB) return `兩人同為${dmA}日主，同氣相求，志趣易近`;
  if (CONTROLS[dmA] === dmB) return `${labelA}日主${dmA}克${labelB}日主${dmB}，${labelA}對${labelB}約束力較強`;
  if (CONTROLS[dmB] === dmA) return `${labelB}日主${dmB}克${labelA}日主${dmA}，${labelB}對${labelA}約束力較強`;
  return "日主間無直接生克，後天緣分為主";
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "bazi-couple" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA?: ZiweiResult;
    baziB: BaziResult; ziweiB?: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  const cfg = getRelationshipConfig(relationshipType);
  const score = calcBaziCoupleScore(baziA, baziB, cfg.key);

  const systemPrompt = SYSTEM.replace("$SHARELABEL$", cfg.shareLabel);

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const elA = baziA.elements, elB = baziB.elements;

  // This-year + next-year ganzhi for both people, related to each day master's
  // element — grounds the 大運時機 section's annual outlook. Reuses getFlowYears
  // (same fixed infra the solo flowyear route + couple/route.ts use) purely for
  // its deterministic year/ganzhi/age facts; the 紫微-specific fields (流年命宮
  // etc.) are intentionally not used here since this route is pure 八字 (見
  // SYSTEM prompt: "不涉及紫微斗數"). Falls back gracefully if ziweiA/B weren't
  // sent (this route's body type marks them optional).
  function yearStemRelation(dayMasterElement: string, yearStem: string): string {
    const yearElement = STEM_ELEM[STEMS.indexOf(yearStem)];
    if (!yearElement) return "";
    if (GENERATES[yearElement] === dayMasterElement) return `（${yearElement}生${dayMasterElement}，有助力）`;
    if (GENERATES[dayMasterElement] === yearElement) return `（${dayMasterElement}生${yearElement}，主付出耗神）`;
    if (CONTROLS[yearElement] === dayMasterElement) return `（${yearElement}克${dayMasterElement}，壓力較大）`;
    if (CONTROLS[dayMasterElement] === yearElement) return `（${dayMasterElement}克${yearElement}，主動出擊）`;
    if (yearElement === dayMasterElement) return "（同氣，力量加倍）";
    return "";
  }
  const annualBlock = await (async () => {
    if (!ziweiA?.birth || !ziweiB?.birth) return "（無流年資料）";
    const currentYear = new Date().getFullYear();
    const birthYearA = parseInt(ziweiA.birth.solarDate.slice(0, 4), 10);
    const birthYearB = parseInt(ziweiB.birth.solarDate.slice(0, 4), 10);
    const [flowsA, flowsB] = await Promise.all([
      getFlowYears(ziweiA.birth, currentYear - birthYearA, currentYear - birthYearA + 1),
      getFlowYears(ziweiB.birth, currentYear - birthYearB, currentYear - birthYearB + 1),
    ]);
    const describe = (label: string, dayMasterElement: string, flows: typeof flowsA) => flows.map(f => {
      const yearStem = f.ganzhi.slice(0, 1);
      return `${label}：${f.year}年 ${f.ganzhi}（${f.age}歲）對日主${dayMasterElement}${yearStemRelation(dayMasterElement, yearStem)}`;
    }).join("\n");
    return [
      describe(labelA, baziA.dayMasterElement, flowsA),
      describe(labelB, baziB.dayMasterElement, flowsB),
    ].join("\n");
  })();

  // RAG: fetch 八字 knowledge about relationship + day master elements
  const ragText = `八字合盤 日主 ${baziA.dayMasterElement}日 ${baziB.dayMasterElement}日 十神 ${cfg.ragTopic} 干支合沖 喜用神 大運`;
  const { context, refs } = await getKnowledge({
    text: ragText,
    school: "八字命理",
    topK: 8,
    maxPerBook: 3,
    strict: false,
  });

  const userMessage = `
【關係類型】${cfg.label}　側重：${cfg.focusHint}

【四維得分（確定性，請據此解釋）】緣分類型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}（${d.desc}）`).join("\n")}

【甲方八字】
稱呼：${labelA}　性別：${genderA === "male" ? "男" : "女"}
四柱：${baziPillars(baziA)}
日主：${baziA.dayMaster}（${baziA.dayMasterElement}）
五行分布：${elementDesc(baziA)}
命格：${baziA.summary}
${currentDecadeDesc(baziA)}

【乙方八字】
稱呼：${labelB}　性別：${genderB === "male" ? "男" : "女"}
四柱：${baziPillars(baziB)}
日主：${baziB.dayMaster}（${baziB.dayMasterElement}）
五行分布：${elementDesc(baziB)}
命格：${baziB.summary}
${currentDecadeDesc(baziB)}

【今明兩年干支】
${annualBlock}

【合盤干支分析】
日主關係：${dmRelationHint(baziA, baziB, labelA, labelB)}
五行互補：${score.elementDesc}
${stemInteractions(baziA, baziB, labelA, labelB)}
地支合衝：${branchInteractions(baziA, baziB, labelA, labelB)}

【典籍參考】
${context || "（暫無相關典籍）"}

請按系統要求的標題逐段完成八字合盤解讀，扣住「${cfg.label}」側重，結合上方四維得分展開。稱呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 6400, not 2800: same truncation risk as couple/route.ts (DeepSeek's
      // reasoning_content eats into this budget — see that file's comment) — this
      // route asks for a comparably long 9-10 section output, bumped from 6000
      // for the 大運時機 section's expanded 今明兩年 annual-outlook content.
      maxTokens: 6400,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "bazi-couple" },
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
