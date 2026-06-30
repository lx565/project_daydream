"use client";

import { useState } from "react";
import Image from "next/image";
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
  "永久保存 · 可重复查阅",
];

type Method = "wechat" | "alipay";

export default function PaywallLock({ chartId, sectionLabel, included = DEFAULT_INCLUDED }: Props) {
  const [method, setMethod] = useState<Method>("wechat");
  const [orderNo, setOrderNo] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function claim() {
    if (submitting || !orderNo.trim()) return;
    setSubmitting(true);
    setErr("");
    gtagEvent("paywall_qr_claim", { chart_id: chartId, method, section: sectionLabel ?? "" });
    try {
      const res = await fetch("/api/unlock/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId, orderNo: orderNo.trim(), contact: contact.trim(), method }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        // Brief delay then reload so usePaywall re-checks server state
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setErr("提交失败，请重试");
        setSubmitting(false);
      }
    } catch {
      setErr("网络错误，请重试");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-jade/30 bg-jade/5 p-6 text-center animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-jade/15 text-2xl">✓</div>
        <p className="text-sm font-medium text-jade">验证成功，正在解锁…</p>
      </div>
    );
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

      {/* What's included */}
      <ul className="mb-4 space-y-1.5">
        {included.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-ink-2">
            <span className="mt-0.5 text-gold flex-shrink-0">✦</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Payment method tabs */}
      <div className="flex rounded-lg border border-border-warm overflow-hidden mb-4">
        <button
          onClick={() => setMethod("wechat")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${method === "wechat" ? "bg-[#07C160] text-white" : "bg-paper text-ink-3 hover:text-ink-2"}`}
        >
          微信支付
        </button>
        <button
          onClick={() => setMethod("alipay")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${method === "alipay" ? "bg-[#1677FF] text-white" : "bg-paper text-ink-3 hover:text-ink-2"}`}
        >
          支付宝
        </button>
      </div>

      {/* QR code */}
      <div className="flex justify-center mb-4">
        <div className="rounded-xl overflow-hidden border border-border-warm p-2 bg-white w-44 h-44 flex items-center justify-center">
          <Image
            src={method === "wechat" ? "/pay-wechat-29-v2.jpg" : "/pay-alipay-29-v2.jpg"}
            alt={method === "wechat" ? "微信支付 ¥29" : "支付宝 ¥29"}
            width={160}
            height={160}
            className="object-contain"
          />
        </div>
      </div>
      <p className="text-center text-xs font-semibold text-ink mb-1">¥29.00</p>
      <p className="text-center text-[11px] text-ink-4 mb-4">
        {method === "wechat" ? "微信扫码支付" : "支付宝扫码支付"} · 付款后填写下方订单号
      </p>

      {/* Order number + contact */}
      <div className="space-y-2 mb-3">
        <input
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          placeholder="付款订单号（必填）"
          className="w-full px-3 py-2 rounded-lg border border-border-warm bg-parchment text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/40 focus:ring-1 focus:ring-vermillion/15"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="联系方式 · 微信/手机（选填）"
          className="w-full px-3 py-2 rounded-lg border border-border-warm bg-parchment text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/40 focus:ring-1 focus:ring-vermillion/15"
        />
      </div>

      <button
        onClick={claim}
        disabled={submitting || !orderNo.trim()}
        style={{ color: "#FDFCF8" }}
        className="w-full rounded-full bg-vermillion px-6 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {submitting ? "验证中…" : "提交订单号 · 立即解锁"}
      </button>

      {err && <p className="mt-2 text-xs text-vermillion text-center">{err}</p>}

      <p className="mt-3 text-center text-[11px] text-ink-4 leading-relaxed">
        付款后人工验证，通常即时解锁 · 如未解锁请留联系方式
      </p>
    </div>
  );
}
