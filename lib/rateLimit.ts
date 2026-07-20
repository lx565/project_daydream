// Per-IP daily rate limiter, backed by @vercel/kv so limits aggregate across
// serverless instances in production. Falls back to an in-memory Map when KV is
// unavailable (e.g. local dev without KV env vars) so local requests still work.
//
// checkRateLimit is async: callers must await it.
//   if (!(await checkRateLimit(request, { limit: 5, keyPrefix: "overview" })).allowed)
//     return rateLimitResponse();

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback (per-instance, non-persistent). Only used if KV errors.
const memStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  limit: number; // max calls per day per IP
  keyPrefix?: string; // namespace for per-route limits
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Seconds remaining until the next UTC midnight. */
function secondsUntilUtcMidnight(): number {
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - Date.now()) / 1000));
}

function checkInMemory(key: string, limit: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now >= entry.resetAt) {
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    memStore.set(key, { count: 1, resetAt: midnight.getTime() });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = clientIp(request);
  const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd (UTC)
  const key = `ratelimit:${config.keyPrefix ?? "default"}:${ip}:${day}`;

  try {
    const { kv } = await import("@vercel/kv");
    const count = await kv.incr(key);
    // First hit in this window — set the key to expire at UTC midnight.
    if (count === 1) {
      await kv.expire(key, secondsUntilUtcMidnight());
    }
    if (count > config.limit) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: config.limit - count };
  } catch {
    // KV not configured / transient error → fall back to per-instance memory.
    return checkInMemory(`${config.keyPrefix ?? "default"}::${ip}`, config.limit);
  }
}

export function rateLimitResponse(): Response {
  return Response.json(
    { error: "今日解讀次數已達上限，明日再來" },
    { status: 429 }
  );
}
