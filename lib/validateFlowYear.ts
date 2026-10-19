// 流年 (per-year) reading validator. The natal 紫微 validator (lib/validateReading.ts)
// deliberately ignores 運限/流年 dynamics, so per-year readings were grounded but never
// proofread. This checks a flow-year reading against the deterministic 流年 facts
// (流年命宮落宮 / 流年四化 / 流耀 / 三方四正). Reuses the shared Gemini review helper. Fail-open.
import type { ZiweiResult } from "./ziwei";
import { getFlowYears, flowYearFactsFrom } from "./flowYears";
import { jsonReview, REVIEW_OUTPUT_SPEC, type ValidationResult } from "./validateReading";

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
  const prompt = `你是紫微斗數流年解讀的事實校驗員。下面【權威流年事實】由確定性演算法（iztro）計算得出，是不可更改的事實；【待校驗解讀】由另一個AI生成，只針對這一個流年。

你的唯一任務：找出解讀中與【已明確列出的流年事實】直接矛盾的陳述，例如：
- 流年命宮落在本命哪一宮說錯
- 流年四化（化祿/權/科/忌）所屬星曜說錯
- 流耀、流年命宮三方四正會照的星曜說錯

以下一律不是錯誤（最多標 note）：文采、詳略、語氣、詮釋與引申、本命層面的泛論（如命主性格）、解讀沒提到某項事實、各學派斷語差異。

${REVIEW_OUTPUT_SPEC}

【權威流年事實】
${facts}

【待校驗解讀】
${reading.slice(0, 8000)}`;
  return jsonReview(prompt, reading, facts);
}
