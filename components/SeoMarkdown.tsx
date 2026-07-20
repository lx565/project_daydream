import ReactMarkdown from "react-markdown";
import { cleanMd } from "@/lib/cleanMd";
import { MD_REMARK, MD_REHYPE } from "@/lib/mdConfig";

// Terms to auto-highlight so articles are scannable and lively. Longer terms first
// so multi-char palaces/terms win over shorter overlaps.
const PALACES = ["命宮","兄弟宮","夫妻宮","子女宮","財帛宮","疾厄宮","遷移宮","交友宮","官祿宮","田宅宮","福德宮","父母宮"];
const MAJOR_STARS = ["紫微","天機","太陽","武曲","天同","廉貞","天府","太陰","貪狼","巨門","天相","天梁","七殺","破軍"];
const MINOR_STARS = ["左輔","右弼","文昌","文曲","天魁","天鉞","祿存","天馬","擎羊","陀羅","火星","鈴星","地空","地劫","紅鸞","天喜"];
const TERMS = ["三方四正","化祿","化權","化科","化忌","廟旺","落陷","大限","流年"];

const HIGHLIGHT = [...new Set([...PALACES, ...TERMS, ...MAJOR_STARS, ...MINOR_STARS])]
  .sort((a, b) => b.length - a.length);
const TERM_RE = new RegExp(`(${HIGHLIGHT.join("|")})`, "g");

// Bold the key terms, but never inside an existing **bold** span or a heading line,
// so we don't break markdown or double-emphasize what the model already bolded.
function highlightTerms(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return line; // leave headings alone
      return line
        .split(/(\*\*[^*]+\*\*)/g)
        .map((seg) => (seg.startsWith("**") ? seg : seg.replace(TERM_RE, "**$1**")))
        .join("")
        // Adjacent highlighted terms create `**a****b**` — the `****` won't parse as
        // markdown between CJK chars and leaks literal asterisks. Collapse it so the
        // two terms merge into a single bold run.
        .replace(/\*{4}/g, "");
    })
    .join("\n");
}

// Renders synthesized Chinese content with the classical ink/parchment styling.
export default function SeoMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={MD_REMARK}
      rehypePlugins={MD_REHYPE}
      components={{
        h2: ({ children }) => (
          <div className="flex items-center gap-2 pt-2">
            <div className="w-1 h-4 bg-gold rounded-full shrink-0" />
            <h2 className="text-sm font-bold text-ink tracking-wide">{children}</h2>
          </div>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-ink-2 pt-1">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-ink-2 leading-[1.95]">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="space-y-1.5 list-none pl-0">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="text-sm text-ink-2 leading-[1.85] pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-gold/40">
            {children}
          </li>
        ),
        // Key terms (stars, palaces, 四化…) rendered as vermillion highlights.
        strong: ({ children }) => (
          <strong className="font-semibold text-gold">{children}</strong>
        ),
      }}
    >
      {cleanMd(highlightTerms(children))}
    </ReactMarkdown>
  );
}
