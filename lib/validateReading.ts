// Cross-model validation for AI readings.
// (A) cheap deterministic structural check + (A2) deterministic 格局-fabrication
// check + (B) a Gemini 2.5 Flash logic review that cross-checks the
// (DeepSeek-generated) reading against the authoritative, iztro-computed chart
// facts. Deliberately a different model family from the DeepSeek writer so the
// check is genuinely independent — hardcoded, never derived from the
// generation model config. Fail-open: if the reviewer errors, we don't block.

import type { ZiweiResult } from "./ziwei";
import { detectMingge } from "./detectMingge";
import { MINGGE_LIST } from "./minggeData";
import { withDeadline } from "./aiRetry";

export interface ValidationResult {
  pass: boolean;
  issues: string[];
  reviewed: boolean; // false if the Gemini reviewer was skipped (e.g. API error)
  // true when `pass` was decided by a deterministic (non-AI) check — e.g.
  // structuralCheck — so it's a genuine verdict even though reviewed is false.
  // Without this, a route can't tell that apart from the reviewer failing open
  // (which is ALSO reviewed:false but is NOT a real verdict).
  deterministic?: boolean;
  // Reviewer observations that are NOT clear chart-fact contradictions (tone,
  // interpretation, omissions, claims outside the facts shown). Never affect
  // pass/fail or the revision notes; kept for logging/analysis only.
  notes?: string[];
}

/**
 * What a client should actually treat as the verdict: `reviewed` (the AI
 * reviewer ran) or `deterministic` (a non-AI check decided it) are both real
 * verdicts — anything else is the reviewer failing open, i.e. no verdict at
 * all, which must not be reported as pass:true. Shared across all three
 * validate-* routes so "validated" means the same thing everywhere.
 */
export function toClientValidation(result: ValidationResult): { pass: boolean | null; issues: string[]; reviewed: boolean } {
  return {
    pass: result.reviewed || result.deterministic ? result.pass : null,
    issues: result.issues,
    reviewed: result.reviewed,
  };
}

export const REVIEW_MODEL = "gemini-2.5-flash";

const pName = (n: string) => (n && !n.endsWith("宮") ? `${n}宮` : n);

/** Authoritative, deterministic chart facts the reading must not contradict. */
export function buildChartFacts(ziwei: ZiweiResult): string {
  const palaceLines = ziwei.palaces.map((p) => {
    const bt = (b: string) => b ? `(${b})` : "";
    const major = p.stars.filter((s) => s.type === "major").map((s) => s.mutagen ? `${s.name}${bt(s.brightness)}化${s.mutagen}` : `${s.name}${bt(s.brightness)}`).join("、") || "空宮";
    const minor = p.stars.filter((s) => s.type === "minor").map((s) => `${s.name}${bt(s.brightness)}`).join("、") || "無";
    const sf = ziwei.sanFangSiZheng?.[p.name];
    const sfTxt = sf ? `；三方四正→對宮${pName(sf.opposite)}/財${pName(sf.wealth)}/官${pName(sf.career)}` : "";
    const adj = p.stars.filter((s) => s.type === "adjective").map((s) => s.name);
    const adjTxt = adj.length ? `｜雜耀${adj.join("、")}` : "";
    return `${pName(p.name)}[${p.heavenlyStem}]：主星${major}｜輔星${minor}${adjTxt}${sfTxt}`;
  }).join("\n");
  return `五行局：${ziwei.fiveElementsClass}；命主${ziwei.mainStar}；身主${ziwei.bodyStar}\n${palaceLines}`;
}

/** 天干 → 四化（祿權科忌），iztro 預設口徑。Used only to give the reviewer a verifiable 飛星 table. */
const SIHUA_BY_STEM: Record<string, string> = {
  甲: "廉貞祿 破軍權 武曲科 太陽忌", 乙: "天機祿 天梁權 紫微科 太陰忌",
  丙: "天同祿 天機權 文昌科 廉貞忌", 丁: "太陰祿 天同權 天機科 巨門忌",
  戊: "貪狼祿 太陰權 右弼科 天機忌", 己: "武曲祿 貪狼權 天梁科 文曲忌",
  庚: "太陽祿 武曲權 太陰科 天同忌", 辛: "巨門祿 太陽權 文曲科 文昌忌",
  壬: "天梁祿 紫微權 左輔科 武曲忌", 癸: "破軍祿 巨門權 太陰科 貪狼忌",
};

