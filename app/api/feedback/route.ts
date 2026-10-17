import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbz88inF_BkCMIeHBuiLj-ajjsJKCmEoSKQfygW1FAqmZQMbg6EI5734FqibKmBkfDfdVw/exec";

const MAX_DESCRIPTION = 2000;

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, { limit: 30, keyPrefix: "feedback" });
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  let body: { type?: string; description?: string; page?: string; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return Response.json({ error: "missing_description" }, { status: 400 });
  }

  const payload = {
    type: (body.type ?? "其他").slice(0, 100),
    description: body.description.slice(0, MAX_DESCRIPTION),
    page: (body.page ?? "").slice(0, 200),
    sessionId: (body.sessionId ?? "").slice(0, 100),
  };

  // Backup first so a message survives any sheet failure.
  try {
    const { kv } = await import("@vercel/kv");
    await kv.lpush("feedback:backup", JSON.stringify({ ts: new Date().toISOString(), ...payload }));
    await kv.ltrim("feedback:backup", 0, 1999);
  } catch (err) {
    console.error("[feedback] kv backup failed:", err);
  }

  try {
    const res = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    let confirmed = false;
    try { confirmed = JSON.parse(text)?.ok === true; } catch {}
    if (!confirmed) {
      console.error("[feedback] script did not confirm", text.slice(0, 200));
      return Response.json({ error: "storage_error" }, { status: 500 });
    }
  } catch (err) {
    console.error("[feedback] sheets error:", err);
    return Response.json({ error: "storage_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
