// Creates a Stripe Checkout session for unlocking a chart's premium reading.
// Server-authoritative: the chartId is passed in metadata, and the unlock is only
// granted by the Stripe webhook after payment completes (see webhook/stripe).

import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { chartType, type ChartType } from "@/lib/chartType";

export const runtime = "nodejs";

// Each product type unlocks against a different Stripe Price ID. "monthly" uses
// a generic env name (not e.g. STRIPE_PRICE_ID_MONTHLY) because it's meant to
// cover any future $1.99 one-time short report, not just this one.
const PRICE_ENV_BY_TYPE: Record<ChartType, string> = {
  solo: "STRIPE_PRICE_ID",
  hepan: "STRIPE_PRICE_ID",
  monthly: "STRIPE_PRICE_ID_SHORT_ONCE",
};

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 20, keyPrefix: "checkout" })).allowed) return rateLimitResponse();

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: "stripe_not_configured" }, { status: 503 });

  let body: { chartId?: string; returnPath?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  const chartId = (body.chartId ?? "").slice(0, 100);
  if (!chartId) return Response.json({ error: "missing_chart" }, { status: 400 });

  const type = chartType(chartId);
  const price = process.env[PRICE_ENV_BY_TYPE[type]];
  if (!price) return Response.json({ error: "stripe_not_configured" }, { status: 503 });

  // Return to the exact chart the user was viewing (its URL carries birth params —
  // a bare /result would redirect home). Same-origin paths only.
  const returnPath = (body.returnPath ?? "/result").slice(0, 500);
  const safeReturn = returnPath.startsWith("/") ? returnPath : "/result";

  // Payment methods are env-configurable so Alipay/WeChat can be switched on
  // (after enabling them in the Stripe dashboard) without a code deploy.
  // e.g. STRIPE_PAYMENT_METHODS="card,alipay,wechat_pay". Default: card.
  const methods = (process.env.STRIPE_PAYMENT_METHODS ?? "card")
    .split(",").map((m) => m.trim()).filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];

  try {
    const StripeSDK = (await import("stripe")).default;
    const stripe = new StripeSDK(secret);
    const origin = request.headers.get("origin") ?? "https://www.mingli.study";
    const sep = safeReturn.includes("?") ? "&" : "?";
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      payment_method_types: methods,
      locale: "zh", // audience is Chinese-speaking; without this Checkout defaults to browser/English locale
      // webhook reads chartId to mark the chart unlocked; chart_type lets
      // Stripe/analytics segment revenue by product.
      metadata: { chartId, chart_type: type },
      success_url: `${origin}${safeReturn}${sep}paid=1`,
      cancel_url: `${origin}${safeReturn}`,
    };
    if (methods.includes("wechat_pay")) {
      params.payment_method_options = { wechat_pay: { client: "web" } };
    }
    const session = await stripe.checkout.sessions.create(params);
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return Response.json({ error: "checkout_failed" }, { status: 500 });
  }
}
