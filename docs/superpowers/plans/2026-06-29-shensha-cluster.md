# 八字神煞 Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 24 八字神煞 SEO articles at `/bazi/shensha/[slug]`, add a 神煞 section to the `/bazi` hub, and wire up sitemap + content generator.

**Architecture:** Follow the existing 十神 (`/bazi/shishen/[slug]`) pattern exactly — data file → `getShenshaContent()` in `lib/seoContent.ts` → `scripts/genShensha.mjs` pre-generates to `content/seo/shensha/*.json` → ISR page serves pre-generated JSON or falls back to live synthesis. Hub section added to `app/bazi/page.tsx` (no separate sub-hub page needed). No new LibraryNav tab — articles use `category="bazi"`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v3, DeepSeek R1 via `synthesize()` in `lib/synthesize.ts`

## Global Constraints

- Next.js 15 App Router — async params: `{ params }: { params: Promise<PageParams> }`, must `await params`
- All article text must be simplified Chinese (简体中文), no English/繁體
- URL slugs are pinyin, no Chinese characters
- `export const revalidate = 604800` on all ISR pages
- `export const maxDuration = 60` on all ISR pages
- `readPregenerated("shensha", slug)` check before any AI call — add `"shensha"` to the kind union in `lib/seoContent.ts:37`
- All prompts use `BAZI_BASE_RULES + ANTI_CLICHE` (already exported from `lib/seoContent.ts`)
- LibraryNav `category="bazi"` on all article pages (no new tab)
- `SEO_MODEL = process.env.SEO_AI_MODEL ?? "deepseek-reasoner"` (already defined in seoContent.ts)
- No new npm packages
- No comments added to code unless a non-obvious invariant
- Breadcrumb: 命里 → 知识库 → 八字 → {name}
- JSON-LD Article schema on every article page (follow `app/bazi/shishen/[slug]/page.tsx` pattern)

---

## Task 1: 神煞 Data File

**Files:**
- Create: `lib/shenshaData.ts`

**Interfaces:**
- Produces: `ShenshaEntry`, `SHENSHA`, `getShensha(slug)` — consumed by Tasks 2, 3, 4

- [ ] **Step 1: Create `lib/shenshaData.ts` with the complete data**