/**
 * Chart facts as shown to the REVIEWER only. buildChartFacts above is also
 * pasted into generation prompts (synthesis), so it must not change; this is a
 * superset that adds what the reviewer was previously blind to —輔星四化 (a
 * reading saying 左輔化科/文昌化忌 was flagged as fabricated because only major
 * stars carried their 四化 in the facts) and the 天干→四化 table needed to check
 * 飛星 claims ("X宮干Y，Z化忌入W") instead of guessing.
 */
export function buildReviewFacts(ziwei: ZiweiResult): string {
  const base = buildChartFacts(ziwei);
  const minorHua = ziwei.palaces.flatMap((p) =>
    p.stars.filter((s) => s.type === "minor" && s.mutagen).map((s) => `${s.name}化${s.mutagen}在${pName(p.name)}`)
  );
  const lines = [base];
  const byName = new Map(ziwei.palaces.map((p) => [pName(p.name), p]));
  const starsOf = (p?: (typeof ziwei.palaces)[number]) => (p ? p.stars.filter((st) => st.type !== "adjective").map((st) => st.name) : []);
  const sanfang = ziwei.palaces.map((p) => {
    const sf = ziwei.sanFangSiZheng?.[p.name];
    if (!sf) return "";
    const members = [p, byName.get(pName(sf.opposite)), byName.get(pName(sf.wealth)), byName.get(pName(sf.career))];
    return `${pName(p.name)}三方四正（本宮+對宮+財位+官位）星曜：${[...new Set(members.flatMap(starsOf))].join("、") || "無"}`;
  }).filter(Boolean);
  if (sanfang.length) lines.push(sanfang.join("\n"));
  lines.push(`各宮地支與大限（宮位名｜地支｜大限歲數）：${ziwei.palaces.map((p) => `${pName(p.name)}${p.earthlyBranch}${p.decadalAge ? `(${p.decadalAge}歲)` : ""}`).join("、")}`);
  const body = ziwei.palaces.find((p) => p.isBodyPalace);
  if (body) lines.push(`身宮：${pName(body.name)}（${body.earthlyBranch}）`);
  const soul = ziwei.palaces.find((p) => p.isSoulPalace);
  if (soul) lines.push(`命宮：${soul.earthlyBranch}宮`);
  if (ziwei.laiYinPalace) lines.push(`來因宮：${ziwei.laiYinPalace}`);
  if (ziwei.yearStem && SIHUA_BY_STEM[ziwei.yearStem]) lines.push(`生年天干${ziwei.yearStem}，生年四化：${SIHUA_BY_STEM[ziwei.yearStem]}`);
  if (minorHua.length) lines.push(`輔星生年四化落宮：${minorHua.join("、")}`);
  lines.push(`宮干飛四化對照表（各宮天干見上方[ ]內）：${Object.entries(SIHUA_BY_STEM).map(([k, v]) => `${k}干：${v}`).join("；")}`);
  return lines.join("\n");
}

/** Cheap deterministic sanity checks (free, no API). */
function structuralCheck(reading: string): string[] {
  const issues: string[] = [];
  const body = (reading ?? "").trim();
  if (body.length < 80) issues.push("解讀內容過短或為空");
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
const NEGATION = /[未不無非沒]/;
/** True if at least one match of `re` is not negated (未/不/無/非/沒 within the 4 chars before it). */
function hasAffirmedClaim(text: string, re: RegExp): boolean {
  for (const m of text.matchAll(re)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 4), m.index ?? 0);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

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
    const claimed = hasAffirmedClaim(reading, new RegExp(`${full}|${quoted.source}`, "g"));
    if (claimed) {
      issues.push(`解讀杜撰了本命盤並不成立的格局「${core}」——該格有嚴格的星曜條件，本盤並未形成。請刪除此格局論斷，僅依據真實星曜組合分析，不要自創或套用格局名。`);
    }
  }
  return issues.slice(0, 5);
}

/**
 * Deterministic hard-fact check (free): 五行局 name, 命宮 branch, and an explicit
 * "<palace>…N~M歲" 大限 range are fully determined by the chart, and the LLM
 * reviewer proved flaky on them (a planted wrong 命宮 branch / age range passed
 * ~1 run in 3). Only unambiguous, adjacent phrasings are matched.
 */
