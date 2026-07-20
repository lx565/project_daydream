# 真实命例 on 八字 Hub Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "真实命例" learning section (real 八字 case cards, domain-scoped) to the 4 八字 applied-cluster hub pages: `/bazi/hunyin`, `/bazi/shiye`, `/bazi/caiyun`, `/bazi/jibing`.

**Architecture:** An offline one-time script keyword-filters the 1,711 cases per life-domain (requiring a real outcome), then has DeepSeek confirm relevance and rewrite a clean, plain-language, domain-scoped blurb; curated output is cached to `content/cases-domains/*.json`. A static server component reads that JSON and renders cards on each hub, each linking to the full `/cases/[slug]` page.

**Tech Stack:** Next.js 15 App Router, TypeScript, `lib/callAI.ts` (DeepSeek via `AI_PROVIDER`), `npx tsx --env-file=.env.local` for scripts, Tailwind, Vercel.

## Global Constraints

- **No git commits.** Per the repo's CLAUDE.md, never auto-commit. Ship via `npx vercel --prod --yes` (deploys the working tree). Omit all `git commit` steps.
- **No new test framework.** This codebase validates content features by running the gen script, inspecting JSON, `npm run build`, and live `curl` — not unit tests. Follow that pattern.
- **Scripts run with:** `npx tsx --env-file=.env.local scripts/<name>.mjs [flags]`. `.env.local` holds `DEEPSEEK_API_KEY`; set `AI_PROVIDER=deepseek` for these runs.
- **Server components only** for the rendered section (NO `"use client"`) so the cards ship in static HTML (SEO requirement).
- **Tone:** blurbs must be plain-language, strictly single-domain, non-fatalist, learning-framed. Reuse `ANTI_CLICHE` from `lib/seoContent.ts`.
- **Output JSON shape** (per case): `{ caseId, slug, bazi_text, rizi, geju, blurb }`.
- **Curation target:** ~8–10 cases per domain.

---

### Task 1: Domain config + loader (`lib/caseDomains.ts`)

Shared source of truth for the 4 domains (label, keywords, accent) and the JSON loader — imported by both the gen script and the component (DRY).

**Files:**
- Create: `lib/caseDomains.ts`
- Create (empty placeholders so the loader has something to read): `content/cases-domains/hunyin.json`, `shiye.json`, `caiyun.json`, `jibing.json` — each initially `[]`

**Interfaces:**
- Produces: `type CaseDomain = "hunyin" | "shiye" | "caiyun" | "jibing"`; `CASE_DOMAINS: Record<CaseDomain, CaseDomainMeta>`; `interface DomainCase`; `loadDomainCases(domain: CaseDomain): DomainCase[]`.

- [ ] **Step 1: Write the loader + config**

Create `lib/caseDomains.ts`:

```ts
import fs from "fs";
import path from "path";

export type CaseDomain = "hunyin" | "shiye" | "caiyun" | "jibing";

export interface CaseDomainMeta {
  domain: CaseDomain;
  label: string;        // 婚姻 / 事业 / 财运 / 健康
  sectionTitle: string; // heading on the hub
  intro: string;        // one-line framing under the heading
  accent: string;       // tailwind bg class for the accent bar
  keywords: string[];   // pre-filter tokens (match in analysis/prediction/outcome)
}

export const CASE_DOMAINS: Record<CaseDomain, CaseDomainMeta> = {
  hunyin: {
    domain: "hunyin", label: "婚姻",
    sectionTitle: "真实命例 · 婚姻",
    intro: "以下为古今命书中的真实婚姻命例，只就婚姻一事对照学习，供参考。",
    accent: "bg-fuchsia-500",
    keywords: ["婚", "妻", "夫", "配偶", "离", "桃花", "感情", "再娶", "克妻", "克夫", "姻缘"],
  },
  shiye: {
    domain: "shiye", label: "事业",
    sectionTitle: "真实命例 · 事业",
    intro: "以下为古今命书中的真实事业命例，只就事业一事对照学习，供参考。",
    accent: "bg-indigo-500",
    keywords: ["官", "事业", "职", "升", "仕", "创业", "经商", "公职", "罢官", "功名", "贵"],
  },
  caiyun: {
    domain: "caiyun", label: "财运",
    sectionTitle: "真实命例 · 财运",
    intro: "以下为古今命书中的真实财运命例，只就财运一事对照学习，供参考。",
    accent: "bg-amber-500",
    keywords: ["财", "富", "破财", "发财", "巨富", "破产", "求财", "钱", "商", "利"],
  },
  jibing: {
    domain: "jibing", label: "健康",
    sectionTitle: "真实命例 · 健康",
    intro: "以下为古今命书中的真实健康命例，只就健康一事对照学习，供参考。",
    accent: "bg-teal-500",
    keywords: ["病", "灾", "伤", "亡", "寿", "疾", "残", "手术", "健康", "夭", "祸"],
  },
};

export interface DomainCase {
  caseId: string;
  slug: string;
  bazi_text: string;
  rizi: string;
  geju: string;
  blurb: string;
}

export function loadDomainCases(domain: CaseDomain): DomainCase[] {
  try {
    const file = path.join(process.cwd(), "content", "cases-domains", `${domain}.json`);
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw) as DomainCase[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Create the four empty JSON files**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && mkdir -p content/cases-domains && for d in hunyin shiye caiyun jibing; do echo "[]" > content/cases-domains/$d.json; done
```

