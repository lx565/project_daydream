import { createHash } from "crypto";

// Non-streaming text generation for static/ISR content pages (SEO).
// Mirrors the provider switch in sseWriter.ts but returns the full text at once,
// with a long-lived KV cache so each page synthesizes at most once per content version.

// SEO content synthesis uses DeepSeek by default — strong at Chinese. This is
// independent of the app-wide AI_PROVIDER that powers live readings. Override
// with SEO_AI_PROVIDER.
// NOTE (2026-07-25): DeepSeek retired deepseek-chat/deepseek-reasoner in favor of
// deepseek-v4-pro/deepseek-v4-flash — both new models emit reasoning_content by
// default (confirmed via direct API test), so the old "non-thinking model, no
// output-budget truncation" assumption behind picking the cheap/fast tier here no
// longer holds. Watch generated SEO content for truncated/cut-off endings; if it
// shows up, maxTokens may need raising to leave headroom for reasoning tokens.
const PROVIDER = (process.env.SEO_AI_PROVIDER
  ?? (process.env.DEEPSEEK_API_KEY ? "deepseek" : process.env.AI_PROVIDER ?? "gemini")) as
  "gemini" | "anthropic" | "deepseek";

const MODEL_DEFAULTS = {
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-flash",
  anthropic: "claude-sonnet-4-6",
} as const;

function resolveModel(): string {
  const env = process.env[`${PROVIDER.toUpperCase()}_MODEL`];
  return env ?? MODEL_DEFAULTS[PROVIDER];
}

// Bump when the prompt structure changes so stale cache is bypassed.
const CACHE_VERSION = "seo-v2"; // v2: deep 7-section structure + R1 model
const CACHE_TTL = 60 * 60 * 24 * 90; // 90 days

// Hash the FULL system string, not a prefix. Several callers (getSihuaContent,
// getSihuaPalaceContent, getXiongContent, getStarPalaceContent) append an
// optional `revisionNote` onto the END of `system` to request targeted
// regeneration — base system prompts here run well past 80 chars (e.g.
// SIHUA_BASE_RULES alone is 1400+), so a prefix-only hash made every
// revisionNote call collide with the original cache entry and silently
// re-serve the stale (unrevised) content instead of regenerating. Found
// 2026-08-25 when a revision request returned byte-identical output twice.
function cacheKey(tag: string, model: string, system: string, prompt: string): string {
  const hash = createHash("md5").update(model + "|" + system + "|" + prompt).digest("hex");
  return `seo:${CACHE_VERSION}:${tag}:${hash}`;
}

async function kvGet(key: string): Promise<string | null> {
  if (!process.env.KV_REST_API_URL) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return await kv.get<string>(key);
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!process.env.KV_REST_API_URL) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value, { ex: CACHE_TTL });
  } catch {}
}

interface GenerateOpts {
  tag: string; // short label for cache namespacing, e.g. "star" | "guide"
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Override the model (e.g. "deepseek-reasoner" for deep teaching content). */
  model?: string;
}

/**
 * Generate synthesized Chinese content. Returns "" on any failure so callers
 * can fall back to curated copy — never surfaces an error to the page.
 */
export async function synthesize(opts: GenerateOpts): Promise<string> {
  const key = cacheKey(opts.tag, opts.model ?? PROVIDER, opts.system, opts.prompt);
  const cached = await kvGet(key);
  if (cached) return cached;

  const call = () =>
    PROVIDER === "gemini" ? genGemini(opts)
      : PROVIDER === "deepseek" ? genDeepSeek(opts)
      : genAnthropic(opts);

  // Retry transient provider errors (503 high-demand, 429 rate, 500) with backoff.
  let text = "";
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      text = (await call()).trim();
      if (text) break;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      const transient = /\b(429|500|502|503|504)\b|high demand|overload|unavailable|timeout|ECONN|fetch failed/i.test(msg);
      if (attempt === MAX_ATTEMPTS || !transient) {
        console.warn(`[synthesize] ${opts.tag} failed (attempt ${attempt}):`, msg);
        return "";
      }
      console.warn(`[synthesize] ${opts.tag} transient error, retrying (${attempt}/${MAX_ATTEMPTS}):`, msg);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(700 * 2 ** (attempt - 1)); // 0.7s, 1.4s, 2.8s
  }

  if (text) kvSet(key, text).catch(() => {});
  return text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function genGemini(opts: GenerateOpts): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: opts.model ?? resolveModel(),
    systemInstruction: opts.system,
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 1200,
      temperature: 0.2,
      // Gemini 2.5 Flash is a thinking model; thinking tokens count against the
      // output budget and would truncate the article. We don't need reasoning here.
      thinkingConfig: { thinkingBudget: 0 },
    } as Record<string, unknown>,
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
  });
  return result.response.text();
}

async function genDeepSeek(opts: GenerateOpts): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });
  const res = await client.chat.completions.create({
    model: opts.model ?? resolveModel(),
    max_tokens: opts.maxTokens ?? 1200,
    temperature: 0.2,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

async function genAnthropic(opts: GenerateOpts): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: opts.model ?? resolveModel(),
    max_tokens: opts.maxTokens ?? 1200,
    temperature: 0.2,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}
