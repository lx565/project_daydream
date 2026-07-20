"use client";

import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select + execCommand for older browsers
      const el = document.createElement("input");
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        copied
          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-400/50 hover:text-amber-400"
      }`}
    >
      {copied ? "已複製連結 ✓" : "複製連結"}
    </button>
  );
}
