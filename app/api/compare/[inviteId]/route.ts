import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getInvite } from "@/lib/compareInvite";

// Lightweight status check for Person A's "刷新" button on the invite-created
// screen (components/HepanFlow.tsx) — lets A check whether Person B has
// responded yet without navigating away (which would otherwise show B's
// birth-input form to A, since that page branches purely on whether personB
// is present). Read-only, no side effects — distinct from the POST-only
// /respond route, which writes B's data.
export interface InviteStatusResult {
  found: boolean;
  personBPresent: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  if (!(await checkRateLimit(request, { limit: 60, keyPrefix: "compare-status" })).allowed) {
    return rateLimitResponse();
  }

  const { inviteId } = await params;
  if (!inviteId) return Response.json({ error: "missing_invite" }, { status: 400 });

  const invite = await getInvite(inviteId);
  if (!invite) {
    return Response.json({ found: false, personBPresent: false } satisfies InviteStatusResult);
  }

  return Response.json({ found: true, personBPresent: !!invite.personB } satisfies InviteStatusResult);
}
