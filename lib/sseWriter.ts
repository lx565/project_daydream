import type { Reference } from "./rag";
import { createHash } from "crypto";
import { withDeadline, withTwoPhaseDeadline, AttemptTimeoutError } from "./aiRetry";
import { refundRateLimit, shouldRefundRateLimit } from "./rateLimit";
import { after } from "next/server";
import { REVIEW_MODEL } from "./validateReading";

// "standard" = main readings, "fast" = cheap/quick sections (e.g. daily 黄历)
export type ModelTier = "standard" | "fast";

export interface SSEWriterOptions {
  tier?: ModelTier;
  maxTokens: number;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  refs?: Reference[];
  /** Sampling temperature. Default 0.5 (factual readings). Narrative routes
   *  (流年/今日/合盘) pass ~0.7 for richer, less generic prose. Was hardcoded 0. */
  temperature?: number;
  /** Deadline in ms for the primary attempt to produce its FIRST visible
   *  content. 2026-10 (deepseek-v4-pro is a thinking model that emits nothing
   *  visible while reasoning — live reads showed 9-29s of silent thinking):
   *  if nothing has been written by this deadline, the attempt is abandoned
   *  (AttemptTimeoutError) and the fast-tier fallback takes over. Once content
   *  HAS started, this deadline is a no-op — see attemptTimeoutMs, the total
   *  cap. Default DEFAULT_FIRST_CONTENT_TIMEOUT_MS (50_000). */
  firstContentTimeoutMs?: number;
  /** TOTAL wall-clock cap in ms for the primary attempt, counted from attempt
   *  start — covers both the silent-thinking phase AND the actual writing.
   *  Once content has started streaming, the attempt is never cut off before
   *  this (only firstContentTimeoutMs can kill a pre-content attempt).
   *  Default DEFAULT_ATTEMPT_TIMEOUT_MS (130_000). Also used by
   *  hasTimeForAnotherAttempt as the per-attempt budget estimate when a route
   *  doesn't pass routeMaxDurationMs. */
  attemptTimeoutMs?: number;
  /** TOTAL wall-clock cap in ms for the fast-tier fallback attempt — fired
   *  whenever the primary attempt is abandoned (timeout) or fails outright
   *  BEFORE sending any content (see runGenerationPass's catch — any
   *  pre-content failure falls back once, not only a timeout). Default
   *  DEFAULT_RETRY_TIMEOUT_MS (90_000). */
  retryTimeoutMs?: number;
  /** The route's own `export const maxDuration` in ms (e.g. 180_000 for a
   *  `maxDuration = 180` route) — lets hasTimeForAnotherAttempt check a
   *  prospective retry/validator call against the route's REAL remaining
   *  budget instead of an estimate derived from attemptTimeoutMs/
   *  retryTimeoutMs. Routes that don't pass this fall back to the old
   *  estimate-based behavior (attemptTimeoutMs + retryTimeoutMs + margin). */
  routeMaxDurationMs?: number;
  /** User-facing text sent when generation ultimately fails (primary attempt
   *  AND the fast-tier fallback both failed/timed out before any content).
   *  Default DEFAULT_TIMEOUT_ERROR_MESSAGE (reading-specific copy about the
   *  deep-reasoning model taking too long). The chat route passes its own
   *  reply-specific wording — see app/api/chat/route.ts. */
  timeoutErrorMessage?: string;
  /** When set, the route already charged one rate-limit unit up front (via
   *  checkRateLimit). streamWithRefs refunds that unit if the request never
   *  actually hit the AI provider — a cache replay or a failed/timed-out
   *  generation — so only readings that genuinely consumed the provider count
   *  against the daily quota. Pass { ip: clientIp(request), keyPrefix: <same
   *  keyPrefix the route used> }. */
  rateLimit?: { ip: string; keyPrefix: string };
  /** DeepSeek-only. v4 models "think" (emit reasoning_content) before answering,
   *  which adds latency and is billed against max_tokens. Policy:
   *    "none" — FREE 總覽 readings (synthesis/consensus/bazi/daily): speed first,
   *             the teaser doesn't need a reasoning pass.
   *    "low"  — PAID deep readings (default): a light reasoning pass for accuracy
   *             on the content people pay for, without the full latency.
   *  Ignored by non-DeepSeek providers. Defaults to "low" when omitted. */
  reasoningEffort?: "none" | "low" | "medium" | "high";
  /** When true, skip both the cache read and the cache write for this call —
   *  the response is never persisted to/served from KV. Use for routes whose
   *  output is inherently personal/contextual per-request (e.g. chat), where
   *  caching risks serving one user's answer to another. Default false. */
  noCache?: boolean;
  /** When true, skip reading from KV cache (a fresh generation still writes on
   *  success). A validation retry's revised message content almost always hashes
   *  to a different cache key anyway, but this guarantees it — a retry must never
   *  replay a stale cached response even in an edge-case hash collision. Routes
   *  that accept `revisionNotes` should pass `skipCacheRead: !!body.revisionNotes?.length`.
   *  Default false. */
  skipCacheRead?: boolean;
  /** Synchronous, server-side cross-model quality gate — runs in-process, after
   *  the existing truncation/blocked finishStatus gate passes and BEFORE the
   *  reading is ever sent to the client as done, so nothing is ever marked
   *  validated (cached/sent as `_validated: true`) without a genuine check.
   *  The route builds this closure with its own chart data (ziwei/bazi) already
   *  captured, so streamWithRefs itself stays generic and never needs to know
   *  those shapes.
   *  Contract: return `null` if the validator itself is unavailable/errored, OR
   *  if it fail-opened internally without genuinely reviewing the content (e.g.
   *  lib/validateReading.ts's `jsonReview` returning `reviewed: false`
   *  on a timeout/API error/bad JSON/missing key — that case returns
   *  `{pass:true,...}`, which the route closure must translate to `null` here,
   *  not forward as a real pass) — fail-open, ship the reading exactly as if
   *  this option were never passed; `validated` is never set true. Return
   *  `{ pass: true, issues: [] }` only on a genuine, reviewed pass. Return
   *  `{ pass: false, issues }` on a genuine, reviewed failure — the reading
   *  still ships (no in-process regeneration, see streamWithRefs), unvalidated,
   *  and falls through to the existing CLIENT-side async validate/revise flow
   *  (lib/useSSEStream.ts) as the safety net. */
  validate?: (fullText: string) => Promise<{ pass: boolean; issues: string[] } | null>;
}

