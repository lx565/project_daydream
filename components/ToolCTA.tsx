"use client";

import Link from "next/link";
import { gtagEvent } from "@/lib/gtag";

const HREF = "/?from=seo";

interface Props {
  variant?: "card" | "slim";
  sub?: string;
  label?: string;
}

export default function ToolCTA({ variant = "card", sub, label }: Props) {
  function handleClick() {
    gtagEvent("library_to_tool", { variant });
  }

  if (variant === "slim") {
    return (
      <Link
        href={HREF}
        onClick={handleClick}
        className="block text-center bg-vermillion text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-vermillion-h transition-colors"
      >
        {label ?? "三派合參 · AI 依據 逾百部典籍為你詳批命盤 →"}
      </Link>
    );
  }

  return (
    <div className="paper-card rounded-2xl border border-border-warm p-6 text-center space-y-3">
      <p className="text-sm text-ink-2 leading-relaxed">
        {sub ?? "三合、四化、飛星三派合參，AI 依據 逾百部典籍，為你逐宮詳批命格、大限與流年。"}
      </p>
      <Link
        href={HREF}
        onClick={handleClick}
        className="inline-block bg-vermillion text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-vermillion-h transition-colors"
      >
        {label ?? "生成我的命盤詳批"}
      </Link>
    </div>
  );
}
