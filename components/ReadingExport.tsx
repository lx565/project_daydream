"use client";

import { useState } from "react";
import { buildReadingEmail, type ReadingEmailData } from "@/lib/emailTemplate";

interface ReadingExportProps {
  data: ReadingEmailData;
}

export default function ReadingExport({ data }: ReadingExportProps) {
  const [copied, setCopied]       = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail]         = useState("");
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const el = document.createElement("input");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
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

      {/* Three action buttons */}
      <div className="grid grid-cols-3 gap-3">
        {/* Share */}
        <button
          onClick={handleCopy}
          className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border transition-all ${
            copied
              ? "border-jade/50 bg-jade/5 text-jade"
              : "border-border-warm bg-paper hover:border-gold/40 hover:bg-paper-2 text-ink-3 hover:text-ink"
          }`}
        >
          <span className="text-xl">{copied ? "✓" : "🔗"}</span>
          <span className="text-xs font-medium leading-tight text-center">
            {copied ? "已複製" : "分享命盤"}
          </span>
        </button>

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