// Default temperature for readings. 0 produced flat, repetitive, generic prose;
// interpretive writing reads far better at a moderate temperature.
const DEFAULT_TEMPERATURE = 0.5;

// 2026-10-15: shared defaults for the two-phase deadline (see firstContentTimeoutMs/
// attemptTimeoutMs/retryTimeoutMs's doc comments above) — sized against live
// production timings against deepseek-v4-pro (silent thinking 9-29s, writing
// 11-25s, totals 39.5-53.1s) with real headroom, under every reading route's
// maxDuration=180 (see each route file). Centralized here instead of 17 routes
// each repeating the same literals.
const DEFAULT_FIRST_CONTENT_TIMEOUT_MS = 50_000;
// 140_000 → 130_000 (2026-10-15): requestStartMs (below) starts inside
// streamWithRefs, AFTER rate-limit, body parse, RAG embedding (up to ~8s),
// and KV/getFlowYears — none of that pre-stream overhead was budgeted.
// Worst case on the primary path is now overhead (~15s) + 130 + 20 (validator)
// = 165 < 180. Live max is ~53s, so no practical cost.
const DEFAULT_ATTEMPT_TIMEOUT_MS = 130_000;
// 60_000 → 90_000 (2026-10-15): decades and couple allow 8192 output tokens,
// and fast-tier output can run past 60s on those — this was cutting off a
// fallback attempt that just needed more time. Worst case on the fallback
// path is now 50 (firstContentTimeoutMs) + 90 + 20 (validator) = 160 ≤ 170.
const DEFAULT_RETRY_TIMEOUT_MS = 90_000;

// Default user-facing copy for a generation that failed outright (primary
// attempt AND the fast-tier fallback both failed/timed out before any
// content) — never leaks a raw provider error (e.g. "terminated") or the old
// generic "AI 服務回應較慢" to the client. See timeoutErrorMessage.
const DEFAULT_TIMEOUT_ERROR_MESSAGE =
  "這份解讀使用深度推理模型，運算時間較長，這次未能及時完成。請點『重試』，通常再試一次就會成功。";

// Output-token ceiling we allow. DeepSeek documents MAX OUTPUT 384K for both
// deepseek-flash and deepseek-v4-pro (https://api-docs.deepseek.com/quick_start/pricing);
// the old 8192 limit belonged to deepseek-chat. 16384 leaves routes that set 8192
// room for reasoning plus visible text. A longer output must still fit the
// per-attempt cap (DEFAULT_ATTEMPT_TIMEOUT_MS). Caps the thinking-headroom
// factor and the one-shot truncation retry below.
const DEEPSEEK_MAX_OUTPUT_TOKENS = 16384;

// v4-pro's hidden reasoning_content is billed against max_tokens (the API has no
// separate reasoning budget — only reasoning_effort, which routes already set),
// so standard-tier calls that think get this much extra headroom, capped at the
// ceiling above. Routes already at the ceiling gain nothing; they rely on the
// fast-tier truncation retry instead.
const THINKING_HEADROOM_TOKENS = 4096;

// Switch provider via AI_PROVIDER env var: "gemini" (default) | "anthropic" | "deepseek"
const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "anthropic" | "deepseek";

// Single source of truth for which model runs. Change the env var → every route
// reflects it automatically; no code edits. Falls back to a sensible default per provider.
const MODEL_DEFAULTS = {
  gemini:    { standard: "gemini-2.5-flash",          fast: "gemini-2.5-flash" },
  // 2026-10-04: switched `standard` to deepseek-v4-pro after a live side-by-side
  // comparison showed it meaningfully richer/more coherent than flash, and the
  // 55s+ latency spike documented below (2026-08-03) did NOT reproduce in that
  // test (31.0s vs flash's 24.1s on the same prompt) — directional, not
  // exhaustively re-verified across every route/chart. The stalled-attempt →
  // fast-tier fallback (runGenerationPass, below) is what protects against a
  // genuinely slow night: if v4-pro stalls before emitting anything, it falls
  // back to deepseek-flash (the `fast` tier) automatically.
  // (2026-09-10: DeepSeek retired the old "v4-flash" alias and renamed it to
  // "deepseek-flash" — same underlying model, id only.)
  deepseek:  { standard: "deepseek-v4-pro",         fast: "deepseek-flash" },
  anthropic: { standard: "claude-sonnet-4-6",         fast: "claude-haiku-4-5-20251001" },
} as const;

function resolveModel(tier: ModelTier = "standard"): string {
  const envStd  = process.env[`${PROVIDER.toUpperCase()}_MODEL`];
  const envFast = process.env[`${PROVIDER.toUpperCase()}_MODEL_FAST`];
  const defaults = MODEL_DEFAULTS[PROVIDER];
  if (tier === "fast") return envFast ?? defaults.fast; // never inherits the standard-tier override
  return envStd ?? defaults.standard;
}

