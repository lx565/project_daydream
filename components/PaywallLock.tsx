"use client";

import { useEffect, useRef, useState } from "react";
import { startCardCheckout } from "@/lib/checkout";
import { gtagEvent } from "@/lib/gtag";

interface Props {
  chartId: string;
  sectionLabel?: string;
  included?: string[];
}

const DEFAULT_INCLUDED = [
  "十二宫位 · 逐宫精解",
  "大运流年 · 运势时机（含逐年详批）",
  "八字命理 · 双重印证",
  "众说纷纭 · 三派各自论断",
  "特别注意 · 风险与化解",
  "问命追问 · 可向模型深度追问命盘细节",
  "永久保存 · 可重复查阅",
];

export default function PaywallLock({ chartId, sectionLabel, included = DEFAULT_INCLUDED }: Props) {
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
      setErr("支付跳转失败，请稍后再试");
      setLoading(false);
    }
    // On success startCardCheckout redirects — no further state needed
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-gold/40 bg-gradient-to-b from-gold-l/40 to-paper p-5 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-xl">🔒</div>
        <h3 className="text-base font-bold text-ink">解锁完整命书</h3>
        <p className="mt-1 text-xs text-ink-3 leading-relaxed">
          {sectionLabel ? `「${sectionLabel}」及` : ""}以下深度解读一次解锁，全部开启
        </p>
      </div>

      {/* Quality proof strip */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { icon: "📖", stat: "万字以上", label: "深度解读" },
          { icon: "🔄", stat: "多模型", label: "交叉校对" },
          { icon: "📚", stat: "上百部", label: "命理典籍加持" },
          { icon: "⚡", stat: "双体系", label: "紫微×八字印证" },
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
        <span className="text-2xl font-bold text-ink">$6.99</span>
        <span className="text-xs text-ink-4 ml-1">一次付费 · 永久解锁</span>
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
            跳转中…
          </>
        ) : (
          "立即解锁 · 信用卡 / 借记卡支付"
        )}
      </button>

      {err && <p className="mt-2 text-xs text-vermillion text-center">{err}</p>}

      <p className="mt-3 text-center text-[11px] text-ink-4 leading-relaxed">
        支付成功后自动解锁 · 安全加密 · 支持 Visa / Mastercard / Apple Pay
      </p>
    </div>
  );
}
