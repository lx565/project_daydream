// One-off targeted regeneration for a specific set of already-successful SEO
// pages (2026-08-25: confirmed via pasted GSC data — all already rank #1-2
// with real clicks) — deepen them rather than build new content, since they
// already prove demand. Bypasses the pregenerated-cache read (passes a
// revisionNote) and overwrites content/seo/{kind}/{key}.json directly.
//
// Usage: npx tsx --env-file=.env.local scripts/deepenTargetedContent.mjs

import fs from "fs";
import path from "path";
import { SIHUA } from "../lib/sihuaData.ts";
import { SIHUA_PALACE } from "../lib/sihuaPalaceData.ts";
import { XIONG } from "../lib/xiongData.ts";
import { MAJOR_STARS, PALACES } from "../lib/starData.ts";
import { ASSISTANT_STARS } from "../lib/assistantStarData.ts";
import { getSihuaContent, getSihuaPalaceContent, getXiongContent, getStarPalaceContent } from "../lib/seoContent.ts";

const REVISION_NOTE = `這篇文章目前偏簡短、偏概論。請大幅加深內容：
1. 每個論點都要具體舉出星曜組合、宮位、四化的實際案例（例如「天同化忌落於命宮者，因擎羊同宮」這類具體命理情境），不可停留在抽象定義。
2. 增加至少一個「與其他星曜/宮位互動時的變化」段落——同一主題在不同命盤配置下會有什麼差異表現。
3. 增加實際生活情境的對應說明（例如這個現象在工作/感情/健康上具體會如何顯現，用真實可辨識的情境描述，不用空泛詞彙）。
4. 篇幅需明顯長於一般水準（目標6-8節，每節150-200字），但每一句都要有實質內容，不可為了加長而重複或空話。`;

async function writeContent(kind, key, label, contentPromise) {
  const outDir = path.join(process.cwd(), "content", "seo", kind);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${key}.json`);

  const before = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf-8")).chars ?? 0 : 0;
  process.stdout.write(`  GEN   ${label} (${kind}/${key}) — was ${before}c … `);

  const t = Date.now();
  try {
    const { markdown, refs } = await contentPromise;
    const elapsed = Math.round((Date.now() - t) / 1000);
    const chars = markdown.length;
    const data = { label, markdown, refs, chars, generatedAt: new Date().toISOString() };
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    const delta = chars - before;
    console.log(`${chars}c in ${elapsed}s (${delta >= 0 ? "+" : ""}${delta}c)`);
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
  }
}

const sihuaEntries = {
  "tiantong-huaji": SIHUA.find((e) => e.urlSlug === "tiantong-huaji"),
  "tiantong-huaquan": SIHUA.find((e) => e.urlSlug === "tiantong-huaquan"),
};
const sihuaPalaceEntries = {
  "hualu-fude-gong": SIHUA_PALACE.find((e) => e.urlSlug === "hualu-fude-gong"),
  "hualu-fuqi-gong": SIHUA_PALACE.find((e) => e.urlSlug === "hualu-fuqi-gong"),
};
const xiongEntry = XIONG.find((e) => e.urlSlug === "minggong-kongwang");
const lucunStar = ASSISTANT_STARS.find((s) => s.name === "祿存");
const tianzhaiPalace = PALACES.find((p) => p.name === "田宅宮");

console.log("\n✦ Deepening 7 already-successful pages (2026-08-25)\n");

for (const [slug, entry] of Object.entries(sihuaEntries)) {
  if (!entry) { console.log(`  SKIP  sihua/${slug} — entry not found in lib/sihuaData.ts`); continue; }
  await writeContent("sihua", slug, entry.title, getSihuaContent(entry, REVISION_NOTE));
}

for (const [slug, entry] of Object.entries(sihuaPalaceEntries)) {
  if (!entry) { console.log(`  SKIP  sihua-palace/${slug} — entry not found in lib/sihuaPalaceData.ts`); continue; }
  await writeContent("sihua-palace", slug, entry.title, getSihuaPalaceContent(entry, REVISION_NOTE));
}

if (!xiongEntry) {
  console.log("  SKIP  xiong/minggong-kongwang — entry not found in lib/xiongData.ts");
} else {
  await writeContent("xiong", "minggong-kongwang", xiongEntry.title, getXiongContent(xiongEntry, REVISION_NOTE));
}

if (!lucunStar || !tianzhaiPalace) {
  console.log(`  SKIP  star/祿存__田宅宮 — star or palace def not found (star=${!!lucunStar}, palace=${!!tianzhaiPalace})`);
} else {
  const key = `${lucunStar.name}__${tianzhaiPalace.name}`;
  await writeContent("star", key, `${lucunStar.name}在${tianzhaiPalace.name}`, getStarPalaceContent(lucunStar, tianzhaiPalace, REVISION_NOTE));
}

console.log("\n✦ Done.\n");
