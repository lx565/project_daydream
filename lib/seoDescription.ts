// Build a click-optimized meta description for SEO article pages.
//
// The snippet Google shows is what actually wins the click. Leading with the
// article's opening prose (the old `intro.slice(0,120)`) buries the answer behind
// throat-clearing ("X 出現在 … 命盤中。X 是 …"). Instead, lead with the page's
// one-sentence direct answer (`entry.oneLine` — the "一句話" box), then fill with
// intro context, capped near Google's ~155-char display limit. Same content the
// page already authored — just ordered for CTR.
export function seoDescription(oneLine: string | undefined, intro: string, max = 150): string {
  const lead = (oneLine ?? "").trim();
  const body = intro.trim();
  const combined = lead && !body.startsWith(lead) ? `${lead} ${body}` : body;
  return combined.length > max ? combined.slice(0, max).trimEnd() + "…" : combined;
}