// ── Server-side KV cache ──────────────────────────────────────────────────────
// Bump CACHE_VERSION when prompt structure changes significantly
const CACHE_VERSION = "v54"; // 2026-10-04: switched standard model to deepseek-v4-pro —
// force every reading to regenerate under the new model rather than keep serving
// old deepseek-flash-generated text from cache until its TTL naturally expires
// (Niki's explicit call — product decision, not a correctness requirement).
// Earlier same-day bump, still true: truncation-detection fix (prior batch) —
// the server cache key hashes only system+messages, never maxTokens, so raising
// maxTokens ceilings and adding the finish_reason/stop_reason truncation check
// did NOT invalidate readings that were already cached truncated under the old
// logic — they'd keep matching this key and being served as "done" forever.
// Bumped to force every reading to regenerate under the new truncation-aware
// retry/error logic. Bump CACHE_PREFIX in lib/useSSEStream.ts together (two-layer
// cache rule).
// v52: 2026-10-02: P1 bazi/cautions prompt audit batch —
// (1) bazi-decade: dropped the hallucination-inviting generic topic:"格局" RAG query
// (pulled in 紫微 keywords for a 八字 question) for school:"八字命理",strict:true with
// explicit stars; also labels decades 已過/當前/未來 correctly instead of always
// "當前大運", passes currentYear/currentAge, and replaced the ungrounded 流年-projection
// ask with a 大運-internal structural-phase ask the model can actually answer.
// (2) bazi-schools: same strict 八字命理 RAG fix (was strict:false, letting NEUTRAL_SCHOOLS
// leak in unfiltered); 神煞 (天乙貴人/羊刃/華蓋/驛馬/天德/月德) now computed deterministically
// and handed to the model instead of being invented (including fixing a wrong 癸→亥 羊刃
// entry, corrected to 癸→丑 per 十干羊刃歌訣); removed the leaked internal "B1" route-jargon.
// (3) bazi: user-message length/structure spec (2-3 段 ~280-320字) now matches the
// system prompt's actual spec (1 段 ~130-160字) instead of contradicting it.
// (4) cautions/bazi/bazi-schools now accept revisionNotes on a validation retry (same
// pattern as overview) instead of ignoring them and silently replaying the same
// flagged cached text under an unchanged cache key. Also hardened validate/validate-bazi's
// cache-invalidation to verify the client-submitted text matches the cached entry before
// deleting it, closing an unauthenticated cross-user cache-busting path.
// v51: 2026-10-02: two P1 clusters bumped together —
// (A) P1-12 (lib/rag.ts's TOPIC_KEYWORDS was missing 流年大限/流年/夫妻/交友/兄弟/父母 —
// those topics silently got zero lexical boost, so the RAG chunks retrieved for
// decades/flowyear/monthly/couple routes change) and P1-17 (lib/flowRisk.ts's
// CAUTION_PALACE_SCORES used suffixed '疾厄宮' etc. instead of iztro's real unsuffixed
// '疾厄' etc., so only 命宮 ever got its intended extra weight — fixing this changes which
// flow years rank as "risk years" and are described in the cautions prompt).
// (B) P1 couple-domain cluster, 5 fixes — (1) bazi-couple's RAG query passed only
// text+school, so buildQueryTerms() saw an empty term set and getKnowledge()
// short-circuited to zero results every time — now passes explicit stars + strict:true.
// (2) couple's palace-mutagen scoring compared iztro's bare Traditional mutagen ("祿"/
// "科"/"忌") against Simplified+化-prefixed strings ("化禄"/"化科"/"化忌"), so 四化 never
// affected 四維得分 — fixed the comparison and exposed per-dimension contribution descs.
// (3) 緣分類型 labels and sibling's "六親" palace label were Simplified, missed by an
// earlier sitewide fix. (4) identical branches were reported as 三合 (couple) / 三合+相刑
// (bazi-couple) due to a missing distinctness guard; also added the missing 子卯相刑 pair.
// (5) couple's prompt asked for cross-chart 飛化互入 and 當前大運 it never computed — added
// both, reusing bazi-couple's 大運 lookup for consistency.
// Bumped once to invalidate cached stale-RAG/wrong-risk-year/empty-RAG/zero-四化-effect/
// Simplified-label/false-三合/hallucinated-飛化互入 readings from all affected routes.
// v50: 2026-10-02: lib/bazi.ts's summary no longer claims a
// 喜用神 (favorable element) — that claim was just the lowest-count element across the
// 8 visible characters, ignoring 月令/藏干/旺衰, and contradicted several routes that
// separately ask the model to derive 用神 properly. Bumped to invalidate cached readings
// built on the old summary wording (bazi, bazi-deep, bazi-schools, bazi-decade, bazi-couple,
// couple, couple/preview, synthesis, niandu).
// v49: 2026-10-02: two fixes bumped together —
// (1) cautions route now matches iztro's bare "忌" instead of "化忌" (was dropping 化忌 stars)
// (2) decades route — fixed prev/next 大限 lookup (was array-index arithmetic, wrong for
// ~half of users on reverse-running 陰男/陽女 charts) and grounded the prompt with
// 大限四化/流年/夫妻官祿疾厄/紅鸞天喜 data it was asking the model to reason about but
// never actually received. Bumped once to invalidate cached wrong-忌/wrong-decade/
// hallucinated readings from both routes.
// v48: 2026-10-02: daily 干支 fixed (wrong epoch/calendar-month/Jan-1 year flip)
// (si*12+bi)%60 was wrong for 55/60 干支 combinations (e.g. 乙丑→海中金 was computed as
// 路旁土), so the entire 祿命派 section built on it was wrong for most charts. Fixed to the
// correct CRT-solved index (and fixed a second compounding Math.floor(idx/2) indexing bug
// into the already-doubled NAYIN table). Bumped to invalidate cached wrong-nayin readings.
const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days

function makeCacheKey(opts: SSEWriterOptions): string {
  // Hash the FULL system string (identifies reading type AND, where applicable,
  // the specific person it was generated for) + full message content.
  const input = opts.system + "|" + opts.messages.map((m) => m.content).join("|");
  const hash = createHash("md5").update(input).digest("hex");
  return `rd:${CACHE_VERSION}:${hash}`;
}

