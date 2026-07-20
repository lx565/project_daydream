export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { validateFlowYearReading } from "@/lib/validateFlowYear";
import type { ZiweiResult } from "@/lib/ziwei";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "validate-flowyear" })).allowed) return rateLimitResponse();

  let body: { reading: string; ziwei: ZiweiResult; year: number };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { reading, ziwei, year } = body;
  if (!reading || !ziwei?.birth?.solarDate || !year) return Response.json({ error: "missing_fields" }, { status: 400 });

  const result = await validateFlowYearReading(reading, ziwei, year);
  return Response.json(result);
}
