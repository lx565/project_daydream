// Pulls one "## Heading" markdown section out of a larger AI-generated couple
// reading, or removes one. Used so 緣分時機 can be its own tab without a new AI
// call — couple/route.ts and bazi-couple/route.ts already produce a timing
// section ("## 緣分時機" / "## 大運時機 · ...") as part of their existing output;
// this just slices it out client-side once the stream is done.
export function extractSection(text: string, heading: string): string {
  const headingRe = new RegExp(`^##\\s*${heading}.*$`, "m");
  const match = headingRe.exec(text);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const nextHeadingIdx = rest.search(/^#{2,3}\s/m);
  return (nextHeadingIdx >= 0 ? rest.slice(0, nextHeadingIdx) : rest).trim();
}

export function removeSection(text: string, heading: string): string {
  const headingRe = new RegExp(`^##\\s*${heading}.*$`, "m");
  const match = headingRe.exec(text);
  if (!match) return text;
  const before = text.slice(0, match.index);
  const rest = text.slice(match.index + match[0].length);
  const nextHeadingIdx = rest.search(/^#{2,3}\s/m);
  const after = nextHeadingIdx >= 0 ? rest.slice(nextHeadingIdx) : "";
  return (before + after).trim();
}
