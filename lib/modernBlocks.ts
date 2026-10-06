// Single source of truth for parsing the [現代]...[/現代] "給你的話" blocks the
// model appends to readings. Hardened so malformed model output can never leak:
//  - normalizes full-width / variant brackets (［現代］/【現代】)
//  - tolerates a dangling [現代] with no closing [/現代] (runs to end of text)
//  - strips any stray leftover tags from BOTH text segments and modern-block
//    content itself (2026-10-05: if the model's own 給你的話 prose happens to
//    restate "現代" in brackets anywhere — e.g. self-referencing its own
//    section — the regex's non-greedy capture swallows that bracket pattern
//    into the block's content since it only stops at a real [/現代] or end of
//    string; previously only the surrounding text parts got this cleanup, so
//    a leaked tag fragment could ride along inside the rendered box verbatim)
// Previously this logic was copy-pasted in WizardFlow / CoupleResultView /
// PerspectivesView / ExportReport and drifted; keep it here only.

export type ModernPart = { type: "text" | "modern"; content: string };

export function parseModernBlocks(text: string): ModernPart[] {
  const normalized = (text ?? "")
    // Normalize Simplified Chinese variant [现代] → [現代]
    .replace(/\[现代\]/g, "[現代]")
    .replace(/\[\/现代\]/g, "[/現代]")
    // Normalize full-width / alternate bracket variants
    .replace(/[［【]\s*現代\s*[］】]/g, "[現代]")
    .replace(/[［【]\s*\/\s*現代\s*[］】]/g, "[/現代]");

  const parts: ModernPart[] = [];
  // Closed block, OR a dangling [現代] that runs to end of text.
  const regex = /\[現代\]([\s\S]*?)(?:\[\/現代\]|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", content: normalized.slice(lastIndex, match.index) });
    parts.push({ type: "modern", content: match[1].trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < normalized.length) parts.push({ type: "text", content: normalized.slice(lastIndex) });

  // Applied uniformly to both part types — a modern block's own content can
  // carry a leaked tag fragment just as easily as a text segment can (see
  // comment above), so both need the same scrub, not just text parts.
  const stripStrayTags = (s: string) =>
    s
      .replace(/\[\/?現代\]/g, "")
      .replace(/\[\/?现代\]/g, "")
      .replace(/[［【]\s*\/?\s*現代\s*[］】]/g, "")
      .trim();

  return parts.map(p => ({ ...p, content: stripStrayTags(p.content) }));
}

/** Remove all 現代 blocks, leaving only the classical body text. */
export function stripModern(text: string): string {
  return parseModernBlocks(text)
    .filter(p => p.type === "text")
    .map(p => p.content)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