```typescript
import type { RagQuery } from "@/lib/rag";

export type ShenshaCategory = "贵人" | "凶煞" | "杂煞";

export interface ShenshaEntry {
  name: string;         // e.g. "天乙贵人"
  urlSlug: string;      // pinyin, e.g. "tianyi-guiren"
  category: ShenshaCategory;
  title: string;        // SEO <title>
  subtitle: string;     // one-liner descriptor
  oneLine: string;      // hub card summary
  derivation: string;   // how to find this 神煞 — injected into prompt
  intro: string;        // ~80-word intro paragraph
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];    // urlSlugs of related 神煞
}

export const SHENSHA: ShenshaEntry[] = [
  // ── 贵人类 ──────────────────────────────────────────────────
  {
    name: "天乙贵人",
    urlSlug: "tianyi-guiren",
    category: "贵人",
    title: "天乙贵人详解：八字里的贵人缘与逢凶化吉",
    subtitle: "八字第一贵人神煞 · 以年干或日干查地支",
    oneLine: "遇难必有人相助，人生路上贵人不断。",
    derivation: "以年干或日干查地支：甲戊→丑未，乙己→子申，庚辛→寅午，壬癸→卯巳，丙丁→酉亥。命、运、年中逢之则贵人显灵。",
    intro: "天乙贵人是八字神煞中地位最高的吉神，号称"百神之首"。命中有天乙贵人者，一生逢凶化吉，危难时总有贵人出手相助。天乙落在哪个宫位、被何神煞冲合，都会影响贵人缘的强弱与应期。本文讲清天乙的推算方法、宫位意义，以及大运流年中如何感应天乙贵人。",
    ragQuery: { text: "天乙贵人 神煞 八字 贵人 逢凶化吉 宫位 大运流年", topic: "格局" },
    related: ["wenchang-guiren", "tiande-guiren", "yuede-guiren"],
  },
  {
    name: "文昌贵人",
    urlSlug: "wenchang-guiren",
    category: "贵人",
    title: "文昌贵人详解：八字里的学业运与考试运",
    subtitle: "主学业、文才与考试 · 以日干查地支",
    oneLine: "利于学业、考试、著作与文职晋升。",
    derivation: "以日干查地支：甲→巳，乙→午，丙戊→申，丁己→酉，庚→亥，辛→子，壬→寅，癸→卯。与天乙贵人同柱或同宫力量更强。",
    intro: "文昌贵人是主管学业、考试与文才的吉神。命中有文昌者，头脑聪慧，善于学习，利于文职、教育、写作类工作，考试运尤佳。文昌入六亲宫可看该宫六亲的学业与事业；流年逢文昌是备考、升学、晋升的好时机。本文讲清文昌的推算与实用判断。",
    ragQuery: { text: "文昌贵人 神煞 八字 学业 考试 文才 日干 大运流年", topic: "格局" },
    related: ["tianyi-guiren", "xuetang-guiren", "guoyin-guiren"],
  },
  {
    name: "国印贵人",
    urlSlug: "guoyin-guiren",
    category: "贵人",
    title: "国印贵人详解：权力、官职与政府资源",
    subtitle: "主官印权势与政府贵人 · 以日干查地支",
    oneLine: "利于仕途、政府关系与手握权力之人。",
    derivation: "以日干查地支：甲→午，乙→申，丙→酉，丁→亥，戊→午，己→申，庚→亥，辛→子，壬→卯，癸→辰。",
    intro: "国印贵人又称"天官贵人"，主官印、权力与政府资源。命中有国印者，易在体制内发展，得上级器重，适合公职、管理、行政岗位。国印与官杀同柱或三合更旺，是仕途顺遂的重要标志。本文讲清国印的推算方法与宫位解读。",
    ragQuery: { text: "国印贵人 天官贵人 神煞 八字 官印 权力 仕途 政府", topic: "格局" },
    related: ["tianyi-guiren", "wenchang-guiren", "taiji-guiren"],
  },
  {
    name: "福星贵人",
    urlSlug: "fuxing-guiren",
    category: "贵人",
    title: "福星贵人详解：八字里的福气与财运庇护",
    subtitle: "主福气、财禄与平安 · 以日干查地支",
    oneLine: "命中福气深厚，财禄自来，少灾少难。",
    derivation: "以日干查地支：甲→寅，乙→丑，丙→子，丁→亥，戊→戌，己→酉，庚→申，辛→未，壬→午，癸→巳（逆序）。",
    intro: "福星贵人是八字吉神之一，主福气与财禄庇护。命中有福星者，人生总体顺遂，即便遭遇挫折也能化险为夷，财运平稳，健康少灾。福星落在财帛宫、命宫力量最强。流年逢福星，适合投资、求财与做重大决定。",
    ragQuery: { text: "福星贵人 神煞 八字 福气 财禄 庇护 平安 宫位", topic: "格局" },
    related: ["tianyi-guiren", "tiande-guiren", "jinyu"],
  },
  {
    name: "太极贵人",
    urlSlug: "taiji-guiren",
    category: "贵人",
    title: "太极贵人详解：八字里的官方助力与格局提升",
    subtitle: "主官方支持与格局拔高 · 以年支或日支查",
    oneLine: "得官方机构或权威人士的支持与助力。",
    derivation: "年支或日支为四正（子午卯酉）对应不同层次：子午卯酉→一般太极，辰戌丑未→四库太极（力量稍弱），寅申巳亥→四生太极。各派推算方式略有不同。",
    intro: "太极贵人主官方支持、贵人提携与格局拔高。命中有太极者，做事易得体制背书，从事正规行业顺遂，职场中常获上级提携。太极贵人与正官同现，是仕途发达的重要指标。本文讲清太极的推算与四正四库四生三种层次的区别。",
    ragQuery: { text: "太极贵人 神煞 八字 官方 贵人 四正 年支 日支 仕途", topic: "格局" },
    related: ["guoyin-guiren", "tianyi-guiren", "jiangxing"],
  },
  {
    name: "学堂贵人",
    urlSlug: "xuetang-guiren",
    category: "贵人",
    title: "学堂贵人详解：天赋学习力与专业技能运",
    subtitle: "主学习天赋与专业技能 · 以日干查地支",
    oneLine: "天生好学，专业领域易出成就。",
    derivation: "以日干查地支（长生位）：甲→亥，乙→午，丙戊→寅，丁己→酉，庚→巳，辛→子，壬→申，癸→卯。与文昌贵人同柱学业更强。",
    intro: "学堂贵人以日干长生位为取法，主天生的学习能力与专业技能发展潜力。命中有学堂者，自幼学习能力强，擅长钻研，适合需要专业技能的行业。与文昌贵人同现，是学术型命局的重要搭配。流年逢学堂，是进修、考证、深造的好时机。",
    ragQuery: { text: "学堂贵人 神煞 八字 学习天赋 长生位 专业 文昌 日干", topic: "格局" },
    related: ["wenchang-guiren", "tianyi-guiren", "guoyin-guiren"],
  },
  {
    name: "天厨贵人",
    urlSlug: "tianchu-guiren",
    category: "贵人",
    title: "天厨贵人详解：口福、饮食业与手艺人的福星",
    subtitle: "主口福、饮食行业与一技之长 · 以日干查地支",
    oneLine: "口福丰厚，适合餐饮、手艺与服务行业。",
    derivation: "以日干查地支：甲→午，乙→巳，丙→戌，丁己→亥，戊→戌，庚→辰，辛→卯，壬→子，癸→亥（各派略有差异，以常用版为准）。",
    intro: "天厨贵人主口福与饮食缘，命中有天厨者，人生中食禄丰厚，口才好，适合餐饮、厨艺、美食、服务业，也可引申为"以口谋食"的才艺型职业。天厨入财帛宫，财从饮食行业来；入命宫，主人一生少饿之忧。本文讲清天厨的推算与行业倾向。",
    ragQuery: { text: "天厨贵人 神煞 八字 口福 饮食 手艺 餐饮 行业", topic: "格局" },
    related: ["fuxing-guiren", "tianyi-guiren", "jinyu"],
  },
  {
    name: "月德贵人",
    urlSlug: "yuede-guiren",
    category: "贵人",
    title: "月德贵人详解：化解凶煞与女性贵人缘",
    subtitle: "主化煞解厄与女性助力 · 以月支查天干",
    oneLine: "命带月德，凶煞力量减半，女贵人助力明显。",
    derivation: "以月支查：寅午戌月→丙为月德，申子辰月→壬为月德，亥卯未月→甲为月德，巳酉丑月→庚为月德。月德在天干出现则有效。",
    intro: "月德贵人是以月支推出的贵人天干，主化解凶煞、减轻灾祸，也主女性贵人的相助。命中有月德者，同柱或同宫的凶煞（如劫煞、亡神）力量会被压制，一生得女性贵人（母亲、女领导、妻子）助力。本文讲清月德的推算与化煞实用解读。",
    ragQuery: { text: "月德贵人 神煞 八字 月支 化煞 女性贵人 劫煞 亡神", topic: "格局" },
    related: ["tiande-guiren", "tianyi-guiren", "jiesha"],
  },
  {
    name: "天德贵人",
    urlSlug: "tiande-guiren",
    category: "贵人",
    title: "天德贵人详解：化解重煞与阴德庇荫",
    subtitle: "主化解重大凶煞与先天阴德 · 以月支查",
    oneLine: "天德入命，一生有阴德庇荫，逢凶不伤。",
    derivation: "以月支查（每月固定干或支）：正月→丁，二月→申（坤），三月→壬，四月→辛，五月→亥（乾），六月→甲，七月→癸，八月→寅（艮），九月→丙，十月→乙，十一月→巳（巽），十二月→庚。命盘中出现对应天干或地支即有天德。",
    intro: "天德贵人是月支所映射的吉神，被视为"阴德贵人"，力量比月德更强。命中有天德者，先天有阴德庇护，一生遇大难有解，遇官司有贵人斡旋，也主此人为人善良，得神明庇护。天德与月德同现称"德合"，化煞能力最强。",
    ragQuery: { text: "天德贵人 神煞 八字 月支 阴德 化煞 月德 庇护 官司", topic: "格局" },
    related: ["yuede-guiren", "tianyi-guiren", "kongwang"],
  },
  {
    name: "金舆",
    urlSlug: "jinyu",
    category: "贵人",
    title: "金舆详解：八字里的财富依托与富贵配偶",
    subtitle: "主富裕依托与财运加持 · 以日干查地支",
    oneLine: "命带金舆，财运有依，多得他人财力支撑。",
    derivation: "以日干查地支（帝旺后一位，即沐浴位）：甲→辰，乙→巳，丙戊→未，丁己→申，庚→戌，辛→亥，壬→丑，癸→寅。",
    intro: "金舆取日干的"沐浴位"地支，代表乘坐金色銮驾，象征财富的承载与依托。命中有金舆者，财运有贵人支撑，男命易得富妻助力，女命易嫁富贵夫君，也主事业中多有他人财力相助。金舆与财星同现，财运格局更高。",
    ragQuery: { text: "金舆 神煞 八字 财富 配偶 财星 日干 富贵", topic: "格局" },
    related: ["tianyi-guiren", "fuxing-guiren", "tianchu-guiren"],
  },

  // ── 凶煞类 ──────────────────────────────────────────────────
  {
    name: "羊刃",
    urlSlug: "yangren",
    category: "凶煞",
    title: "羊刃详解：八字里的锋芒、魄力与血刃之气",
    subtitle: "日主帝旺前一位 · 主刚烈、锋芒与意外血光",
    oneLine: "羊刃是把双刃剑：制化得宜则魄力过人，无制则冲动招祸。",
    derivation: "以日干查地支（帝旺位前一位）：甲→卯，乙→辰，丙戊→午，丁己→未，庚→酉，辛→戌，壬→子，癸→亥。月支带羊刃最旺。",
    intro: "羊刃是日干帝旺位前一步，五行气势过旺、锋芒外露的象征。有制（官杀制刃、食伤泄刃）则成"羊刃驾杀"等大格局，主魄力、执行力与强悍意志；无制则主冲动、意外、血光。从事武职、外科、竞技类职业者多见羊刃。本文讲清羊刃的双面性与制化之道。",
    ragQuery: { text: "羊刃 神煞 八字 刃 制刃 羊刃驾杀 官杀 魄力 意外血光 格局", topic: "格局" },
    related: ["kuigang", "jiesha", "wangshen"],
  },
  {
    name: "劫煞",
    urlSlug: "jiesha",
    category: "凶煞",
    title: "劫煞详解：八字里的意外、险境与他人劫夺",
    subtitle: "主意外受劫与险境 · 以年支或日支三合局查",
    oneLine: "逢劫煞易遭意外、财物损失或被人劫夺。",
    derivation: "以年支或日支三合局第二位地支对冲得出：申子辰→巳，寅午戌→亥，巳酉丑→寅，亥卯未→申。流年逢劫煞宜防意外。",
    intro: "劫煞是以三合局推算的凶神，主意外受伤、财物被劫夺、官司纠纷与险境。命中劫煞重而无制者，一生多遭横祸；有月德、天德同柱则化煞为用，反主胆识过人。流年劫煞临命要特别注意交通意外与财务纠纷。本文讲清劫煞的推算与流年应期。",
    ragQuery: { text: "劫煞 神煞 八字 意外 险境 三合局 流年 月德化煞", topic: "格局" },
    related: ["wangshen", "yangren", "yuede-guiren"],
  },
  {
    name: "亡神",
    urlSlug: "wangshen",
    category: "凶煞",
    title: "亡神详解：八字里的阻挠、暗损与精神内耗",
    subtitle: "主暗中阻挠与精神消耗 · 以年支或日支查",
    oneLine: "逢亡神易有暗中阻力、精神内耗或隐性损失。",
    derivation: "以年支或日支三合局第一位地支对冲得出：申子辰→亥，寅午戌→巳，巳酉丑→申，亥卯未→寅。与劫煞常同时出现。",
    intro: "亡神又称"阻神"，主暗中阻挠、精神内耗与隐性损失。与劫煞相比，亡神的伤害更隐蔽，多以精神困扰、信息不畅、暗中被人拖累的形式出现。命中亡神重且冲克日主，需注意心理健康与防小人。流年亡神临命，做重要决定前宜三思。",
    ragQuery: { text: "亡神 阻神 神煞 八字 暗中阻力 精神内耗 隐性损失 劫煞 流年", topic: "格局" },
    related: ["jiesha", "yangren", "kongwang"],
  },
  {
    name: "红艳",
    urlSlug: "hongyan",
    category: "凶煞",
    title: "红艳详解：八字里的异性缘、桃花与感情纠葛",
    subtitle: "主异性魅力与桃花纠葛 · 以日干查地支",
    oneLine: "红艳带来异性缘，但感情易起伏或多纠葛。",
    derivation: "以日干查地支：甲→午，乙→午，丙→寅，丁→未，戊→辰，己→辰，庚→戌，辛→酉，壬→子，癸→申。红艳与桃花（咸池）同现感情更复杂。",
    intro: "红艳是主异性魅力与桃花感情的神煞，带红艳者天生有魅力，异性缘旺，但感情生活往往比较复杂，多有纠葛或婚外感情。男命红艳入夫妻宫，易有感情风波；女命红艳旺且无制，婚姻需慎。有食伤化泄则红艳变为艺术与表达的魅力。",
    ragQuery: { text: "红艳 桃花 神煞 八字 异性缘 感情纠葛 夫妻宫 桃花煞 日干", topic: "格局" },
    related: ["xianchi", "guchen", "guasu"],
  },
  {
    name: "空亡",
    urlSlug: "kongwang",
    category: "凶煞",
    title: "空亡详解：八字里的落空、虚耗与失去",
    subtitle: "以日柱旬中空亡推算 · 主虚耗、失落与漂泊",
    oneLine: "空亡的地支五行力量大打折扣，主落空与虚耗。",
    derivation: "以日柱天干地支确定旬首，每旬有两个空亡地支：甲子旬→戌亥，甲戌旬→申酉，甲申旬→午未，甲午旬→辰巳，甲辰旬→寅卯，甲寅旬→子丑。命中空亡的宫位或六亲缘分较薄。",
    intro: "空亡是指在六十甲子中，某旬内地支配不到天干而形成的"真空"状态。落入空亡的地支五行力量大减，对应的六亲缘薄、事项易落空。命中夫妻宫空亡则缘薄；财帛宫空亡则财来财去；但空亡也主"出世"之象，宗教、玄学、艺术类人才多见。",
    ragQuery: { text: "空亡 旬空 神煞 八字 日柱 落空 虚耗 六亲缘薄 旬首", topic: "格局" },
    related: ["wangshen", "tianluo-diwang", "huagai"],
  },
  {
    name: "天罗地网",
    urlSlug: "tianluo-diwang",
    category: "凶煞",
    title: "天罗地网详解：八字里的困境、羁绊与难以脱身",
    subtitle: "辰为天罗，戌为地网 · 主困境束缚与难以脱身",
    oneLine: "命中多见辰戌，主人生易陷困境，进退两难。",
    derivation: "辰（水库）为天罗，戌（火库）为地网。命中四柱多见辰戌（尤其两者同现），或大运流年逢辰戌冲，主困境、官司、监禁、疾病缠身等难以脱身之象。壬癸日主逢辰，甲乙日主逢戌最重。",
    intro: "天罗地网是由辰（天罗）与戌（地网）组成的一对凶煞，象征天网恢恢、无处逃脱。命中多见辰戌者，人生容易陷入困境、官司、疾病或感情羁绊，进退两难。大运流年逢辰戌冲，是需要谨慎的敏感期。有解：天德月德化之、丑未合解辰戌。",
    ragQuery: { text: "天罗地网 辰 戌 神煞 八字 困境 羁绊 官司 四库 流年", topic: "格局" },
    related: ["kongwang", "jiesha", "kuigang"],
  },

  // ── 杂煞类 ──────────────────────────────────────────────────
  {
    name: "将星",
    urlSlug: "jiangxing",
    category: "杂煞",
    title: "将星详解：八字里的领导力与统帅气质",
    subtitle: "三合局正中一位 · 主领导统帅与权威",
    oneLine: "命带将星，天生领导气质，适合统帅之位。",
    derivation: "以年支或日支三合局中间地支（帝旺位）为将星：申子辰→子，寅午戌→午，巳酉丑→酉，亥卯未→卯。将星与官杀同现，领导格局更显。",
    intro: "将星取三合局帝旺位，代表统帅之气与领导天赋。命中有将星者，天生具备指挥与决断能力，适合管理、军政、竞技等需要统帅力的领域。将星与羊刃、七杀同现，形成"将星羊刃格"，是强势、有霸气的命格。本文讲清将星的推算与宫位解读。",
    ragQuery: { text: "将星 神煞 八字 领导 统帅 三合局 帝旺 羊刃 七杀 格局", topic: "格局" },
    related: ["yangren", "taiji-guiren", "jiangxing"],
  },
  {
    name: "驿马",
    urlSlug: "yima",
    category: "杂煞",
    title: "驿马详解：八字里的流动、迁移与变动之神",
    subtitle: "三合局冲位 · 主奔波流动与海外缘",
    oneLine: "驿马主奔波、出行、迁移，动多静少。",
    derivation: "以年支或日支三合局前一位地支对冲为驿马：申子辰→寅，寅午戌→申，巳酉丑→亥，亥卯未→巳。命中驿马有财，主经商四方；有官，主升职调动。",
    intro: "驿马是三合局冲位，象征不停奔驰的马，主人生中的流动与变化。命中驿马旺者，生性爱动，难以安定，适合出差、外贸、物流、航空等流动性职业，也主海外缘或频繁迁居。驿马冲旺且无制，主奔波劳碌；驿马合财，主外贸致富。",
    ragQuery: { text: "驿马 神煞 八字 流动 迁移 出差 海外 外贸 三合局 奔波", topic: "格局" },
    related: ["jiangxing", "huagai", "xianchi"],
  },
  {
    name: "华盖",
    urlSlug: "huagai",
    category: "杂煞",
    title: "华盖详解：孤高、宗教缘与艺术天赋",
    subtitle: "三合局末位四库 · 主孤高、才艺与出世之象",
    oneLine: "华盖主孤高、宗教缘与艺术天赋，入世难融，出世有成。",
    derivation: "以年支或日支三合局末位四库地支为华盖：申子辰→辰，寅午戌→戌，巳酉丑→丑，亥卯未→未。月时支带华盖力量更强。",
    intro: "华盖取三合局末位的四库地支，象征帝王出行时遮阳的华丽车盖，主孤高与与众不同。命中有华盖者，个性独特、不随俗流，多有宗教、玄学、艺术方面的天赋；但同时也主孤独，人际关系不易融洽。华盖多现，命格偏清高，适合独立创作或修行。",
    ragQuery: { text: "华盖 神煞 八字 孤高 宗教缘 艺术 玄学 四库 孤独 才艺", topic: "格局" },
    related: ["guchen", "guasu", "kongwang"],
  },
  {
    name: "咸池",
    urlSlug: "xianchi",
    category: "杂煞",
    title: "咸池（桃花）详解：感情吸引力与风流之象",
    subtitle: "又称桃花煞 · 主异性吸引力与感情起伏",
    oneLine: "咸池主感情魅力与桃花，缘分旺但易多情。",
    derivation: "以年支或日支三合局第三位为咸池/桃花：申子辰→酉，寅午戌→卯，巳酉丑→午，亥卯未→子。坐支（日支）桃花比年支桃花更旺。",
    intro: "咸池俗称"桃花星"或"桃花煞"，是主感情吸引力与异性缘的神煞。命中有咸池者，外表有魅力，异性缘好；但桃花旺而无制，感情生活易复杂，多情、滥情或感情纠葛。桃花入驿马称"流动桃花"（主圈外桃花），入日支称"墙内桃花"（主正缘）。",
    ragQuery: { text: "咸池 桃花 桃花煞 神煞 八字 异性缘 感情 吸引力 日支 年支", topic: "格局" },
    related: ["hongyan", "guchen", "yima"],
  },
  {
    name: "孤辰",
    urlSlug: "guchen",
    category: "杂煞",
    title: "孤辰详解：孤独感与独立自强的命理根源",
    subtitle: "以年支查 · 主孤独、亲情薄与独立",
    oneLine: "孤辰主人际疏离感，亲缘薄，独处能力强。",
    derivation: "以年支查：亥子丑年→寅为孤辰，寅卯辰年→巳为孤辰，巳午未年→申为孤辰，申酉戌年→亥为孤辰。孤辰入命宫或日柱力量最强。",
    intro: "孤辰是以年支推算的凶神，主孤独感与亲情疏离。命中有孤辰者，骨子里有一种"难以真正融入"的孤独感，亲缘薄，不容易依赖他人，但独处能力强、自立心旺。孤辰与寡宿同现称"孤鸾煞"，婚姻尤需注意。本文讲清孤辰的推算与不同宫位的解读。",
    ragQuery: { text: "孤辰 寡宿 神煞 八字 孤独 亲缘薄 独立 婚姻 年支 孤鸾煞", topic: "格局" },
    related: ["guasu", "huagai", "xianchi"],
  },
  {
    name: "寡宿",
    urlSlug: "guasu",
    category: "杂煞",
    title: "寡宿详解：感情孤独与晚婚命格的信号",
    subtitle: "以年支查 · 主感情孤寡与晚婚",
    oneLine: "寡宿主感情方面的孤独，婚姻易迟或感情难稳。",
    derivation: "以年支查（孤辰之后）：亥子丑年→戌为寡宿，寅卯辰年→丑为寡宿，巳午未年→辰为寡宿，申酉戌年→未为寡宿。女命带寡宿，婚姻上尤需关注。",
    intro: "寡宿与孤辰相对，是感情方面孤寡的象征，尤其影响婚姻关系。女命带寡宿，易晚婚、感情不稳或婚后聚少离多；男命寡宿入夫妻宫，配偶缘较薄。然而寡宿也主专心致志，在事业上能静下心深耕。有正印化之，孤独转为精神独立。",
    ragQuery: { text: "寡宿 孤辰 神煞 八字 孤独 感情 婚姻 晚婚 女命 年支", topic: "格局" },
    related: ["guchen", "huagai", "xianchi"],
  },
  {
    name: "魁罡",
    urlSlug: "kuigang",
    category: "杂煞",
    title: "魁罡详解：刚烈、孤傲与一生多磨的特殊日柱",
    subtitle: "特定四个日柱 · 主刚烈、聪明与命途多磨",
    oneLine: "魁罡主聪明刚烈，一生多磨，成就大则磨难也大。",
    derivation: "魁罡日柱共四个：庚辰日、庚戌日、壬辰日、戊戌日。生于这四日者带魁罡。魁罡不喜财官冲克，命中财官重则多磨；得印比帮扶则英雄命格。",
    intro: "魁罡是四个特定日柱（庚辰/庚戌/壬辰/戊戌）所形成的特殊神煞，主聪明、刚烈与权威，历史上不少将帅、高僧、文豪生于魁罡日。然而魁罡也主命途多磨，不喜财官冲克，一旦命局中财官过旺，磨难成倍。男命魁罡有节有制则成器，女命魁罡则感情婚姻较坎坷。",
    ragQuery: { text: "魁罡 神煞 八字 庚辰 庚戌 壬辰 戊戌 刚烈 聪明 命途多磨 日柱", topic: "格局" },
    related: ["yangren", "tianluo-diwang", "jiesha"],
  },
  {
    name: "十恶大败",
    urlSlug: "shie-dabai",
    category: "凶煞",
    title: "十恶大败详解：八字中最凶的十个日柱",
    subtitle: "十个特定日柱 · 主大败、损耗与灾难",
    oneLine: "生于十恶大败日，命局凶险，需格局强旺方能化解。",
    derivation: "十恶大败共十个日柱：甲辰、乙巳、丙申、丁亥、戊戌、己丑、庚辰、辛巳、壬申、癸亥。这十个日柱因天干地支五行处于死、绝、墓等不利状态，传统认为格局最凶。",
    intro: "十恶大败是八字中十个特定日柱，因天干五行在地支处于死绝或相克状态，传统命理认为这十日所生之人格局凶险、易逢大败。然而现代命理认为，十恶大败须看整体格局：命盘强旺、有制化，未必应验；弱命再逢十恶，才真主大败损耗。本文客观讲清十恶大败的历史渊源与现代评价。",
    ragQuery: { text: "十恶大败 神煞 八字 日柱 凶险 大败 甲辰 格局 传统命理 现代命理", topic: "格局" },
    related: ["kuigang", "tianluo-diwang", "kongwang"],
  },
];

export function getShensha(urlSlug: string): ShenshaEntry | undefined {
  return SHENSHA.find(s => s.urlSlug === urlSlug);
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/nikipro/Desktop/Projects/fortune-app
npx tsc --noEmit 2>&1 | grep -E "shenshaData|error" | head -20
```

