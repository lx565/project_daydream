"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function LikeButton() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`vote:${pathname}`) === "up") setLiked(true);
    } catch {}

    fetch(`/api/vote?path=${encodeURIComponent(pathname)}`)
      .then(r => r.json())
      .then(d => setCount(Number(d.up ?? 0)))
      .catch(() => setCount(0));
  }, [pathname]);

  async function handleLike() {
    if (liked || loading) return;
    setLoading(true);
    setLiked(true);
    setCount(c => (c ?? 0) + 1);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, vote: "up" }),
      });
      const data = await res.json();
      setCount(Number(data.up ?? 0));
      localStorage.setItem(`vote:${pathname}`, "up");
    } catch {}
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLike}
        disabled={liked || loading}
        aria-label={liked ? "已點贊" : "點贊這篇文章"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all
          ${liked
            ? "border-vermillion/40 text-vermillion bg-vermillion/5 cursor-default"
            : "border-border-warm text-ink-4 hover:border-vermillion hover:text-vermillion hover:bg-vermillion/5 active:scale-95"
          }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 transition-all ${liked ? "fill-vermillion stroke-vermillion" : "fill-none stroke-current"}`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="text-xs font-medium tabular-nums">
          {liked ? "已喜歡" : "喜歡"}
        </span>
      </button>
      {count !== null && count > 0 && (
        <span className="text-xs text-ink-4 tabular-nums">{count} 人覺得有幫助</span>
      )}
    </div>
  );
}
