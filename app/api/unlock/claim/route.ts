// QR-payment unlock claim. Personal Alipay/WeChat 收款碼 give NO payment callback,
// so unlock is OPTIMISTIC: we grant access on claim and log the order number so the
// owner can reconcile against actual received payments (and revoke abusers).
// Server-authoritative Stripe path (webhook → markUnlocked) stays the real one for
// when a proper processor is wired; this is the QR fallback for the China audience.

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { markUnlocked } from "@/lib/unlock";

// Same Google Sheet the feedback route writes to — claims show up alongside feedback
// for manual reconciliation against Alipay/WeChat receipts.
const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxex1lpJZNi1FEbYb1phB0YegnDLjjXP3SczsQKyk__g-IfrAE-JbHyap0iPEmLGQuscg/exec";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 15, keyPrefix: "unlock_claim" })).allowed) {
    return rateLimitResponse();
  }

  let body: { chartId?: string; orderNo?: string; contact?: string; method?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const chartId = (body.chartId ?? "").slice(0, 100);
  if (!chartId) return Response.json({ error: "missing_chart" }, { status: 400 });

  // Optimistic unlock (KV, server-side).
  await markUnlocked(chartId);

  // Log claim for reconciliation (non-blocking on failure — unlock already granted).
  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        type: "付費解鎖·掃碼",
        description: `方式:${(body.method ?? "").slice(0, 20)} | 單號:${(body.orderNo ?? "").slice(0, 100)} | 聯絡:${(body.contact ?? "").slice(0, 100)}`,
        page: "paywall",
        sessionId: chartId,
      }),
      redirect: "follow",
    });
  } catch (err) {
    console.error("[unlock/claim] log error:", err);
  }

  return Response.json({ ok: true });
}