Expected: No errors referencing shenshaData.ts

- [ ] **Step 3: Commit**

```bash
git add lib/shenshaData.ts
git commit -m "feat: add 八字神煞 data file (24 entries)"
```

---

## Task 2: Content Function + Generator Script

**Files:**
- Modify: `lib/seoContent.ts` — add `"shensha"` to `readPregenerated` kind union + add `getShenshaContent()`
- Create: `scripts/genShensha.mjs`

**Interfaces:**
- Consumes: `ShenshaEntry` from `lib/shenshaData.ts`
- Produces: `getShenshaContent(entry, revisionNote?)` → `Promise<SeoContent>`; writes `content/seo/shensha/${urlSlug}.json`

- [ ] **Step 1: Add `"shensha"` to `readPregenerated` kind union in `lib/seoContent.ts`**

Find line 37 in `lib/seoContent.ts`. The line starts with `function readPregenerated(kind: "star" | "palace" | ...`. Add `"shensha"` to the union:

```typescript
function readPregenerated(kind: "star" | "palace" | "guide" | "mingge" | "assistantstar" | "personality" | "book" | "sources" | "shishen" | "tiangan" | "geju" | "baziguide" | "zodiac" | "qinggan" | "sihua" | "xiong" | "liunian" | "hunyin" | "shiye" | "caiyun" | "jibing" | "bazi-hunyin" | "bazi-shiye" | "bazi-caiyun" | "bazi-jibing" | "shensha", key: string): SeoContent | null {
```

