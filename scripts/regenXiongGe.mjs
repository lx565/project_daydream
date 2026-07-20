// Regenerate all 凶格 pages with the updated caring tone prompt.
// Usage: npx tsx --env-file=.env.local scripts/regenXiongGe.mjs
import { getMinggeContent } from "../lib/seoContent.ts";
import { MINGGE_LIST } from "../lib/minggeData.ts";
import fs from "fs";
import path from "path";

const xiong = MINGGE_LIST.filter(m => m.type === "凶格");
console.log(`Regenerating ${xiong.length} 凶格 with caring tone...`);

for (const m of xiong) {
  const f = path.join(process.cwd(), "content/seo/mingge", `${m.slug}.json`);
  try { fs.unlinkSync(f); } catch {}
}

let done = 0;
async function worker(q) {
  for (;;) {
    const m = q.shift(); if (!m) return;
    try {
      const { markdown, refs } = await getMinggeContent(m);
      const out = { label: m.name, markdown, refs, chars: markdown.length, generatedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(process.cwd(), "content/seo/mingge", `${m.slug}.json`), JSON.stringify(out, null, 2));
      console.log(`✓ ${m.name} (${markdown.length}字)`);
    } catch(e) { console.log(`✗ ${m.name}: ${e.message}`); }
    done++;
  }
}
const q = [...xiong];
await Promise.all(Array.from({length: 3}, () => worker(q)));
console.log(`\nDone: ${done}/${xiong.length}`);