- [ ] **Step 3: Verify the loader compiles + returns []**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && npx tsx --env-file=.env.local -e "import {loadDomainCases, CASE_DOMAINS} from './lib/caseDomains.ts'; console.log(Object.keys(CASE_DOMAINS)); console.log(loadDomainCases('hunyin'));"
```

Expected: prints `[ 'hunyin', 'shiye', 'caiyun', 'jibing' ]` then `[]`.

---

### Task 2: Gen script — keyword pre-filter + dry-run (`scripts/genCaseDomains.mjs`)

Builds candidate lists per domain (no LLM yet), so we can eyeball counts before spending model calls.

**Files:**
- Create: `scripts/genCaseDomains.mjs`

**Interfaces:**
- Consumes: `getAllCases()` from `lib/casesData.ts`; `CASE_DOMAINS` from `lib/caseDomains.ts`.
- Produces (internal): `candidatesFor(domain)` returning cases that match a domain keyword AND have a non-empty `outcome`.

- [ ] **Step 1: Write the script with keyword filter + `--dry-run`**

Create `scripts/genCaseDomains.mjs`:

```js
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
const limit   = args.includes("--limit")  ? parseInt(args[args.indexOf("--limit") + 1]) : 30; // candidates scanned/domain
const keep    = args.includes("--keep")   ? parseInt(args[args.indexOf("--keep") + 1])  : 10; // cards kept/domain
const dryRun  = args.includes("--dry-run");

const OUT_DIR = path.join(process.cwd(), "content", "cases-domains");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ALL = getAllCases();

function candidatesFor(meta) {
  return ALL.filter(c => {
    if (!c.outcome || !c.outcome.trim()) return false; // outcome = good learning example
    const hay = `${c.analysis} ${c.prediction} ${c.outcome}`;
    return meta.keywords.some(k => hay.includes(k));
  });
}

const domains = only ? [only] : Object.keys(CASE_DOMAINS);

for (const domain of domains) {
  const meta = CASE_DOMAINS[domain];
  const cands = candidatesFor(meta);
  console.log(`${domain} (${meta.label}): ${cands.length} candidates with outcome`);
  if (dryRun) continue;
  // Task 3 fills in the LLM rewrite + write.
}
```

- [ ] **Step 2: Run the dry-run and read the counts**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && npx tsx --env-file=.env.local scripts/genCaseDomains.mjs --dry-run
```

Expected: four lines like `hunyin (婚姻): NN candidates with outcome`, each NN ≥ 10 (if any domain is < 10, note it — we widen its keywords in Task 3 before generating).

---

### Task 3: Gen script — LLM scope+rewrite + write curated JSON

Turns candidates into ~10 clean, domain-scoped cards per domain.

**Files:**
- Modify: `scripts/genCaseDomains.mjs` (replace the `if (dryRun) continue;` tail with the generation loop)

**Interfaces:**
- Consumes: `callAI({system, userMessage, jsonMode, maxTokens, temperature})` → string; `ANTI_CLICHE`.
- Produces: `content/cases-domains/<domain>.json` = `DomainCase[]`.

- [ ] **Step 1: Replace the loop tail with the LLM rewrite + write**

In `scripts/genCaseDomains.mjs`, replace this block:

```js
  if (dryRun) continue;
  // Task 3 fills in the LLM rewrite + write.
}
```

with:

```js
  if (dryRun) continue;

  const system = `你是命理教学编辑。给你一个真实的八字命例和一个人生领域（如"婚姻"）。