- [ ] **Step 2: Add import for `ShenshaEntry` at the top of `lib/seoContent.ts`**

Add after the existing `BaziJibingEntry` import line:

```typescript
import type { ShenshaEntry } from "./shenshaData";
```

- [ ] **Step 3: Add `getShenshaContent()` function at the end of `lib/seoContent.ts`**

```typescript
/** 八字神煞 (divine stars) explainer page. */
export async function getShenshaContent(entry: ShenshaEntry, revisionNote?: string): Promise<SeoContent> {
  if (!revisionNote) {
    const pre = readPregenerated("shensha", entry.urlSlug);
    if (pre) return pre;
  }

  const { context, refs } = await getKnowledge({
    ...entry.ragQuery,
    topK: 8,
    maxPerBook: 2,
  });

  const system = BAZI_BASE_RULES + `

这是一篇八字神煞科普文章，主题为「${entry.name}」（${entry.category}类）。

【推算方法务必准确】${entry.derivation}

要点：
- 先用一两句讲清这是什么神煞（${entry.category}类），以及最简单的推算方法
- 讲清命中有此神煞时的主要影响：吉神讲吉处与不足，凶煞讲凶处与化解之道
- 具体说明它落在哪些宫位（命宫/夫妻宫/财帛宫/官禄宫）时的差别意义
- 讲清流年/大运逢此神煞时的应期与注意事项
- 结尾给读者一条"如何在自己八字里应用这个知识"的可操作建议

