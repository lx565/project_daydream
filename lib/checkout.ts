// Kicks off a Stripe Checkout session for a card unlock and redirects to it.
// The server (/api/checkout) is authoritative: it creates the session with the
// chartId in metadata, and the webhook grants the unlock only after payment.
// Returning from Stripe, success_url carries ?paid=1 so usePaywall polls for the
// webhook to land. Shared by PaywallLock and the chat-limit upsell.

export async function startCardCheckout(chartId: string): Promise<{ ok: boolean; error?: string }> {
  if (!chartId) return { ok: false, error: "missing_chart" };
  try {
    const returnPath =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/result";
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chartId, returnPath }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (data.url) {
      window.location.href = data.url;
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "unavailable" };
  } catch {
    return { ok: false, error: "network" };
  }
}
