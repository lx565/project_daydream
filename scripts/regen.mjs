// Regenerate specific palace hubs with proofreader corrections injected.
import fs from "fs";
import path from "path";
import { PALACES } from "../lib/starData.ts";
import { getPalaceHubContent } from "../lib/seoContent.ts";

const fixes = {
  "疾厄宫":
    "务必逐一核对十四主星的五行属性，确保与紫微斗数通行说法一致。特别注意：巨门五行属水（癸水），绝不可写成'属土'；巨门在疾厄宫主口腔、食道、肠胃及是非之疾，是因其为暗曜主口舌阴暗，而非因属土。其余各星五行也需准确。",
  "官禄宫":
    "紫微斗数中不存在'天王'这颗星，全文严禁出现'天王'或任何不存在的星名。破军在官禄宫若论特殊技艺或偏门行业，应是因会照或同宫擎羊、陀罗、火星、铃星等煞曜所致——请改用真实存在的星曜，绝不可臆造星名。通篇只能使用真实存在的紫微斗数星曜。",
};

for (const [name, note] of Object.entries(fixes)) {
  const p = PALACES.find((x) => x.name === name);
  const t = Date.now();
  const { markdown, refs } = await getPalaceHubContent(p, note);
  const f = path.join(process.cwd(), "content", "seo", "palace", `${name}.json`);
  fs.writeFileSync(f, JSON.stringify({ label: name, markdown, refs, chars: markdown.length, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`regenerated ${name}: ${markdown.length} chars in ${Math.round((Date.now() - t) / 1000)}s`);
}
