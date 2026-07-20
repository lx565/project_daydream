import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Same Google Apps Script webhook used by feedback + unlock reconciliation.
// The script routes on `type`; add a `type === "birth"` branch that appends to a
// "births" tab. Demographics (age/gender/daily counts) are analyzed in the sheet.
const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxex1lpJZNi1FEbYb1phB0YegnDLjjXP3SczsQKyk__g-IfrAE-JbHyap0iPEmLGQuscg/exec";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 60, keyPrefix: "track-birth" })).allowed) {
    return rateLimitResponse();
  }

  let body: {
    date?: string; hour?: number; gender?: string;
    name?: string; method?: string; source?: string; sessionId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const date = (body.date ?? "").slice(0, 20); // solar "YYYY-MM-DD"
  if (!date) return Response.json({ error: "missing_date" }, { status: 400 });

  const birthYear = parseInt(date.slice(0, 4), 10);
  const age = Number.isFinite(birthYear) ? new Date().getFullYear() - birthYear : "";

  try {
    const res = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // text/plain avoids CORS preflight to Apps Script
      body: JSON.stringify({
        type: "birth",
        date,
        birthYear: Number.isFinite(birthYear) ? birthYear : "",
        age,
        hour: typeof body.hour === "number" ? body.hour : "",
        gender: (body.gender ?? "").slice(0, 10),
        name: (body.name ?? "").slice(0, 50),
        calendar: "solar",
        source: (body.source ?? "").slice(0, 50),
        sessionId: (body.sessionId ?? "").slice(0, 100),
        readingKind: (body.method ?? "ziwei").slice(0, 20),
      }),
      redirect: "follow",
    });
    if (res.status >= 400) throw new Error(`sheets ${res.status}`);
  } catch (err) {
    console.error("[track-birth] sheets error:", err);
    return Response.json({ error: "storage_error" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
