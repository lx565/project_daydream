import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { NextRequest } from "next/server";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { BaziResult } from "@/lib/bazi";

// B3 · 八字 tab — 各派視角 (祿命派 + 盲派)
// Beside-mode: B1 already covers 旺衰+格局; this adds two non-overlapping lenses.
const SYSTEM = `你是一位博採眾派的命理師，熟悉祿命法與盲派各自的斷命邏輯。請對同一命局從兩個獨立視角簡述，每派各有側重，不重複「八字」分頁深度解讀已做的旺衰/格局/十神分析。

${MODERN_INSTRUCTION}

請嚴格按以下格式輸出兩節：

## 祿命派視角

祿命法以納音五行為綱，重視神煞（天乙貴人、羊刃、華蓋、驛馬、天德、月德等）的實際影響。請：
- 點出此命的納音五行（年/日納音）及其特質含義
- 僅依據下方【神煞】清單（已由演算法核實是否成立）展開其中1-3個最具影響力者的實際體現；清單中未列出者一律視為不成立，不得自行杜撰其他神煞；若清單顯示本命局神煞不顯，請如實說明
- 用祿命法視角說明命局的"格"與"局"（如納音相生/相剋、貴人助力格局）
字數：350-450字。加粗關鍵神煞名稱。

## 盲派視角

盲派以意象直斷為特色，不講大套理論，直接從字象和五行象讀取資訊。請：
- 從四柱字面、五行象感讀出3-4個此命的直觀特徵（生活實感，非套話）
- 點出日主在整盤中最顯眼的一個"象"（事業象/感情象/財運象中選一個最明確的）
- 如有命例類比思路，可簡提（不必展開）
注意：盲派以直覺為主，結論因師而異，僅供參考。
字數：200-280字。風格直截了當。` ;

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEM = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
// 納音五行 lookup (by 60-jiazi cycle index, pairs share same nayin)
const NAYIN = [
  "海中金","海中金","爐中火","爐中火","大林木","大林木",
  "路旁土","路旁土","劍鋒金","劍鋒金","山頭火","山頭火",
  "澗下水","澗下水","城頭土","城頭土","白蠟金","白蠟金",
  "楊柳木","楊柳木","泉中水","泉中水","屋上土","屋上土",
  "霹靂火","霹靂火","松柏木","松柏木","長流水","長流水",
  "砂中金","砂中金","山下火","山下火","平地木","平地木",
  "壁上土","壁上土","金箔金","金箔金","覆燈火","覆燈火",
  "天河水","天河水","大驛土","大驛土","釵釧金","釵釧金",
  "桑柘木","桑柘木","大溪水","大溪水","沙中土","沙中土",
  "天上火","天上火","石榴木","石榴木","大海水","大海水",
];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// ── 神煞 (deterministic lookups) ──────────────────────────────────────────────
// Same tables already published in lib/shenshaData.ts's `derivation` fields (used
// for the /sources SEO pages) — reused here as the ground truth so the model is
// only ever asked to elaborate on 神煞 that are actually present, never invent them.
const TIANYI_GUIREN: Record<string, string[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  庚: ["寅", "午"], 辛: ["寅", "午"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"],
  丙: ["酉", "亥"], 丁: ["酉", "亥"],
};
const YANGREN: Record<string, string> = {
  甲: "卯", 乙: "辰", 丙: "午", 戊: "午", 丁: "未", 己: "未",
  庚: "酉", 辛: "戌", 壬: "子", 癸: "丑",
};
// 三合局分組：每組對應各自的華蓋（末位四庫）與驛馬（前一位對沖）地支
const SANHE_GROUPS: { branches: string[]; huagai: string; yima: string }[] = [
  { branches: ["申", "子", "辰"], huagai: "辰", yima: "寅" },
  { branches: ["寅", "午", "戌"], huagai: "戌", yima: "申" },
  { branches: ["巳", "酉", "丑"], huagai: "丑", yima: "亥" },
  { branches: ["亥", "卯", "未"], huagai: "未", yima: "巳" },
];
const YUEDE: Record<string, string> = {
  寅: "丙", 午: "丙", 戌: "丙",
  申: "壬", 子: "壬", 辰: "壬",
  亥: "甲", 卯: "甲", 未: "甲",
  巳: "庚", 酉: "庚", 丑: "庚",
};
const TIANDE: Record<string, { value: string; isStem: boolean }> = {
  寅: { value: "丁", isStem: true },
  卯: { value: "申", isStem: false },
  辰: { value: "壬", isStem: true },
  巳: { value: "辛", isStem: true },
  午: { value: "亥", isStem: false },
  未: { value: "甲", isStem: true },
  申: { value: "癸", isStem: true },
  酉: { value: "寅", isStem: false },
  戌: { value: "丙", isStem: true },
  亥: { value: "乙", isStem: true },
  子: { value: "巳", isStem: false },
  丑: { value: "庚", isStem: true },
};

/** Which of the 6 神煞 named in the system prompt actually apply to this chart
 *  (日干/月支-based lookups, cross-checked against all 4 pillars). */
function computeShensha(bazi: BaziResult): string[] {
  const stems = [bazi.year.stem, bazi.month.stem, bazi.day.stem, bazi.hour.stem];
  const branches = [bazi.year.branch, bazi.month.branch, bazi.day.branch, bazi.hour.branch];
  const dayStem = bazi.day.stem;
  const monthBranch = bazi.month.branch;
  const results: string[] = [];

  const tianyiTargets = TIANYI_GUIREN[dayStem] ?? [];
  const tianyiHit = tianyiTargets.filter((b) => branches.includes(b));
  if (tianyiHit.length) results.push(`天乙貴人（日干${dayStem}查${tianyiTargets.join("/")}，命局見${tianyiHit.join("、")}）`);

  const yangrenTarget = YANGREN[dayStem];
  if (yangrenTarget && branches.includes(yangrenTarget)) {
    results.push(`羊刃（日干${dayStem}查${yangrenTarget}，命局見之）`);
  }

  const group = SANHE_GROUPS.find((g) => g.branches.includes(bazi.year.branch) || g.branches.includes(bazi.day.branch));
  if (group) {
    if (branches.includes(group.huagai)) results.push(`華蓋（見${group.huagai}）`);
    if (branches.includes(group.yima)) results.push(`驛馬（見${group.yima}）`);
  }

  const yuedeTarget = YUEDE[monthBranch];
  if (yuedeTarget && stems.includes(yuedeTarget)) {
    results.push(`月德貴人（月支${monthBranch}查天干${yuedeTarget}，命局見之）`);
  }

  const tiande = TIANDE[monthBranch];
  if (tiande) {
    const present = tiande.isStem ? stems.includes(tiande.value) : branches.includes(tiande.value);
    if (present) results.push(`天德貴人（月支${monthBranch}查${tiande.isStem ? "天干" : "地支"}${tiande.value}，命局見之）`);
  }

  return results;
}

function nayinOf(stem: string, branch: string): string {
  const si = STEMS.indexOf(stem);
  const bi = BRANCHES.indexOf(branch);
  if (si < 0 || bi < 0) return "未知";
  // Solve the simultaneous congruence n≡si (mod 10), n≡bi (mod 12) via CRT to get
  // the 0-59 position in the 六十甲子 cycle. (Old formula (si*12+bi)%60 was simply
  // wrong — not a solution to that congruence — and was wrong for 55/60 combos.)
  const idx = (((6 * si - 5 * bi) % 60) + 60) % 60;
  // NAYIN is already indexed directly by this 0-59 cycle position (each name stored
  // at two consecutive raw indices, e.g. NAYIN[0]=NAYIN[1]="海中金"), so idx indexes
  // it directly. Math.floor(idx/2) here was a second, compounding bug: combined with
  // a correct idx it would still pick the wrong name for most of the 60 combos
  // (e.g. 丙寅 would still resolve to 海中金 instead of 爐中火).
  return NAYIN[idx] ?? "未知";
}

function buildMessage(bazi: BaziResult, gender: string, revisionNotes?: string[]): string {
  const dm = bazi.dayMaster;
  const yearNayin = nayinOf(bazi.year.stem, bazi.year.branch);
  const dayNayin  = nayinOf(bazi.day.stem,  bazi.day.branch);
  const pillars = [
    `年柱：${bazi.year.stem}${bazi.year.branch}（納音${yearNayin}）`,
    `月柱：${bazi.month.stem}${bazi.month.branch}`,
    `日柱：${bazi.day.stem}${bazi.day.branch}（日主·納音${dayNayin}）`,
    `時柱：${bazi.hour.stem}${bazi.hour.branch}`,
  ];
  const el = bazi.elements;
  const shensha = computeShensha(bazi);
  const revision = revisionNotes?.length
    ? `\n\n【重要·上一版校驗發現以下問題，請務必修正後重新輸出】\n${revisionNotes.join("\n")}`
    : "";
  return `【八字命局】
四柱（含納音）：
${pillars.join("\n")}
日主：${dm}（${bazi.dayMasterElement}）
五行分佈：木${el.wood} 火${el.fire} 土${el.earth} 金${el.metal} 水${el.water}
性別：${gender === "male" ? "男" : "女"}
命局摘要：${bazi.summary}

神煞（已由演算法核實，僅列實際成立者，祿命派視角須只依此清單展開）：
${shensha.length ? shensha.join("\n") : "本命局未見天乙貴人、羊刃、華蓋、驛馬、天德、月德等常見神煞"}

請分別從祿命派和盲派視角解讀，按格式輸出兩節。${revision}`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "bazi-schools" })).allowed) return rateLimitResponse();

  let body: { bazi: BaziResult; gender: string; revisionNotes?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { bazi, gender } = body;
  if (!bazi || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  // RAG: pull 祿命法 sources (納音/神煞) and 盲派 sources (直斷/意象). strict:true so
  // this never pulls in 三合/四化/飛星派 (紫微) chunks against a 八字 question — the
  // old strict:false only soft-downweighted the wrong schools, and several of them
  // (古籍經典/其他名家/倪師學派) are NEUTRAL_SCHOOLS so weren't downweighted at all.
  const { context, refs } = await getKnowledge({
    stars: ["納音", "神煞", "貴人", "祿命", "羊刃", "華蓋", "驛馬"],
    text: `祿命法 納音五行 神煞 天乙貴人 羊刃 華蓋 驛馬 盲派 意象直斷 ${bazi.summary} ${bazi.dayMasterElement}`,
    school: "八字命理",
    strict: true,
    topK: 8,
    maxPerBook: 4,
  });

  const userMessage = `${context ? `【典籍參考（祿命法·盲派）】\n${context}\n\n---\n\n` : ""}${buildMessage(bazi, gender, body.revisionNotes)}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // 2200 → 4000 (2026-10-04): real reasoning-phase headroom, not a minimal
      // reactive bump — see lib/sseWriter.ts's DEEPSEEK_MAX_OUTPUT_TOKENS note.
      maxTokens: 4000,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      rateLimit: { ip: clientIp(request), keyPrefix: "bazi-schools" },
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
      // See cautions/route.ts — without this a validation retry's hash matches
      // the flagged original and the cache just replays the same flagged text.
      skipCacheRead: !!body.revisionNotes?.length,
    })
  );
}
