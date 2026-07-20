// Cross-model validation for AI readings.
// (A) cheap deterministic structural check + (A2) deterministic 格局-fabrication
// check + (B) a Gemini 2.5 Flash logic review that cross-checks the
// (DeepSeek-generated) reading against the authoritative, iztro-computed chart
// facts. Fail-open: if the reviewer errors, we don't block.

import type { ZiweiResult } from "./ziwei";
import { detectMingge } from "./detectMingge";
import { MINGGE_LIST } from "./minggeData";

export interface ValidationResult {
  pass: boolean;
  issues: string[];
  reviewed: boolean; // false if the Gemini reviewer was skipped (e.g. API error)
}

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

/** Authoritative, deterministic chart facts the reading must not contradict. */
export function buildChartFacts(ziwei: ZiweiResult): string {
  const palaceLines = ziwei.palaces.map((p) => {
    const bt = (b: string) => b ? `(${b})` : "";
    const major = p.stars.filter((s) => s.type === "major").map((s) => s.mutagen ? `${s.name}${bt(s.brightness)}化${s.mutagen}` : `${s.name}${bt(s.brightness)}`).join("、") || "空宮";
    const minor = p.stars.filter((s) => s.type === "minor").map((s) => `${s.name}${bt(s.brightness)}`).join("、") || "無";
    const sf = ziwei.sanFangSiZheng?.[p.name];
    const sfTxt = sf ? `；三方四正→對宮${pName(sf.opposite)}/財${pName(sf.wealth)}/官${pName(sf.career)}` : "";
    return `${pName(p.name)}[${p.heavenlyStem}]：主星${major}｜輔星${minor}${sfTxt}`;
  }).join("\n");
  return `五行局：${ziwei.fiveElementsClass}；命主${ziwei.mainStar}；身主${ziwei.bodyStar}\n${palaceLines}`;
}

/** Cheap deterministic sanity checks (free, no API). */
function structuralCheck(reading: string): string[] {
  const issues: string[] = [];
  const body = (reading ?? "").trim();
  if (body.length < 80) issues.push("解讀內容過短或為空");
  // truncation heuristic: ends mid-sentence without terminal punctuation
  if (body.length > 200 && !/[。！？”）\]]\s*$/.test(body) && !/\[\/現代\]\s*$/.test(body)) {
    issues.push("解讀疑似被截斷（結尾不完整）");
  }
  return issues;
}

/**
 * Deterministic 格局-fabrication check (free, no API). The model frequently
 * invents 格局 names that don't apply to the chart — the recurring example is
 * claiming 巨門+祿存 forms "祿馬交馳" (which actually requires 祿存+天馬). We
 * cross-reference every 格局 the reading *names as formed* against the
 * algorithm-verified list from detectMingge(); any named-but-unverified 格局 is
 * a fabrication. Only explicit 格局 claims are matched (the full "…格" name, or
 * the bare name in quotes immediately followed by 格/變格/格局) so that
 * descriptive star-system mentions like "殺破狼系" are not false-flagged.
 */
function minggeFabricationCheck(reading: string, ziwei: ZiweiResult): string[] {
  if (!reading || !ziwei?.palaces?.length) return [];
  let verified: Set<string>;
  try {
    verified = new Set(detectMingge(ziwei.palaces).map((f) => f.name));
  } catch {
    return []; // detection failed — don't block
  }

  const issues: string[] = [];
  for (const m of MINGGE_LIST) {
    const full = m.name;                       // e.g. "祿馬交馳格"
    const core = full.replace(/格$/, "");      // e.g. "祿馬交馳"
    if (!core || verified.has(full)) continue; // chart genuinely forms it → fine

    const quoted = new RegExp(`[“"'「『]${core}[”"'」』].{0,6}(變?格局?|格)`);
    const claimed = reading.includes(full) || quoted.test(reading);
    if (claimed) {
      issues.push(`解讀杜撰了本命盤並不成立的格局「${core}」——該格有嚴格的星曜條件，本盤並未形成。請刪除此格局論斷，僅依據真實星曜組合分析，不要自創或套用格局名。`);
    }
  }
  return issues.slice(0, 5);
}

/** Shared: run a complete prompt through Gemini 2.5 Flash, parse {pass, issues}. Fail-open. */
export async function geminiJsonReview(prompt: string): Promise<{ pass: boolean; issues: string[]; reviewed: boolean }> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return { pass: true, issues: [], reviewed: false };
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const model = new GoogleGenerativeAI(key).getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    });
    const resp = await model.generateContent(prompt);
    const parsed = JSON.parse(resp.response.text()) as { pass?: boolean; issues?: string[] };
    return {
      pass: parsed.pass !== false,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 8) : [],
      reviewed: true,
    };
  } catch (err) {
    console.warn("[review] gemini review skipped:", (err as Error).message);
    return { pass: true, issues: [], reviewed: false }; // fail-open
  }
}

/** Gemini 2.5 Flash cross-checks the reading against the authoritative 紫微 facts. */
async function geminiLogicReview(reading: string, facts: string): Promise<{ pass: boolean; issues: string[]; reviewed: boolean }> {
  const prompt = `你是紫微斗數解讀的邏輯校驗員。下面【權威命盤事實】由確定性演算法（iztro）計算得出，是不可更改的事實；【待校驗解讀】由另一個AI生成。

請只核查解讀是否與權威事實矛盾，重點：
- 星曜落宮是否搞錯（說某星在某宮，但事實並非如此）
- 四化（化祿/權/科/忌）所屬星曜或落宮是否錯誤
- 星曜亮度（廟旺得利平陷）是否與事實矛盾（如說某星廟旺，但事實標註為陷）
- 流年命宮、三方四正會照是否與事實衝突
- 解讀是否自相矛盾

不要評判文采、詳略或觀點；輕微措辭差異、合理引申不算錯誤。只抓硬性事實錯誤。

重要：解讀中涉及流年、大限、流耀、流年四化等"運限/動態"資訊**不在**下方本命事實範圍內——不要因為下方事實未列出這些動態資訊就判錯；只有當解讀與下方**已明確列出的本命事實直接衝突**時（例如說某主星在某宮、但事實並非如此）才判 pass=false。

返回 JSON：{"pass": true/false, "issues": ["具體問題簡短中文", ...]}。無明顯事實錯誤則 pass=true、issues 為空。

【權威命盤事實】
${facts}

【待校驗解讀】
${reading.slice(0, 8000)}`;
  return geminiJsonReview(prompt);
}

export async function validateReading(reading: string, ziwei: ZiweiResult): Promise<ValidationResult> {
  const structural = structuralCheck(reading);
  if (structural.length) return { pass: false, issues: structural, reviewed: false };

  // Deterministic 格局-fabrication gate (free) — fail fast so the reading is
  // regenerated without the invented 格局; no need to spend a Gemini call.
  const fabricated = minggeFabricationCheck(reading, ziwei);
  if (fabricated.length) return { pass: false, issues: fabricated, reviewed: true };

  const facts = buildChartFacts(ziwei);
  const review = await geminiLogicReview(reading, facts);
  return { pass: review.pass, issues: review.issues, reviewed: review.reviewed };
}
