export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { validateBaziReading } from "@/lib/validateBazi";
import { toClientValidation } from "@/lib/validateReading";
import { invalidateReadingCache } from "@/lib/sseWriter";
import type { BaziResult } from "@/lib/bazi";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "validate-bazi" })).allowed) return rateLimitResponse();

  let body: { reading: string; bazi: BaziResult; cacheKey?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { reading, bazi } = body;
  if (!reading || !bazi?.day?.stem) return Response.json({ error: "missing_fields" }, { status: 400 });

  const result = await validateBaziReading(reading, bazi);
  // See validate/route.ts — otherwise the flagged first-pass text keeps being
  // served from KV to every other visitor with this chart for the rest of the TTL.
  // invalidateReadingCache verifies the cached entry actually matches `reading`
  // before deleting — cacheKey is client-supplied and unauthenticated, so without
  // that check a caller could delete any other chart's cache entry by name.
  if (result.pass === false && body.cacheKey) invalidateReadingCache(body.cacheKey, reading).catch(() => {});
  return Response.json(toClientValidation(result));
}
