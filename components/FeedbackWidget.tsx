"use client";

import { useState } from "react";

type FeedbackState = "idle" | "submitting" | "done";

export default function FeedbackWidget({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<FeedbackState>("idle");
  const [selected, setSelected] = useState<"up" | "down" | null>(null);

  async function submit(rating: "up" | "down") {
    setSelected(rating);
    setState("submitting");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, rating }),
      });
    } catch { /* silent */ }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-4">
        <span>{selected === "up" ? "👍" : "👎"}</span>
        <span>感謝你的反饋！</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-4">這次解讀準確嗎？</span>
      <button onClick={() => submit("up")} disabled={state === "submitting"}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-jade-l border border-jade/30 text-jade hover:bg-jade hover:text-paper transition-colors disabled:opacity-50">
        準確
      </button>
      <button onClick={() => submit("down")} disabled={state === "submitting"}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-paper-2 border border-border-warm text-ink-3 hover:bg-vermillion-l hover:border-vermillion/30 hover:text-vermillion transition-colors disabled:opacity-50">
        不準
      </button>
    </div>
  );
}