你的任务：判断这个命例是否对该领域有清晰的学习价值，如果有，写一段面向初学者的白话点评。
严格要求：
- 只谈该领域这一件事，不要牵扯命主的其他人生方面（事业/健康/财运等一律不写）。
- 平实、客观、就事论事，不制造恐慌、不宿命论、不夸张吉凶。
- 结构："命主……（八字在该领域显示了什么，用通俗话讲）→ 结局：（实际发生了什么）"。
- 100~180字，不照抄原文的文言。
${ANTI_CLICHE}
只输出 JSON：{"relevant": true/false, "blurb": "……"}。若该命例对本领域无清晰价值或缺乏结局，relevant 设为 false。`;

  const kept = [];
  const scan = cands.slice(0, limit);
  for (const c of scan) {
    if (kept.length >= keep) break;
    const userMessage = `【领域】${meta.label}
【日主】${c.rizi || "未知"}
【格局】${c.geju || "未知"}
【四柱】${c.bazi_text || "未知"}
【原始批语】${c.analysis}
【预测】${c.prediction}
【结局】${c.outcome}`;
    let raw = "";
    try {
      raw = await callAI({ system, userMessage, jsonMode: true, maxTokens: 700, temperature: 0.4 });
    } catch (e) {
      console.log(`  skip ${c.id}: call failed (${e.message})`);
      continue;
    }
    let parsed;
    try { parsed = JSON.parse(raw); } catch { console.log(`  skip ${c.id}: bad JSON`); continue; }
    if (!parsed.relevant || !parsed.blurb || !parsed.blurb.trim()) { continue; }
    kept.push({
      caseId: c.id, slug: c.slug, bazi_text: c.bazi_text,
      rizi: c.rizi, geju: c.geju, blurb: parsed.blurb.trim(),
    });
    console.log(`  kept ${c.id} (${kept.length}/${keep})`);
  }

  const outFile = path.join(OUT_DIR, `${domain}.json`);
  fs.writeFileSync(outFile, JSON.stringify(kept, null, 2), "utf-8");
  console.log(`  → wrote ${kept.length} cards to ${outFile}`);
}
```

- [ ] **Step 2: Generate ONE domain and inspect quality**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && AI_PROVIDER=deepseek npx tsx --env-file=.env.local scripts/genCaseDomains.mjs --domain hunyin
```

Expected: `kept …` lines up to 10, then `→ wrote N cards`.

- [ ] **Step 3: Read the output and confirm the guardrails held**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && cat content/cases-domains/hunyin.json | python3 -m json.tool | head -40
```

Expected: entries with a real `bazi_text`, `slug`, and a `blurb` that (a) talks ONLY about marriage, (b) is plain language, (c) ends with 结局, (d) is not doom-laden. If a blurb bleeds into other domains or reads alarming, tighten the `system` prompt and re-run this one domain before continuing.

---

### Task 4: Render component (`components/BaziCaseExamples.tsx`)

Static server component that renders the domain's cards.

**Files:**
- Create: `components/BaziCaseExamples.tsx`

**Interfaces:**
- Consumes: `loadDomainCases`, `CASE_DOMAINS`, `CaseDomain` from `lib/caseDomains.ts`.
- Produces: `export default function BaziCaseExamples({ domain, max }: { domain: CaseDomain; max?: number })`.

- [ ] **Step 1: Write the component**

Create `components/BaziCaseExamples.tsx` (NO `"use client"`):

```tsx
import Link from "next/link";
import { loadDomainCases, CASE_DOMAINS, type CaseDomain } from "@/lib/caseDomains";

export default function BaziCaseExamples({ domain, max = 10 }: { domain: CaseDomain; max?: number }) {
  const meta = CASE_DOMAINS[domain];
  const cases = loadDomainCases(domain).slice(0, max);
  if (cases.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 border-b border-border-warm pb-2">
        <div className={`w-1.5 h-5 ${meta.accent} rounded-full self-center`} />
        <h2 className="text-lg font-bold text-ink">{meta.sectionTitle}</h2>
      </div>
      <p className="text-xs text-ink-3">{meta.intro}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cases.map((c) => (
          <div key={c.caseId} className="bg-paper rounded-lg shadow-sm p-4 space-y-2 border-t-2 border-border-warm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink">
                {c.rizi}{c.geju ? ` · ${c.geju}` : ""}
              </span>
              {c.bazi_text && (
                <span className="text-[11px] font-mono text-ink-3">{c.bazi_text}</span>
              )}
            </div>
            <p className="text-[13px] text-ink-2 leading-relaxed">{c.blurb}</p>
            <Link href={`/cases/${c.slug}`} className="inline-block text-[11px] text-vermillion hover:underline">
              看完整命例 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks in a build-free way**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "BaziCaseExamples\|caseDomains" || echo "no type errors in the new files"
```