const FIVE_ELEMENT_CLASSES = ["水二局", "木三局", "金四局", "土五局", "火六局"];
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
function hardFactCheck(reading: string, ziwei: ZiweiResult): string[] {
  if (!reading || !ziwei?.palaces?.length) return [];
  const issues: string[] = [];
  const actualClass = ziwei.fiveElementsClass;
  if (actualClass) {
    for (const c of FIVE_ELEMENT_CLASSES) {
      if (c !== actualClass && hasAffirmedClaim(reading, new RegExp(`(?:五行局|此盤|本盤|命盤)[為是屬：:]{0,2}${c}`, "g"))) {
        issues.push(`解讀把五行局寫成「${c}」，但本盤五行局是${actualClass}。`);
      }
    }
  }
  const soul = ziwei.palaces.find((p) => p.isSoulPalace);
  if (soul?.earthlyBranch) {
    const m = reading.match(new RegExp(`命宮[\\s·‧：:]{0,3}(?:落在|落於|坐於|位於|在|於)?([${BRANCHES}])宮`));
    if (m && m[1] !== soul.earthlyBranch) issues.push(`解讀把命宮寫在${m[1]}宮，但本盤命宮在${soul.earthlyBranch}宮。`);
  }
  for (const p of ziwei.palaces) {
    const nm = pName(p.name);
    if (p.earthlyBranch && nm !== "命宮") {
      const m = reading.match(new RegExp(`(?:^|[\\n#\\s*])${nm}[\\s·‧：:]{1,3}([${BRANCHES}])宮`));
      if (m && m[1] !== p.earthlyBranch) issues.push(`解讀把${nm}寫在${m[1]}宮，但本盤${nm}在${p.earthlyBranch}宮。`);
    }
    if (p.decadalAge) {
      const base = nm.replace(/宮$/, "");
      const am = reading.match(new RegExp(`${base}宮?(?:大限)?[（(：:\\s是為在走]{0,4}(\\d{1,3})\\s*[~～－-]\\s*(\\d{1,3})\\s*歲`)) ??
        reading.match(new RegExp(`${base}宮?[^\\n。，；,;\\d]{0,6}大限[^\\n。，；,;\\d]{0,4}(\\d{1,3})\\s*[~～－-]\\s*(\\d{1,3})\\s*歲`));
      const [a, b] = p.decadalAge.split("~");
      if (am && (am[1] !== a || am[2] !== b)) issues.push(`解讀把${nm}大限寫成${am[1]}~${am[2]}歲，但本盤${nm}大限是${p.decadalAge}歲。`);
    }
  }
  return issues.slice(0, MAX_REVISION_ISSUES);
}

/**
 * Shared output contract appended to every review prompt. The reviewer used to
 * return a flat list of strings and fail the whole reading on any of them —
 * measured ~40% FAIL on production, mostly style/omission/out-of-scope noise,
 * each triggering a full regeneration. Now only severity:"error" counts.
 */
export const REVIEW_OUTPUT_SPEC = `只報告「可對照上方事實逐字驗證的硬性矛盾」。每個問題必須附 quote：解讀中逐字出現的原文片段（不超過30字，不得改寫、不得憑空捏造）。
severity 規則：
- "error"：解讀明確寫出的某項陳述，與上方【已明確列出】的事實直接矛盾（星曜落宮、主/輔星歸屬、四化星曜與落宮、宮干、五行局、命主身主、解讀明確說出且事實有標註的亮度、八字干支/日主/大運年齡）。矛盾必須是確定的，你能指出事實中對應的那一行。
- "note"：其他一切——措辭語氣輕重、詮釋與引申、解讀沒提到的事實（遺漏）、事實未涵蓋因而無法核對的內容、學派觀點差異、與事實一致的陳述。
不確定是否矛盾時一律用 "note"。與事實一致的陳述不要列出。
返回 JSON：{"pass": true/false, "issues": [{"quote": "解讀原文片段", "fact": "上方事實中與之對照的那一行或那一段原文（逐字複製）", "analysis": "一句話：解讀說X，事實是Y，逐項比對", "contradicts": true或false, "severity": "error"或"note"}]}。
欄位請依上述順序先寫 analysis 再下結論。只有比對後確定「解讀與事實不一致」(contradicts=true) 且 fact 能逐字複製出矛盾的事實原文時，才可 severity="error"。若比對後發現一致、正確、事實未列出、無法核對、解讀未提及或屬詮釋，則不要輸出該項。pass=true 當且僅當沒有任何 error。issues 最多 8 項。`;

/** Max real errors handed back to the writer as revision notes. */
export const MAX_REVISION_ISSUES = 5;

