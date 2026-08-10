// Templated FAQ (no AI) for SEO article pages that share the {name, oneLine, intro}
// shape (bazi life-domain clusters, etc.). Feeds the FAQPage JSON-LD (People-Also-Ask
// surface) + the visible accordion. Phrased to how people actually search these
// topics: definitional ("X是什麼意思") + evaluative ("X代表什麼，該怎麼理解").
export function seoFaqItems(
  entry: { name: string; oneLine: string; intro: string }
): { question: string; answer: string }[] {
  return [
    { question: `${entry.name}是什麼意思？`, answer: entry.intro },
    { question: `${entry.name}代表什麼？該怎麼理解？`, answer: entry.oneLine },
  ];
}