输出结构（用 ## 二级标题，4-6节，每节约100-180字）。禁止：虚构神煞推算表、捏造典籍名称、空泛恐吓（"必主大凶"）。`
    + (revisionNote ? `\n\n【本次修订要求（最高优先级）】\n${revisionNote}` : "");

  const prompt = `【主题】${entry.title}
【副标题】${entry.subtitle}
【导语】${entry.intro}
【推算方法】${entry.derivation}

【典籍参考】
${context || "（无可用参考，请基于八字命理通论严谨撰写）"}

请撰写这篇八字神煞科普文章的正文。`;

  const markdown = await synthesize({ tag: "guide", system, prompt, model: SEO_MODEL, maxTokens: 3500 });
  return { markdown, refs };
}
```

- [ ] **Step 4: Create `scripts/genShensha.mjs`**

```javascript
// Generate all 八字神煞 articles for content/seo/shensha/
// Usage:
//   npx tsx --env-file=.env.local scripts/genShensha.mjs
//   npx tsx --env-file=.env.local scripts/genShensha.mjs --slug tianyi-guiren
//   npx tsx --env-file=.env.local scripts/genShensha.mjs --force

import fs from "fs";
import path from "path";
import { SHENSHA } from "../lib/shenshaData.ts";
import { getShenshaContent } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const outDir = path.join(process.cwd(), "content", "seo", "shensha");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const entries = slugFilter
  ? SHENSHA.filter(s => s.urlSlug === slugFilter)
  : [...SHENSHA];

