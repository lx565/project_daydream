# 婚姻宫位 (Hunyin) SEO Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 婚姻宫位 SEO cluster at /hunyin — 14 articles covering each main 紫微斗数 star in the 夫妻宫 (marriage palace), with hub page, article page template, generation script, and generated JSON content.

**Architecture:** Follows the qinggan/liunian cluster pattern exactly: a `lib/hunyinData.ts` data file (flat list, no `kind`), hub and article Next.js pages under `app/hunyin/`, a generation script at `scripts/genHunyin.mjs`, and pre-generated content stored as JSON in `content/seo/hunyin/`. The `seoContent.ts` `getHunyinContent()` function and sitemap/LibraryNav hooks are already wired — only the data file, pages, and generation script need to be created.

**Tech Stack:** Next.js 15 (App Router, `force-static`/`revalidate`), TypeScript, DeepSeek Reasoner (via `synthesize()`), existing `lib/rag.ts`, `lib/seoContent.ts`, `components/LibraryNav.tsx`, `components/ToolCTA.tsx`, `components/VoteWidget.tsx`, `components/SeoMarkdown.tsx`, `components/JsonLd.tsx`.

## Global Constraints

- Never put ASCII `"` inside a double-quoted TypeScript string — use `「」` for Chinese quotation marks
- Rose/pink color theme throughout: `rose-600`/`rose-700` for headers, `rose-500`/`rose-400` for accents (matches existing qinggan rose theme)
- No `kind` grouping — flat list of 14 articles on the hub (unlike liunian which has kind-groups)
- Article hero shows `entry.subtitle` as the kicker line (not a kind label)
- All URLs are lowercase pinyin: `/hunyin/{urlSlug}`
- Never auto-commit; never push without explicit instruction
- Content generation uses `npx tsx --env-file=.env.local` (requires `.env.local` with `DEEPSEEK_API_KEY` or `SEO_AI_MODEL` override)
- `lib/seoContent.ts` already imports `HunyinEntry` from `./hunyinData` — the interface name must be `HunyinEntry` exactly; the export must be `HUNYIN`
- `app/sitemap.ts` already imports `HUNYIN` from `@/lib/hunyinData` — the array must be named `HUNYIN`
- `components/LibraryNav.tsx` already has `category="hunyin"` wired with `count: 14`

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `lib/hunyinData.ts` | **CREATE** | `HunyinEntry` interface, `HUNYIN` array (14 entries), `getHunyin()` lookup |
| `app/hunyin/page.tsx` | **CREATE** | Hub page — flat list of 14 articles + FAQ + CTAs |
| `app/hunyin/[slug]/page.tsx` | **CREATE** | Article page — metadata, JSON-LD, content render, related links |
| `scripts/genHunyin.mjs` | **CREATE** | CLI generation script for `content/seo/hunyin/` |
| `content/seo/hunyin/{slug}.json` | **GENERATE** | Pre-generated article content (14 files, one per star) |

Files already in place (DO NOT touch):
- `lib/seoContent.ts` — `getHunyinContent()` already written
- `components/LibraryNav.tsx` — "hunyin" tab already registered
- `app/sitemap.ts` — `HUNYIN` import + `hunyinPages` already wired

---

## Task 1: Create `lib/hunyinData.ts`

**Files:**
- Create: `lib/hunyinData.ts`

**Interfaces:**
- Produces: `HunyinEntry` (consumed by `lib/seoContent.ts` line 23 which already imports it), `HUNYIN` array (consumed by `app/sitemap.ts` line 14), `getHunyin()` (consumed by Task 2 and Task 3)

- [ ] **Step 1: Create the file**

Create `/Users/nikipro/Desktop/Projects/fortune-app/lib/hunyinData.ts` with the following complete content:

