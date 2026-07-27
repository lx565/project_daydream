"use client";

import { useState } from "react";
import { buildReadingEmail, type ReadingEmailData } from "@/lib/emailTemplate";
import { gtagEvent } from "@/lib/gtag";

interface ReadingExportProps {
  data: ReadingEmailData;
}

export default function ReadingExport({ data }: ReadingExportProps) {
  const [xhsCopied, setXhsCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail]         = useState("");
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState("");

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("input");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }

  async function handleShareXhs() {
    gtagEvent("share_xhs");
    await copyToClipboard(
      "我在命裡生成了自己的命盤解讀，紫微+八字雙系統AI解讀，附典籍引用 → https://www.mingli.study"
    );
    setXhsCopied(true);
    setTimeout(() => setXhsCopied(false), 2500);
  }

  function handlePrint() {
    gtagEvent("export_pdf");
    const { html } = buildReadingEmail(data);
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/email/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), ...data }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "發送失敗，請稍後再試");
      } else {
        gtagEvent("export_email_sent");
        setSent(true);
        setShowEmail(false);
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-8 border-t border-border-light pt-6">
      <p className="text-center text-xs text-ink-4 tracking-widest mb-4">儲存 & 分享</p>

      {/* 分享命盤 copy-link button removed — leaked free access to anyone with the link; reinstate after 2026-07-24-unlock-token-design.md ships */}
      <div className="grid grid-cols-2 gap-3">
        {/* Download PDF */}
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-border-warm bg-paper hover:border-vermillion/40 hover:bg-paper-2 text-ink-3 hover:text-ink transition-all"
        >
          <span className="text-xl">⬇</span>
          <span className="text-xs font-medium leading-tight text-center">下載 PDF</span>
        </button>

        {/* Email */}
        <button
          onClick={() => { setShowEmail(v => !v); setSent(false); }}
          className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-all ${
            showEmail
              ? "border-vermillion/50 bg-vermillion/5 text-vermillion"
              : "border-border-warm bg-paper hover:border-vermillion/40 hover:bg-paper-2 text-ink-3 hover:text-ink"
          }`}
        >
          <span className="text-xl">✉</span>
          <span className="text-xs font-medium leading-tight text-center">郵件報告</span>
        </button>
      </div>

      {/* Light-touch 小紅書 nudge — copies a share-ready caption, no hard sell */}
      <button
        onClick={handleShareXhs}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs text-ink-4 hover:text-vermillion transition-colors"
      >
        <span>{xhsCopied ? "✓" : "📌"}</span>
        <span>{xhsCopied ? "文案已複製，快去小紅書分享吧" : "分享到小紅書"}</span>
      </button>

      {/* Email form — expands when ✉ clicked */}
      {showEmail && (
        <div className="mt-4 p-4 rounded-xl border border-border-warm bg-paper-2">
          {sent ? (
            <div className="flex items-center gap-2 text-sm text-jade font-medium py-1">
              <span>✓</span>
              <span>報告已發送至 {email}，請查收郵件（含垃圾郵件）。</span>
            </div>
          ) : (
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  className="flex-1 text-sm border border-border-warm rounded-lg px-3 py-2 bg-paper focus:outline-none focus:border-vermillion/50"
                  required
                />
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="px-4 py-2 bg-vermillion text-paper text-sm font-medium rounded-lg hover:bg-vermillion/90 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {sending ? "發送中…" : "發送"}
                </button>
              </div>
              {error && <p className="text-xs text-vermillion">{error}</p>}
              <p className="text-[11px] text-ink-4">
                包含完整解讀報告。我們不會分享或出售您的郵件地址。
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
