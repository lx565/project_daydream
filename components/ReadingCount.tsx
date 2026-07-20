"use client";

import { useEffect, useState } from "react";

// Exact live count with thousands separators (e.g. 3023 → "3,023").
// Falls back to the seed baseline before the fetch lands.
function format(n: number): string {
  return n.toLocaleString("en-US");
}

export default function ReadingCount() {
  const [count, setCount] = useState(3023);

  useEffect(() => {
    fetch("/api/stats/readings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.count === "number") setCount(d.count);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="inline-flex items-center gap-2 text-xs text-ink-3">
      <span className="w-1.5 h-1.5 rounded-full bg-vermillion inline-block" />
      已有 <span className="font-bold text-vermillion">{format(count)}</span> 人生成命盤
    </div>
  );
}
