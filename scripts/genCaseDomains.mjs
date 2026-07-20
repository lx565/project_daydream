// Generate domain-scoped real-case cards for the 4 八字 hub pages.
// Pipeline: keyword pre-filter (free) -> LLM scope+rewrite -> curate -> JSON.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/genCaseDomains.mjs --dry-run
//   AI_PROVIDER=deepseek npx tsx --env-file=.env.local scripts/genCaseDomains.mjs --domain hunyin --limit 30
//   AI_PROVIDER=deepseek npx tsx --env-file=.env.local scripts/genCaseDomains.mjs   // all domains
import fs from "fs";
import path from "path";
import { getAllCases } from "../lib/casesData.ts";
import { CASE_DOMAINS } from "../lib/caseDomains.ts";
import { callAI } from "../lib/callAI.ts";
import { ANTI_CLICHE } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const only    = args.includes("--domain") ? args[args.indexOf("--domain") + 1] : null;
const limit   = args.includes("--limit")  ? parseInt(args[args.indexOf("--limit") + 1]) : 60; // candidates scanned/domain
const keep    = args.includes("--keep")   ? parseInt(args[args.indexOf("--keep") + 1])  : 8; // cards kept/domain (~6-8)
const dryRun  = args.includes("--dry-run");

const OUT_DIR = path.join(process.cwd(), "content", "cases-domains");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ALL = getAllCases();

// Grim / lurid outcome terms — cases whose documented result contains any of these are
// dropped before they reach the model (the source case books skew to dramatic tragedies;
// this keeps the learning cards cautionary-but-clean, never doom-laden or salacious).
const BLOCK = [
  "死亡", "病亡", "身亡", "去世", "病故", "过世", "早逝", "猝死", "暴亡",
  "丧妻", "丧夫", "丧父", "丧母", "夭", "自杀", "坐牢", "入狱",
  "诈骗", "坑骗", "嫖", "换偶", "乱伦", "强奸", "吸毒", "凶案", "杀人",
];

// A clean four-pillar string: exactly 4 space-separated 干支 pairs (e.g. "甲子 乙丑 丙寅 丁卯").
// Rejects malformed/descriptive bazi_text like "庚金 卯月 丙年 戊时" so every card shows a real chart.
const FOUR_PILLARS = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]( [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]){3}$/;

function candidatesFor(meta) {
  return ALL.filter(c => {
    if (!c.bazi_text || !FOUR_PILLARS.test(c.bazi_text.trim())) return false; // real four pillars only
    if (!c.outcome || !c.outcome.trim()) return false;     // outcome = good learning example
    // The documented RESULT (prediction + outcome), not the general analysis, must be
    // about this domain — so the 结局 shown on the card is a real domain result, not an
    // unrelated event (e.g. a parent's death) that the keyword happened to match.
    const result = `${c.prediction} ${c.outcome}`;
    if (BLOCK.some(w => result.includes(w))) return false; // no death/crime/lurid outcomes
    return meta.keywords.some(k => result.includes(k));
  });
}

const domains = only ? [only] : Object.keys(CASE_DOMAINS);

