// 免費預覽：確定性算出四維分 + 緣分類型，AI 只寫「感情模式（各2行）+ 鉤子句」。
// 不做解鎖檢查。鉤子句對有前世緣的關係類型作截斷，吊起付費欲望。
import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { calcCoupleScoreV2 } from "@/lib/couple";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { yearBranchAffinity, dayBranchAffinity, dayStemCombination } from "@/lib/bazi-affinity";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const BRANCH_ZODIAC: Record<string, string> = {
  子:"鼠",丑:"牛",寅:"虎",卯:"兔",辰:"龍",巳:"蛇",午:"馬",未:"羊",申:"猴",酉:"雞",戌:"狗",亥:"豬",
};

function buildSystem(hasPastLife: boolean): string {
  const pastLifeBlock = hasPastLife ? `

## 前世緣分
用1句話，借用生肖/干支合衝的意象，寫一句有畫面感的「前世緣」聯想（例如「生肖三合，像是宿世的牽絆」），溫暖、不誇張，不作迷信斷言，只作浪漫化的文學聯想。` : "";

  return `你是資深命理師，同時懂一些心理學的溝通/依戀風格語言。下面會給你兩個人的命盤要點、一個「關係類型」，以及幾條已經算好的確定性信號（生肖合衝、日支合衝、日干合等）。
請只輸出以下幾塊，簡短克制，不要展開長篇（這是免費預覽，要留白吊起好奇）。**必須緊扣給出的確定性信號來寫，不要脫離信號泛泛而談**：

## 各自的感情模式
**[甲方稱呼]**：用2行描述這個人在該關係裡的相處模式與情感傾向（落到具體星曜/日主，不空泛，可用一點依戀風格式的心理學語言，比如「更傾向在關係裡主動付出」）。
**[乙方稱呼]**：同樣2行。

## 相處之道
用1-2句，基於給出的合衝信號，講兩人日常相處會呈現的具體樣子（不是空泛的「要多溝通」，要落到「因為XX信號，你們更容易在YY場景裡合拍」這樣的具體描述）。

## 會遇到的磨合
用1句話，溫和地指出兩人可能需要磨合的地方——**絕不用「衝突/危險/不合」這類字眼**，永遠搭配一個正向的化解視角（例如「偶爾步調不一致，但這恰好是讓彼此更瞭解的機會」）。
${pastLifeBlock}

## 緣分一瞥
用1-2句點出兩人關係的最大亮點（不下吉凶定論）。

最後單獨一行，以「——」開頭寫一句「鉤子」，戛然而止、引人想看下文，例如：
——你們之間，似乎有一段更早的淵源……

繁體中文（臺灣用語）。不要出現「付費/解鎖/完整版」等字樣。` + MODERN_INSTRUCTION;
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

  const userMessage = `
【關係類型】${cfg.label}（側重：${cfg.focusHint}）

【確定性得分】緣分類型：${score.label}（${score.total}分）
${score.dims.map(d => `${d.name} ${d.score}`).join(" · ")}

【確定性信號】${yb.desc}；${db.desc}；${ds.desc}

【${labelA}】生肖${BRANCH_ZODIAC[baziA.year.branch] ?? ""}，日主${baziA.dayMaster}（${baziA.dayMasterElement}），命格：${baziA.summary}
夫妻宮主星：${score.weddingStarsA.join("、") || "（空宮）"}

【${labelB}】生肖${BRANCH_ZODIAC[baziB.year.branch] ?? ""}，日主${baziB.dayMaster}（${baziB.dayMasterElement}），命格：${baziB.summary}
夫妻宮主星：${score.weddingStarsB.join("、") || "（空宮）"}

請按系統要求輸出各塊。稱呼用「${labelA}」「${labelB}」。`.trim();

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 1500 + reasoning "none": this is a FREE teaser on the highest-intent hepan
      // visitor — it must be fast and must never render blank. At 900 with the default
      // "low" reasoning, the thinking phase can consume the whole budget before any
      // visible token (the bug that rendered 紫薇綜合 empty). "none" removes that risk.
      maxTokens: 1500,
      reasoningEffort: "none",
      temperature: 0.7,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-preview" },
      system: buildSystem(cfg.hasPastLife),
      messages: [{ role: "user", content: userMessage }],
      refs: [],
    })
  );
}
