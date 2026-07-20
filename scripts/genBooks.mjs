// Generate all 30 book articles for content/seo/book/
// Usage:
//   npx tsx --env-file=.env.local scripts/genBooks.mjs
//   npx tsx --env-file=.env.local scripts/genBooks.mjs --slug ziwei-bishu-shudian
//   npx tsx --env-file=.env.local scripts/genBooks.mjs --force

import fs from "fs";
import path from "path";
import { BOOK_ARTICLES } from "../lib/bookArticles.ts";
import { getBookContent } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const outDir = path.join(process.cwd(), "content", "seo", "book");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const articles = slugFilter
  ? BOOK_ARTICLES.filter(a => a.urlSlug === slugFilter || a.slug === slugFilter)
  : [...BOOK_ARTICLES];

if (articles.length === 0) {
  console.error(`No article found matching --slug "${slugFilter}"`);
  process.exit(1);
}

console.log(`\n📚 命理书单 — generating ${articles.length} article(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

let generated = 0;
let skipped = 0;
let failed = 0;
const tooShort = [];

for (const article of articles) {
  const outFile = path.join(outDir, `${article.slug}.json`);

  if (!force && fs.existsSync(outFile)) {
    const existing = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    console.log(`  SKIP  ${article.slug} (${existing.chars ?? "?"}c already exists)`);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`  DRY   ${article.slug}`);
    continue;
  }

  const t = Date.now();
  process.stdout.write(`  GEN   ${article.slug} … `);

  try {
    const { markdown, refs } = await getBookContent(article, undefined);
    const elapsed = Math.round((Date.now() - t) / 1000);
    const chars = markdown.length;

    const data = {
      label: article.title,
      markdown,
      refs,
      chars,
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    console.log(`${chars}c in ${elapsed}s`);
    generated++;

    if (chars < 400) {
      tooShort.push({ slug: article.slug, chars });
      console.warn(`  ⚠️  SHORT: ${article.slug} only ${chars} chars — may need review`);
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
