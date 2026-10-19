export const maxDuration = 30;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { validateReading, toClientValidation } from "@/lib/validateReading";
import { invalidateReadingCache } from "@/lib/sseWriter";
import type { ZiweiResult } from "@/lib/ziwei";
import { inputGuard } from "@/lib/inputLimits";

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, { limit: 40, keyPrefix: "validate" });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { reading: string; ziwei: ZiweiResult; cacheKey?: string; natalOnly?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { reading, ziwei } = body;
  { const bad = inputGuard(body); if (bad) return bad; }
  if (!reading || !ziwei?.palaces?.length) return Response.json({ error: "missing_fields" }, { status: 400 });

  const result = await validateReading(reading, ziwei, { natalOnly: body.natalOnly === true });
  // The flagged first-pass text would otherwise keep being served from KV to every
  // other visitor with this chart for the rest of the 30-day TTL — see sseWriter.ts.
  // invalidateReadingCache verifies the cached entry actually matches `reading`
  // before deleting — cacheKey is client-supplied and unauthenticated, so without
  // that check a caller could delete any other chart's cache entry by name.
  if (result.pass === false && body.cacheKey) await invalidateReadingCache(body.cacheKey, reading).catch(() => {});
  return Response.json(toClientValidation(result));
}
