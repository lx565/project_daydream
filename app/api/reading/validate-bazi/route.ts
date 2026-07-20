export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { validateBaziReading } from "@/lib/validateBazi";
import type { BaziResult } from "@/lib/bazi";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "validate-bazi" })).allowed) return rateLimitResponse();

  let body: { reading: string; bazi: BaziResult };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { reading, bazi } = body;
  if (!reading || !bazi?.day?.stem) return Response.json({ error: "missing_fields" }, { status: 400 });

  const result = await validateBaziReading(reading, bazi);
  return Response.json(result);
}
