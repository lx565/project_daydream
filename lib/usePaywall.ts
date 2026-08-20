"use client";

import { useEffect, useRef, useState } from "react";
import { gtagEvent } from "@/lib/gtag";
import { chartType, CHART_PRICE_USD } from "@/lib/chartType";

// Client hook resolving the paywall state for a chart.
//
//   enabled  — master switch (NEXT_PUBLIC_PAYWALL_ENABLED === "true").
//              While false the whole feature is inert: every section stays free,
//              so deploying the paywall code changes nothing until you flip the
//              env var in Vercel.
//   unlocked — server-authoritative (granted by the Stripe webhook → KV),
//              read via /api/unlock?chartId=. Returning from Stripe Checkout
//              the URL carries ?paid=1, so we poll briefly to absorb webhook lag.
//   loading  — true until the first unlock check resolves; callers should not
//              start (pay for) gated AI sections while loading.

const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

// Fires "purchase" at most once per chart per browser session — guards against
// re-firing on a manual refresh of the ?paid=1 return page (refs alone don't
// survive a remount, only sessionStorage does).
function trackPurchaseOnce(chartId: string) {
  const key = `ga_purchase_tracked_${chartId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  const type = chartType(chartId);
  gtagEvent("purchase", { transaction_id: chartId, value: CHART_PRICE_USD[type], currency: "USD", chart_type: type });
}

export interface PaywallState {
  enabled: boolean;
  unlocked: boolean;
  loading: boolean;
}

export function usePaywall(chartId?: string): PaywallState {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(PAYWALL_ENABLED);
  const polled = useRef(false);

  useEffect(() => {
    if (!PAYWALL_ENABLED || !chartId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function check(): Promise<boolean> {
      try {
        const res = await fetch(`/api/unlock?chartId=${encodeURIComponent(chartId!)}`);
        const data = await res.json();
        return data.unlocked === true;
      } catch {
        return false;
      }
    }

    async function run() {
      // Just returned from Stripe? Check this before the unlock check itself —
      // the webhook can land before this page even mounts, so "already unlocked"
      // on the very first check does not mean the purchase was tracked yet.
      const justPaid = new URLSearchParams(window.location.search).has("paid");

      const ok = await check();
      if (cancelled) return;
      if (ok) {
        setUnlocked(true);
        setLoading(false);
        if (justPaid) trackPurchaseOnce(chartId!);
        return;
      }

      // Webhook hasn't landed yet — poll a few times.
      if (justPaid && !polled.current) {
        polled.current = true;
        for (let i = 0; i < 6 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          if (await check()) {
            if (!cancelled) {
              setUnlocked(true);
              trackPurchaseOnce(chartId!);
              break;
            }
          }
        }
      }
      if (!cancelled) setLoading(false);
    }

    run();
    return () => { cancelled = true; };
  }, [chartId]);

  return { enabled: PAYWALL_ENABLED, unlocked, loading };
}
