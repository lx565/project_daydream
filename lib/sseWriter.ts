import type { Reference } from "./rag";
import { createHash } from "crypto";
import { withDeadline, AttemptTimeoutError } from "./aiRetry";

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
}

// Default temperature for readings. 0 produced flat, repetitive, generic prose;
// interpretive writing reads far better at a moderate temperature.
const DEFAULT_TEMPERATURE = 0.5;

// Switch provider via AI_PROVIDER env var: "gemini" (default) | "anthropic" | "deepseek"
const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "anthropic" | "deepseek";

// Single source of truth for which model runs. Change the env var → every route
// reflects it automatically; no code edits. Falls back to a sensible default per provider.
const MODEL_DEFAULTS = {
  gemini:    { standard: "gemini-2.5-flash",          fast: "gemini-2.5-flash" },
  deepseek:  { standard: "deepseek-chat",             fast: "deepseek-chat" },
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
const CACHE_VERSION = "v26"; // 2026-07-24 perspectives retrieval parity fix (palaces signal, per-school topK, 6th school)
const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days

function makeCacheKey(opts: SSEWriterOptions): string {
  // Hash system prefix (identifies reading type) + full message content (identifies the person)
  const input = opts.system.slice(0, 100) + "|" + opts.messages.map((m) => m.content).join("|");
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

  try {
    // ── Check server-side cache ─────────────────────────────────────────────
    const cacheKey = makeCacheKey(opts);
    const cached = await kvGet(cacheKey);
    if (cached) {
      // Replay cached response instantly
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
    const runAttempt = (attemptGen: number) => {
      const guardedWrite = async (obj: object) => {
        if (attemptGen !== gen) return;
        if ("text" in obj && typeof (obj as { text: string }).text === "string") {
          fullText += (obj as { text: string }).text;
          sentAnyContent = true;
        }
        await safeWrite(obj);
      };
      if (PROVIDER === "gemini") return streamGemini(guardedWrite, opts);
      if (PROVIDER === "deepseek") return streamDeepSeek(guardedWrite, opts);
      return streamAnthropic(guardedWrite, opts);
    };

    try {
      gen = 1;
      await withDeadline(runAttempt(1), 35_000);
    } catch (e) {
      if (!(e instanceof AttemptTimeoutError) || sentAnyContent) throw e;
      gen = 2; // invalidates any late write from the abandoned first attempt
      await withDeadline(runAttempt(2), 15_000);
    }

    if (opts.refs && opts.refs.length > 0) await safeWrite({ refs: opts.refs });
    await safeWrite({ _done: true });
    try { await writer.write(encoder.encode("data: [DONE]\n\n")); } catch {}

    // ── Save to cache (non-blocking) ────────────────────────────────────────
    if (fullText) {
      kvSet(cacheKey, { text: fullText, refs: opts.refs ?? [] }).catch(() => {});
    }
  } catch (err) {
    console.error("[streamWithRefs]", PROVIDER, (err as Error)?.message ?? err);
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
  opts: SSEWriterOptions
) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: resolveModel(opts.tier),
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
}

// ── DeepSeek (OpenAI-compatible) ─────────────────────────────────────────────

async function streamDeepSeek(
  safeWrite: (obj: object) => Promise<void>,
  opts: SSEWriterOptions
) {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  const stream = await client.chat.completions.create({
    model: resolveModel(opts.tier),
    max_tokens: opts.maxTokens,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    stream: true,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages,
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) await safeWrite({ text });
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────

async function streamAnthropic(
  safeWrite: (obj: object) => Promise<void>,
  opts: SSEWriterOptions
) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemBlocks = [
    { type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } },
  ];

  const stream = client.messages.stream({
    model: resolveModel(opts.tier),
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
}