type KVCacheValue = { text: string; refs: Reference[]; validated?: boolean };

async function kvGet(key: string): Promise<KVCacheValue | null> {
  if (!process.env.KV_REST_API_URL) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return await kv.get<KVCacheValue>(key);
  } catch { return null; }
}

async function kvSet(key: string, value: KVCacheValue): Promise<void> {
  if (!process.env.KV_REST_API_URL) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value, { ex: CACHE_TTL });
  } catch {}
}

async function kvDel(key: string): Promise<void> {
  if (!process.env.KV_REST_API_URL) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.del(key);
  } catch {}
}

/** Delete a specific cached reading from KV. Called by the validate/validate-bazi
 *  routes when a reading fails cross-model validation — without this, the flagged
 *  first-pass text stays served from cache to every other visitor with the same
 *  chart for the rest of the 30-day TTL, even though this visitor's own retry (with
 *  revisionNotes) regenerates fine under a different cache key.
 *
 *  `cacheKey` is client-supplied and unauthenticated — a caller could name any
 *  chart's cache key, not just the one for the `reading` they're actually
 *  submitting. `expectedText` must be the exact reading text the client got from
 *  the SSE stream for THIS request; we only delete if the entry currently cached
 *  under `cacheKey` is byte-identical to it, so a request can only invalidate the
 *  cache entry it actually produced — never an arbitrary other chart's. */
