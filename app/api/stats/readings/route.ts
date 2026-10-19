import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Vanity counter for "命盤 generated so far". Real generations are tracked in
// KV (key `stats:readings`); BASELINE seeds the count with historical traffic
// that predates the counter so the displayed number is honest from day one.
const BASELINE = 3023;
const KEY = "stats:readings";

async function currentCount(): Promise<number> {
  if (!process.env.KV_REST_API_URL) return BASELINE;
  try {
    const { kv } = await import("@vercel/kv");
    const n = await kv.get<number>(KEY);
    return BASELINE + Number(n ?? 0);
  } catch {
    return BASELINE;
  }
}

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(request, { limit: 300, keyPrefix: "stats-readings-get" });
  if (!rl.allowed) return rateLimitResponse(rl);
  return Response.json({ count: await currentCount() });
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, { limit: 30, keyPrefix: "stats-readings" });
  if (!rl.allowed) return rateLimitResponse(rl);
  if (!process.env.KV_REST_API_URL) {
    return Response.json({ count: BASELINE });
  }
  try {
    const { kv } = await import("@vercel/kv");
    const n = await kv.incr(KEY);
    return Response.json({ count: BASELINE + Number(n) });
  } catch {
    return Response.json({ count: BASELINE });
  }
}
