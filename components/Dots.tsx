"use client";

export type DotsType = "overall" | "career" | "romance";

const DOTS_COLORS: Record<DotsType, [string, string]> = {
  overall: ["bg-vermillion", "bg-vermillion/12"],
  career:  ["bg-amber-500",  "bg-amber-100"],
  romance: ["bg-rose-400",   "bg-rose-100"],
};

export default function Dots({ n, type }: { n: number; type: DotsType }) {
  const [filled, empty] = DOTS_COLORS[type];
  return (
    <span className="flex gap-px items-center justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < n ? filled : empty}`} />
      ))}
    </span>
  );
}
