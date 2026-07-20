"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type State = "idle" | "voting" | "up" | "down";

export default function VoteWidget() {
  const pathname = usePathname();
  const [state, setState] = useState<State>("idle");

  // Remember if this browser already voted on this page.
  useEffect(() => {
    try {
      const prior = localStorage.getItem(`vote:${pathname}`);
      if (prior === "up" || prior === "down") setState(prior);
    } catch {}
  }, [pathname]);

  async function vote(choice: "up" | "down") {
    if (state === "voting" || state === "up" || state === "down") return;
    setState("voting");
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, vote: choice }),
      });
    } catch {}
    try { localStorage.setItem(`vote:${pathname}`, choice); } catch {}
    setState(choice);
  }

  const voted = state === "up" || state === "down";

  return (
    <div className="paper-card rounded-2xl border border-border-warm p-5 text-center space-y-3">
      {!voted ? (
        <>
          <p className="text-sm font-bold text-ink">這篇內容對你有幫助嗎？</p>
          <p className="text-xs text-ink-4 leading-relaxed">
            你的投票會直接影響我們對這篇文章的修訂與完善——<br className="hidden sm:block" />
            每一票我們都認真對待。
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => vote("up")}
              disabled={state === "voting"}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-border-warm text-sm text-ink-2 hover:border-vermillion hover:text-vermillion transition-colors disabled:opacity-50"
            >
              <span>👍</span> 有幫助
            </button>
            <button
              onClick={() => vote("down")}
              disabled={state === "voting"}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-border-warm text-sm text-ink-2 hover:border-vermillion hover:text-vermillion transition-colors disabled:opacity-50"
            >
              <span>🤔</span> 需改進
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-vermillion">謝謝你的反饋 🙏</p>
          <p className="text-xs text-ink-4 leading-relaxed">
            {state === "up"
              ? "很高興這篇對你有幫助，我們會繼續打磨它。"
              : "我們收到了，會根據反饋認真修訂這篇文章。"}
          </p>
        </div>
      )}
    </div>
  );
}