```typescript
import type { RagQuery } from "@/lib/rag";

export interface HunyinEntry {
  name: string;
  urlSlug: string;
  title: string;
  subtitle: string;
  oneLine: string;
  intro: string;
  grounding: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];
}

export const HUNYIN: HunyinEntry[] = [
  {
    name: "紫微",
    urlSlug: "ziwei",
    title: "紫微在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 紫微",
    oneLine: "紫微坐夫妻宫，配偶往往气场强、有主见，婚姻里你更像追随者。",
    intro: "紫微是紫微斗数的帝王星，阴土、北斗主星，代表权威、尊贵与领导力。坐入夫妻宫时，意味着你的配偶往往有帝王风范——独立、强势、有主导意识。这不是控制，而是一种天然的气场吸引。婚姻能量底色是「强配偶型」，感情稳定，但伴侣需要被尊重和空间。",
    grounding: "紫微星：阴土，北斗主星，化气为「尊」。主官禄、权威、领导；性格高傲自持、有领袖气质。紫微入夫妻宫（传统断语）：配偶聪慧能干、有领导力，在社会上有地位或声望；对方自尊心强，婚姻中需给予尊重。感情特质：婚姻稳定但节奏较慢，不喜欢被催婚；配偶个性独立，夫妻之间需要彼此空间。化忌时：配偶或过于强势、难相处，或情感表达冷漠，需注意婚姻中的权力失衡问题。",
    ragQuery: { text: "紫微 夫妻宫 配偶 婚姻 感情 帝王星 强势 领导力 权威 婚姻稳定", topic: "感情" },
    related: ["tianfu", "tianliang", "tianxiang"],
  },
  {
    name: "天机",
    urlSlug: "tianji",
    title: "天机在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 天机",
    oneLine: "天机坐夫妻宫，配偶聪慧灵动，但感情易变、婚姻需要耐心稳固。",
    intro: "天机是木性的智慧星，代表机变、才思与流动性。坐入夫妻宫时，配偶往往思维敏锐、善于学习，充满新鲜感——但也因此感情底色偏不稳定，容易因「想太多」或外部环境变化而对婚姻产生动摇。婚姻要长久，双方都需要在智识层面共同成长。",
    grounding: "天机星：阴木，南斗第三星，化气为「善」。主智慧、机变、兄弟；性格灵活多变、富有好奇心。天机入夫妻宫：配偶聪明伶俐、机智善变；感情活泼，初期新鲜感强。古断语：天机夫妻宫主「变动」，婚姻有换偶或晚婚的可能，感情关系易有起伏。化禄时：配偶智慧出众，婚姻因共同兴趣而稳固；化忌时：配偶优柔寡断或心思飘忽，婚姻容易出现言语摩擦。",
    ragQuery: { text: "天机 夫妻宫 配偶 婚姻 感情 智慧 变动 灵动 机变 晚婚", topic: "感情" },
    related: ["taiyin", "tiantong", "tianxiang"],
  },
  {
    name: "太阳",
    urlSlug: "taiyang",
    title: "太阳在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 太阳",
    oneLine: "太阳坐夫妻宫，配偶阳光热情、社交广，婚姻是你生命中发光的力量。",
    intro: "太阳是阳火的光明星，代表热情、外向与贵人缘。坐入夫妻宫时，配偶往往个性开朗、广结善缘，在社会上有一定影响力或光彩。对女命来说，太阳入夫妻宫往往意味着配偶事业有成或社会地位较高；对男命则代表感情中积极付出、主动追求。婚姻整体阳光有活力，但需注意配偶因社交广泛带来的感情摩擦。",
    grounding: "太阳星：阳火，化气为「贵」。主官禄、贵人、父亲；性格热情、外向、有公益心。太阳入夫妻宫：古断语「太阳夫妻宫，男命配偶贤淑、女命夫婿有地位」。太阳庙旺（卯宫/寅宫）：配偶光明磊落、婚姻阳光幸福；落陷（酉宫）：配偶缺乏自信或婚姻有缘分课题，感情费心。化禄时：姻缘顺遂、配偶事业顺；化忌时：配偶健康或事业有波折，夫妻关系需要相互支持。",
    ragQuery: { text: "太阳 夫妻宫 配偶 婚姻 感情 阳光 贵人 光明 热情 外向 庙旺落陷", topic: "感情" },
    related: ["taiyin", "wuqu", "tianxiang"],
  },
  {
    name: "武曲",
    urlSlug: "wuqu",
    title: "武曲在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 武曲",
    oneLine: "武曲坐夫妻宫，配偶务实能干，婚姻踏实但浪漫感稍欠，刚克易伤情。",
    intro: "武曲是阴金的财星，代表务实、执行力与金属的刚硬之气。坐入夫妻宫时，配偶往往独立自主、行动力强、注重实际，对感情不擅长「说情话」但会用行动表达。武曲化气为「刚」，是六煞性最强的主星之一，夫妻宫见武曲在传统命理中有「克夫/克妻」或「晚婚」的说法，现代理解为感情课题较重、需要双方格外用心经营。",
    grounding: "武曲星：阴金，北斗第六星，化气为「财」，兼化气为「刚」。主财帛、执行、军事；性格刚毅果断、不苟言笑。武曲入夫妻宫：古断语「武曲守夫妻，克夫克妻之象」，晚婚者婚姻反而稳固。现代解读：配偶独立务实，情感表达直接甚至生硬，浪漫指数低但忠诚度高。化禄时：财运进入婚姻，配偶经济能力强，婚姻生活稳定；化忌时：婚姻摩擦增加，感情易有冷漠或冲突，需要主动沟通。",
    ragQuery: { text: "武曲 夫妻宫 配偶 婚姻 感情 刚克 克夫 晚婚 务实 财星 金", topic: "感情" },
    related: ["qisha", "pojun", "tanlang"],
  },
  {
    name: "天同",
    urlSlug: "tiantong",
    title: "天同在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 天同",
    oneLine: "天同坐夫妻宫，配偶温柔体贴，婚姻如清泉般舒适，是少有的和谐格局。",
    intro: "天同是阳水的福德星，代表享受、安逸与温柔。坐入夫妻宫时，是婚姻宫位中最温和的星曜之一——配偶往往个性温柔、懂得照顾人、不爱争吵，婚姻生活有舒适的日常幸福感。天同化气为「福」，在夫妻宫中带来的是平静而滋养的感情底色，但也要注意双方容易因太舒适而缺乏成长动力。",
    grounding: "天同星：阳水，南斗第四星，化气为「福」。主福德、享受、儿童；性格温和、乐观、享乐主义。天同入夫妻宫：古断语「天同夫妻，婚姻和谐、配偶温柔善良」。配偶特质：性格温和体贴，感情细腻，喜欢营造家的氛围，不善主动冲突。感情模式：婚姻以和谐舒适为主，缺乏刺激但稳定踏实。化忌时：配偶过于依赖或婚姻趋于平淡，需要双方主动创造新鲜感。",
    ragQuery: { text: "天同 夫妻宫 配偶 婚姻 感情 温柔 福德 和谐 舒适 体贴 安逸", topic: "感情" },
    related: ["tianji", "tianxiang", "taiyin"],
  },
  {
    name: "廉贞",
    urlSlug: "lianzheng",
    title: "廉贞在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 廉贞",
    oneLine: "廉贞坐夫妻宫，感情浓烈有磁力，但「桃花劫」与婚姻波折是需要直视的课题。",
    intro: "廉贞是阴火的囚星，同时也是桃花星，代表强烈的情欲、热情与戏剧性的感情能量。坐入夫妻宫时，婚姻往往激情澎湃——配偶极具吸引力，感情有深度，但也因廉贞化气为「囚」而带来感情课题：占有欲、感情纠纷或外遇风险。这是一个「要么深爱、要么深伤」的婚姻格局。",
    grounding: "廉贞星：阴火，北斗第五星，化气为「囚」，兼桃花性。主刑厄、感情、法律；性格多情、有原则但情绪化。廉贞入夫妻宫：古断语「廉贞夫妻，感情激烈，有桃花劫，婚姻多变」。配偶特质：魅力强、情感丰富、占有欲较重。婚姻模式：情感浓烈、吸引力强，但容易有感情摩擦或第三者介入。化禄时：感情顺遂、桃花吉化，配偶充满魅力且关系稳定；化忌时：感情问题最为突出，有外遇、感情伤害或法律纠纷风险。",
    ragQuery: { text: "廉贞 夫妻宫 配偶 婚姻 感情 桃花 占有欲 激情 波折 囚 感情纠纷", topic: "感情" },
    related: ["tanlang", "qisha", "pojun"],
  },
  {
    name: "天府",
    urlSlug: "tianfu",
    title: "天府在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 天府",
    oneLine: "天府坐夫妻宫，配偶稳重可靠，婚姻有厚度，是紫微斗数中最稳固的婚姻格局之一。",
    intro: "天府是阳土的南斗主星，化气为「令」，代表稳固、储藏与包容。坐入夫妻宫时，是婚姻宫位中最吉利的星曜之一——配偶往往成熟稳重、有责任感、懂得持家，婚姻生活踏实有安全感。天府无四化，稳定性最高，夫妻感情以平稳长久为主，是命盘中罕见的「好命婚姻」格局。",
    grounding: "天府星：阳土，南斗主星，化气为「令」。主财库、官禄、包容；性格稳重、保守、有领袖气。天府入夫妻宫：古断语「天府守夫妻，配偶稳重有实力，婚姻吉昌」。配偶特质：成熟可靠、物质条件好、持家有道，情感表达内敛但忠诚。天府无四化，是最稳定的主星之一，夫妻宫见天府几乎是婚姻最稳固的信号，除非有重煞加会才有变动。",
    ragQuery: { text: "天府 夫妻宫 配偶 婚姻 感情 稳固 责任 成熟 南斗主星 包容 安全感", topic: "感情" },
    related: ["ziwei", "tianxiang", "taiyin"],
  },
  {
    name: "太阴",
    urlSlug: "taiyin",
    title: "太阴在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 太阴",
    oneLine: "太阴坐夫妻宫，配偶温柔细腻如月，婚姻带有诗意与深情。",
    intro: "太阴是阴水的月亮星，化气为「富」，代表细腻、情感、阴柔之美与家庭。坐入夫妻宫时，配偶往往温柔内敛、感情丰富、富有美感，无论男女都带有细腻的情感特质。对男命来说，太阴入夫妻宫是「美妻」之象；对女命则代表感情专一、配偶内心丰富。太阴庙旺时婚姻幸福，落陷时感情多曲折、配偶情绪化。",
    grounding: "太阴星：阴水，南斗第二星，化气为「富」。主田宅、女性、母亲；性格内敛、温柔、情感细腻。太阴入夫妻宫：古断语「太阴夫妻，男命妻美贤淑，女命夫君内敛多情」。庙旺（子宫）：配偶美丽或气质出众，婚姻幸福安稳；落陷（午宫）：配偶情绪化，婚姻有起伏，感情曲折。化禄时：感情顺遂、物质生活丰裕；化忌时：配偶情绪不稳或婚姻有暗流，夫妻间需要更多耐心沟通。",
    ragQuery: { text: "太阴 夫妻宫 配偶 婚姻 感情 温柔 细腻 月亮 美妻 庙旺 落陷 情感", topic: "感情" },
    related: ["tianji", "tianfu", "tiantong"],
  },
  {
    name: "贪狼",
    urlSlug: "tanlang",
    title: "贪狼在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 贪狼",
    oneLine: "贪狼坐夫妻宫，感情磁场极强，配偶魅力四射，但桃花多变是婚姻最大的考验。",
    intro: "贪狼是阳木的欲望星，也是桃花星之首，化气为「桃花」，代表欲望、魅力、多才与人际关系。坐入夫妻宫时，婚姻带有强烈的吸引力底色——配偶极具个人魅力，感情丰富，但贪狼多欲的特性使得婚姻容易面临桃花问题：无论是自身还是配偶，感情的忠贞度都需要特别用心维护。",
    grounding: "贪狼星：阳木，北斗第一星，化气为「桃花」（兼欲望）。主欲望、才艺、人际；性格多才多艺、充满魅力、欲望旺盛。贪狼入夫妻宫：古断语「贪狼夫妻，桃花旺盛，感情多变，婚姻有波折」。配偶特质：魅力突出、社交能力强、有艺术天分，但情感上需求较多。化禄时：桃花化吉，感情顺遂、配偶魅力变为吸引力而非困扰；化忌时：桃花化祸，感情问题最重，有外遇或感情纠纷风险。",
    ragQuery: { text: "贪狼 夫妻宫 配偶 婚姻 感情 桃花 魅力 欲望 多变 外遇 感情纠纷", topic: "感情" },
    related: ["lianzheng", "pojun", "qisha"],
  },
  {
    name: "巨门",
    urlSlug: "jumen",
    title: "巨门在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 巨门",
    oneLine: "巨门坐夫妻宫，婚姻里口舌是非多，爱而伤、伤而爱，是最需要沟通智慧的格局。",
    intro: "巨门是阴水的暗星，化气为「暗」，代表口才、是非、隐藏与暗流。坐入夫妻宫时，婚姻底色带有「口舌」特质——夫妻之间容易有言语误解、争吵或是非，甚至因说话方式不当而伤情。但巨门也代表深度思考与真诚表达，善用沟通的夫妻反而能借此磨合出更深的理解。",
    grounding: "巨门星：阴水，北斗第二星，化气为「暗」。主口才、是非、暗流；性格多疑、善辩、内心丰富但表达有时不当。巨门入夫妻宫：古断语「巨门夫妻，口舌多，感情有暗流，婚姻多争吵」。配偶特质：口才好、思维缜密、内心深邃；但有时说话过于直白或挑剔，容易引发误解。化禄时：口才转为善于沟通，婚姻因坦诚而加深感情；化忌时：口舌是非最重，夫妻争吵频繁，需避免言语伤人。",
    ragQuery: { text: "巨门 夫妻宫 配偶 婚姻 感情 口舌 是非 争吵 暗 沟通 言语", topic: "感情" },
    related: ["tianji", "tianxiang", "tianliang"],
  },
  {
    name: "天相",
    urlSlug: "tianxiang",
    title: "天相在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 天相",
    oneLine: "天相坐夫妻宫，配偶可靠温厚，婚姻有贵人相助，是感情里的「印」格。",
    intro: "天相是阳水的印星，代表规矩、服务、忠诚与贵人庇护。坐入夫妻宫时，配偶往往品格端正、踏实可靠，对婚姻有承诺感，不轻易变心。天相化气为「印」，意味着婚姻有正统的能量，夫妻之间讲原则、重承诺——这是天相最核心的婚姻特质。整体来说，天相入夫妻宫是较为吉祥的配置。",
    grounding: "天相星：阳水，南斗第五星，化气为「印」。主印绶、服务、官禄辅佐；性格守规矩、忠厚、有服务心。天相入夫妻宫：古断语「天相守夫妻，配偶忠诚可靠、婚姻有规矩」。配偶特质：品格端正、处事稳重、对家庭责任感强；感情真诚踏实，不花心。婚姻稳定度高，但天相喜逢廉贞（正曜组合「廉相」），若廉贞化忌时整体婚姻格局有起伏。",
    ragQuery: { text: "天相 夫妻宫 配偶 婚姻 感情 印 忠诚 可靠 规矩 服务 踏实 贵人", topic: "感情" },
    related: ["ziwei", "tianfu", "tiantong"],
  },
  {
    name: "天梁",
    urlSlug: "tianliang",
    title: "天梁在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 天梁",
    oneLine: "天梁坐夫妻宫，配偶像一棵大树，遮风挡雨，但婚姻有年龄差或「护弱」特质。",
    intro: "天梁是阳土的荫星，化气为「荫」，代表荫庇、医疗、长辈与解厄。坐入夫妻宫时，配偶往往有一种「照顾人」的天性——成熟、有经验、像导师或长者，给婚姻带来稳定的庇护感。天梁入夫妻宫在传统命理中与「年龄差婚姻」或「老少配」有关，现代理解为配偶心智成熟或在婚姻中承担更多保护者角色。",
    grounding: "天梁星：阳土，南斗第三星，化气为「荫」。主老人、医疗、荫庇、解厄；性格老成持重、有长者风范。天梁入夫妻宫：古断语「天梁夫妻，多有年龄差，配偶老成，婚姻得庇护」。配偶特质：成熟稳健、有担当、喜欢照顾人；感情表达方式偏「教导型」，需要注意不要让对方感觉被管教。化禄时：配偶有贵人庇护力量，婚姻遇困有贵人相助；化忌时：配偶有健康隐患或婚姻中的保护感变为负担。",
    ragQuery: { text: "天梁 夫妻宫 配偶 婚姻 感情 荫 年龄差 成熟 庇护 老少配 长者", topic: "感情" },
    related: ["ziwei", "tianxiang", "tianfu"],
  },
  {
    name: "七杀",
    urlSlug: "qisha",
    title: "七杀在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 七杀",
    oneLine: "七杀坐夫妻宫，配偶个性独立强势，婚姻有摩擦但也有激烈的相互吸引。",
    intro: "七杀是阴金的杀星，代表独立、果断、冲突与破格。坐入夫妻宫时，配偶往往个性强烈、独立自主、有强烈的自我意识，感情里很难被「约束」。婚姻底色偏激烈——有激情的吸引，也有强烈的摩擦。七杀入夫妻宫在传统命理中有晚婚或婚姻多变的提示，现代理解为感情课题偏重，需要双方成熟后才能走入稳定的婚姻。",
    grounding: "七杀星：阴金，南斗第六星，化气为「将」。主独立、武力、破格；性格刚烈、果断、孤高。七杀入夫妻宫：古断语「七杀守夫妻，克夫克妻，婚姻多挫折，晚婚为宜」。现代解读：配偶独立强势、不依赖人，婚姻里需要彼此空间；感情磁场强烈但也易冲突。七杀与武曲同为刚性较强的星曜，入夫妻宫感情课题重，需有成熟的沟通能力。化忌时：婚姻摩擦最大，有分合可能，需谨慎处理感情危机。",
    ragQuery: { text: "七杀 夫妻宫 配偶 婚姻 感情 晚婚 克夫 独立 强势 摩擦 刚烈 武力", topic: "感情" },
    related: ["wuqu", "pojun", "lianzheng"],
  },
  {
    name: "破军",
    urlSlug: "pojun",
    title: "破军在夫妻宫是什么意思？配偶特质与婚姻深度解析",
    subtitle: "紫微斗数 · 夫妻宫 · 破军",
    oneLine: "破军坐夫妻宫，婚姻是一场破旧立新的旅程，感情有深度，但稳定性是最大考验。",
    intro: "破军是阳水的破坏星，化气为「耗」，代表破坏、更新与彻底的改变力。坐入夫妻宫时，婚姻往往充满变动——感情深度很深，但也很难走平稳的路。破军的「破」字点明了这个格局的核心课题：婚姻里需要经历「打破旧格局、建立新平衡」的过程，可能意味着多段感情经历、再婚，或者婚姻里反复的蜕变与重建。",
    grounding: "破军星：阳水，北斗第七星，化气为「耗」。主破坏、更新、领军冲锋；性格叛逆、追求自由、不喜守旧。破军入夫妻宫：古断语「破军夫妻，婚姻多变，有离婚或再婚之象，配偶个性豪放不羁」。配偶特质：个性自由、创新、不喜受约束；感情方面深情但难以「定型」。化禄时：破中有立，婚姻经历波折后反而走向稳固；化忌时：婚姻破坏力最强，有分离、离婚或感情重大变动的可能。",
    ragQuery: { text: "破军 夫妻宫 配偶 婚姻 感情 破坏 更新 离婚 再婚 变动 自由 不稳定", topic: "感情" },
    related: ["qisha", "tanlang", "wuqu"],
  },
];

export function getHunyin(urlSlug: string): HunyinEntry | undefined {
  return HUNYIN.find(e => e.urlSlug === urlSlug);
}
```