export async function invalidateReadingCache(cacheKey: string, expectedText: string): Promise<void> {
  const cached = await kvGet(cacheKey);
  if (cached && cached.text === expectedText) await kvDel(cacheKey);
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

// Permanent daily validation tally (Vercel logs only keep ~30 min). Fire-and-forget.
function tallyValidation(outcome: "pass" | "fail" | "unreviewed" | "truncated" | "fastFallback" | "truncRetryOk", route?: string): void {
  (async () => {
    const { kv } = await import("@vercel/kv");
    const key = `stats:validation:${new Date().toISOString().slice(0, 10)}`;
    const p = kv.pipeline();
    p.hincrby(key, outcome, 1);
    if (route) p.hincrby(key, `${route}:${outcome}`, 1);
    p.expire(key, 90 * 24 * 3600);
    await p.exec();
  })().catch(() => {});
}

export function makeSSEResponse(
  handler: (writer: WritableStreamDefaultWriter<Uint8Array>, encoder: TextEncoder) => Promise<void>
): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  handler(writer, encoder).finally(() => {
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// How a generation attempt ended, per the provider's own finish_reason/stop_reason
// — see runGenerationPass's doc comment in streamWithRefs for the full rationale.
type FinishStatus = "complete" | "truncated" | "blocked";

// Shared time-budget check: is there enough of the route's maxDuration left to
// justify firing one more attempt that needs `neededMs`? Used by the
// truncation-retry path below (defaults `neededMs` to attemptTimeoutMs, sizing
// for one more full generation attempt — unchanged behavior) and by the
// synchronous validate gate (passes the validator's own ~20s deadline instead,
// since a full generation attempt's duration is the wrong estimate for a much
// smaller call). `elapsedMs` is measured from the `requestStartMs` anchor, so
// a check made later correctly sees less headroom than one made earlier.
//
// Measured against the route's REAL budget (opts.routeMaxDurationMs, e.g.
// 180_000 for `maxDuration = 180`) when the route passes it, per Niki's D —
// the old estimate (attemptTimeoutMs + retryTimeoutMs + margin) stopped being
// a meaningful proxy for the route's actual ceiling once those two numbers
// were raised independently of maxDuration. Every streamWithRefs caller now
// passes routeMaxDurationMs explicitly (see each route's own options) sized
// to its own maxDuration; this estimate-based fallback only remains for
// defensiveness against a future caller that omits it.
const OVERHEAD_MARGIN_MS = 10_000;
function hasTimeForAnotherAttempt(requestStartMs: number, opts: SSEWriterOptions, neededMs?: number): boolean {
  const attemptTimeoutMs = opts.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const elapsedMs = Date.now() - requestStartMs;
  const needed = neededMs ?? attemptTimeoutMs;
  if (opts.routeMaxDurationMs != null) {
    return elapsedMs + needed <= opts.routeMaxDurationMs - OVERHEAD_MARGIN_MS;
  }
  // No real budget passed — old estimate-based behavior, unchanged, for the
  // routes this change deliberately leaves alone.
  const estimatedRouteBudgetMs =
    attemptTimeoutMs + (opts.retryTimeoutMs ?? DEFAULT_RETRY_TIMEOUT_MS) + OVERHEAD_MARGIN_MS;
  return elapsedMs + needed <= estimatedRouteBudgetMs;
}

export async function streamWithRefs(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  opts: SSEWriterOptions
) {
  let lastActivityMs = Date.now();
  const safeWrite = async (obj: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      lastActivityMs = Date.now();
    } catch {}
  };
  // DeepSeek's thinking phase emits nothing visible for up to firstContentTimeoutMs
  // (50s default) — iOS's URLSession drops a connection after ~60s of total
  // silence. An SSE comment line (`: ...\n\n`, per the spec never a `data:`
  // line) keeps the connection alive without being mistaken for content by any
  // client parser — verified against web's lib/useSSEStream.ts and the iOS
  // app's parseFullSSE (both only act on lines starting with "data:", so a
  // comment line is silently skipped). Cleared in the `finally` below on every
  // exit path (done, error, abort, client disconnect).
  const HEARTBEAT_INTERVAL_MS = 15_000;
  const heartbeatTimer = setInterval(() => {
    if (Date.now() - lastActivityMs < HEARTBEAT_INTERVAL_MS) return;
    writer.write(encoder.encode(": ping\n\n")).then(() => { lastActivityMs = Date.now(); }, () => {});
  }, HEARTBEAT_INTERVAL_MS);
  // Wall-clock anchor for the retry time-budget check below (Medium 4) — covers
  // the whole request, including the cache lookup, so it reflects real elapsed
  // time against the route's maxDuration, not just time spent in the provider call.
  const requestStartMs = Date.now();

  // Monotonic (never reset by the truncation retry): once the provider has
  // streamed any content, tokens were billed and the rate-limit unit is spent.
  let providerBilled = false;

  try {
    // ── Check server-side cache ─────────────────────────────────────────────
    const cacheKey = opts.noCache ? null : makeCacheKey(opts);
    // Sent unconditionally (cache hit or miss) so the client can hand this key
    // back to the validate/validate-bazi routes for KV invalidation if this
    // reading later fails cross-model validation — see invalidateReadingCache.
    if (cacheKey) await safeWrite({ _cacheKey: cacheKey });
    const cached = (cacheKey && !opts.skipCacheRead) ? await kvGet(cacheKey) : null;
    if (cached) {
      // Replay cached response instantly — no provider call happened, so refund
      // the rate-limit unit the route charged up front.
      if (opts.rateLimit) {
        refundRateLimit(opts.rateLimit.ip, opts.rateLimit.keyPrefix).catch(() => {});
      }
      await safeWrite({ text: cached.text });
      if (cached.refs?.length) await safeWrite({ refs: cached.refs });
      // Tell the client this cached text already passed the synchronous
      // validate gate (see opts.validate below) so it skips its own redundant
      // async re-check — same signal as a fresh, just-validated generation.
      // Older cache entries (written before this field existed) simply lack
      // `validated`, so this is a no-op for them — identical to today's behavior.
      if (cached.validated) await safeWrite({ _validated: true });
      await safeWrite({ _done: true });
      try { await writer.write(encoder.encode("data: [DONE]\n\n")); } catch {}
      return;
    }

    // ── Stream from AI, capture text ────────────────────────────────────────
    // A hung provider call is bounded well under Vercel's 60s maxDuration and
    // retried once — the platform kills the whole function at 60s with no
    // chance for application code to react, so retrying only helps if it
    // happens *inside* that budget. `gen` invalidates any writes from an
    // abandoned first attempt that resolves late (after a retry has already
    // started) — without it, a slow-but-not-truly-hung first attempt could
    // interleave stale text into the retry's stream. Only safe to retry if
    // the timed-out attempt sent NO real content to the client yet —
    // restarting after partial output was already flushed would duplicate
    // text in front of the retry's full response, visibly broken.
    let fullText = "";
    let gen = 0;
    let sentAnyContent = false;
    const runAttempt = (attemptGen: number, tierOverride?: ModelTier, maxTokensOverride?: number, signal?: AbortSignal) => {
      const guardedWrite = async (obj: object) => {
        if ("text" in obj && typeof (obj as { text: string }).text === "string") providerBilled = true;
        if (attemptGen !== gen) return;
        if ("text" in obj && typeof (obj as { text: string }).text === "string") {
          fullText += (obj as { text: string }).text;
          sentAnyContent = true;
        }
        await safeWrite(obj);
      };
      const attemptOpts = maxTokensOverride ? { ...opts, maxTokens: maxTokensOverride } : opts;
      if (PROVIDER === "gemini") return streamGemini(guardedWrite, attemptOpts, tierOverride, signal);
      if (PROVIDER === "deepseek") return streamDeepSeek(guardedWrite, attemptOpts, tierOverride, signal);
      return streamAnthropic(guardedWrite, attemptOpts, tierOverride, signal);
    };

    // One full generation pass, including the stalled/failed-first-attempt →
    // fast-tier fallback. Returns the provider's own verdict on how the response
    // ended — a signal the old code never looked at, so a truncated-but-nonempty
    // OR safety/content-filter-cut-but-nonempty response was indistinguishable
    // from a real, complete one:
    //   "complete"  — a genuine normal finish (OpenAI/DeepSeek finish_reason
    //                  "stop", Gemini FinishReason.STOP, Anthropic stop_reason
    //                  "end_turn"/"stop_sequence"). Only this may be cached/sent as done.
    //   "truncated" — cut off by the token budget (length/MAX_TOKENS/max_tokens).
    //                  The only case worth retrying with a higher ceiling.
    //   "blocked"   — any other non-normal ending (content filter, safety block,
    //                  recitation, or no finish_reason captured at all). Retrying
    //                  with more tokens can't fix this, so it goes straight to
    //                  the error path below, same as a hard provider failure.
    type GenerationPassResult = {
      finishStatus: FinishStatus;
      tierUsed: ModelTier;
      usedFallback: boolean;
      /** Why the fallback fired, for the reading_generation log line below.
       *  Undefined when usedFallback is false. */
      fallbackReason?: string;
    };
    const runGenerationPass = async (maxTokensOverride?: number, forceFast = false): Promise<GenerationPassResult> => {
      const firstContentTimeoutMs = opts.firstContentTimeoutMs ?? DEFAULT_FIRST_CONTENT_TIMEOUT_MS;
      const attemptTimeoutMs = opts.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
      const retryTimeoutMs = opts.retryTimeoutMs ?? DEFAULT_RETRY_TIMEOUT_MS;
      gen += 1;
      // Aborts the actual upstream HTTP request (not just our own local wait)
      // once either deadline below fires, so an abandoned provider call stops
      // consuming tokens/holding a connection instead of running to completion
      // in the background purely for us to discard its output via the `gen` guard.
      if (forceFast) {
        const fastController = new AbortController();
        const { finishStatus } = await withDeadline(
          runAttempt(gen, "fast", maxTokensOverride, fastController.signal),
          retryTimeoutMs,
          () => fastController.abort()
        );
        return { finishStatus, tierUsed: "fast", usedFallback: false };
      }
      const primaryController = new AbortController();
      try {
        const { finishStatus } = await withTwoPhaseDeadline(
          runAttempt(gen, undefined, maxTokensOverride, primaryController.signal),
          firstContentTimeoutMs,
          attemptTimeoutMs,
          () => sentAnyContent,
          () => primaryController.abort()
        );
        return { finishStatus, tierUsed: opts.tier ?? "standard", usedFallback: false };
      } catch (e) {
        // Content already reached the client — never fall back (would
        // duplicate text in front of the retry's own stream). Propagate as-is;
        // the outer catch decides what the user sees.
        if (sentAnyContent) throw e;
        // Nothing reached the client yet: fall back to the fast tier for ANY
        // failure, not just a timeout — on DeepSeek this is v4-pro's reasoning
        // ("thinking") phase eating the whole window on a slow night (v4-pro
        // ~7s vs v4-flash ~1.8s on the same short prompt; on real readings
        // v4-pro was blowing well past the old 55s while v4-flash returns), OR
        // a hard failure before any content (a dropped connection — observed
        // live as the upstream error "terminated" — ECONNRESET, a provider
        // 5xx). Either way the reader should get *a* reading instead of a bare
        // error. Only safe because no content was sent yet (guarded above) —
        // restarting after partial output was already flushed would duplicate
        // text.
        const fallbackReason = e instanceof AttemptTimeoutError
          ? `timeout:${firstContentTimeoutMs}ms`
          : `error:${e instanceof Error ? e.message : String(e)}`;
        gen += 1; // invalidates any late write from the abandoned primary attempt
        const fallbackController = new AbortController();
        const { finishStatus } = await withDeadline(
          runAttempt(gen, "fast", maxTokensOverride, fallbackController.signal),
          retryTimeoutMs,
          () => fallbackController.abort()
        );
        return { finishStatus, tierUsed: "fast", usedFallback: true, fallbackReason };
      }
    };

    let result = await runGenerationPass();
    let fastTierFallbackUsed = result.usedFallback;
    let fallbackReason = result.fallbackReason;
    if (result.usedFallback) tallyValidation("fastFallback", opts.rateLimit?.keyPrefix);

    // Non-negotiable: a response the provider itself flagged as cut off by the
    // token budget must never reach the client marked as a complete reading —
    // whether or not it's nonempty. Try once, invisibly, with real headroom
    // above this route's already-raised ceiling before giving up. Text already
    // streamed to the client for the truncated attempt is live-typing UX, not a
    // finished artifact — _restart tells the client to discard it and re-accumulate
    // from the retry, so nothing half-finished is ever left on screen as "done".
    let truncationRetryAttempted = false;
    if (result.finishStatus === "truncated") {
      tallyValidation("truncated", opts.rateLimit?.keyPrefix);
      const retryMaxTokens = Math.min(DEEPSEEK_MAX_OUTPUT_TOKENS, Math.round(opts.maxTokens * 1.5));
      // The first attempt can already have eaten most of the route's maxDuration
      // budget before truncation is even detected (only known once the full
      // attempt resolves) — retrying is doomed if Vercel is about to kill the
      // whole function mid-retry anyway, which also means the refund below never
      // gets the chance to run. hasTimeForAnotherAttempt checks against the
      // route's REAL budget (opts.routeMaxDurationMs) when passed — see its own
      // doc comment — rather than an estimate derived from attemptTimeoutMs/
      // retryTimeoutMs. Require as much headroom as a full fresh attempt
      // (attemptTimeoutMs) could need before even trying a retry.
      // The retry runs on the FAST tier (no reasoning phase, so it's quicker and
      // its whole budget goes to visible output) and is therefore sized with the
      // fast-tier budget (retryTimeoutMs, 90s), not a full attemptTimeoutMs
      // (130s): a v4-pro reading is typically truncated at 40-70s, which the old
      // full-attempt gate (130 + elapsed <= 170) always rejected. Truncation
      // detected after ~65s of elapsed time fails the gate and falls through to the error.
      // Routes already at the token ceiling (retryMaxTokens === maxTokens) are
      // still worth retrying when the failed pass was the thinking tier, since
      // flash doesn't spend the budget on reasoning.
      const retryTimeoutMs = opts.retryTimeoutMs ?? DEFAULT_RETRY_TIMEOUT_MS;
      const worthRetrying = retryMaxTokens > opts.maxTokens || result.tierUsed !== "fast";
      // requestStartMs is taken inside streamWithRefs, after pre-stream work
      // (rate limit, body parse, RAG embedding: up to ~15s) that it can't see, so
      // pad the needed time by that overhead. Worst case: 15 (pre-stream) + 65
      // (max elapsed at detection: 65 + 105 <= 180 - 10) + 90 (retry) = 170 < 180.
      const PRE_STREAM_OVERHEAD_MS = 15_000;
      if (worthRetrying && hasTimeForAnotherAttempt(requestStartMs, opts, retryTimeoutMs + PRE_STREAM_OVERHEAD_MS)) {
        truncationRetryAttempted = true;
        await safeWrite({ _restart: true });
        fullText = "";
        sentAnyContent = false;
        result = await runGenerationPass(retryMaxTokens, true);
        fastTierFallbackUsed = fastTierFallbackUsed || result.usedFallback;
        fallbackReason = fallbackReason ?? result.fallbackReason;
        if (result.finishStatus === "complete") tallyValidation("truncRetryOk", opts.rateLimit?.keyPrefix);
      }
    }

    // Observability only (not user-facing, not stored) — one grep-able line per
    // generation recording which tier actually produced the text, how the
    // provider says it ended, whether the stalled/failed-attempt fast-tier
    // fallback or the truncation retry fired (and why, for the fallback), and
    // total wall-clock latency. Logged here (right after the pre-existing
    // truncation/blocked handling settles on a final `result`) so it reflects
    // the generation step itself — a separate "reading_validation" line below
    // covers the synchronous validate gate, since that's a distinct later event.
    console.log(JSON.stringify({
      event: "reading_generation",
      provider: PROVIDER,
      tier: result.tierUsed,
      finishStatus: result.finishStatus,
      fastTierFallback: fastTierFallbackUsed,
      ...(fallbackReason ? { fallbackReason } : {}),
      truncationRetry: truncationRetryAttempted,
      ...(truncationRetryAttempted ? { truncationRetryTier: "fast" } : {}),
      latencyMs: Date.now() - requestStartMs,
    }));

    // Still truncated after the retry (or no headroom/time left to even try), or
    // the provider ended abnormally for a reason more tokens can't fix (content
    // filter, safety block, etc.). Surface the same explicit error event the
    // mid-stream timeout-kill path already uses, so the client's existing error
    // UI/retry button takes over. Never send _done/[DONE] and never cache this text.
    const failIfIncomplete = async (): Promise<boolean> => {
      if (result.finishStatus === "complete") return false;
      if (opts.rateLimit && shouldRefundRateLimit({ cacheHit: false, providerBilled })) {
        refundRateLimit(opts.rateLimit.ip, opts.rateLimit.keyPrefix).catch(() => {});
      }
      const message = result.finishStatus === "truncated"
        ? "AI 回應過長被截斷，請重試"
        : "AI 回應被中斷，請重試";
      await safeWrite({ error: message });
      return true;
    };
    if (await failIfIncomplete()) return;

    // ── Synchronous server-side quality gate (runs BEFORE _done) ────────────
    // Niki's explicit call: this adds one validator call's latency — accepted
    // tradeoff so nothing is ever cached/sent as "validated" without a genuine
    // cross-model check. On failure, ship the reading as-is, unvalidated — no
    // in-process regeneration. (2026-10-04: regeneration was removed after
    // review found the worst case — a regeneration attempt + fast-tier fallback
    // + a second validator call, all stacked AFTER an already-slow first
    // generation — could reach ~125s against a 90s maxDuration, with the
    // existing time-budget gate only checked before the regeneration started,
    // not before the second validator call. Simplest fix: drop regeneration
    // entirely rather than patch the budget accounting, removing the timeout
    // risk as a class instead of tightening around it.) The pre-existing
    // CLIENT-side async validate/revise flow (lib/useSSEStream.ts) remains the
    // safety net for a failed/skipped validation, exactly as it was before this
    // synchronous gate existed.
    let validated: boolean | undefined;
    let failedIssues: string[] | undefined;
    if (opts.validate) {
      // The validator (jsonReview, lib/validateReading.ts) has its own
      // ~20s internal deadline that hasTimeForAnotherAttempt's default sizing
      // (a full generation attempt) doesn't account for — without this check, a
      // validate call fired after an already-slow generation could still get
      // killed by Vercel's maxDuration mid-call, turning a reading that was
      // already fully generated into a lost "回應不完整" error for the user
      // instead of just shipping it unvalidated. Skipping the call entirely
      // when there's no time left is the same fail-open outcome as a validator
      // timeout/error — just decided before spending the call instead of after.
      const VALIDATOR_TIMEOUT_MS = 20_000; // matches lib/validateReading.ts's withDeadline(..., 20_000)
      if (!hasTimeForAnotherAttempt(requestStartMs, opts, VALIDATOR_TIMEOUT_MS)) {
        console.log(JSON.stringify({ event: "reading_validation", skipped: "no_time_budget", reviewModel: REVIEW_MODEL }));
        tallyValidation("unreviewed", opts.rateLimit?.keyPrefix);
      } else {
        const verdict = await opts.validate(fullText);
        if (verdict === null) {
          // Validator unavailable/errored (or, per each route's closure, didn't
          // genuinely review the content) — fail open, exactly as if `validate`
          // had never been passed (same documented policy as the pre-existing
          // client-side async validator). `validated` stays undefined: we don't
          // know it passed, so we don't claim it did.
          tallyValidation("unreviewed", opts.rateLimit?.keyPrefix);
        } else if (verdict.pass) {
          validated = true;
          tallyValidation("pass", opts.rateLimit?.keyPrefix);
        } else {
          console.log(JSON.stringify({ event: "reading_validation", pass: false, issuesCount: verdict.issues.length, reviewModel: REVIEW_MODEL }));
          tallyValidation("fail", opts.rateLimit?.keyPrefix);
          failedIssues = verdict.issues;
        }
      }
    }

    if (opts.refs && opts.refs.length > 0) await safeWrite({ refs: opts.refs });
    if (validated) await safeWrite({ _validated: true });
    // Additive event (web + iOS parsers ignore unknown keys): hands the genuine
    // server-side verdict to the web client so it goes straight to the revision
    // call instead of re-running the identical check.
    if (failedIssues?.length) await safeWrite({ _validationIssues: failedIssues });
    await safeWrite({ _done: true });
    try { await writer.write(encoder.encode("data: [DONE]\n\n")); } catch {}

    // ── Save to cache ───────────────────────────────────────────────────────
    // A reading that genuinely failed validation is never cached — it would be
    // replayed to every visitor for 30 days. Written via after() so the
    // serverless instance isn't frozen before the KV write lands.
    if (fullText && cacheKey && !failedIssues) {
      const write = kvSet(cacheKey, { text: fullText, refs: opts.refs ?? [], ...(validated ? { validated: true } : {}) });
      try { after(write); } catch { await write; }
    }
  } catch (err) {
    console.error("[streamWithRefs]", PROVIDER, (err as Error)?.message ?? err);
    // The generation never produced a usable reading — refund the rate-limit unit
    // so a slow/failed provider night doesn't burn the user's daily quota on retries.
    if (opts.rateLimit && shouldRefundRateLimit({ cacheHit: false, providerBilled })) {
      refundRateLimit(opts.rateLimit.ip, opts.rateLimit.keyPrefix).catch(() => {});
    }
    // Reached when the primary attempt AND the fast-tier fallback both
    // failed/timed out before any content (see runGenerationPass) — but also
    // after content has already started streaming, if a mid-stream drop or
    // the attempt's own total cap (attemptTimeoutMs) throws past that point;
    // sentAnyContent being true there re-throws out of runGenerationPass
    // instead of falling back, landing here with partial text already sent.
    // Always the canned copy below, never `err.message`: that used to leak a
    // raw provider error (e.g. the literal string "terminated" from a dropped
    // connection) straight to a Chinese-speaking user.
    const message = opts.timeoutErrorMessage ?? DEFAULT_TIMEOUT_ERROR_MESSAGE;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
    } catch {}
  } finally {
    clearInterval(heartbeatTimer);
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────

async function streamGemini(
  safeWrite: (obj: object) => Promise<void>,
  opts: SSEWriterOptions,
  tierOverride?: ModelTier,
  signal?: AbortSignal
): Promise<{ finishStatus: FinishStatus }> {
  const { GoogleGenerativeAI, FinishReason } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: resolveModel(tierOverride ?? opts.tier),
    systemInstruction: opts.system,
    generationConfig: { maxOutputTokens: opts.maxTokens, temperature: opts.temperature ?? DEFAULT_TEMPERATURE },
  });

  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Aborts the actual upstream request once the two-phase deadline in
  // streamWithRefs gives up on this attempt — see runGenerationPass.
  const result = await model.generateContentStream({ contents }, signal ? { signal } : undefined);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) await safeWrite({ text });
  }
  // The aggregated final response (not individual stream chunks) carries the
  // definitive finishReason once the whole stream has been consumed. Only STOP
  // is a genuine normal finish — anything else (SAFETY/RECITATION/OTHER/etc.)
  // is non-normal and must not be treated as a successful completion.
  const finalResponse = await result.response;
  const finishReason = finalResponse.candidates?.[0]?.finishReason;
  if (finishReason === FinishReason.STOP) return { finishStatus: "complete" };
  if (finishReason === FinishReason.MAX_TOKENS) return { finishStatus: "truncated" };
  return { finishStatus: "blocked" };
}

