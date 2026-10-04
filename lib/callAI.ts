// Non-streaming single AI call — for structured/JSON responses.
// Respects the same AI_PROVIDER env var as sseWriter.ts.

import { withDeadline, AttemptTimeoutError } from "./aiRetry";

const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "anthropic" | "deepseek";

interface CallAIOpts {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  /** DeepSeek reasoning effort. Defaults to "none" — callAI is for structured/JSON
   *  utility calls (e.g. flow-year scoring) where the thinking phase only adds
   *  latency and eats the token budget. See sseWriter.ts for the full rationale. */
  reasoningEffort?: "none" | "low" | "medium" | "high";
}

/** `truncated` mirrors sseWriter.ts's finish_reason/stop_reason check: false
 *  only for a genuine normal finish (OpenAI/DeepSeek "stop", Gemini
 *  FinishReason.STOP, Anthropic "end_turn"/"stop_sequence"). Anything else
 *  (length/max_tokens, content_filter, safety, or no finish_reason captured
 *  at all) is true — callAI itself doesn't retry on this (it has no SSE
 *  client to send a `_restart` to), so callers must treat `text` as unusable
 *  and fall back to their own existing placeholder copy when `truncated` is true. */
interface CallAIResult {
  text: string;
  truncated: boolean;
}

async function callOnce(opts: CallAIOpts): Promise<CallAIResult> {
  const { system, userMessage, maxTokens = 1500, temperature = 0.3, jsonMode = false, reasoningEffort = "none" } = opts;

  if (PROVIDER === "deepseek") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
    const res = await client.chat.completions.create({
      // Match sseWriter's model policy: flash primary (v4-pro's thinking phase was
      // blowing past callAI's deadline → 500s on flowyears-scores), overridable via
      // DEEPSEEK_MODEL. reasoning_effort cast because "none" isn't in OpenAI's union.
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash",
      max_tokens: maxTokens,
      temperature,
      reasoning_effort: reasoningEffort as "low",
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    });
    const text = res.choices[0]?.message?.content ?? "";
    const finishReason = res.choices[0]?.finish_reason;
    return { text, truncated: finishReason !== "stop" };
  }

  if (PROVIDER === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content[0];
    const text = block.type === "text" ? block.text : "";
    const truncated = msg.stop_reason !== "end_turn" && msg.stop_reason !== "stop_sequence";
    return { text, truncated };
  }

  // Gemini
  const { GoogleGenerativeAI, FinishReason } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens, temperature };
  if (jsonMode) generationConfig.responseMimeType = "application/json";
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: system,
    generationConfig,
  });
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  const finishReason = result.response.candidates?.[0]?.finishReason;
  return { text, truncated: finishReason !== FinishReason.STOP };
}

// A hung provider call is bounded well under Vercel's maxDuration and retried
// once — the platform kills the whole function with no chance for
// application code to react, so retrying only helps if it happens *inside*
// that budget. See lib/aiRetry.ts and lib/sseWriter.ts (same pattern, applied
// to the streaming path) for the full rationale.
export async function callAI(opts: CallAIOpts): Promise<CallAIResult> {
  try {
    return await withDeadline(callOnce(opts), 35_000);
  } catch (e) {
    if (!(e instanceof AttemptTimeoutError)) {
      console.error("[callAI]", PROVIDER, (e as Error)?.message ?? e);
      throw e;
    }
    try {
      return await withDeadline(callOnce(opts), 15_000);
    } catch (e2) {
      console.error("[callAI] retry also failed:", PROVIDER, (e2 as Error)?.message ?? e2);
      throw e2;
    }
  }
}
