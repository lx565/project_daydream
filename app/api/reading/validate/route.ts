export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { validateReading } from "@/lib/validateReading";
import { invalidateReadingCache } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 40, keyPrefix: "validate" })).allowed) return rateLimitResponse();

  let body: { reading: string; ziwei: ZiweiResult; cacheKey?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { reading, ziwei } = body;
  if (!reading || !ziwei?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const result = await validateReading(reading, ziwei);
  // The flagged first-pass text would otherwise keep being served from KV to every
  // other visitor with this chart for the rest of the 30-day TTL — see sseWriter.ts.
  // invalidateReadingCache verifies the cached entry actually matches `reading`
  // before deleting — cacheKey is client-supplied and unauthenticated, so without
  // that check a caller could delete any other chart's cache entry by name.
  if (!result.pass && body.cacheKey) invalidateReadingCache(body.cacheKey, reading).catch(() => {});
  return Response.json(result);
}
