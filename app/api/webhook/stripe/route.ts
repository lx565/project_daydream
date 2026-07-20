// Stripe webhook — the single source of truth for unlocks.
// Verifies the signature, then on checkout.session.completed marks the chart
// unlocked in KV. Requires STRIPE_WEBHOOK_SECRET.

import { NextRequest } from "next/server";
import { markUnlocked } from "@/lib/unlock";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return Response.json({ error: "stripe_not_configured" }, { status: 503 });

  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text(); // raw body required for signature verification

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);
    const event = stripe.webhooks.constructEvent(raw, sig, whSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as { metadata?: { chartId?: string } };
      const chartId = session.metadata?.chartId;
      if (chartId) await markUnlocked(chartId);
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook]", (err as Error).message);
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }
}