const squash = (t: string) => t.replace(/[\s*#>_`「」『』"'“”（）()、，。：:；;]/g, "");

interface RawIssue { severity?: unknown; quote?: unknown; fact?: unknown; analysis?: unknown; message?: unknown; contradicts?: unknown }

/** An "error" whose own explanation concedes it isn't a contradiction (the reviewer sometimes tags consistent / unverifiable items as errors). */
const CONCESSION = /與事實一致|相符|正確的|無法核對|無法驗證|未提供|未列出|不在.{0,6}範圍|未提及|未標註|未明確|學派斷語|屬於?詮釋|此處描述一致|並無矛盾|沒有錯誤|並非錯誤|列為主星|是輔星|是雜耀/;

/** Shared: run a complete prompt through the Gemini reviewer. Fail-open.
 *  `reading` (optional) enables quote verification: an "error" whose quote does
 *  not literally appear in the reading is a hallucinated complaint and is
 *  demoted to a note. Verdict: pass=false iff at least one surviving error. */
export async function jsonReview(prompt: string, reading?: string, facts?: string, opts?: { demoteQuote?: RegExp }): Promise<{ pass: boolean; issues: string[]; reviewed: boolean; notes: string[] }> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return { pass: true, issues: [], reviewed: false, notes: [] };
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(key);
    // thinkingBudget:1024 (was 0) — at 0 the reviewer skipped the compare step and
    // tagged consistent claims as errors (see docs/checker-strictness-analysis.md);
    // measured ~6s avg / 10s max per call, inside the 20s deadline. Not in the SDK's GenerationConfig type yet, so
    // built as a loose record (same pattern as callAI.ts).
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 1024 },
    };
    const model = genAI.getGenerativeModel({ model: REVIEW_MODEL, generationConfig }, { timeout: 20_000 });
    // Called from maxDuration=30 routes and the sseWriter gate — bounded well
    // under that so a slow response fails open here. See aiRetry.ts.
    const res = await withDeadline(model.generateContent(prompt), 20_000);
    const parsed = JSON.parse(res.response.text() || "{}") as { pass?: boolean; issues?: unknown };
    // Valid JSON with no boolean `pass` (e.g. "{}") didn't actually answer the
    // question — that's a reviewer failure, not a genuine pass, so it must
    // fail open (reviewed:false) rather than be trusted and cached as validated.
    if (typeof parsed.pass !== "boolean") return { pass: true, issues: [], reviewed: false, notes: [] };

    const hay = reading ? squash(reading) : null;
    const factHay = facts ? squash(facts) : null;
    const errors: string[] = [];
    const notes: string[] = [];
    for (const raw of Array.isArray(parsed.issues) ? (parsed.issues as unknown[]) : []) {
      // Legacy/flat string issue: no severity to trust, treated as an error (old contract).
      const it: RawIssue = typeof raw === "string" ? { severity: "error", message: raw } : (raw as RawIssue) ?? {};
      const message = (typeof it.analysis === "string" ? it.analysis : typeof it.message === "string" ? it.message : "").trim();
      if (!message) continue;
      const quote = typeof it.quote === "string" ? it.quote.trim() : "";
      const quoteMissing = hay !== null && typeof raw !== "string" && (!quote || !hay.includes(squash(quote)));
      const fact = typeof it.fact === "string" ? it.fact.trim() : "";
      // The cited contradicting fact must literally exist in the facts we gave the reviewer.
      const factMissing = factHay !== null && typeof raw !== "string" && (!fact || !factHay.includes(squash(fact)));
      const contradicts = typeof raw === "string" || it.contradicts === true;
      const dynamicQuote = VAGUE_LIFE_STAGE.test(quote) || (!!opts?.demoteQuote && opts.demoteQuote.test(quote));
      if (it.severity === "error" && contradicts && !quoteMissing && !dynamicQuote && !factMissing && !CONCESSION.test(message)) errors.push(quote ? `「${quote}」${message}` : message);
      else notes.push(message);
    }
    return {
      pass: errors.length === 0,
      issues: errors.slice(0, MAX_REVISION_ISSUES),
      reviewed: true,
      notes: notes.slice(0, 8),
    };
  } catch (err) {
    console.warn("[review] review skipped:", JSON.stringify({ reviewModel: REVIEW_MODEL, error: (err as Error).message }));
    return { pass: true, issues: [], reviewed: false, notes: [] }; // fail-open
  }
}

/** Gemini cross-checks the reading against the authoritative 紫微 facts. */
const MAX_REVIEW_CHARS = 14000;
/** Keep head and tail of a long reading so the tail isn't silently unchecked. */
function reviewWindow(reading: string): string {
  if (reading.length <= MAX_REVIEW_CHARS) return reading;
  return `${reading.slice(0, 9000)}\n……（中段省略）……\n${reading.slice(-5000)}`;
}

