// Generate /sources article content for corpus books.
// Uses getSourceContent() which pulls a real excerpt from knowledge/extracted/
//
// Usage:
//   npx tsx --env-file=.env.local scripts/genSourcesArticles.mjs
//   npx tsx --env-file=.env.local scripts/genSourcesArticles.mjs --slug wangtingzhi-zhongzhou-jichu
//   npx tsx --env-file=.env.local scripts/genSourcesArticles.mjs --school 三合派
//   npx tsx --env-file=.env.local scripts/genSourcesArticles.mjs --force

import fs from "fs";
import path from "path";
import { SOURCE_BOOKS } from "../lib/sourcesData.ts";
import { getSourceContent } from "../lib/seoContent.ts";

const args = process.argv.slice(2);
const slugFilter  = args.includes("--slug")   ? args[args.indexOf("--slug")   + 1] : null;
const schoolFilter= args.includes("--school") ? args[args.indexOf("--school") + 1] : null;
const force  = args.includes("--force");
const dryRun = args.includes("--dry-run");
const limit  = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : Infinity;

const OUT_DIR = path.join(process.cwd(), "content", "seo", "sources");
const EXTRACT_DIR = path.join(process.cwd(), "knowledge", "extracted");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

/** Load first ~1500 chars of a book's extracted text as an excerpt for the prompt. */
function loadExcerpt(bookSlug) {
  if (!fs.existsSync(EXTRACT_DIR)) return null;
  const schoolDirs = fs.readdirSync(EXTRACT_DIR).filter(d =>
    fs.statSync(path.join(EXTRACT_DIR, d)).isDirectory()
  );
  // Normalise slug for fuzzy match
  const norm = bookSlug.replace(/[（）()。·\-]/g, "").toLowerCase();
  const shortNorm = norm.slice(0, 8);

  for (const school of schoolDirs) {
    const dir = path.join(EXTRACT_DIR, school);
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".txt"));
    const match = files.find(f => {
      const fn = f.replace(".txt", "").replace(/[（）()。·\-]/g, "").toLowerCase();
      return fn.includes(shortNorm) || shortNorm.includes(fn.slice(0, 6));
    });
    if (match) {
      const content = fs.readFileSync(path.join(dir, match), "utf-8");
      const cleaned = content.replace(/\[第\d+页\]\n?/g, "").trim();
      return cleaned.slice(0, 1500);
    }
  }
  return null;
}

let books = [...SOURCE_BOOKS];
if (slugFilter)   books = books.filter(b => b.urlSlug === slugFilter);
if (schoolFilter) books = books.filter(b => b.school === schoolFilter);

// Sort: no content first, then by chunks (desc) to generate highest-value books first
const outFileExists = b =>
  fs.existsSync(path.join(OUT_DIR, `${b.urlSlug}.json`)) ||
  fs.existsSync(path.join(OUT_DIR, `${b.slug}.json`));
books.sort((a, b) => {
  const aHas = outFileExists(a), bHas = outFileExists(b);
  if (aHas !== bHas) return aHas ? 1 : -1;
  return b.chunks - a.chunks;
});
if (isFinite(limit)) books = books.slice(0, limit);

if (books.length === 0) {
  console.error("No books matched filters.");
  process.exit(1);
}

console.log(`\n📚 genSourcesArticles — ${books.length} book(s)${force ? " (--force)" : ""}${dryRun ? " (--dry-run)" : ""}\n`);

let totalGen = 0, totalSkip = 0, totalFail = 0;
const shortBooks = [];

for (const book of books) {
  const outFile = path.join(OUT_DIR, `${book.urlSlug}.json`);

  if (!force && fs.existsSync(outFile)) {
    const existing = JSON.parse(fs.readFileSync(outFile, "utf-8"));
    const chars = existing.markdown?.length ?? 0;
    console.log(`  SKIP  ${book.urlSlug}  (${chars}c — ${book.title})`);
    totalSkip++;
    continue;
  }

  if (dryRun) {
    console.log(`  DRY   ${book.urlSlug}  (${book.chunks} chunks — ${book.title})`);
    totalGen++;
    continue;
  }

  console.log(`  GEN   ${book.urlSlug}  (${book.school} · ${book.chunks} chunks — ${book.title})`);
  const t0 = Date.now();

  try {
    const excerpt = loadExcerpt(book.slug) || undefined;
    const { markdown, refs } = await getSourceContent(book, excerpt);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const chars = markdown.length;

    if (chars < 300) {
      console.warn(`  WARN  ${book.urlSlug} — suspiciously short (${chars}c)`);
      shortBooks.push(book.urlSlug);
    }

    fs.writeFileSync(outFile, JSON.stringify({ markdown, refs, chars, generated: new Date().toISOString() }, null, 2), "utf-8");
    console.log(`  ✅    ${chars}c in ${elapsed}s → content/seo/sources/${book.urlSlug}.json`);
    totalGen++;

    // Rate limit: short pause between calls
    await new Promise(r => setTimeout(r, 800));
  } catch (err) {
    console.error(`  ✗     ${book.urlSlug}: ${err.message}`);
    totalFail++;
  }
}

console.log(`\n${"─".repeat(50)}`);
console.log(`Generated: ${totalGen}  Skipped: ${totalSkip}  Failed: ${totalFail}`);
if (shortBooks.length > 0) {
  console.log(`\nShort outputs (check manually):\n${shortBooks.map(s => `  - ${s}`).join("\n")}`);
}
if (totalFail > 0) process.exit(1);
