export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { validateReading } from "@/lib/validateReading";
import type { ZiweiResult } from "@/lib/ziwei";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "validate" })).allowed) return rateLimitResponse();

  let body: { reading: string; ziwei: ZiweiResult };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { reading, ziwei } = body;
  if (!reading || !ziwei?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const result = await validateReading(reading, ziwei);
  return Response.json(result);
}
