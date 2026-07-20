"use client";

import { useState } from "react";

const TYPES = ["排盤有誤", "解讀問題", "功能異常", "其他"] as const;

export default function BugReportButton({ sessionId, page }: { sessionId?: string; page?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("排盤有誤");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit() {
    if (!description.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description, page, sessionId }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    setDescription("");
    setType("排盤有誤");
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-paper border border-border-warm text-ink-3 shadow-sm hover:border-vermillion hover:text-vermillion transition-colors"
      >
        <span>⚑</span> 報錯
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="relative w-full max-w-sm bg-parchment rounded-2xl border border-border-warm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink tracking-wide">報告問題</h3>
              <button onClick={close} className="text-ink-4 hover:text-ink text-lg leading-none">×</button>
            </div>

            {status === "done" ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-vermillion font-medium text-sm">已收到，謝謝反饋</p>
                <p className="text-xs text-ink-4">我會盡快排查修復</p>
                <button onClick={close} className="mt-3 px-4 py-1.5 rounded-full text-xs border border-border-warm hover:border-vermillion text-ink-3 hover:text-vermillion transition-colors">關閉</button>
              </div>
            ) : (
              <>
                {/* Type */}
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        type === t
                          ? "bg-vermillion text-white border-vermillion"
                          : "border-border-warm text-ink-3 hover:border-vermillion hover:text-vermillion"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="簡單描述一下問題（比如：命宮星曜不對、解讀答非所問…）"
                  className="w-full h-24 text-xs p-3 rounded-xl border border-border-warm bg-paper resize-none focus:outline-none focus:border-vermillion/60 text-ink placeholder:text-ink-4"
                />

                {status === "error" && (
                  <p className="text-xs text-red-500">提交失敗，請稍後再試</p>
                )}

                <button
                  onClick={submit}
                  disabled={!description.trim() || status === "sending"}
                  className="w-full py-2 rounded-xl text-xs font-medium bg-vermillion text-white hover:bg-vermillion/90 disabled:opacity-40 transition-colors"
                >
                  {status === "sending" ? "提交中…" : "提交"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