/** Generic life-stage wording ("中晚年") is interpretation, never a checkable age range. */
const VAGUE_LIFE_STAGE = /中晚年|早年|晚年|中年|少年|青年/;

/** In 大限／流年／年度 readings, a quote about a moving period can't be checked against natal-only facts. */
const DYNAMIC_QUOTE = /(財帛|官祿|命宮|遷移|疾厄|福德)位|大限|大運|流年|流月|流日|流耀|20\d\d年|\d+歲|\d+～\d+|\d+~\d+/;

async function logicReview(reading: string, facts: string, natalOnly = false): Promise<{ pass: boolean; issues: string[]; reviewed: boolean; notes: string[] }> {
  const prompt = `你是紫微斗數解讀的事實校驗員。下面【權威命盤事實】由確定性演算法（iztro）計算得出，是不可更改的事實；【待校驗解讀】由另一個AI生成。

你的唯一任務：找出解讀中與【已明確列出的事實】直接矛盾的陳述，例如：
- 說某星在某宮，但事實中該星在另一宮（注意：命宮空宮「借對宮星曜」、三方四正會照的星，不算錯）
- 四化（化祿/權/科/忌）的星曜或落宮錯誤（主星、輔星的生年四化均已列出）
- 說「某宮天干X、飛某星化某入某宮」，但與事實中該宮天干及【宮干飛四化對照表】不符
- 五行局、命主、身主、命宮/身宮落宮、宮位地支與事實不同
- 解讀明確寫出某星的亮度（廟旺得利平陷），而事實標註的亮度不同

飛星陳述（如「X宮干Y，Z化祿入W宮」）請分三步核對，缺一不可：①X宮的天干是否真是Y（看事實中X宮[ ]內的天干）；②對照表中Y干的祿權科忌星曜，是否正是所說的Z星與化象；③Z星是否位於W宮。三步都吻合就是正確，W宮自己的天干與此無關，不得拿W宮天干去反駁。
以下一律不是錯誤（最多標 note）：解讀以「主星：」「輔星：」等格式標籤列出星曜時混列主輔星、文采、詳略、語氣輕重（如把「陷」說得輕描淡寫）、合理引申與擴寫、解讀沒提到某項事實、未標註亮度、神煞/雜耀的詮釋、各學派斷語差異、解讀自身的行文邏輯。
解讀可能同時談到八字、流年、大限、其他學派資料，凡不屬於上方事實涵蓋的內容（八字干支、日主、十神、流年大限推算等）一律不得判 error。
三方四正會照以【三方四正星曜】行為準；解讀漏列某些會照星曜不算錯，只有列出了不在其中的星才算錯。空宮借對宮星曜屬正常寫法。解讀若明確寫出某宮（含命宮）的大限歲數「N~M歲」，必須對照事實中「各宮地支與大限」一行逐項核對，數字不符即為 error；，「中晚年」等泛稱不核對。
運限/動態資訊（大限、流年、流月、流耀、流年四化、大限干四化、年齡區間對應的宮位）**不在**事實範圍內，無法核對，不得判為 error。
${natalOnly ? "\n本篇為大限／流年／年度解讀：下方事實僅有本命盤，各大限、流年的星曜與四化是另行推算的；凡涉及某一大限或某一年的論斷一律不得判 error，只核查其中明確涉及本命星曜落宮、本命四化、宮干的陳述。\n" : ""}
${REVIEW_OUTPUT_SPEC}

【權威命盤事實】
${facts}

【待校驗解讀】
${reviewWindow(reading)}`;
  return jsonReview(prompt, reading, facts, natalOnly ? { demoteQuote: DYNAMIC_QUOTE } : undefined);
}

export async function validateReading(reading: string, ziwei: ZiweiResult, opts?: { natalOnly?: boolean }): Promise<ValidationResult> {
  const structural = structuralCheck(reading);
  if (structural.length) return { pass: false, issues: structural, reviewed: false, deterministic: true };

  // Deterministic 格局-fabrication gate (free) — fail fast so the reading is
  // regenerated without the invented 格局; no need to spend a review call.
  const fabricated = minggeFabricationCheck(reading, ziwei);
  if (fabricated.length) return { pass: false, issues: fabricated, reviewed: true };

  const hard = hardFactCheck(reading, ziwei);
  if (hard.length) return { pass: false, issues: hard, reviewed: true };

  const facts = buildReviewFacts(ziwei);
  const review = await logicReview(reading, facts, opts?.natalOnly);
  return { pass: review.pass, issues: review.issues, reviewed: review.reviewed, notes: review.notes };
}
