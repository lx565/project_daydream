/**
 * Utilities for loading and formatting 命格 verified examples.
 * Examples are used to:
 *  1. Ground AI readings — inject a verified chart snapshot into the prompt
 *     so the AI can reference a real example when explaining a 格局
 *  2. Ground SEO articles — provide a concrete "驗證案例" section
 *
 * File: lib/minggeExamples.json
 * Format: { [slug: string]: MinggeExample[] }
 */

import type { MinggeEntry } from "./minggeData";

export interface PalaceSnap {
  earthlyBranch: string;
  major: Array<{ name: string; brightness: string; mutagen?: string }>;
  keyMinors: string[];
}

export interface MinggeExample {
  year: number; month: number; day: number; hour: number;
  shichen: string; gender: string; soulBranch: string;
  description: string;
  palaceSnapshot: Record<string, PalaceSnap>;  // palace name → snapshot
}

// ── Loader ────────────────────────────────────────────────────────────────
let _cache: Record<string, MinggeExample[]> | null = null;

function loadExamples(): Record<string, MinggeExample[]> {
  if (_cache) return _cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _cache = require("./minggeExamples.json") as Record<string, MinggeExample[]>;
  } catch {
    _cache = {};
  }
  return _cache!;
}

/** Get all stored examples for a given 命格 slug. */
export function getExamplesForSlug(slug: string): MinggeExample[] {
  const all = loadExamples();
  // Handle both formats: new {slug: examples[]} and old flat array
  if (Array.isArray(all)) {
    // old flat-array format had a `slug` field per entry
    return (all as unknown as Array<MinggeExample & { slug?: string }>).filter((e) => e.slug === slug);
  }
  return all[slug] ?? [];
}

// ── Formatting for AI prompts ─────────────────────────────────────────────

/** Format a single example as a compact grounding block for AI prompts. */
function formatExample(ex: MinggeExample, index: number): string {
  const birth = `${ex.year}年${ex.month}月${ex.day}日${ex.shichen}（${ex.gender}）`;
  const lines = [`案例${index + 1}（${birth}）：${ex.description}`];

  // Pull the key palace details from the snapshot
  const snap = ex.palaceSnapshot;
  const keyPalaces = ["命宮", "財帛宮", "官祿宮", "遷移宮"];
  for (const palName of keyPalaces) {
    const p = snap[palName];
    if (!p) continue;
    const stars = p.major.map(s =>
      `${s.name}（${s.brightness}${s.mutagen ? "·化" + s.mutagen : ""}）`
    ).join("、") || "無主星";
    const minors = p.keyMinors.length ? ` 輔星：${p.keyMinors.join("、")}` : "";
    lines.push(`  · ${palName}（${p.earthlyBranch}宮）：${stars}${minors}`);
  }
  return lines.join("\n");
}

/**
 * Build a grounding block of verified examples suitable for injecting into
 * an AI prompt. Returns empty string if no examples are available.
 *
 * @param slug    命格 slug
 * @param maxExamples  how many examples to include (default 2)
 */
export function buildExampleGrounding(slug: string, maxExamples = 2): string {
  const examples = getExamplesForSlug(slug).slice(0, maxExamples);
  if (!examples.length) return "";

  const header = `【iztro 驗證案例 — 星盤已由計算引擎核實，可作為格局論述的典型參照】`;
  const body = examples.map((ex, i) => formatExample(ex, i)).join("\n\n");
  return `${header}\n${body}`;
}

/**
 * Build a short example note suitable for embedding in SEO article markdown.
 * Format: a "## 驗證案例" section with 1-2 real chart examples.
 */
export function buildExampleSection(entry: MinggeEntry, maxExamples = 2): string {
  const examples = getExamplesForSlug(entry.slug).slice(0, maxExamples);
  if (!examples.length) return "";

  const lines = [`## 驗證案例\n`];
  lines.push(
    `以下為 iztro 紫微斗數計算引擎核實的真實入格案例，供參考對照：\n`
  );

  for (const [i, ex] of examples.entries()) {
    const birth = `${ex.year}年${ex.month}月${ex.day}日 ${ex.shichen}（${ex.gender}）`;
    lines.push(`**案例 ${i + 1}**（${birth}）`);
    lines.push(ex.description);

    const snap = ex.palaceSnapshot;
    const keyPalaces = ["命宮", "財帛宮", "官祿宮", "遷移宮"];
    for (const palName of keyPalaces) {
      const p = snap[palName];
      if (!p) continue;
      const stars = p.major.map(s =>
        `${s.name}（${s.brightness}${s.mutagen ? "·化" + s.mutagen : ""}）`
      ).join("、") || "無主星";
      const minors = p.keyMinors.length ? `，輔：${p.keyMinors.join("、")}` : "";
      lines.push(`- **${palName}**（${p.earthlyBranch}宮）：${stars}${minors}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
