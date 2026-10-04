import type { Reference } from "./rag";
import { createHash } from "crypto";
import { withDeadline, AttemptTimeoutError } from "./aiRetry";
import { refundRateLimit } from "./rateLimit";

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
  /** First-attempt deadline in ms before retrying (if no content sent yet) or
   *  failing (if content already streamed). Default 35_000 — matches every
   *  route's `maxDuration = 60` with margin for retry + overhead. Routes that
   *  declare a longer `maxDuration` (e.g. decades' 90) and generate enough
   *  content to need more real time should pass a proportionally longer value
   *  here — otherwise a legitimately-in-progress-but-slow generation gets
   *  killed mid-stream at the default 35s regardless of how much headroom the
   *  route's own maxDuration actually has. */
  attemptTimeoutMs?: number;
  /** Retry-attempt deadline in ms, only used if the first attempt timed out
   *  with zero content sent. Default 15_000. See attemptTimeoutMs. */
  retryTimeoutMs?: number;
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
}

// Default temperature for readings. 0 produced flat, repetitive, generic prose;
// interpretive writing reads far better at a moderate temperature.
const DEFAULT_TEMPERATURE = 0.5;

// DeepSeek's documented max_tokens ceiling for the chat-completions endpoint
// (deepseek-chat/deepseek-reasoner family, which "deepseek-flash"/"deepseek-v4-pro"
// are aliases of) is 8192 — passing a higher value is rejected by the API rather
// than silently clamped. This repo has no live network access to re-verify that
// number against the current DeepSeek API reference for these specific aliases;
// if it's ever raised provider-side, bump this too. Used both to cap every
// route's maxTokens (see each route's own comment) and as the ceiling for the
// one-shot truncation retry below.
const DEEPSEEK_MAX_OUTPUT_TOKENS = 8192;

// Switch provider via AI_PROVIDER env var: "gemini" (default) | "anthropic" | "deepseek"
const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "anthropic" | "deepseek";

// Single source of truth for which model runs. Change the env var → every route
// reflects it automatically; no code edits. Falls back to a sensible default per provider.
const MODEL_DEFAULTS = {
  gemini:    { standard: "gemini-2.5-flash",          fast: "gemini-2.5-flash" },
  // TEMP (2026-08-03): standard set to flash, not v4-pro. v4-pro's reasoning
  // phase was returning 55s+ on every reading (site-wide "AI 服务响应较慢"); flash
  // is ~4x faster and still strong at Chinese. Revert `standard` to "deepseek-v4-pro"
  // (or set env DEEPSEEK_MODEL=deepseek-v4-pro) once DeepSeek v4-pro latency recovers.
  // (2026-09-10: DeepSeek retired the old "v4-flash" alias and renamed it to
  // "deepseek-flash" — same underlying model, id only.)
  deepseek:  { standard: "deepseek-flash",         fast: "deepseek-flash" },
  anthropic: { standard: "claude-sonnet-4-6",         fast: "claude-haiku-4-5-20251001" },
} as const;

function resolveModel(tier: ModelTier = "standard"): string {
  const envStd  = process.env[`${PROVIDER.toUpperCase()}_MODEL`];
  const envFast = process.env[`${PROVIDER.toUpperCase()}_MODEL_FAST`];
  const defaults = MODEL_DEFAULTS[PROVIDER];
  if (tier === "fast") return envFast ?? envStd ?? defaults.fast;
  return envStd ?? defaults.standard;
}

// ── Server-side KV cache ──────────────────────────────────────────────────────
// Bump CACHE_VERSION when prompt structure changes significantly
const CACHE_VERSION = "v53"; // 2026-10-04: truncation-detection fix (this batch) —
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

async function kvGet(key: string): Promise<{ text: string; refs: Reference[] } | null> {
  if (!process.env.KV_REST_API_URL) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return await kv.get<{ text: string; refs: Reference[] }>(key);
  } catch { return null; }
}

