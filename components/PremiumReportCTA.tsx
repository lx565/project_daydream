"use client";

import { useState } from "react";

interface Props {
  sessionId?: string;
  page?: string;
}

type State = "idle" | "submitting" | "done";

export default function PremiumReportCTA({ sessionId, page = "result" }: Props) {
  const [state, setState] = useState<State>("idle");
  const [contact, setContact] = useState("");

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const value = contact.trim();
    if (!value || state === "submitting") return;
    setState("submitting");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "報告候補·一生詳批",
          description: value,
          page,
          sessionId: sessionId ?? "",
        }),
      });
    } catch {}
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="paper-card rounded-2xl border border-vermillion/30 bg-vermillion-l p-5 text-center space-y-1.5 animate-fade-in">
        <p className="text-sm font-bold text-vermillion">已加入候補名單 🙏</p>
        <p className="text-xs text-ink-3 leading-relaxed">
          報告上線時我們會第一時間通知你——感謝你的支援。
        </p>
      </div>
    );
  }

  return (
    <div className="paper-card rounded-2xl border border-border-warm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-gold rounded-full" />
        <p className="text-sm font-bold text-ink">想要一份完整的「一生詳批」報告嗎？</p>
      </div>
      <p className="text-xs text-ink-3 leading-relaxed">
        十二宮逐宮精解 · 大限流年走勢 · 性格 / 事業 / 感情 / 財運全維度，
        匯成一份可永久儲存、精美排版的 PDF 長圖報告。
        <span className="text-gold font-medium">即將推出。</span>
        留下聯絡方式，上線時第一時間通知你。
      </p>
      <form onSubmit={join} className="flex flex-col sm:flex-row gap-2 pt-1">
        <input
          type="text"
          inputMode="email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="郵箱 / 微訊號"
          className="flex-1 rounded-full border border-border-warm bg-paper px-4 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "submitting" || !contact.trim()}
          className="rounded-full bg-vermillion px-5 py-2 text-sm font-medium text-paper hover:bg-vermillion-h transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {state === "submitting" ? "提交中…" : "加入候補名單"}
        </button>
      </form>
      <p className="text-[11px] text-ink-4 leading-relaxed">
        我們只用它來通知你報告上線，不會用於任何其他用途。
      </p>
    </div>
  );
}