// ── DeepSeek (OpenAI-compatible) ─────────────────────────────────────────────

async function streamDeepSeek(
  safeWrite: (obj: object) => Promise<void>,
  opts: SSEWriterOptions,
  tierOverride?: ModelTier,
  signal?: AbortSignal
): Promise<{ finishStatus: FinishStatus }> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  // Aborts the actual upstream request once the two-phase deadline in
  // streamWithRefs gives up on this attempt — see runGenerationPass. This is
  // the live production provider (PROVIDER=deepseek), so this is the path
  // that actually stops a stalled v4-pro "thinking" call from continuing to
  // consume tokens after we've already moved on to the fast-tier fallback.
  const effectiveTier = tierOverride ?? opts.tier ?? "standard";
  // The fast tier exists to be quick: it never reasons, whatever the route's
  // reasoningEffort says (flash thinks by default if not told "none").
  const effort = tierOverride === "fast" ? "none" : (opts.reasoningEffort ?? "low");
  const thinks = effort !== "none";
  const maxTokens = thinks
    ? Math.min(DEEPSEEK_MAX_OUTPUT_TOKENS, opts.maxTokens + THINKING_HEADROOM_TOKENS)
    : opts.maxTokens;
  const stream = await client.chat.completions.create({
    model: resolveModel(effectiveTier),
    max_tokens: maxTokens,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    stream: true,
    // DeepSeek v4 models "think" (emit reasoning_content) by default — that phase
    // adds large latency AND is billed against max_tokens (it starved short readings
    // to empty output). Free 總覽 readings pass "none" (speed); paid deep readings
    // default to "low" (light reasoning for accuracy). "none" isn't in OpenAI's
    // ReasoningEffort union, hence the value cast — DeepSeek's endpoint accepts it.
    reasoning_effort: effort as "low",
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages,
    ],
  }, signal ? { signal } : undefined);

  // finish_reason is null on every intermediate chunk and only set on the
  // terminal one — track the last non-null value seen. Only "stop" is a genuine
  // normal finish — anything else (including never receiving a finish_reason at
  // all, e.g. a dropped connection mid-stream) is non-normal.
  let finishReason: string | null = null;
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) await safeWrite({ text });
    if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
  }
  if (finishReason === "stop") return { finishStatus: "complete" };
  if (finishReason === "length") return { finishStatus: "truncated" };
  return { finishStatus: "blocked" };
}

