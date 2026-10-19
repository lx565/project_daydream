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

// IPv6 clients control a whole /64, so keying on the full address lets one
// attacker rotate through 2^64 "different" IPs. Collapse to the /64 prefix.
export function normalizeIp(raw: string): string {
  const ip = raw.trim();
  if (!ip.includes(":") || ip.includes(".")) return ip; // IPv4 or IPv4-mapped IPv6
  const [head, tail = ""] = ip.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = ip.includes("::") && tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? Math.max(0, 8 - headGroups.length - tailGroups.length) : 0;
  const groups = [...headGroups, ...Array<string>(missing).fill("0"), ...tailGroups];
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

export function clientIp(request: Request): string {
  return normalizeIp(
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown"
  );
}

// Routes that don't call a paid AI provider are exempt from the global
// generation circuit breaker.
const NON_AI_PREFIXES = new Set([
  "vote", "vote-get", "track-birth", "checkout", "feedback", "bazi-candidates", "email-report",
  "stats-readings", "stats-readings-get", "cases-match", "compare-status", "compare-respond", "compare-invite",
]);

const GLOBAL_GEN_CAP_NAME = "global-gen";
let globalCapLogDay = "";

function globalGenCap(): number {
  return Number(process.env.GLOBAL_DAILY_GEN_CAP) || 10000;
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

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** True when denied by the site-wide daily generation circuit breaker. */
  globalCap?: boolean;
}

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = clientIp(request);
  const prefix = config.keyPrefix ?? "default";
  const key = rateLimitKey(prefix, ip, config.windowSec);

  try {
    const { kv } = await import("@vercel/kv");
    const count = await kv.incr(key);
    // First hit in this window — set the key to expire at UTC midnight.
    if (count === 1) {
      await kv.expire(key, config.windowSec ?? secondsUntilUtcMidnight());
    }
    if (count > config.limit) return { allowed: false, remaining: 0 };
    if (!NON_AI_PREFIXES.has(prefix) && !(await incrDailyCap(GLOBAL_GEN_CAP_NAME, globalGenCap()))) {
      const day = new Date().toISOString().slice(0, 10);
      if (globalCapLogDay !== day) {
        globalCapLogDay = day;
        console.error(`[rateLimit] GLOBAL_DAILY_GEN_CAP (${globalGenCap()}) reached — AI generation routes returning 503 until UTC midnight`);
      }
      // The per-IP unit was spent but nothing will be generated.
      kv.decr(key).catch(() => {});
      return { allowed: false, remaining: 0, globalCap: true };
    }
    return { allowed: true, remaining: config.limit - count };
  } catch {
    // KV not configured / transient error → per-instance memory, with a
    // stricter limit since counts aren't shared across serverless instances.
    return checkInMemory(`${prefix}::${ip}`, Math.max(1, Math.ceil(config.limit / 3)), config.windowSec);
  }
}

// Give back a previously-charged unit. checkRateLimit increments up front (before
// we know whether the AI call will succeed); this reverses that charge when the
// generation never actually consumed the provider — i.e. it was served from cache
// or it failed/timed out. Without this, a slow-provider night burns a user's whole
// daily quota on retries that produced no reading, locking them out ("今日解讀次數
// 已達上限"). Floored at 0 so a double-refund can't mint free quota. Best-effort:
// a refund failure just means the (already-served or failed) request cost a unit.
// Refund policy: only when the provider was never billed for content (cache hit,
// or a failure before any tokens streamed). A truncated/blocked/timed-out
// generation that already produced content is NOT refunded — otherwise forcing
// a cut-off (tiny token limit, adversarial input) would give unlimited AI calls.
export function shouldRefundRateLimit(ctx: { cacheHit: boolean; providerBilled: boolean }): boolean {
  return ctx.cacheHit || !ctx.providerBilled;
}

export async function refundRateLimit(ip: string, keyPrefix: string): Promise<void> {
  const key = rateLimitKey(keyPrefix, ip);
  try {
    const { kv } = await import("@vercel/kv");
    const count = await kv.get<number>(key);
    if (typeof count === "number" && count > 0) await kv.decr(key);
    if (!NON_AI_PREFIXES.has(keyPrefix)) {
      const gk = `dailycap:${GLOBAL_GEN_CAP_NAME}:${new Date().toISOString().slice(0, 10)}`;
      const g = await kv.get<number>(gk);
      if (typeof g === "number" && g > 0) await kv.decr(gk);
    }
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
    if (count > cap) {
      // A denied request must not keep pushing the counter past the cap.
      kv.decr(key).catch(() => {});
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function rateLimitResponse(result?: RateLimitResult): Response {
  if (result?.globalCap) {
    return Response.json(
      { error: "目前使用人數眾多，今日解讀服務暫時飽和，請明日再來" },
      { status: 503 }
    );
  }
  return Response.json(
    { error: "今日解讀次數已達上限，明日再來" },
    { status: 429 }
  );
}
