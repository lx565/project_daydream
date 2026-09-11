import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { createInvite, type PersonSnapshot } from "@/lib/compareInvite";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@/lib/coupleTypes";

export interface CreateInviteResult {
  inviteId: string;
}

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 30, keyPrefix: "compare-invite" })).allowed) {
    return rateLimitResponse();
  }

  let body: { date?: string; hour?: number; gender?: string; name?: string; relType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { date, hour, gender, name, relType } = body;
  if (!date || typeof hour !== "number" || (gender !== "male" && gender !== "female")) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!relType || !(relType in RELATIONSHIP_TYPES)) {
    return Response.json({ error: "invalid_relType" }, { status: 400 });
  }

  const personA: PersonSnapshot = {
    date: date.slice(0, 20),
    hour,
    gender,
    name: name ? name.slice(0, 50) : undefined,
  };

  const inviteId = await createInvite(personA, relType as RelationshipType);

  return Response.json({ inviteId } satisfies CreateInviteResult);
}