// ── Anthropic ────────────────────────────────────────────────────────────────

async function streamAnthropic(
  safeWrite: (obj: object) => Promise<void>,
  opts: SSEWriterOptions,
  tierOverride?: ModelTier,
  signal?: AbortSignal
): Promise<{ finishStatus: FinishStatus }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemBlocks = [
    { type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } },
  ];

  // Aborts the actual upstream request once the two-phase deadline in
  // streamWithRefs gives up on this attempt — see runGenerationPass.
  const stream = client.messages.stream({
    model: resolveModel(tierOverride ?? opts.tier),
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    system: systemBlocks,
    messages: opts.messages,
  }, signal ? { signal } : undefined);

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      await safeWrite({ text: event.delta.text });
    }
  }
  // finalMessage() resolves once the stream has fully ended and carries the
  // definitive stop_reason. "end_turn"/"stop_sequence" are genuine normal
  // finishes; "max_tokens" is the budget cutting the response off; anything
  // else ("tool_use" shouldn't occur here since no tools are passed, or null)
  // is non-normal.
  const final = await stream.finalMessage();
  if (final.stop_reason === "end_turn" || final.stop_reason === "stop_sequence") {
    return { finishStatus: "complete" };
  }
  if (final.stop_reason === "max_tokens") return { finishStatus: "truncated" };
  return { finishStatus: "blocked" };
}