async function kvSet(key: string, value: { text: string; refs: Reference[] }): Promise<void> {
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

export async function streamWithRefs(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  opts: SSEWriterOptions
) {
  const safeWrite = async (obj: object) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
    } catch {}
  };
  // Wall-clock anchor for the retry time-budget check below (Medium 4) — covers
  // the whole request, including the cache lookup, so it reflects real elapsed
  // time against the route's maxDuration, not just time spent in the provider call.
  const requestStartMs = Date.now();

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
    const runAttempt = (attemptGen: number, tierOverride?: ModelTier, maxTokensOverride?: number) => {
      const guardedWrite = async (obj: object) => {
        if (attemptGen !== gen) return;
        if ("text" in obj && typeof (obj as { text: string }).text === "string") {
          fullText += (obj as { text: string }).text;
          sentAnyContent = true;
        }
        await safeWrite(obj);
      };
      const attemptOpts = maxTokensOverride ? { ...opts, maxTokens: maxTokensOverride } : opts;
      if (PROVIDER === "gemini") return streamGemini(guardedWrite, attemptOpts, tierOverride);
      if (PROVIDER === "deepseek") return streamDeepSeek(guardedWrite, attemptOpts, tierOverride);
      return streamAnthropic(guardedWrite, attemptOpts, tierOverride);
    };

    // One full generation pass, including the existing stalled-first-attempt →
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
    const runGenerationPass = async (maxTokensOverride?: number): Promise<{ finishStatus: FinishStatus }> => {
      try {
        gen += 1;
        return await withDeadline(runAttempt(gen, undefined, maxTokensOverride), opts.attemptTimeoutMs ?? 35_000);
      } catch (e) {
        if (!(e instanceof AttemptTimeoutError) || sentAnyContent) throw e;
        // Primary model stalled before emitting anything — on DeepSeek this is
        // v4-pro's reasoning ("thinking") phase eating the whole window on a slow
        // night (v4-pro ~7s vs v4-flash ~1.8s on the same short prompt; on real
        // readings v4-pro was blowing past 55s while v4-flash returns). Fall back to
        // the "fast" tier (deepseek-flash / gemini-2.5-flash / claude-haiku) so
        // the reader gets *a* reading instead of "AI 服务响应较慢". Only safe because
        // no content was sent yet (guarded by !sentAnyContent above) — restarting
        // after partial output was already flushed would duplicate text.
        gen += 1; // invalidates any late write from the abandoned first attempt
        return await withDeadline(runAttempt(gen, "fast", maxTokensOverride), opts.retryTimeoutMs ?? 15_000);
      }
    };

    let result = await runGenerationPass();

    // Non-negotiable: a response the provider itself flagged as cut off by the
    // token budget must never reach the client marked as a complete reading —
    // whether or not it's nonempty. Try once, invisibly, with real headroom
    // above this route's already-raised ceiling before giving up. Text already
    // streamed to the client for the truncated attempt is live-typing UX, not a
    // finished artifact — _restart tells the client to discard it and re-accumulate
    // from the retry, so nothing half-finished is ever left on screen as "done".
    if (result.finishStatus === "truncated") {
      const retryMaxTokens = Math.min(DEEPSEEK_MAX_OUTPUT_TOKENS, Math.round(opts.maxTokens * 1.5));
      // The first attempt can already have eaten most of the route's maxDuration
      // budget before truncation is even detected (only known once the full
      // attempt resolves) — retrying is doomed if Vercel is about to kill the
      // whole function mid-retry anyway, which also means the refund below never
      // gets the chance to run. attemptTimeoutMs/retryTimeoutMs are already sized
      // proportionally to each route's own maxDuration (see attemptTimeoutMs's doc
      // comment — e.g. 55s+20s for a 90s route, 35s+15s default for 60s), so their
      // sum plus a conservative overhead margin stands in for "the route's real
      // budget" without needing every call site to thread maxDuration through.
      // Require as much headroom as a full fresh attempt (attemptTimeoutMs) could
      // need before even trying a retry.
      const OVERHEAD_MARGIN_MS = 10_000;
      const estimatedRouteBudgetMs =
        (opts.attemptTimeoutMs ?? 35_000) + (opts.retryTimeoutMs ?? 15_000) + OVERHEAD_MARGIN_MS;
      const elapsedMs = Date.now() - requestStartMs;
      const hasTimeForRetry = elapsedMs + (opts.attemptTimeoutMs ?? 35_000) <= estimatedRouteBudgetMs;
      if (retryMaxTokens > opts.maxTokens && hasTimeForRetry) {
        await safeWrite({ _restart: true });
        fullText = "";
        sentAnyContent = false;
        result = await runGenerationPass(retryMaxTokens);
      }
    }

    if (result.finishStatus !== "complete") {
      // Still truncated after the retry (or no headroom/time left to even try),
      // or the provider ended abnormally for a reason more tokens can't fix
      // (content filter, safety block, etc. — never worth a second generation).
      // Surface the same explicit error event the mid-stream timeout-kill path
      // already uses, so the client's existing error UI/retry button takes over.
      // Never send _done/[DONE] and never cache this text.
      if (opts.rateLimit) {
        refundRateLimit(opts.rateLimit.ip, opts.rateLimit.keyPrefix).catch(() => {});
      }
      const message = result.finishStatus === "truncated"
        ? "AI 回應過長被截斷，請重試"
        : "AI 回應被中斷，請重試";
      await safeWrite({ error: message });
      return;
    }

    if (opts.refs && opts.refs.length > 0) await safeWrite({ refs: opts.refs });
    await safeWrite({ _done: true });
    try { await writer.write(encoder.encode("data: [DONE]\n\n")); } catch {}

    // ── Save to cache (non-blocking) ────────────────────────────────────────
    if (fullText && cacheKey) {
      kvSet(cacheKey, { text: fullText, refs: opts.refs ?? [] }).catch(() => {});
    }
  } catch (err) {
    console.error("[streamWithRefs]", PROVIDER, (err as Error)?.message ?? err);
    // The generation never produced a usable reading — refund the rate-limit unit
    // so a slow/failed provider night doesn't burn the user's daily quota on retries.
    if (opts.rateLimit) {
      refundRateLimit(opts.rateLimit.ip, opts.rateLimit.keyPrefix).catch(() => {});
    }
    const message = err instanceof AttemptTimeoutError
      ? "AI 服务响应较慢，请稍后重试"
      : err instanceof Error ? err.message : "服务暂时不可用";
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
    } catch {}
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────

async function streamGemini(
  safeWrite: (obj: object) => Promise<void>,
  opts: SSEWriterOptions,
  tierOverride?: ModelTier
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

  const result = await model.generateContentStream({ contents });
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
  tierOverride?: ModelTier
): Promise<{ finishStatus: FinishStatus }> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  const stream = await client.chat.completions.create({
    model: resolveModel(tierOverride ?? opts.tier),
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    stream: true,
    // DeepSeek v4 models "think" (emit reasoning_content) by default — that phase
    // adds large latency AND is billed against max_tokens (it starved short readings
    // to empty output). Free 總覽 readings pass "none" (speed); paid deep readings
    // default to "low" (light reasoning for accuracy). "none" isn't in OpenAI's
    // ReasoningEffort union, hence the value cast — DeepSeek's endpoint accepts it.
    reasoning_effort: (opts.reasoningEffort ?? "low") as "low",
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages,
    ],
  });

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
  tierOverride?: ModelTier
): Promise<{ finishStatus: FinishStatus }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemBlocks = [
    { type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } },
  ];

  const stream = client.messages.stream({
    model: resolveModel(tierOverride ?? opts.tier),
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    system: systemBlocks,
    messages: opts.messages,
  });

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
