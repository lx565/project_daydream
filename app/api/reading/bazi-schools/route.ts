import { MODERN_INSTRUCTION } from "@/lib/modernInstruction";
export const maxDuration = 90;
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextRequest } from "next/server";
import { getKnowledge } from "@/lib/rag";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";
import type { BaziResult } from "@/lib/bazi";

// B3 · 八字 tab — 各派視角 (祿命派 + 盲派)
// Beside-mode: B1 already covers 旺衰+格局; this adds two non-overlapping lenses.
const SYSTEM = `你是一位博採眾派的命理師，熟悉祿命法與盲派各自的斷命邏輯。請對同一命局從兩個獨立視角簡述，每派各有側重，不重複 B1 已做的旺衰/格局/十神分析。

${MODERN_INSTRUCTION}

請嚴格按以下格式輸出兩節：

## 祿命派視角

祿命法以納音五行為綱，重視神煞（天乙貴人、羊刃、華蓋、驛馬、天德、月德等）的實際影響。請：
- 點出此命的納音五行（年/日納音）及其特質含義
- 列舉2-3個最具影響力的神煞及其在命局中的實際體現
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

function nayinOf(stem: string, branch: string): string {
  const si = STEMS.indexOf(stem);
  const bi = BRANCHES.indexOf(branch);
  if (si < 0 || bi < 0) return "未知";
  const idx = (si * 12 + bi) % 60;
  return NAYIN[Math.floor(idx / 2)] ?? "未知";
}

function buildMessage(bazi: BaziResult, gender: string): string {
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
  return `【八字命局】
四柱（含納音）：
${pillars.join("\n")}
日主：${dm}（${bazi.dayMasterElement}）
五行分佈：木${el.wood} 火${el.fire} 土${el.earth} 金${el.metal} 水${el.water}
性別：${gender === "male" ? "男" : "女"}
命局摘要：${bazi.summary}

請分別從祿命派和盲派視角解讀，按格式輸出兩節。`;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 4, keyPrefix: "bazi-schools" })).allowed) return rateLimitResponse();

  let body: { bazi: BaziResult; gender: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { bazi, gender } = body;
  if (!bazi || !gender) return Response.json({ error: "missing_fields" }, { status: 400 });

  // RAG: pull 祿命法 sources (納音/神煞) and 盲派 sources (直斷/意象)
  const { context, refs } = await getKnowledge({
    stars: ["納音", "神煞", "貴人", "祿命", "羊刃", "華蓋", "驛馬"],
    text: `祿命法 納音五行 神煞 天乙貴人 羊刃 華蓋 驛馬 盲派 意象直斷 ${bazi.summary} ${bazi.dayMasterElement}`,
    school: "八字命理",
    strict: false,
    topK: 8,
    maxPerBook: 4,
  });

  const userMessage = `${context ? `【典籍參考（祿命法·盲派）】\n${context}\n\n---\n\n` : ""}${buildMessage(bazi, gender)}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      maxTokens: 2200,
      // Wider deadline — DeepSeek was observed exceeding the 35s default while still
      // legitimately streaming; see couple/route.ts for the full rationale.
      attemptTimeoutMs: 55_000,
      retryTimeoutMs: 20_000,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      refs,
    })
  );
}
