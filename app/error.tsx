"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="paper-card rounded-2xl border border-border-warm p-8 text-center max-w-md space-y-4">
        <p className="text-3xl">🌫️</p>
        <h1 className="text-lg font-bold text-ink">出了點小狀況</h1>
        <p className="text-sm text-ink-3 leading-relaxed">
          頁面遇到了一個意外錯誤。可能是輸入的資訊有誤，或服務暫時不可用。請稍後重試。
        </p>
        <div className="flex gap-3 justify-center pt-1">
          <button
            onClick={reset}
            className="rounded-full border border-gold/40 bg-gold-l px-5 py-2 text-sm font-medium text-gold hover:border-gold transition-colors"
          >
            重試
          </button>
          <a
            href="/"
            className="rounded-full border border-border-warm px-5 py-2 text-sm text-ink-3 hover:text-ink-2 hover:border-gold/50 transition-colors"
          >
            返回首頁
          </a>
        </div>
      </div>
    </main>
  );
}
