// 免費預覽：確定性算出四維分 + 緣分類型，AI 只寫「感情模式（各3-4行，扣住具體宮位星曜）+ 鉤子句」。
// 不做解鎖檢查。鉤子句對有前世緣的關係類型作截斷，吊起付費欲望。
// 宮位/星曜/四化的抓取邏輯與 app/api/reading/couple/route.ts（付費版）一致，
// 只是段落長度與資料量縮減至預覽規模，維持「留白吊起好奇」的定位不變。
import { MODERN_INSTRUCTION, ACCESSIBLE_LANGUAGE_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { calcCoupleScoreV2, PALACE_ALIASES } from "@/lib/couple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { detectMingge } from "@/lib/detectMingge";
import { yearBranchAffinity, dayBranchAffinity, dayStemCombination } from "@/lib/bazi-affinity";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const BRANCH_ZODIAC: Record<string, string> = {
  子:"鼠",丑:"牛",寅:"虎",卯:"兔",辰:"龍",巳:"蛇",午:"馬",未:"羊",申:"猴",酉:"雞",戌:"狗",亥:"豬",
};

// Real ZiweiResult.palaces[].name values (post-alias-resolution) — filters
// out non-palace coupleTypes.ts entries like sibling config's "六亲".
const REAL_PALACE_NAMES = new Set([
  "命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄",
  "遷移", "僕役", "官祿", "田宅", "福德", "父母",
]);

function isRealPalace(palaceName: string): boolean {
  const resolved = PALACE_ALIASES[palaceName] ?? palaceName;
  return REAL_PALACE_NAMES.has(resolved);
}

// Describe a palace with its major stars + any 四化 on them — same shape as
// the paid route's palaceDesc, so the preview's evidence reads identically
// grounded, just shorter overall (fewer palaces, shorter section asks).
function palaceDesc(ziwei: ZiweiResult, palaceName: string): string {
  const resolvedName = PALACE_ALIASES[palaceName] ?? palaceName;
  const p = ziwei.palaces.find((x) => x.name === palaceName || x.name === resolvedName);
  if (!p) return `${palaceName}（無資料）`;
  const stars = p.stars
    .filter((s) => s.type === "major")
    .map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ""}`)
    .join("、");
  return `${palaceName}：${stars || "空宮"}`;
}

function buildSystem(hasPastLife: boolean): string {
  const pastLifeBlock = hasPastLife ? `

## 前世緣分
用1句話，借用生肖/干支合衝的意象，寫一句有畫面感的「前世緣」聯想（例如「生肖三合，像是宿世的牽絆」），溫暖、不誇張，不作迷信斷言，只作浪漫化的文學聯想。` : "";

  return `你是資深命理師，同時懂一些心理學的溝通/依戀風格語言。下面會給你兩個人的命盤要點、一個「關係類型」，以及幾條已經算好的確定性信號（生肖合衝、日支合衝、日干合、相關宮位星曜與四化）。
請只輸出以下幾塊——雖是免費預覽要留白吊起好奇，但每一句話都必須具體扣住下方給出的星曜/宮位/四化證據來寫，不可空泛斷言或憑空發揮：

## 各自的感情模式
**[甲方稱呼]**：用3-4行描述這個人在該關係裡的相處模式與情感傾向，先講白話（這個人在感情裡是什麼樣子），再輕輕帶出一個下方給出的相關宮位星曜作依據（不只是夫妻宮，其他相關宮位也可），星曜名稱第一次出現時順手用白話補一句是什麼意思；若該宮位有化祿/化權/化科，可點出這是加分之處；若有化忌，溫和點出需留意的面向。可用一點依戀風格式的心理學語言。
**[乙方稱呼]**：同樣3-4行，同樣要求。

## 相處之道
用2-3句，基於給出的合衝信號與宮位對照，講兩人日常相處會呈現的具體樣子（不是空泛的「要多溝通」，要落到「因為XX星曜/XX信號，你們更容易在YY場景裡合拍」這樣的具體描述，並簡短說明背後的命理依據）。

## 會遇到的磨合
用1-2句話，溫和地指出兩人可能需要磨合的地方——具體點出是哪個宮位或星曜組合帶來的張力（若下方【命格自動識別】清單中有相關格局可自然帶出，僅可引用清單中的名稱，不可自創）。**絕不用「衝突/危險/不合」這類字眼**，永遠搭配一個正向的化解視角。
${pastLifeBlock}

## 緣分一瞥
用2句點出兩人關係的最大亮點，具體扣住一個宮位或星曜證據（不下吉凶定論）。

最後單獨一行，以「——」開頭寫一句「鉤子」，戛然而止、引人想看下文，例如：
——你們之間，似乎有一段更早的淵源……

繁體中文（臺灣用語）。不要出現「付費/解鎖/完整版」等字樣。` + ACCESSIBLE_LANGUAGE_INSTRUCTION + MODERN_INSTRUCTION;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-preview" })).allowed) return rateLimitResponse();

  let body: {
    baziA: BaziResult; ziweiA: ZiweiResult;
    baziB: BaziResult; ziweiB: ZiweiResult;
    nameA?: string; nameB?: string; genderA: string; genderB: string;
    relationshipType?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { baziA, ziweiA, baziB, ziweiB, nameA, nameB, genderA, genderB, relationshipType } = body;
  const cfg = getRelationshipConfig(relationshipType);
  const score = calcCoupleScoreV2(baziA, ziweiA, baziB, ziweiB, cfg.key);

  const yb = yearBranchAffinity(baziA, baziB);
  const db = dayBranchAffinity(baziA, baziB);
  const ds = dayStemCombination(baziA, baziB);

  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  // Relevant-palace grounding — driven by cfg.palaces (per relationship
  // type), matching the paid route's approach so the preview's evidence is
  // never narrower than "just 夫妻宮", just fewer palaces/shorter asks than
  // the full paid depth.
  const relevantPalaces = cfg.palaces.filter(isRealPalace);
  const palaceBlockA = relevantPalaces.map((p) => palaceDesc(ziweiA, p)).join("；");
  const palaceBlockB = relevantPalaces.map((p) => palaceDesc(ziweiB, p)).join("；");
  const palaceComparison = relevantPalaces
    .map((p) => `${labelA}${palaceDesc(ziweiA, p)}　|　${labelB}${palaceDesc(ziweiB, p)}`)
    .join("\n");

  const minggeA = detectMingge(ziweiA.palaces);
  const minggeB = detectMingge(ziweiB.palaces);
  const minggeBlock = [
    minggeA.length ? `${labelA}：${minggeA.map((m) => `${m.name}（${m.type}）`).join("、")}` : `${labelA}：無明顯特殊格局`,
    minggeB.length ? `${labelB}：${minggeB.map((m) => `${m.name}（${m.type}）`).join("、")}` : `${labelB}：無明顯特殊格局`,
  ].join("\n");

  const userMessage = `
【關係類型】${cfg.label}（側重：${cfg.focusHint}）

【確定性得分】緣分類型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【確定性信號】${yb.desc}；${db.desc}；${ds.desc}

【${labelA}】生肖${BRANCH_ZODIAC[baziA.year.branch] ?? ""}，日主${baziA.dayMaster}（${baziA.dayMasterElement}），命格：${baziA.summary}
相關宮位星曜：${palaceBlockA}

【${labelB}】生肖${BRANCH_ZODIAC[baziB.year.branch] ?? ""}，日主${baziB.dayMaster}（${baziB.dayMasterElement}），命格：${baziB.summary}
相關宮位星曜：${palaceBlockB}

【宮位對照】
${palaceComparison}

【命格自動識別（僅可引用此清單中的格局名稱，清單之外不可自創）】
${minggeBlock}

請按系統要求輸出各塊，每句話都要扣住上方給出的具體宮位/星曜/四化證據來寫。稱呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // Bumped from 1500 — sections now ask for 3-4 lines each with concrete
      // palace/star/mutagen citations instead of 2 bare lines, so the same
      // "must never render blank on this highest-intent free teaser" caution
      // from the original 1500 tuning still applies, just at a higher floor.
      maxTokens: 2200,
      reasoningEffort: "none",
      temperature: 0.7,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-preview" },
      system: buildSystem(cfg.hasPastLife),
      messages: [{ role: "user", content: userMessage }],
      refs: [],
    })
  );
}
