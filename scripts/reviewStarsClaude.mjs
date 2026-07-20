// Third-model adjudication of the Gemini-flagged star articles, using Claude
// Sonnet 4.6 (DeepSeek authored, Gemini flagged, Claude is the tiebreaker).
// Each flagged article is re-checked AGAINST its ground-truth facts. Claude must
// verify every 庙旺/同宫/四化 claim against the authoritative block before flagging,
// because Gemini produced noisy self-contradicting brightness complaints.
// Usage: npx tsx --env-file=.env.local scripts/reviewStarsClaude.mjs
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { MAJOR_STARS, PALACES } from "../lib/starData.ts";
import { starGroundingBlock } from "../lib/starFacts.ts";

const client = new Anthropic(); // ANTHROPIC_API_KEY from --env-file
const CONC = 3;

// Read the Gemini run; default to all 168 if absent.
let jobs;
try {
  const prev = JSON.parse(fs.readFileSync("/tmp/star_review.json", "utf8"));
  jobs = (prev.revise ?? []).map((x) => ({ s: x.s, p: x.p, geminiNote: x.verdict.replace(/^REVISE:?\s*/, "") }));
} catch {
  jobs = [];
  for (const s of MAJOR_STARS) for (const p of PALACES) jobs.push({ s: s.name, p: p.name, geminiNote: "" });
}

const SYS = (s, p) => `你是紫微斗数事实核查员，负责对一篇大众科普文章「${s}在${p}」做"事实"复核。下方给出的是标准排盘的权威定盘资料，是唯一事实基准。

【该星权威定盘资料（唯一事实基准）】
${starGroundingBlock(s)}

核查规则：
1. 逐条把文中关于"星曜同宫组合""庙旺亮度""可化四化"的说法，与上方权威资料逐字比对。只有当文中说法与权威资料确有矛盾、或出现权威资料之外的虚构星名/格名/四化时，才算"真错"。
2. 庙旺亮度只判断与权威资料是否一致；权威资料用的亮度词（庙/旺/得/利/平/不/陷等）以它为准，文中近义或细分写法若不与之冲突，不算错。
3. 性格描述、人生建议、行文风格一律不审。措辞鸡毛蒜皮不要挑。
4. 你是独立第三方，不要默认下面这条 Gemini 旧意见正确——它可能是误报（例如把相同亮度判成不同、或自相矛盾）。自己核对权威资料后再下结论。

Gemini 旧意见（仅供参考，可能误报）：${p ? "" : ""}${"「" + "..." + "」"}

只输出一行：
PASS
或
REVISE: <最多两条经你核实属实的硬伤，注明正确值，简短>`;

async function review(job, attempt = 1) {
  try {
    const md = JSON.parse(fs.readFileSync(path.join("content/seo/star", `${job.s}__${job.p}.json`), "utf8")).markdown;
    const sys = SYS(job.s, job.p).replace("「...」", `「${job.geminiNote || "（无）"}」`);
    const r = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: sys,
      messages: [{ role: "user", content: md }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return text;
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (attempt < 4 && /429|503|500|overload|rate|timeout|fetch|ECONN/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return review(job, attempt + 1);
    }
    return `ERROR: ${msg.slice(0, 100)}`;
  }
}

let done = 0;
const revise = [];
const pass = [];
const errors = [];
async function worker(q) {
  for (;;) {
    const job = q.shift();
    if (!job) return;
    const verdict = await review(job);
    done++;
    if (verdict.startsWith("REVISE")) {
      revise.push({ ...job, claude: verdict });
      console.log(`REVISE ${job.s}在${job.p} — ${verdict.replace(/^REVISE:?\s*/, "")}`);
    } else if (verdict.startsWith("ERROR")) {
      errors.push({ ...job, claude: verdict });
      console.log(`ERROR  ${job.s}在${job.p} — ${verdict}`);
    } else {
      pass.push({ ...job });
      console.log(`PASS   ${job.s}在${job.p}（Gemini 误报）`);
    }
  }
}
const q = [...jobs];
await Promise.all(Array.from({ length: CONC }, () => worker(q)));

console.log(`\n=== Claude Sonnet 复核 ${jobs.length} 篇：${pass.length} PASS（判 Gemini 误报）, ${revise.length} REVISE（确属硬伤）, ${errors.length} ERROR ===`);
fs.writeFileSync("/tmp/star_review_claude.json", JSON.stringify({ revise, pass, errors }, null, 2));
