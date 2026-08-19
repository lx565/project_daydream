"use client";

import { useState } from "react";

export default function ReadingFeedbackPrompt({ sessionId }: { sessionId?: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (dismissed) return null;

  async function submit() {
    if (!description.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "付費解讀留言", description, page: "result", sessionId }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="no-print rounded-2xl border border-border-warm bg-paper-2 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-2 tracking-wide">這份解讀對你有幫助嗎？有什麼想法都可以告訴我們</p>
        <button onClick={() => setDismissed(true)} className="text-ink-4 hover:text-ink text-lg leading-none shrink-0 ml-2">×</button>
      </div>

      {status === "done" ? (
        <p className="text-xs text-vermillion">已收到，謝謝你的想法</p>
      ) : (
        <>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="喜歡哪部分、覺得哪裡不準、希望我們補充什麼…都歡迎"
            className="w-full h-20 text-xs p-3 rounded-xl border border-border-warm bg-paper resize-none focus:outline-none focus:border-vermillion/60 text-ink placeholder:text-ink-4"
          />
          {status === "error" && <p className="text-xs text-red-500">提交失敗，請稍後再試</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={submit}
              disabled={!description.trim() || status === "sending"}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-vermillion text-white hover:bg-vermillion/90 disabled:opacity-40 transition-colors"
            >
              {status === "sending" ? "提交中…" : "送出"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