- [ ] **Step 2: Verify the file was created**

Run:
```bash
wc -l /Users/nikipro/Desktop/Projects/fortune-app/lib/hunyinData.ts
```
Expected: output showing ~200+ lines.

- [ ] **Step 3: Quick sanity check for quote errors**

Run:
```bash
grep -n '"[^"]*"[^"]*"' /Users/nikipro/Desktop/Projects/fortune-app/lib/hunyinData.ts | head -5
```
Expected: no output (no double-quoted strings containing unescaped double quotes).

---

## Task 2: Create `app/hunyin/page.tsx` (hub page)

**Files:**
- Create: `app/hunyin/page.tsx`

**Interfaces:**
- Consumes: `HUNYIN` from `@/lib/hunyinData` (Task 1), `breadcrumbSchema`, `faqSchema` from `@/lib/jsonld`, `LibraryNav` with `category="hunyin"`, `ToolCTA` with rose theme
- Produces: `/hunyin` route — flat list of all 14 articles, 4-item FAQ, 2 CTAs

- [ ] **Step 1: Create `app/hunyin/` directory and `page.tsx`**

Create `/Users/nikipro/Desktop/Projects/fortune-app/app/hunyin/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { HUNYIN } from "@/lib/hunyinData";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import LibraryNav from "@/components/LibraryNav";
import ToolCTA from "@/components/ToolCTA";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "夫妻宫星曜详解 · 婚姻与配偶命理 — 命里",
  description:
    "紫微在夫妻宫、廉贞在夫妻宫、七杀在夫妻宫……14颗主星坐夫妻宫的完整婚姻解析。了解配偶特质、感情模式与婚姻运势走向。",
  openGraph: {
    title: "夫妻宫星曜详解 · 婚姻与配偶命理 — 命里",
    description: "14颗主星 × 夫妻宫，配偶特质 · 感情模式 · 婚姻稳定度完整解析。",
    url: "https://www.mingli.study/hunyin",
    siteName: "命里",
    locale: "zh_CN",
  },
  alternates: { canonical: "https://www.mingli.study/hunyin" },
};

const FAQ = [
  {
    question: "夫妻宫的星曜能决定我的婚姻好不好吗？",
    answer:
      "夫妻宫主星是婚姻能量的底色，但不是唯一决定因素。夫妻宫的四化（化禄/权/科/忌）、大运流年对夫妻宫的影响，以及命宫与夫妻宫的三方四正关系，共同决定婚姻运势。主星只是起点——就像你选了一个方向，四化和大运决定这条路是顺还是崎岖。",
  },
  {
    question: "夫妻宫没有主星（空宫）怎么办？",
    answer:
      "夫妻宫空宫不代表无缘婚姻或婚姻差，而是需要借对宫（官禄宫）的主星来看配偶特质。空宫夫妻宫的人，感情方向往往更灵活、不固化，反而容易遇到各类型的伴侣——关键看流年大运何时触动夫妻宫。",
  },
  {
    question: "夫妻宫有煞星（擎羊/火星等）一定婚姻不好吗？",
    answer:
      "不一定。煞星入夫妻宫代表婚姻能量偏强烈、有摩擦感，但不等于婚姻失败。很多婚姻稳定、感情深厚的命盘里都有煞星——关键是两人如何面对摩擦。有时煞星反而带来强烈的相互吸引力和彼此成长的动力。",
  },
  {
    question: "怎么判断自己几岁容易结婚？",
    answer:
      "紫微斗数判断婚期主要看：1) 大运行到夫妻宫相关运程的时间；2) 流年红鸾天喜入夫妻宫或命宫的年份；3) 流年四化化禄入夫妻宫的年份。这三个信号如果叠加出现，往往是最容易走入婚姻的时期。命里 AI 会在读盘时自动标注婚期可能的时间窗口。",
  },
];

export default function HunyinHubPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命里", path: "/" },
          { name: "知识库", path: "/library" },
          { name: "夫妻宫星曜", path: "/hunyin" },
        ]),
        faqSchema(FAQ),
      ]} />
      <LibraryNav category="hunyin" />

      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-8">
        {/* Header */}
        <div className="text-center pt-8 pb-2 space-y-2">
          <p className="text-xs text-ink-4 tracking-[0.25em] uppercase">命里 · 紫微斗数</p>
          <h1
            className="text-3xl font-bold text-rose-700"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.12em" }}
          >
            夫妻宫星曜详解
          </h1>
          <p className="text-sm text-ink-3 max-w-md mx-auto leading-relaxed pt-1">
            夫妻宫决定了你与伴侣的缘分底色——这颗星坐在你的夫妻宫，就是你婚姻能量的核心来源。
          </p>
        </div>

        <ToolCTA variant="slim" label="排你的命盘 · AI 解析你的夫妻宫格局与婚姻运势 →" />

        {/* Flat article list */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-rose-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-rose-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              14 颗主星 · 夫妻宫完整解析
            </h2>
            <span className="ml-auto text-[11px] text-ink-4">{HUNYIN.length} 篇</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {HUNYIN.map(e => (
              <Link
                key={e.urlSlug}
                href={`/hunyin/${e.urlSlug}`}
                className="paper-card paper-card-hover rounded-xl border border-border-warm p-4 block space-y-1"
              >
                <p className="text-sm font-bold text-ink">{e.name}在夫妻宫</p>
                <p className="text-[11px] text-ink-4 leading-relaxed">{e.oneLine}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
            <div className="w-1.5 h-5 bg-rose-500 rounded-full self-center" />
            <h2 className="text-lg font-bold text-rose-700 tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              常见问题
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ.map(item => (
              <details
                key={item.question}
                className="paper-card rounded-xl border border-border-warm px-4 py-3 group"
              >
                <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>{item.question}</span>
                  <span className="text-ink-4 text-xs transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="text-xs text-ink-3 leading-relaxed pt-2.5">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <ToolCTA variant="card" label="解析我的婚姻运势" sub="AI 依据逾百部典籍，结合你的夫妻宫主星与四化，分析你的配偶特质、婚姻时机与感情模式。" />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the file was created**

Run:
```bash
wc -l /Users/nikipro/Desktop/Projects/fortune-app/app/hunyin/page.tsx
```
Expected: output showing ~110+ lines.

---

## Task 3: Create `app/hunyin/[slug]/page.tsx` (article page)

**Files:**
- Create: `app/hunyin/[slug]/page.tsx`

**Interfaces:**
- Consumes: `HUNYIN`, `getHunyin` from Task 1; `getHunyinContent` from `@/lib/seoContent` (already written); `articleSchema`, `breadcrumbSchema` from `@/lib/jsonld`
- Produces: `/hunyin/{slug}` routes — metadata, JSON-LD, full article render, related links

- [ ] **Step 1: Create `app/hunyin/[slug]/` directory and `page.tsx`**

Create `/Users/nikipro/Desktop/Projects/fortune-app/app/hunyin/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { HUNYIN, getHunyin } from "@/lib/hunyinData";
import { getHunyinContent } from "@/lib/seoContent";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/jsonld";
import SeoMarkdown from "@/components/SeoMarkdown";
import VoteWidget from "@/components/VoteWidget";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return HUNYIN.map(e => ({ slug: e.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getHunyin(urlSlug);
  if (!entry) return {};

  const title = `${entry.title} — 命里`;
  const description = entry.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/hunyin/${entry.urlSlug}`,
      siteName: "命里",
      locale: "zh_CN",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/hunyin/${entry.urlSlug}`,
    },
  };
}

