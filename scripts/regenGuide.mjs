// Regenerate specific guide pages with proofreader corrections injected.
import fs from "fs";
import path from "path";
import { GUIDE_TOPICS } from "../lib/guideTopics.ts";
import { getGuideContent } from "../lib/seoContent.ts";

const fixes = {
  "格局":
    "【严格禁止】全文绝对不可出现'盖世才'这三个字，也不可出现任何'古人说……''典籍称……'后面跟着杜撰称谓的句式。讲'巨日同宫'时，只用平实语言描述其特点（如'太阳的光明化解巨门的是非暗昧，使口舌之才转为犀利的口才与沟通力'），不得加任何引文或格名。其它要求：紫微七杀在巳亥同宫只作描述（如'七杀遇紫微，化暴为权'），不要安非标准格名'将星得权'；紫微天相在辰戌不要套用'君臣不义格'，宜描述其条件（财荫夹印与刑忌夹印之别）。凡无确切出处的格名或'古人云'引语，一律删去改为描述性表述，绝不杜撰。文中出现的所有格名（如君臣庆会、火贪格、马头带箭、机月同梁等）必须是真实存在的。",
};

for (const [slug, note] of Object.entries(fixes)) {
  const topic = GUIDE_TOPICS.find((t) => t.slug === slug);
  if (!topic) { console.log("SKIP (no topic):", slug); continue; }
  const t = Date.now();
  const { markdown, refs } = await getGuideContent(topic, note);
  const f = path.join(process.cwd(), "content", "seo", "guide", `${slug}.json`);
  fs.writeFileSync(f, JSON.stringify({ label: topic.title, markdown, refs, chars: markdown.length, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`regenerated ${slug}: ${markdown.length} chars in ${Math.round((Date.now() - t) / 1000)}s`);
}
