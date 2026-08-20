import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { calcCoupleScoreV2, PALACE_ALIASES } from "@/lib/couple";
import { detectMingge } from "@/lib/detectMingge";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是精通紫微斗數與八字子平的資深合盤命理師。本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重來解讀（情侶談感情、親子談教養、朋友談默契，不要套同一模板）。

分析層次：
1. 獨立看甲方在這段關係中的模式（不受乙方影響）
2. 獨立看乙方
3. 兩盤合觀：契合、張力、相處之道
4. 時機：結合雙方當前大運，點出關係的高峰/考驗階段

請嚴格按以下 Markdown 輸出（標題照抄）：

## 四維詳解
（逐條解釋使用者給出的四維得分各自因何而來，落到具體星曜/日主/五行；每維1-2句；**加粗**維度名）

## 甲方在這段關係中
（約160字：下方列出的相關宮位主星與四化、感情星強弱、相處模式；若相關宮位有化忌或煞星（擎羊/陀羅/火星/鈴星/地空/地劫），具體點出並溫和說明可能的張力；**加粗**關鍵星曜）

## 乙方在這段關係中
（約160字，同框架）

## 宮位對照
（約150字：逐一對照下方【宮位對照】資料中雙方在同一宮位的星曜配置，說明彼此在該領域容易被對方哪一面吸引、契合或需要磨合之處；若下方【命格自動識別】清單中有格局涉及這些宮位（尤其凶格），可自然帶出並說明如何應對，不誇大不恐嚇；**加粗**關鍵星曜與宮位名）

## 飛化互入
（約140字：一方的生年四化/重要星曜落入對方命盤的哪個宮，說明彼此牽動的領域。注意命理規則：七殺/天相/天府不參與十干四化；紫微只化權/化科。）

## 合盤綜析與三方四正
（約180字：雙方相關宮位的三方四正牽引、日主生克、四柱合衝、五行互補結構；**加粗**關鍵論斷）

## 緣分時機
（約120字：結合雙方當前大運，點出關係的高峰期與需留心的階段）

## 相處之道
（針對兩人命盤，3-5條具體可操作建議；每條先用一句話點出兩人在這方面最可能遇到的具體摩擦或誤解——依附風格、溝通習慣或情緒表達方式的差異，而非籠統的「多溝通」——再給出可操作的化解方式；- 開頭列表）
$PASTLIFE$

## 給你們的話
（溫暖真誠的收尾寄語，約70字）

### 分享卡片
（嚴格按以下格式，方括號替換為實際內容，不加其他文字：）
✦ 命裡合盤 ✦
[甲方稱呼] × [乙方稱呼]
$SHARELABEL$：[緣分類型標籤]
[維度1名] [分] · [維度2名] [分] · [維度3名] [分] · [維度4名] [分]
「一句12字內的緣分點睛，溫暖且可截圖分享」
僅供傳統文化學習參考 · mingli.study