if (entries.length === 0) {
  console.error(`No 神煞 found matching --slug "${slugFilter}"`);
  process.exit(1);
}

console.log(`\n🀄 八字神煞 — generating ${entries.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

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
  process.stdout.write(`  GEN   ${entry.name} (${entry.urlSlug}) … `);

  try {
    const { markdown, refs } = await getShenshaContent(entry, undefined);
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
    console.log(`${chars}c in ${elapsed}s`);
    generated++;

    if (chars < 400) {
      tooShort.push({ slug: entry.urlSlug, chars });
      console.warn(`  ⚠️  SHORT: ${entry.urlSlug} only ${chars} chars — may need review`);
    }
  } catch (err) {
    console.error(`FAILED`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

console.log(`\n──────────────────────────────────────────`);
console.log(`  Generated: ${generated}`);
console.log(`  Skipped:   ${skipped}`);
console.log(`  Failed:    ${failed}`);
if (tooShort.length > 0) {
  console.log(`  Too short: ${tooShort.map(x => `${x.slug}(${x.chars}c)`).join(", ")}`);
}
console.log(`──────────────────────────────────────────\n`);
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "seoContent|shenshaData|error" | head -20
```

Expected: No errors

- [ ] **Step 6: Dry-run the generator**

```bash
npx tsx --env-file=.env.local scripts/genShensha.mjs --dry-run
```

Expected output: 24 lines starting with `  DRY   ` — one per 神煞 slug

- [ ] **Step 7: Commit**

```bash
git add lib/seoContent.ts scripts/genShensha.mjs
git commit -m "feat: add getShenshaContent() and genShensha.mjs script"
```

---

## Task 3: Article Page

**Files:**
- Create: `app/bazi/shensha/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getShensha(slug)` from `lib/shenshaData.ts`; `getShenshaContent(entry)` from `lib/seoContent.ts`
- Produces: ISR page at `/bazi/shensha/[slug]`, `category="bazi"` LibraryNav, JSON-LD Article schema

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/nikipro/Desktop/Projects/fortune-app/app/bazi/shensha/\[slug\]
```

- [ ] **Step 2: Create `app/bazi/shensha/[slug]/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SHENSHA, getShensha } from "@/lib/shenshaData";
import { getShenshaContent } from "@/lib/seoContent";
import JsonLd from "@/components/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/jsonld";
import SeoMarkdown from "@/components/SeoMarkdown";
import VoteWidget from "@/components/VoteWidget";
import LikeButton from "@/components/LikeButton";
import ToolCTA from "@/components/ToolCTA";
import LibraryNav from "@/components/LibraryNav";

