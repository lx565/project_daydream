import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { respondToInvite, type PersonSnapshot } from "@/lib/compareInvite";

export interface RespondInviteResult {
  ok: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "compare-respond" })).allowed) {
    return rateLimitResponse();
  }

  const { inviteId } = await params;
  if (!inviteId) return Response.json({ error: "missing_invite" }, { status: 400 });

  let body: { date?: string; hour?: number; gender?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { date, hour, gender, name } = body;
  if (!date || typeof hour !== "number" || (gender !== "male" && gender !== "female")) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const personB: PersonSnapshot = {
    date: date.slice(0, 20),
    hour,
    gender,
    name: name ? name.slice(0, 50) : undefined,
  };

  const ok = await respondToInvite(inviteId, personB);
  if (!ok) return Response.json({ error: "invite_not_found" }, { status: 404 });

  return Response.json({ ok: true } satisfies RespondInviteResult);
}
