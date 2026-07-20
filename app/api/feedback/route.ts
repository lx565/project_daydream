import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxex1lpJZNi1FEbYb1phB0YegnDLjjXP3SczsQKyk__g-IfrAE-JbHyap0iPEmLGQuscg/exec";

const MAX_DESCRIPTION = 2000;

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "feedback" })).allowed) {
    return rateLimitResponse();
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

  try {
    const res = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        type: (body.type ?? "其他").slice(0, 100),
        description: body.description.slice(0, MAX_DESCRIPTION),
        page: (body.page ?? "").slice(0, 200),
        sessionId: (body.sessionId ?? "").slice(0, 100),
      }),
      redirect: "follow",
    });
    // Apps Script returns 302 → echo URL; any 2xx/3xx means the script ran
    if (res.status >= 400) throw new Error(`sheets ${res.status}`);
  } catch (err) {
    console.error("[feedback] sheets error:", err);
    return Response.json({ error: "storage_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