for (const domain of domains) {
  const meta = CASE_DOMAINS[domain];
  const cands = candidatesFor(meta);
  console.log(`${domain} (${meta.label}): ${cands.length} candidates with outcome`);
  if (dryRun) continue;

  // 1) 命里 AI blind read — fed ONLY the chart (no master text, no outcome).
  const readSystem = `你是命里 AI，一位严谨的八字命理引擎。只会给你一个命主的【四柱】与【日主】，请你独立、盲测地针对「${meta.label}」这一件事给出解读——你看不到任何古籍批语或真实结局，完全凭盘论断。
要求：面向没学过命理的人写白话；只谈「${meta.label}」，不牵扯其他方面；凡用专有名词（正官、财星、比劫、格局等）紧跟一句大白话解释它在「${meta.label}」上代表什么；100~140字；不得出现"结局""古籍""据说""史载"等字样（你并不知道结果）。直接输出解读正文，不要前言。
${ANTI_CLICHE}`;

  // 2) Judge alignment (valence-strict) + condense the master's verdict + clean 结局.
  const judgeSystem = `你是命理对照评审。给你【命里AI解读】【古籍原文批语】【真实结局】，都是关于「${meta.label}」。只输出 JSON：
{"aligned": true/false, "masterVerdict": "……", "outcomeLine": "……"}
- aligned：命里AI解读对「${meta.label}」的吉凶方向（顺利/坎坷、美满/波折、成/败）是否与真实结局一致。**若解读偏负面（说会有问题、坎坷）但真实结局其实顺利美满，或解读偏正面但真实结局坎坷，一律 aligned=false**——方向必须一致，细节措辞不苛求。**另：若【古籍原文批语】所述的日主/命局与【命里AI解读】明显不是同一个命（例如一个讲壬水日主、一个讲丙火日主），说明原始资料有误，也一律 aligned=false。**
- masterVerdict：把古籍批语的核心论断与理据浓缩成 2~3 句、约 60~100 字的白话，保留大师判断的具体依据（如凭某星／某神煞／某格局／某五行关系，为何主此结果），只谈「${meta.label}」，平实不猎奇、不堆砌文言。
- outcomeLine：用一句平和白话说明命主在「${meta.label}」上的真实结局，≤30字，只讲该领域。**若真实结局与「${meta.label}」无关（如只讲居住地、亲人生死），或只涉及死亡/凶祸等无法平和陈述的内容，一律 aligned=false。**
所有输出不得含 死亡/去世/病故/早逝/自杀/凶案/坐牢/双亡 等字样。`;

  const kept = [];
  const scan = cands.slice(0, limit);
  for (const c of scan) {
    if (kept.length >= keep) break;

    // blind read
    let mingliRead = "";
    try {
      mingliRead = (await callAI({
        system: readSystem,
        userMessage: `【日主】${c.rizi || "未知"}\n【四柱】${c.bazi_text}\n【领域】${meta.label}`,
        maxTokens: 500, temperature: 0.5,
      })).trim();
    } catch (e) { console.log(`  skip ${c.id}: read failed (${e.message})`); continue; }
    if (!mingliRead || BLOCK.some(w => mingliRead.includes(w)) || /悲剧|惨|凄凉/.test(mingliRead)) continue;

    // judge + condense
    let judge;
    try {
      const raw = await callAI({
        system: judgeSystem, jsonMode: true, maxTokens: 400, temperature: 0.2,
        userMessage: `【命里AI解读】${mingliRead}\n【古籍原文批语】${c.analysis}\n【真实结局】${c.outcome}`,
      });
      judge = JSON.parse(raw);
    } catch { console.log(`  skip ${c.id}: judge failed`); continue; }
    const verdict = (judge?.masterVerdict ?? "").trim();
    const outcomeLine = (judge?.outcomeLine ?? "").trim();
    if (!judge?.aligned || !verdict || !outcomeLine) { console.log(`  skip ${c.id}: not aligned`); continue; }
    // The shown verdict/结局 must be squeaky clean — reject death (夫亡/死), crime, or
    // lurid wording (共夫/性生活/混乱/淫…). Excludes bare 亡/杀 so legit 官杀 terms survive.
    const GRIM_SHOWN = /死|[夫妻子父母]亡|身亡|亡故|自杀|凶案|坐牢|入狱|诈骗|嫖|换偶|共夫|乱伦|强奸|淫|性生活|吸毒|悲剧|惨|凄凉|混乱|出轨|夭/;
    if ([verdict, outcomeLine].some(t => GRIM_SHOWN.test(t))) { console.log(`  skip ${c.id}: tone`); continue; }

    kept.push({
      caseId: c.id, slug: c.slug, bazi_text: c.bazi_text, rizi: c.rizi, geju: c.geju,
      sourceLabel: c.sourceLabel || c.source || "",
      mingliRead, masterVerdict: verdict, outcome: outcomeLine,
    });
    console.log(`  kept ${c.id} (${kept.length}/${keep})`);
  }

  const outFile = path.join(OUT_DIR, `${domain}.json`);
  fs.writeFileSync(outFile, JSON.stringify(kept, null, 2), "utf-8");
  console.log(`  → wrote ${kept.length} aligned cards to ${outFile}`);
}
