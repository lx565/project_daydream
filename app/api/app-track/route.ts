import { NextRequest, NextResponse } from "next/server";
import { SHEETS_URL } from "@/lib/sheetsWebhook";

// Events the iOS app (mingli-app) may log. Keep this allowlist in sync with
// app/lib/analytics.ts in the mingli-app repo — the client can't dictate
// arbitrary event names into the sheet.
const ALLOWED_EVENTS = ["profile_created", "reading_viewed"] as const;
type AllowedEvent = (typeof ALLOWED_EVENTS)[number];

function isAllowedEvent(e: unknown): e is AllowedEvent {
  return typeof e === "string" && (ALLOWED_EVENTS as readonly string[]).includes(e);
}

// Fire-and-forget forward to the shared sheet webhook — never awaited by the
// caller, same spirit as email/report's logToSheets.
function logToSheets(event: AllowedEvent, data: Record<string, unknown>) {
  fetch(SHEETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: `app_${event}`,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  }).catch(() => {/* silent — sheet log is non-critical */});
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { event, data } = body as { event?: unknown; data?: unknown };

  if (!isAllowedEvent(event)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  if (data !== undefined && (typeof data !== "object" || data === null || Array.isArray(data))) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  // Don't await — this route's only job is to forward, so respond as soon as
  // the fetch is issued rather than waiting on the Apps Script response.
  logToSheets(event, (data as Record<string, unknown>) ?? {});

  return NextResponse.json({ ok: true });
}