繁體中文（臺灣用語）。` + MODERN_INSTRUCTION;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRANCH_ZODIAC: Record<string, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龍", 巳: "蛇",
  午: "馬", 未: "羊", 申: "猴", 酉: "雞", 戌: "狗", 亥: "豬",
};

function zodiacRelation(branchA: string, branchB: string): string {
  const SAN_HE = [["子","辰","申"],["亥","卯","未"],["寅","午","戌"],["巳","酉","丑"]];
  const LIU_HE: [string,string][] = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  const CHONG: [string,string][] = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  const XING: [string,string,string][] = [["寅","巳","申"],["丑","戌","未"]];

  for (const g of SAN_HE) if (g.includes(branchA) && g.includes(branchB)) return "三合（天然契合，同氣相求）";
  for (const [a,b] of LIU_HE) if ((a===branchA&&b===branchB)||(a===branchB&&b===branchA)) return "六合（相合融洽）";
  for (const [a,b] of CHONG) if ((a===branchA&&b===branchB)||(a===branchB&&b===branchA)) return "相衝（摩擦較多，需磨合）";
  for (const g of XING) if (g.includes(branchA) && g.includes(branchB)) return "三刑（相互磨礪，有緣有劫）";
  return "無特殊合衝（後天緣分為主，需彼此經營）";
}

// Describe a palace with all its stars. Resolves coupleTypes.ts's short/modern
// palace labels (e.g. "交友", "命") against ZiweiResult.palaces[].name's actual
// stored form (e.g. "僕役", "命宮") via the shared PALACE_ALIASES table.
function palaceDesc(ziwei: ZiweiResult, palaceName: string): string {
  const resolvedName = PALACE_ALIASES[palaceName] ?? palaceName;
  const p = ziwei.palaces.find(x => x.name === palaceName || x.name === resolvedName);
  if (!p) return `${palaceName}（無資料）`;
  const stars = p.stars
    .filter(s => s.type === "major" || s.type === "minor" || ["紅鸞","天喜","天馬","孤辰","寡宿"].includes(s.name))
    .map(s => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`)
    .join("、");
  const stem = p.heavenlyStem ? `[${p.heavenlyStem}干]` : "";
  return `${palaceName}${stem}：${stars || "空宮"}`;
}

// Real ZiweiResult.palaces[].name values (post-alias-resolution) — used to
// filter out non-palace entries like coupleTypes.ts's sibling config's "六亲"
// (a loose relational grouping, not one of the 12 actual palaces).
const REAL_PALACE_NAMES = new Set([
  "命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄",
  "遷移", "僕役", "官祿", "田宅", "福德", "父母",
]);

function isRealPalace(palaceName: string): boolean {
  const resolved = PALACE_ALIASES[palaceName] ?? palaceName;
  return REAL_PALACE_NAMES.has(resolved);
}

// Find which palace a named star sits in
function findStarPalace(ziwei: ZiweiResult, starName: string): string {
  for (const p of ziwei.palaces) {
    const s = p.stars.find(x => x.name === starName);
    if (s) return `${p.name}${s.mutagen ? `化${s.mutagen}` : ""}`;
  }
  return "（未見）";
}

// Describe the four bazi pillars compactly
function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

// Detect simple stem combinations between two bazi sets
function stemRelations(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const HE_STEMS: [string,string][] = [["甲","己"],["乙","庚"],["丙","辛"],["丁","壬"],["戊","癸"]];
  const relations: string[] = [];
  const stemsA = [baziA.year.stem, baziA.month.stem, baziA.day.stem, baziA.hour.stem];
  const stemsB = [baziB.year.stem, baziB.month.stem, baziB.day.stem, baziB.hour.stem];
  const pillarNames = ["年干","月干","日干","時干"];
  for (const [i, sa] of stemsA.entries()) {
    for (const [j, sb] of stemsB.entries()) {
      for (const [ha, hb] of HE_STEMS) {
        if ((sa===ha&&sb===hb)||(sa===hb&&sb===ha)) {
          relations.push(`${labelA}${pillarNames[i]}${sa} 合 ${labelB}${pillarNames[j]}${sb}`);
        }
      }
    }
  }
  return relations.length ? relations.join("；") : "天干無明顯合化";
}

