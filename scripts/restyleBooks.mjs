// De-template / de-AI-tell pass for the 30 book articles.
// Rewrites STYLE ONLY — facts (names, dates, dynasties, terms, 格局 conditions)
// must be preserved verbatim. Backs up each file to <slug>.json.bak first.
// Usage:
//   npx tsx --env-file=.env.local scripts/restyleBooks.mjs
//   npx tsx --env-file=.env.local scripts/restyleBooks.mjs --slug 徐子平传
//   npx tsx --env-file=.env.local scripts/restyleBooks.mjs --restore   (revert from .bak)

import fs from "fs";
import path from "path";
import { synthesize } from "../lib/synthesize.ts";
import { ANTI_CLICHE } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const restore = args.includes("--restore");
const dryRun = args.includes("--dry-run");

const dir = path.join(process.cwd(), "content", "seo", "book");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && !f.endsWith(".bak"));
const targets = slugFilter ? files.filter(f => f === `${slugFilter}.json`) : files;

if (restore) {
  let n = 0;
  for (const f of targets) {
    const bak = path.join(dir, f + ".bak");
    if (fs.existsSync(bak)) { fs.copyFileSync(bak, path.join(dir, f)); n++; }
  }
  console.log(`Restored ${n} file(s) from .bak`);
  process.exit(0);
}

const SYSTEM = `你是资深中文编辑，同时是真正读过这些命理典籍的行家。下面给你一篇【已经事实核对过】的命理科普文章，问题是它读起来太像 AI 写的——套路化、空话套话多、每篇结构雷同。请把它彻底重写一遍，让它读起来像一个懂行的人在跟朋友认真讲。

【最高优先级 · 绝对不能动的】
- 任何事实一字不改：人名、书名（含别名）、朝代、年代、术语、师承关系、格局的成败条件、五行生克与阴阳——不得改动、不得增删、不得"纠正"、不得新增任何原文没有的人名书名或史实。你只改文风，不碰事实。
- 文章涵盖的核心信息与结论保持一致。

【必须改掉的】${ANTI_CLICHE}
- 开头不要再用"史料极少/绕不开/在……发展史上"这类套路开场，直接切入有信息量的内容。
- 结尾不要再用加粗的"给你的可操作建议/一句话建议"统一收尾；自然地收在一个具体观点或判断上。
- 章节标题全部重写，要具体、有信息量、彼此不雷同，不要"是什么→核心理论→历史影响→阅读建议"这种通用骨架。
- 字数与原文相近（±20%）。

只输出重写后的正文 Markdown，不要任何前言或说明。`;

let done = 0, failed = 0;
for (const f of targets) {
  const file = path.join(dir, f);
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const original = data.markdown ?? "";
  if (!original.trim()) { console.log(`  SKIP  ${f} (empty)`); continue; }
  if (dryRun) { console.log(`  DRY   ${f}`); continue; }

  const t = Date.now();
  process.stdout.write(`  REWRITE ${f.replace(".json", "")} … `);
  try {
    const rewritten = await synthesize({
      tag: "book-restyle",
      system: SYSTEM,
      prompt: `【待重写的文章】\n\n${original}`,
      model: process.env.SEO_AI_MODEL ?? "deepseek-reasoner",
      maxTokens: 4000,
    });
    if (!rewritten || rewritten.trim().length < 300) {
      console.log(`FAILED (too short: ${rewritten?.length ?? 0}c) — kept original`);
      failed++;
      continue;
    }
    // Back up original once, then overwrite.
    const bak = file + ".bak";
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, JSON.stringify(data, null, 2));
    data.markdown = rewritten;
    data.chars = rewritten.length;
    data.restyledAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`${rewritten.length}c in ${Math.round((Date.now() - t) / 1000)}s`);
    done++;
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    failed++;
  }
}
console.log(`\n  Rewritten: ${done}  Failed: ${failed}\n`);
