"use client";

import { useEffect, useRef, useState } from "react";
import { gtagEvent } from "@/lib/gtag";

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
      const ok = await check();
      if (cancelled) return;
      if (ok) {
        setUnlocked(true);
        setLoading(false);
        return;
      }
      // Just returned from Stripe? Poll a few times for the webhook to land.
      const justPaid = new URLSearchParams(window.location.search).has("paid");
      if (justPaid && !polled.current) {
        polled.current = true;
        for (let i = 0; i < 6 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          if (await check()) {
            if (!cancelled) {
              setUnlocked(true);
              // Fires only on this Stripe-return transition, not on later
              // reloads of an already-unlocked chart — chartId doubles as
              // transaction_id so a duplicate fire (e.g. StrictMode) dedupes in GA4.
              gtagEvent("purchase", { transaction_id: chartId, value: 6.99, currency: "USD" });
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
