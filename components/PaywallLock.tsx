"use client";

import { useEffect, useRef, useState } from "react";
import { startCardCheckout } from "@/lib/checkout";
import { gtagEvent } from "@/lib/gtag";

interface Props {
  chartId: string;
  sectionLabel?: string;
  included?: string[];
  /** One dynamic line personalizing the pitch with data already on the client
   *  (e.g. the user's 命宮主星). Optional — omit to fall back to the generic pitch. */
  personalizedHint?: string;
}

// Honest social proof — real reading count from KV; renders nothing until the
// fetch lands (no seeded/fake number inside a payment surface).
function UnlockSocialProof() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats/readings")
      .then((r) => r.json())
      .then((d) => { if (typeof d?.count === "number") setCount(d.count); })
      .catch(() => {});
  }, []);
  if (count === null) return null;
  return (
    <p className="mt-2.5 text-center text-[11px] text-ink-4">
      已有 <span className="font-semibold text-amber-800">{count.toLocaleString("en-US")}</span> 人在命裡生成命書
    </p>
  );
}

const DEFAULT_INCLUDED = [
  "十二宮位 · 逐宮精解",
  "大運流年 · 運勢時機（含逐年詳批）",
  "八字命理 · 雙重印證",
  "眾說紛紜 · 三派各自論斷",
  "特別注意 · 風險與化解",
  "問命追問 · 可向模型深度追問命盤細節",
  "永久保存 · 可重複查閱",
];

export default function PaywallLock({ chartId, sectionLabel, included = DEFAULT_INCLUDED, personalizedHint }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current || !chartId) return;
    viewed.current = true;
    gtagEvent("paywall_view", { chart_id: chartId, section: sectionLabel ?? "" });
  }, [chartId, sectionLabel]);

  async function handleCheckout() {
    if (loading || !chartId) return;
    setLoading(true);
    setErr("");
    gtagEvent("paywall_checkout_start", { chart_id: chartId, section: sectionLabel ?? "" });
    const result = await startCardCheckout(chartId);
    if (!result.ok) {
      setErr("付款跳轉失敗，請稍後再試");
      setLoading(false);
    }
    // On success startCardCheckout redirects — no further state needed
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gold/40 bg-gradient-to-b from-gold-l/40 to-paper p-5 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-xl">🔒</div>
        <h3 className="text-base font-bold text-ink">解鎖完整命書</h3>
        <p className="mt-1 text-xs text-ink-3 leading-relaxed">
          {sectionLabel ? `「${sectionLabel}」及` : ""}以下深度解讀一次解鎖，全部開啟
        </p>
      </div>

      {/* Quality proof strip */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { icon: "📖", stat: "萬字以上", label: "深度解讀" },
          { icon: "🔄", stat: "多模型", label: "交叉校對" },
          { icon: "📚", stat: "上百部", label: "命理典籍加持" },
          { icon: "⚡", stat: "雙體系", label: "紫微×八字印證" },
        ].map(({ icon, stat, label }) => (
          <div key={stat} className="flex items-center gap-1.5 rounded-lg bg-gold/8 border border-gold/20 px-2.5 py-2">
            <span className="text-base leading-none">{icon}</span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-800 leading-tight">{stat}</div>
              <div className="text-[10px] text-ink-4 leading-tight truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Personalized hint — one dynamic line using client-side chart data, if provided */}
      {personalizedHint && (
        <p className="mb-4 rounded-lg border border-gold/25 bg-gold/8 px-3 py-2 text-xs text-ink-2 leading-relaxed">
          {personalizedHint}
        </p>
      )}

      {/* What's included */}
      <ul className="mb-5 space-y-1.5">
        {included.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-ink-2">
            <span className="mt-0.5 text-gold flex-shrink-0">✦</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Price + CTA */}
      <div className="text-center mb-3">
        <p className="text-[11px] text-ink-4 mb-1">人工命理諮詢動輒數千元起跳</p>
        <span className="text-2xl font-bold text-ink">$6.99</span>
        <span className="text-xs text-ink-4 ml-1">USD · 一次付費 · 永久解鎖</span>
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{ color: "#FDFCF8" }}
        className="w-full rounded-full bg-vermillion px-6 py-3 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            跳轉中…
          </>
        ) : (
          "立即解鎖 · 信用卡 / Apple Pay"
        )}
      </button>

      {err && <p className="mt-2 text-xs text-vermillion text-center">{err}</p>}

      <UnlockSocialProof />

      <p className="mt-3 text-center text-[11px] text-ink-4 leading-relaxed">
        付款成功後自動解鎖 · 安全加密 · 支援 Visa / Mastercard / Apple Pay
      </p>
    </div>
  );
}
