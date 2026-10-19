// 八字 reading validator — cross-checks a 八字 reading against the deterministically
// computed 八字 chart (四柱 / 日主 / 五行 / 大運). The 紫微 validator (lib/validateReading.ts)
// can't do this: 八字 has no stars/palaces. Reuses the shared Gemini review helper. Fail-open.
import type { BaziResult } from "./bazi";
import { jsonReview, REVIEW_OUTPUT_SPEC, type ValidationResult } from "./validateReading";

/** Authoritative, deterministic 八字 facts the reading must not contradict. */
export function buildBaziFacts(bazi: BaziResult): string {
  const gz = (p: { stem: string; branch: string }) => `${p.stem}${p.branch}`;
  const e = bazi.elements;
  const daYun = (bazi.decades ?? [])
    .map((d) => `${d.ganZhi}(${d.startAge}-${d.endAge}歲)`)
    .join(" ") || "無";
  return [
    `四柱：年柱${gz(bazi.year)} 月柱${gz(bazi.month)} 日柱${gz(bazi.day)} 時柱${gz(bazi.hour)}`,
    `日主（日元）：${bazi.dayMaster}（${bazi.dayMasterElement}）`,
    `五行個數：木${e.wood} 火${e.fire} 土${e.earth} 金${e.metal} 水${e.water}`,
    `起運：${bazi.luckStartAge}歲`,
    `大運（依次）：${daYun}`,
  ].join("\n");
}

/** Gemini cross-checks a 八字 reading against the authoritative 八字 facts. */
export async function validateBaziReading(reading: string, bazi: BaziResult): Promise<ValidationResult> {
  if (!reading || !bazi?.day?.stem) return { pass: true, issues: [], reviewed: false };
  const facts = buildBaziFacts(bazi);
  const prompt = `你是八字命理解讀的事實校驗員。下面【權威八字事實】由確定性演算法排盤得出，是不可更改的事實；【待校驗解讀】由另一個AI生成。

你的唯一任務：找出解讀中與【已明確列出的事實】直接矛盾的陳述，例如：
- 說某柱是某干支，但事實並非如此
- 說日主（日元）是某天干/五行，但事實並非如此
- 大運干支或起止年齡與事實衝突
- 五行個數的明顯誤斷（如說某五行最旺，但事實個數為0）

以下一律不是錯誤（最多標 note）：文采、詳略、語氣、流派觀點差異、旺衰/用神/格局/十神/神煞的推斷與詮釋、流年與具體年份吉凶、地支藏干的細節說法、合理引申、解讀沒提到某項事實。

${REVIEW_OUTPUT_SPEC}

【權威八字事實】
${facts}

【待校驗解讀】
${reading.slice(0, 8000)}`;
  return jsonReview(prompt, reading, facts);
}
