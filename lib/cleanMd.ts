// Bulletproof markdown bold normalization — the PERMANENT fix for literal `**` bugs.
//
// Root cause of the recurring bug: we relied on the markdown parser (CommonMark) to
// render `**bold**`, but CommonMark's "flanking" rules break around Chinese text and
// full-width punctuation (e.g. `）**日主`, `** 一句話**`), leaking literal asterisks.
// Regex-patching each broken case was whack-a-mole.
//
// The fix: we match bold OURSELVES with a forgiving regex and emit real <strong> HTML,
// so CommonMark's bold rules never run. Then we delete every leftover `**`, so a
// literal double-asterisk can NEVER reach the page — worst case a stray bold silently
// renders as plain text (acceptable), but the user never sees `**` again.
//
// The <strong> HTML is rendered via rehype-raw + rehype-sanitize (see lib/mdConfig.ts).
// EVERY markdown renderer must run cleanMd + use MD_REHYPE — Md, SeoMarkdown,
// ChatInterface, ExportReport, and the /personality + /zodiac pages.
export function cleanMd(text: string): string {
  let t = text ?? "";
  // 1. `**X**` → `<strong>X</strong>`. Non-greedy, trims inner spaces, content has no
  //    `*` inside — so we own the match and CommonMark flanking never applies.
  t = t.replace(/\*\*[ \t　]*([^\n*]+?)[ \t　]*\*\*/g, "<strong>$1</strong>");
  // 2. Delete any surviving `**` (orphans, unclosed openers, mashed runs). This is the
  //    guarantee: no literal `**` can render, ever.
  t = t.replace(/\*\*+/g, "");
  return t;
}