export default async function HunyinArticlePage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getHunyin(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getHunyinContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(slug => getHunyin(slug))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const pagePath = `/hunyin/${entry.urlSlug}`;

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命里", path: "/" },
          { name: "知识库", path: "/library" },
          { name: "夫妻宫星曜", path: "/hunyin" },
          { name: `${entry.name}在夫妻宫`, path: pagePath },
        ]),
        articleSchema({
          headline: entry.title,
          description: entry.subtitle,
          path: pagePath,
          section: "婚姻宫位",
        }),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="hunyin" currentTitle={`${entry.name}在夫妻宫`} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-rose-600 tracking-widest font-medium">
              {entry.subtitle}
            </p>
            <h1
              className="text-3xl font-bold text-rose-700 leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.08em" }}
            >
              {entry.name}在夫妻宫
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.oneLine}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-rose-300/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400/50" />
              <div className="h-px w-16 bg-rose-300/40" />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          <ToolCTA variant="slim" label="排你的命盘 · AI 解析你的夫妻宫与婚姻运势 →" />

          {/* Article content */}
          {hasContent && (
            <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-4">
              <SeoMarkdown>{markdown}</SeoMarkdown>
            </div>
          )}

          {/* Refs */}
          {refs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-ink-4 font-medium">参考典籍</p>
              <div className="flex flex-wrap gap-2">
                {refs.map((ref, i) => (
                  <span
                    key={i}
                    className="text-[11px] text-ink-4 bg-paper-2 border border-border-light px-2 py-0.5 rounded"
                  >
                    {ref.school} · {ref.book}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-ink-4/80 leading-relaxed">
                本文由命里 AI 综合典籍整理，仅供学习参考。
              </p>
            </div>
          )}

          <VoteWidget />

          <ToolCTA variant="card" label="解析我的婚姻运势" sub="AI 依据逾百部典籍，结合你的命盘格局分析你的夫妻宫主星特质与婚姻走向。" />

          {/* Related articles */}
          {relatedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相关话题</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(e => (
                  <Link
                    key={e.urlSlug}
                    href={`/hunyin/${e.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-rose-300 hover:text-rose-700 transition-colors"
                  >
                    <p className="font-medium">{e.name}在夫妻宫</p>
                    <p className="text-[11px] text-ink-4 mt-0.5">{e.oneLine}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="紫微斗数 AI · 依据逾百部典籍为你详批婚姻运势 →" />

        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify directory structure**

Run:
```bash
ls /Users/nikipro/Desktop/Projects/fortune-app/app/hunyin/
```
Expected: `[slug]  page.tsx`

---

## Task 4: Create `scripts/genHunyin.mjs`

**Files:**
- Create: `scripts/genHunyin.mjs`

**Interfaces:**
- Consumes: `HUNYIN` from `../lib/hunyinData.ts`; `getHunyinContent` from `../lib/seoContent.ts`
- Produces: CLI script that writes `content/seo/hunyin/{slug}.json` for each entry

- [ ] **Step 1: Create the script**

Create `/Users/nikipro/Desktop/Projects/fortune-app/scripts/genHunyin.mjs`:

```javascript
// Generate 婚姻宫位 articles for content/seo/hunyin/
// Usage:
//   npx tsx --env-file=.env.local scripts/genHunyin.mjs
//   npx tsx --env-file=.env.local scripts/genHunyin.mjs --slug ziwei
//   npx tsx --env-file=.env.local scripts/genHunyin.mjs --force

import fs from "fs";
import path from "path";
import { HUNYIN } from "../lib/hunyinData.ts";
import { getHunyinContent } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const outDir = path.join(process.cwd(), "content", "seo", "hunyin");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let entries = [...HUNYIN];
if (slugFilter) entries = entries.filter(e => e.urlSlug === slugFilter);

if (entries.length === 0) {
  console.error(`No entries found matching filters (slug="${slugFilter}")`);
  process.exit(1);
}

console.log(`\n⚡ 婚姻宫位 — generating ${entries.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

let generated = 0, skipped = 0, failed = 0;
const tooShort = [];

for (const entry of entries) {
  const outFile = path.join(outDir, `${entry.urlSlug}.json`);

  if (!force && fs.existsSync(outFile)) {
    const existing = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    console.log(`  SKIP  ${entry.urlSlug} (${existing.chars ?? "?"}c already exists)`);
    skipped++;
    continue;
  }
  if (dryRun) { console.log(`  DRY   ${entry.urlSlug}`); continue; }

  const t = Date.now();
  process.stdout.write(`  GEN   ${entry.name}在夫妻宫 (${entry.urlSlug}) … `);

  try {
    const { markdown, refs } = await getHunyinContent(entry, undefined);
    const elapsed = Math.round((Date.now() - t) / 1000);
    const chars = markdown.length;

    const data = {
      label: entry.title,
      markdown,
      refs,
      chars,
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));

    const flag = chars < 800 ? " ⚠ SHORT" : "";
    console.log(`${chars}c in ${elapsed}s${flag}`);
    if (chars < 800) tooShort.push(entry.urlSlug);
    generated++;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    failed++;
  }
}

console.log(`\n⚡ Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);
if (tooShort.length) console.log(`⚠ Short articles (< 800c): ${tooShort.join(", ")}`);
```

- [ ] **Step 2: Verify the script was created**

Run:
```bash
wc -l /Users/nikipro/Desktop/Projects/fortune-app/scripts/genHunyin.mjs
```
Expected: ~60+ lines.

---

## Task 5: TypeScript check

**Files:**
- No files created; verifying all Tasks 1–4 compile correctly.

**Interfaces:**
- Verifies: `HunyinEntry` interface matches what `lib/seoContent.ts` line 23 imports (`type HunyinEntry`) and what `getHunyinContent` parameter type expects.

- [ ] **Step 1: Run TypeScript check**

Run (from the project root):
```bash
cd /Users/nikipro/Desktop/Projects/fortune-app && npx tsc --noEmit 2>&1 | head -50
```
Expected: no output (clean) or only pre-existing warnings (none involving `hunyinData.ts`, `app/hunyin/`, or `seoContent.ts` hunyin section).

- [ ] **Step 2: Fix any errors**

If the TypeScript check outputs errors related to hunyin files:

Common issues and fixes:
- **`HunyinEntry` property mismatch**: Check `lib/seoContent.ts` line 989+ to confirm which properties `getHunyinContent(entry)` uses (`entry.ragQuery`, `entry.grounding`, `entry.intro`, `entry.name`, `entry.subtitle`). All are present in Task 1's interface.
- **`articleSchema` missing property**: The `articleSchema` call in Task 3 uses `{ headline, description, path, section }` — verify this matches the existing `lib/jsonld.ts` signature by running `grep -n "articleSchema" /Users/nikipro/Desktop/Projects/fortune-app/lib/jsonld.ts`.
- **Implicit `any` in `genHunyin.mjs`**: This is a `.mjs` file, not checked by `tsc --noEmit` — ignore.

Re-run `npx tsc --noEmit` after any fix and confirm clean.

---

## Task 6: Generate content

**Files:**
- Generate: `content/seo/hunyin/{slug}.json` × 14

**Interfaces:**
- Consumes: `getHunyinContent` → calls `getKnowledge` (RAG) + `synthesize` (DeepSeek R1) → returns `{ markdown, refs }`
- Produces: JSON files read by `readPregenerated("hunyin", slug)` at runtime

- [ ] **Step 1: Create the output directory**

Run:
```bash
mkdir -p /Users/nikipro/Desktop/Projects/fortune-app/content/seo/hunyin
```

- [ ] **Step 2: Run generation**

Run (from project root, requires `.env.local` with valid API key):
```bash
cd /Users/nikipro/Desktop/Projects/fortune-app && npx tsx --env-file=.env.local scripts/genHunyin.mjs
```
Expected output format:
```
⚡ 婚姻宫位 — generating 14 article(s)

  GEN   紫微在夫妻宫 (ziwei) … 1850c in 32s
  GEN   天机在夫妻宫 (tianji) … 1720c in 28s
  ...
⚡ Done: 14 generated, 0 skipped, 0 failed
```

Each article should be ≥ 800 characters. If any are flagged ⚠ SHORT, regenerate that slug with `--force`:
```bash
cd /Users/nikipro/Desktop/Projects/fortune-app && npx tsx --env-file=.env.local scripts/genHunyin.mjs --slug {slug} --force
```

- [ ] **Step 3: Verify generated files**

Run:
```bash
ls /Users/nikipro/Desktop/Projects/fortune-app/content/seo/hunyin/ | wc -l
```
Expected: `14`

Run:
```bash
for f in /Users/nikipro/Desktop/Projects/fortune-app/content/seo/hunyin/*.json; do
  chars=$(python3 -c "import json; d=json.load(open('$f')); print(d.get('chars','?'))")
  echo "$(basename $f .json): ${chars}c"
done
```
Expected: all 14 slugs listed with char counts ≥ 800.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `lib/hunyinData.ts` with `HunyinEntry` interface | Task 1 |
| 14 entries for all main stars | Task 1 (紫微/天机/太阳/武曲/天同/廉贞/天府/太阴/贪狼/巨门/天相/天梁/七杀/破军) |
| urlSlugs match spec | Task 1 (ziwei/tianji/taiyang/wuqu/tiantong/lianzheng/tianfu/taiyin/tanlang/jumen/tianxiang/tianliang/qisha/pojun) |
| `HUNYIN` export (for sitemap.ts) | Task 1 |
| `getHunyin()` lookup function | Task 1 |
| No ASCII `"` inside double-quoted strings | Task 1 — uses `「」` throughout |
| Hub page `/hunyin` with rose theme | Task 2 |
| No kind grouping — flat list | Task 2 |
| 4 FAQ questions (exact content from spec) | Task 2 |
| CTA slim and card with specified labels/subs | Tasks 2 + 3 |
| Article page `/hunyin/[slug]` | Task 3 |
| Rose color theme (rose-600/rose-700) | Tasks 2 + 3 |
| Hero shows `entry.subtitle` | Task 3 (kicker line) |
| Breadcrumb: 命里 / 知识库 / 夫妻宫星曜 / {name}在夫妻宫 | Task 3 |
| JSON-LD section: "婚姻宫位" | Task 3 |
| Related links to `/hunyin/{slug}` | Task 3 |
| `scripts/genHunyin.mjs` | Task 4 |
| `content/seo/hunyin/{slug}.json` × 14 | Task 6 |
| TypeScript clean | Task 5 |

**Placeholder scan:** No TBDs, no "implement later", no "similar to Task N", all code blocks complete.

**Type consistency check:**
- `HunyinEntry` defined in Task 1 with: `name`, `urlSlug`, `title`, `subtitle`, `oneLine`, `intro`, `grounding`, `ragQuery`, `related`
- `getHunyinContent(entry)` in `lib/seoContent.ts` accesses: `entry.ragQuery` (line 994), `entry.name` (line 997), `entry.subtitle` (line 997), `entry.intro` (line 1009), `entry.grounding` (line 1012) — all present ✓
- `generateStaticParams` in Task 3 uses `e.urlSlug` — present ✓
- `related` array contains urlSlugs that exist in HUNYIN — verified ✓ (all 3 per entry reference valid slugs)
