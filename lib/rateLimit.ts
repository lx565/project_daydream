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
  windowSec?: number; // counting window; defaults to "until UTC midnight"
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitKey(keyPrefix: string, ip: string, windowSec?: number): string {
  if (windowSec) return `ratelimit:${keyPrefix}:${ip}:w${windowSec}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd (UTC)
  return `ratelimit:${keyPrefix}:${ip}:${day}`;
}

/** Seconds remaining until the next UTC midnight. */
function secondsUntilUtcMidnight(): number {
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - Date.now()) / 1000));
}

function checkInMemory(key: string, limit: number, windowSec?: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now >= entry.resetAt) {
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    memStore.set(key, { count: 1, resetAt: windowSec ? now + windowSec * 1000 : midnight.getTime() });
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
  const key = rateLimitKey(config.keyPrefix ?? "default", ip, config.windowSec);

  try {
    const { kv } = await import("@vercel/kv");
    const count = await kv.incr(key);
    // First hit in this window — set the key to expire at UTC midnight.
    if (count === 1) {
      await kv.expire(key, config.windowSec ?? secondsUntilUtcMidnight());
    }
    if (count > config.limit) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: config.limit - count };
  } catch {
    // KV not configured / transient error → fall back to per-instance memory.
    return checkInMemory(`${config.keyPrefix ?? "default"}::${ip}`, config.limit, config.windowSec);
  }
}

// Give back a previously-charged unit. checkRateLimit increments up front (before
// we know whether the AI call will succeed); this reverses that charge when the
// generation never actually consumed the provider — i.e. it was served from cache
// or it failed/timed out. Without this, a slow-provider night burns a user's whole
// daily quota on retries that produced no reading, locking them out ("今日解讀次數
// 已達上限"). Floored at 0 so a double-refund can't mint free quota. Best-effort:
// a refund failure just means the (already-served or failed) request cost a unit.
export async function refundRateLimit(ip: string, keyPrefix: string): Promise<void> {
  const key = rateLimitKey(keyPrefix, ip);
  try {
    const { kv } = await import("@vercel/kv");
    const count = await kv.get<number>(key);
    if (typeof count === "number" && count > 0) await kv.decr(key);
  } catch {
    const memKey = `${keyPrefix}::${ip}`;
    const entry = memStore.get(memKey);
    if (entry && entry.count > 0) entry.count -= 1;
  }
}

// Global per-day counter (all callers combined). Returns false once `cap` is
// exceeded. Fails open when KV is unavailable (the per-IP limits still apply).
export async function incrDailyCap(name: string, cap: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `dailycap:${name}:${day}`;
  try {
    const { kv } = await import("@vercel/kv");
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, secondsUntilUtcMidnight());
    return count <= cap;
  } catch {
    return true;
  }
}

export function rateLimitResponse(): Response {
  return Response.json(
    { error: "今日解讀次數已達上限，明日再來" },
    { status: 429 }
  );
}
