// 流年 (per-year) reading validator. The natal 紫微 validator (lib/validateReading.ts)
// deliberately ignores 運限/流年 dynamics, so per-year readings were grounded but never
// proofread. This checks a flow-year reading against the deterministic 流年 facts
// (流年命宮落宮 / 流年四化 / 流耀 / 三方四正). Reuses the shared Gemini helper. Fail-open.
import type { ZiweiResult } from "./ziwei";
import { getFlowYears, flowYearFactsFrom } from "./flowYears";
import { geminiJsonReview, type ValidationResult } from "./validateReading";

/** Gemini cross-checks a single-year 流年 reading against its authoritative 流年 facts. */
export async function validateFlowYearReading(
  reading: string,
  ziwei: ZiweiResult,
  year: number
): Promise<ValidationResult> {
  if (!reading || !ziwei?.birth?.solarDate || !year) return { pass: true, issues: [], reviewed: false };
  const birthYear = parseInt(ziwei.birth.solarDate.slice(0, 4), 10);
  const age = year - birthYear;
  const [flow] = await getFlowYears(ziwei.birth, age, age);
  if (!flow) return { pass: true, issues: [], reviewed: false }; // compute failed → don't block

  const facts = flowYearFactsFrom(flow);
  const prompt = `你是紫微斗數流年解讀的邏輯校驗員。下面【權威流年事實】由確定性演算法（iztro）計算得出，是不可更改的事實；【待校驗解讀】由另一個AI生成，只針對這一個流年。

請只核查解讀是否與權威流年事實矛盾，重點：
- 流年命宮落在本命哪一宮是否搞錯（說落某宮，但事實並非如此）
- 流年四化（化祿/權/科/忌）所屬星曜是否錯誤（說某星化某，但事實並非如此）
- 流耀、流年命宮三方四正會照是否與事實衝突
- 解讀是否自相矛盾

不要評判文采、詳略或觀點；輕微措辭差異、合理引申不算錯誤。只抓硬性事實錯誤。
注意：本命層面的泛論（如命主性格）不在下方流年事實範圍內，不要因此判錯；只有當解讀與下方**已明確列出的流年事實直接衝突**時才判 pass=false。

返回 JSON：{"pass": true/false, "issues": ["具體問題簡短中文", ...]}。無明顯事實錯誤則 pass=true、issues 為空。

【權威流年事實】
${facts}

【待校驗解讀】
${reading.slice(0, 8000)}`;
  return geminiJsonReview(prompt);
}
