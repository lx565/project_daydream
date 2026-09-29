import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { getSharedRetrieval } from "@/lib/rag";
import type { Reference } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import { getRelationshipConfig } from "@/lib/coupleTypes";
import { PALACE_ALIASES, isRealPalace, palaceDesc } from "@/lib/couple";
import { detectMingge } from "@/lib/detectMingge";
import type { BaziResult } from "@/lib/bazi";
import type { ZiweiResult } from "@/lib/ziwei";

const SYSTEM = `你是一位博採眾派的紫微斗數命理師，熟悉三合派、四化派、飛星派、倪師學派與其他名家對「兩人關係契合度」各自的判斷邏輯。本次合盤的關係類型會在使用者資訊中給出，請始終扣住該關係類型的側重。

解讀原則：
1. 各派只依據下方對應學派的典籍參考，不得張冠李戴
2. 若某派參考資料不足，誠實說明「此配對在OO學派典籍中著墨不多」，不強行編造
3. 加粗所有星曜與四化名稱

請嚴格按以下 Markdown 格式輸出（標記一字不差）：

## 三合派觀點
（約150字：依三合派邏輯，論雙方相關宮位是否構成三合、六合或相衝——結合下方【生肖與宮位地支關係】資料，說明這對配對整體是天然契合還是需要後天經營）

## 四化派觀點
（約150字：依四化派邏輯，依下方【相關宮位並列】中已標註的雙方四化（化祿/化權/化科/化忌），比較兩人在各自相關宮位的四化結構是否互補——例如一方化祿/化科集中在感情福德類宮位而顯情深，另一方化祿多落財帛官祿類宮位而顯務實；化忌落於相關宮位處點出需磨合之處。只依已提供的宮位資料推論，不臆測未提供的飛入對方命盤細節）

## 飛星派觀點
（約120字：以飛星派「星曜能量流向」的大方向立意，依雙方在相關宮位的主星旺弱與四化，論兩人相處中誰的特質較主動牽動對方、誰較被動承接；只依已提供的宮位資料推論，不臆測未提供的飛宮細節）

## 倪師學派觀點
（約100字：依據倪師典籍，對這段配對給出直接務實的判斷，風格直接不繞圈子；若參考資料不足，簡述「倪師典籍對此類配對著墨不多」即可）

## 小眾學派觀點
（約110字：綜合小眾學派典籍參考中三大主流之外的說法，補充一個旁參視角；若參考資料不足，簡述「此配對在小眾諸家中著墨不多」即可，不強行編造）

繁體中文（臺灣用語）。只用**加粗**單個星曜名稱和四化符號，絕不用**包裹整句或短語。` + MODERN_INSTRUCTION;

function baziPillars(bazi: BaziResult): string {
  return `年${bazi.year.stem}${bazi.year.branch} 月${bazi.month.stem}${bazi.month.branch} 日${bazi.day.stem}${bazi.day.branch} 時${bazi.hour.stem}${bazi.hour.branch}`;
}

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

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "couple-schools" })).allowed) return rateLimitResponse();

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
  if (!ziweiA?.palaces?.length || !ziweiB?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const cfg = getRelationshipConfig(relationshipType);
  const labelA = nameA || (genderA === "male" ? "甲方（男）" : "甲方（女）");
  const labelB = nameB || (genderB === "male" ? "乙方（男）" : "乙方（女）");

  const relevantPalaces = cfg.palaces.filter(isRealPalace);
  const relevantStars = relevantPalaces.flatMap(pName => {
    const resolved = PALACE_ALIASES[pName] ?? pName;
    const starsA = ziweiA.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    const starsB = ziweiB.palaces.find(p => p.name === pName || p.name === resolved)?.stars.filter(s => s.type === "major").map(s => s.name) ?? [];
    return [...starsA, ...starsB];
  });
  const allStars = [...new Set(relevantStars)];

  const retrieval = await getSharedRetrieval({ stars: allStars, palaces: relevantPalaces });
  const sanhe   = retrieval.select({ school: "三合派", strict: true, topK: 5, maxPerBook: 2 });
  const sihua   = retrieval.select({ school: "四化派", strict: true, topK: 5, maxPerBook: 2 });
  const feixing = retrieval.select({ school: "飛星派", strict: true, topK: 4, maxPerBook: 2 });
  const nixi    = retrieval.select({ school: "倪師學派", strict: true, topK: 3, maxPerBook: 2 });
  const niche   = retrieval.select({ school: "其他名家", strict: true, topK: 3, maxPerBook: 2 });

  const allRefs: Reference[] = [...sanhe.refs, ...sihua.refs, ...feixing.refs, ...nixi.refs, ...niche.refs].filter(
    (r, i, arr) => arr.findIndex((x) => x.book === r.book) === i
  );

  const ragContext = [
    sanhe.context   ? `【三合派典籍參考】\n${sanhe.context}` : "",
    sihua.context   ? `【四化派典籍參考】\n${sihua.context}` : "",
    feixing.context ? `【飛星派典籍參考】\n${feixing.context}` : "",
    nixi.context    ? `【倪師學派典籍參考】\n${nixi.context}` : "",
    niche.context   ? `【小眾學派典籍參考】\n${niche.context}` : "",
  ].filter(Boolean).join("\n\n");

  const branchA = baziA.year.branch;
  const branchB = baziB.year.branch;

  const palaceComparison = relevantPalaces
    .map(p => `${labelA}${palaceDesc(ziweiA, p)}　|　${labelB}${palaceDesc(ziweiB, p)}`)
    .join("\n");

  const minggeA = detectMingge(ziweiA.palaces);
  const minggeB = detectMingge(ziweiB.palaces);
  const minggeBlock = [
    minggeA.length ? `${labelA}：${minggeA.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelA}：無明顯特殊格局`,
    minggeB.length ? `${labelB}：${minggeB.map(m => `${m.name}（${m.type}）`).join("、")}` : `${labelB}：無明顯特殊格局`,
  ].join("\n");

  const userMessage = `【關係類型】${cfg.label}　側重：${cfg.focusHint}

【甲方】${labelA}　${genderA === "male" ? "男" : "女"}　八字：${baziPillars(baziA)}
【乙方】${labelB}　${genderB === "male" ? "男" : "女"}　八字：${baziPillars(baziB)}

【生肖與宮位地支關係】${BRANCH_ZODIAC[branchA] ?? branchA}與${BRANCH_ZODIAC[branchB] ?? branchB} → ${zodiacRelation(branchA, branchB)}

【相關宮位並列】
${palaceComparison}

【命格自動識別（僅可引用此清單中的格局名稱，清單之外不可自創）】
${minggeBlock}

${ragContext || "（各派典籍參考皆暫無匹配資料）"}

請用五派視角，分別針對以上兩人的配對進行解讀，嚴格按系統要求的五個標題輸出。`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 4200,
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "couple-schools" },
      temperature: 0.6,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs: allRefs,
    })
  );
}