function branchRelations(baziA: BaziResult, baziB: BaziResult, labelA: string, labelB: string): string {
  const CHONG: [string,string][] = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  const LIU_HE: [string,string][] = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  const relations: string[] = [];
  const branchesA = [baziA.year.branch, baziA.month.branch, baziA.day.branch, baziA.hour.branch];
  const branchesB = [baziB.year.branch, baziB.month.branch, baziB.day.branch, baziB.hour.branch];
  const names = ["年支","月支","日支","時支"];
  for (const [i,ba] of branchesA.entries()) {
    for (const [j,bb] of branchesB.entries()) {
      for (const [a,b] of CHONG) {
        if ((ba===a&&bb===b)||(ba===b&&bb===a)) relations.push(`${labelA}${names[i]}${ba} 衝 ${labelB}${names[j]}${bb}`);
      }
      for (const [a,b] of LIU_HE) {
        if ((ba===a&&bb===b)||(ba===b&&bb===a)) relations.push(`${labelA}${names[i]}${ba} 合 ${labelB}${names[j]}${bb}`);
      }
    }
  }
  return relations.length ? relations.slice(0,4).join("；") : "地支無明顯合衝";
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string;
    genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;

  const cfg = getRelationshipConfig(relationshipType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);

  // Per-relationship 前世缘 section + share-card label injected into SYSTEM.
  const pastLifeSection = cfg.hasPastLife
    ? "\n## 前世緣分（命理故事）\n（約120字：以來因宮/夫妻宮星曜組合為依據，寫一段富畫面感的「前世今生」小敘事，開頭註明這是命理意象、非史實；可自然帶出兩人相處中「似曾相識」的情感連結（如彼此吸引或彼此磨合的模式），但不用心理學術語，維持故事感；溫暖動人，適合分享）"
    : "";
  const systemPrompt = SYSTEM
    .replace("$PASTLIFE$", pastLifeSection)
    .replace("$SHARELABEL$", cfg.shareLabel);

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const branchA = baziA.year.branch;
  const branchB = baziB.year.branch;

  // Relevant-palace stars for RAG — driven by cfg.palaces (per relationship
  // type), not hardcoded to 夫妻/子女. A friend/sibling/parentchild reading
  // pulls stars from 交友/兄弟/父母 etc. instead of irrelevant marriage palaces.
  const relevantPalaces = cfg.palaces.filter(isRealPalace);
  const relevantStars = relevantPalaces.flatMap(pName => {
    const resolved = PALACE_ALIASES[pName] ?? pName;
    const starsA = ziweiA.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    const starsB = ziweiB.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    return [...starsA, ...starsB];
  });
  const allStars = [...new Set(relevantStars)];

  const { context, refs } = await getKnowledge({
    stars: allStars,
    topic: cfg.ragTopic,
    topK: 8,
    text: `合盤 ${relevantPalaces.join("宮 ")}宮 感情緣分 ${cfg.label}`,
  });

  const dmRelHint = (() => {
    const G: Record<string,string> = {木:"火",火:"土",土:"金",金:"水",水:"木"};
    const dmA = baziA.dayMasterElement, dmB = baziB.dayMasterElement;
    if (G[dmA]===dmB) return `${labelA}日主${dmA}生${labelB}日主${dmB}（有扶持滋養之情）`;
    if (G[dmB]===dmA) return `${labelB}日主${dmB}生${labelA}日主${dmA}（有扶持滋養之情）`;
    if (dmA===dmB) return `雙方同為${dmA}日主（同氣，志趣相近）`;
    const C: Record<string,string> = {木:"土",土:"水",水:"火",火:"金",金:"木"};
    if (C[dmA]===dmB) return `${labelA}日主${dmA}克${labelB}日主${dmB}（需注意主導與壓制）`;
    if (C[dmB]===dmA) return `${labelB}日主${dmB}克${labelA}日主${dmA}（需注意主導與壓制）`;
    return "日主無直接生克";
  })();

  const elA = baziA.elements, elB = baziB.elements;

  // 紅鸞/天喜 are romance-signal stars — only meaningful when 夫妻宮 is actually
  // among this relationship type's relevant palaces (lover/spouse).
  const showRomanceStars = relevantPalaces.includes("夫妻");
  const palaceBlockA = relevantPalaces.map(p => palaceDesc(ziweiA, p)).join("\n") +
    (showRomanceStars ? `\n紅鸞星：${findStarPalace(ziweiA,"紅鸞")}　天喜星：${findStarPalace(ziweiA,"天喜")}` : "");
  const palaceBlockB = relevantPalaces.map(p => palaceDesc(ziweiB, p)).join("\n") +
    (showRomanceStars ? `\n紅鸞星：${findStarPalace(ziweiB,"紅鸞")}　天喜星：${findStarPalace(ziweiB,"天喜")}` : "");

  // Side-by-side same-palace comparison for the new 宮位對照 section
  // (palaceDesc already prefixes the palace name, so no need to repeat it).
  const palaceComparison = relevantPalaces
    .map(p => `${labelA}${palaceDesc(ziweiA, p)}　|　${labelB}${palaceDesc(ziweiB, p)}`)
    .join("\n");

  // Deterministic 命格 detection (same function solo readings use) — grounds
  // any 凶格 mention in the 宮位對照 section. SAFETY_GUARDRAIL already forbids
  // inventing 格局 names outside a provided 【命格自動識別】 list, so labeling
  // this block with that exact bracket name reuses that existing enforcement.
  const minggeA = detectMingge(ziweiA.palaces);
  const minggeB = detectMingge(ziweiB.palaces);
  const minggeBlock = [
    minggeA.length ? `${labelA}：${minggeA.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelA}：無明顯特殊格局`,
    minggeB.length ? `${labelB}：${minggeB.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelB}：無明顯特殊格局`,
  ].join("\n");

  const userMessage = `
【關係類型】${cfg.label}　側重：${cfg.focusHint}
【四維得分（確定性，請據此解釋）】緣分類型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【甲方基本資訊】
姓名/稱呼：${labelA}　性別：${genderA==="male"?"男":"女"}
生肖：${BRANCH_ZODIAC[branchA]??branchA}（${baziA.year.stem}${branchA}年）
八字四柱：${baziPillars(baziA)}
日主：${baziA.dayMaster}（${baziA.dayMasterElement}）
五行：木${elA.wood} 火${elA.fire} 土${elA.earth} 金${elA.metal} 水${elA.water}
命格：${baziA.summary}

【甲方紫微宮位】
${palaceBlockA}

【乙方基本資訊】
姓名/稱呼：${labelB}　性別：${genderB==="male"?"男":"女"}
生肖：${BRANCH_ZODIAC[branchB]??branchB}（${baziB.year.stem}${branchB}年）
八字四柱：${baziPillars(baziB)}
日主：${baziB.dayMaster}（${baziB.dayMasterElement}）
五行：木${elB.wood} 火${elB.fire} 土${elB.earth} 金${elB.metal} 水${elB.water}
命格：${baziB.summary}

【乙方紫微宮位】
${palaceBlockB}

【宮位對照（雙方相同宮位並列，供撰寫宮位對照段落使用）】
${palaceComparison}

【命格自動識別（僅可引用此清單中的格局名稱，清單之外不可自創）】
${minggeBlock}

【合盤資料】
生肖緣分：${BRANCH_ZODIAC[branchA]}與${BRANCH_ZODIAC[branchB]} → ${zodiacRelation(branchA,branchB)}
日主關係：${dmRelHint}
天干合化：${stemRelations(baziA,baziB,labelA,labelB)}
地支合衝：${branchRelations(baziA,baziB,labelA,labelB)}

【典籍參考】
${context||"（暫無）"}

請按系統要求的標題逐段完成合盤解讀，扣住關係類型「${cfg.label}」的側重，並結合上方四維得分展開。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 6800, not 2800: DeepSeek's v4-pro model emits reasoning_content that counts
      // against this same budget (see lib/synthesize.ts's note on the 2026-07-25 model
      // change) — 2800 was observed truncating output mid-section. This route now asks
      // for 10 sections (added 宮位對照), bumped from 6000 to keep headroom.
      maxTokens: 6800,
      // This route declares maxDuration=90 (vs the usual 60) because its 8-section
      // output (甲方/乙方/飞化互入/合盘综析/...) was observed exceeding
      // streamWithRefs's default 35s deadline while still legitimately streaming
      // content, which skips the retry (content already sent) and surfaces as a
      // hard error instead of just finishing slowly. 55s/20s leaves 15s margin
      // under the 90s ceiling, matching decades/route.ts's fix for the same issue.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple" },
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
