// 八字 reading validator — cross-checks a 八字 reading against the deterministically
// computed 八字 chart (四柱 / 日主 / 五行 / 大運). The 紫微 validator (lib/validateReading.ts)
// can't do this: 八字 has no stars/palaces. Reuses the shared Gemini helper. Fail-open.
import type { BaziResult } from "./bazi";
import { geminiJsonReview, type ValidationResult } from "./validateReading";

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
  const prompt = `你是八字命理解讀的邏輯校驗員。下面【權威八字事實】由確定性演算法排盤得出，是不可更改的事實；【待校驗解讀】由另一個AI生成。

請只核查解讀是否與權威事實矛盾，重點：
- 四柱干支是否搞錯（說某柱是某干支，但事實並非如此）
- 日主（日元）是否搞錯（說日主是某五行/天干，但事實並非如此）
- 大運干支或起止年齡是否與事實衝突
- 五行多寡的明顯誤斷（如說某五行最旺，但事實個數為0）
- 解讀是否自相矛盾

不要評判文采、詳略或流派觀點；輕微措辭差異、合理引申不算錯誤。只抓硬性事實錯誤。

重要：解讀中涉及流年、具體年份吉凶、神煞、十神引申等**推斷性**內容不在下方"事實"範圍內——只有當解讀與下方**已明確列出的事實直接衝突**時（例如說日主為甲木、但事實為庚金）才判 pass=false。

返回 JSON：{"pass": true/false, "issues": ["具體問題簡短中文", ...]}。無明顯事實錯誤則 pass=true、issues 為空。

【權威八字事實】
${facts}

【待校驗解讀】
${reading.slice(0, 8000)}`;
  return geminiJsonReview(prompt);
}