export const maxDuration = 60;
export const revalidate = 604800;

export async function generateStaticParams() {
  return SHENSHA.map(s => ({ slug: s.urlSlug }));
}

interface PageParams { slug: string }

export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getShensha(urlSlug);
  if (!entry) return {};

  const title = `${entry.name}详解：八字神煞完全指南 — 命里`;
  const description = entry.intro.slice(0, 120) + "…";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.mingli.study/bazi/shensha/${entry.urlSlug}`,
      siteName: "命里",
      locale: "zh_CN",
      type: "article",
    },
    alternates: {
      canonical: `https://www.mingli.study/bazi/shensha/${entry.urlSlug}`,
    },
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  "贵人": "吉神贵人",
  "凶煞": "凶煞",
  "杂煞": "杂煞",
};

export default async function ShenshaPage(
  { params }: { params: Promise<PageParams> }
) {
  const { slug: rawSlug } = await params;
  const urlSlug = decodeURIComponent(rawSlug);
  const entry = getShensha(urlSlug);
  if (!entry) notFound();

  const { markdown, refs } = await getShenshaContent(entry);
  const hasContent = markdown.trim().length > 0;
  const relatedEntries = entry.related
    .map(slug => getShensha(slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const pagePath = `/bazi/shensha/${entry.urlSlug}`;

  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([
          { name: "命里", path: "/" },
          { name: "知识库", path: "/library" },
          { name: "八字", path: "/bazi" },
          { name: entry.name, path: pagePath },
        ]),
        articleSchema({
          headline: `${entry.name}详解 · 八字神煞`,
          description: entry.subtitle,
          path: pagePath,
          section: "八字命理",
        }),
      ]} />

      <main className="min-h-screen bg-parchment">
        <LibraryNav category="bazi" currentTitle={entry.name} />

        <div className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

          {/* Hero */}
          <div className="text-center pt-8 pb-4 space-y-2">
            <p className="text-xs text-ink-4 tracking-widest">
              八字神煞 · {CATEGORY_LABEL[entry.category] ?? entry.category}
            </p>
            <h1
              className="text-4xl font-bold text-gold leading-snug"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "0.1em" }}
            >
              {entry.name}
            </h1>
            <p className="text-xs text-ink-4 tracking-widest">{entry.subtitle}</p>
            <div className="flex items-center gap-3 justify-center pt-1">
              <div className="h-px w-16 bg-gold/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
              <div className="h-px w-16 bg-gold/20" />
            </div>
          </div>

          {/* Intro */}
          <div className="paper-card rounded-2xl border border-border-warm p-5">
            <p className="text-sm text-ink-2 leading-[1.9]">{entry.intro}</p>
          </div>

          {/* Derivation */}
          <div className="paper-card rounded-2xl border border-border-warm p-5 bg-amber-50/30">
            <p className="text-xs font-semibold text-ink-3 mb-1.5">如何推算</p>
            <p className="text-sm text-ink-2 leading-relaxed">{entry.derivation}</p>
          </div>

          <ToolCTA variant="slim" label="排你的八字 · AI 详解命中神煞与格局 →" />

          {/* Synthesized article */}
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

          <LikeButton />
          <VoteWidget />

          <ToolCTA variant="card" sub="推算之外，更要看你自己命局里的神煞组合。AI 为你逐项详批命中神煞与大运应期。" label="生成我的八字神煞详批" />

          {/* Related 神煞 */}
          {relatedEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-4 font-medium">相关神煞</p>
              <div className="grid grid-cols-2 gap-2">
                {relatedEntries.map(s => (
                  <Link
                    key={s.urlSlug}
                    href={`/bazi/shensha/${s.urlSlug}`}
                    className="paper-card rounded-xl border border-border-warm p-3 text-sm text-ink-2 hover:border-gold/40 hover:text-gold transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <ToolCTA variant="slim" label="八字 + 紫微双系统 · AI 依据逾百部典籍为你详批 →" />

        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -E "shensha|error" | head -20
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add "app/bazi/shensha/[slug]/page.tsx"
git commit -m "feat: add 八字神煞 article page at /bazi/shensha/[slug]"
```

---

## Task 4: Hub Section + Sitemap

**Files:**
- Modify: `app/bazi/page.tsx` — add 神煞 section before the 应用专题 section
- Modify: `app/sitemap.ts` — add `/bazi/shensha/[slug]` entries

**Interfaces:**
- Consumes: `SHENSHA` from `lib/shenshaData.ts`, `ShenshaCategory` type

- [ ] **Step 1: Add import to `app/bazi/page.tsx`**

Add at the top with the other lib imports:

```typescript
import { SHENSHA } from "@/lib/shenshaData";
import type { ShenshaCategory } from "@/lib/shenshaData";
```

- [ ] **Step 2: Add `SHENSHA_GROUPS` constant in `app/bazi/page.tsx`** (add after the `ELEMENTS` array, before `export default`):

```typescript
const SHENSHA_GROUPS: { key: ShenshaCategory; label: string; desc: string }[] = [
  { key: "贵人", label: "贵人神煞", desc: "逢吉助力 · 化险为夷" },
  { key: "凶煞", label: "凶煞", desc: "防范趋避 · 化煞为用" },
  { key: "杂煞", label: "杂煞", desc: "中性强烈 · 有制成器" },
];
```

- [ ] **Step 3: Add 神煞 section to `app/bazi/page.tsx`**

Insert this JSX block **before** the `{/* 八字应用专题 */}` section (search for `<h2 className="text-lg font-bold text-gold tracking-wide"` followed by `八字应用专题`):

```tsx
{/* 八字神煞 cluster */}
<div className="space-y-4">
  <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
    <div className="w-1.5 h-5 bg-gold rounded-full self-center" />
    <h2 className="text-lg font-bold text-gold tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
      八字神煞
    </h2>
    <span className="text-[11px] text-ink-4">贵人 · 凶煞 · 杂煞</span>
    <span className="ml-auto text-[11px] text-ink-4">{SHENSHA.length} 篇</span>
  </div>

  {SHENSHA_GROUPS.map(group => {
    const items = SHENSHA.filter(s => s.category === group.key);
    if (items.length === 0) return null;
    return (
      <div key={group.key} className="space-y-2">
        <p className="text-xs font-semibold text-ink-3">
          {group.label} <span className="text-ink-4 font-normal">· {group.desc}</span>
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
          {items.map(s => (
            <Link
              key={s.urlSlug}
              href={`/bazi/shensha/${s.urlSlug}`}
              className="group flex flex-col gap-2 bg-paper rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              style={{ borderTop: "2px solid var(--color-border-warm)" }}
            >
              <p className="text-[14px] font-bold text-ink group-hover:text-vermillion transition-colors leading-snug" style={{ fontFamily: "var(--font-serif)" }}>{s.name}</p>
              <p className="text-[11px] text-ink-4 leading-relaxed flex-1">{s.oneLine}</p>
              <span className="text-[11px] font-medium mt-auto text-ink-4 group-hover:underline underline-offset-2">阅读 →</span>
            </Link>
          ))}
        </div>
      </div>
    );
  })}
</div>
```

- [ ] **Step 4: Add sitemap entries in `app/sitemap.ts`**

Add import at the top with the other imports:

```typescript
import { SHENSHA } from "@/lib/shenshaData";
```

Add these entries inside the `sitemap()` function return array (add after the `cases` section):

```typescript
  const shenshaArticles = SHENSHA.map(s => ({
    url: `${BASE}/bazi/shensha/${s.urlSlug}`,
    lastModified: LAST_CONTENT_UPDATE,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));
```

And add `...shenshaArticles` to the final return array spread.

- [ ] **Step 5: Type-check + verify sitemap count**

```bash
npx tsc --noEmit 2>&1 | grep "error" | head -10
```

Expected: No errors

```bash
npx tsx --env-file=.env.local -e "
import { default as sitemap } from './app/sitemap.ts';
const s = await sitemap();
console.log('Total URLs:', s.length);
const shensha = s.filter(u => u.url.includes('/bazi/shensha/'));
console.log('Shensha articles:', shensha.length);
"
```

Expected: Shensha articles: 24

- [ ] **Step 6: Commit**

```bash
git add app/bazi/page.tsx app/sitemap.ts
git commit -m "feat: add 神煞 hub section to /bazi and sitemap entries"
```

---

## Task 5: Generate Content + Deploy

**Files:**
- Create: `content/seo/shensha/*.json` (24 files)

- [ ] **Step 1: Run generator (full batch)**

```bash
npx tsx --env-file=.env.local scripts/genShensha.mjs
```

Expected: 24 articles generated, 0 failed. Each file ~800–1500 chars. Any article < 400 chars is flagged ⚠️ and needs `--force` re-run after reviewing.

- [ ] **Step 2: Spot-check 3 articles**

```bash
# Check one 贵人, one 凶煞, one 杂煞
node -e "
const fs = require('fs');
for (const slug of ['tianyi-guiren', 'yangren', 'yima']) {
  const f = fs.readFileSync(\`content/seo/shensha/\${slug}.json\`, 'utf-8');
  const d = JSON.parse(f);
  console.log(slug, d.chars + 'c', d.markdown.slice(0, 100));
}
"
```

Expected: 3 files exist, each with Chinese content > 400 chars

- [ ] **Step 3: Commit generated content**

```bash
git add content/seo/shensha/
git commit -m "content: generate 24 八字神煞 articles"
```

- [ ] **Step 4: Final build check**

```bash
npx next build 2>&1 | tail -20
```

Expected: Build completes successfully, no TypeScript or import errors in output

- [ ] **Step 5: Deploy**

```bash
npx vercel --prod --yes
```

Expected: Deployment URL printed, project live at https://www.mingli.study

- [ ] **Step 6: Verify live pages**

```bash
curl -s "https://www.mingli.study/bazi/shensha/tianyi-guiren" | grep -o "<h1[^>]*>[^<]*</h1>"
curl -s "https://www.mingli.study/bazi" | grep -o "八字神煞"
```

Expected: First curl returns `<h1>` containing 天乙贵人; second returns `八字神煞`

- [ ] **Step 7: Submit to IndexNow**

```bash
npm run indexnow
```

Expected: New total submitted URLs includes the 24 new `/bazi/shensha/` pages