Expected: `no type errors in the new files`.

---

### Task 5: Wire into the 4 hub pages, generate all domains, build + deploy

**Files:**
- Modify: `app/bazi/hunyin/page.tsx`, `app/bazi/shiye/page.tsx`, `app/bazi/caiyun/page.tsx`, `app/bazi/jibing/page.tsx`

**Interfaces:**
- Consumes: `BaziCaseExamples` (Task 4).

- [ ] **Step 1: Add the import + component to each hub page**

In each of the 4 files, add near the other imports:

```tsx
import BaziCaseExamples from "@/components/BaziCaseExamples";
```

Then, inside the page's container `<div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">`, add the component just before the final `<ToolCTA .../>` (or before `</div>` closing the container if no ToolCTA), using the matching domain:

- `app/bazi/hunyin/page.tsx`: `<BaziCaseExamples domain="hunyin" />`
- `app/bazi/shiye/page.tsx`: `<BaziCaseExamples domain="shiye" />`
- `app/bazi/caiyun/page.tsx`: `<BaziCaseExamples domain="caiyun" />`
- `app/bazi/jibing/page.tsx`: `<BaziCaseExamples domain="jibing" />`

- [ ] **Step 2: Generate the remaining 3 domains** (hunyin done in Task 3)

Run:

```bash
cd ~/Desktop/Projects/fortune-app && for d in shiye caiyun jibing; do AI_PROVIDER=deepseek npx tsx --env-file=.env.local scripts/genCaseDomains.mjs --domain $d; done
```

Expected: each writes N cards. Spot-check one: `cat content/cases-domains/caiyun.json | python3 -m json.tool | head -20`.

- [ ] **Step 3: Build**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && npm run build 2>&1 | tail -15
```

Expected: build completes with no errors; the 4 `/bazi/<domain>` routes appear as static.

- [ ] **Step 4: Confirm the section is in the built static HTML**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && grep -l "真实命例" .next/server/app/bazi/hunyin.html 2>/dev/null && echo "section present in static HTML ✓" || echo "MISSING — check server-component wiring"
```

Expected: `section present in static HTML ✓` (confirms the server component rendered into static output, not client-only).

- [ ] **Step 5: Deploy to production**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && npx vercel --prod --yes 2>&1 | grep -iE "readyState|Aliased|error"
```

Expected: `readyState: READY` + aliased to `www.mingli.study`.

- [ ] **Step 6: Live verify all 4 hubs render the section + a case link resolves**

Run:

```bash
cd ~/Desktop/Projects/fortune-app && for d in hunyin shiye caiyun jibing; do printf "%s: " "$d"; curl -s -A Googlebot --max-time 40 "https://www.mingli.study/bazi/$d" | grep -oq "真实命例" && echo "section ✓" || echo "MISSING"; done
```

Expected: all four print `section ✓`. Then open one hub, click a `看完整命例 →` link, confirm the `/cases/[slug]` page returns 200.

---

## Self-Review

- **Spec coverage:** scope (4 hubs) ✓ Task 5; LLM pre-process (keyword filter + scope+rewrite + curate) ✓ Tasks 2–3; ~8–10/domain ✓ (`--keep 10`); plain-language non-fatalist blurbs ✓ Task 3 prompt + `ANTI_CLICHE`; cards link to `/cases/[slug]` ✓ Task 4; static server component ✓ Task 4 + Step 4 grep gate; SEO internal-link synergy ✓ (links in cards); auto-deploy ✓ Task 5. Out-of-scope items untouched.
- **Placeholder scan:** none — every code step has complete code; every verify step has a command + expected output.
- **Type consistency:** `DomainCase` fields (`caseId/slug/bazi_text/rizi/geju/blurb`) are identical across the loader (Task 1), the script's `kept.push` (Task 3), and the component (Task 4). `CaseDomain` union + `CASE_DOMAINS` keys consistent across Tasks 1/4/5.
- **Note:** if a domain's dry-run count (Task 2) is < 10, widen that domain's `keywords` in `lib/caseDomains.ts` before Task 3 rather than shipping a thin section.
