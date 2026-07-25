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
}

async function callOnce(opts: CallAIOpts): Promise<string> {
  const { system, userMessage, maxTokens = 1500, temperature = 0.3, jsonMode = false } = opts;

  if (PROVIDER === "deepseek") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
    const res = await client.chat.completions.create({
      model: "deepseek-v4-pro",
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
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
    return block.type === "text" ? block.text : "";
  }

  // Gemini
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const generationConfig: Record<string, unknown> = { maxOutputTokens: maxTokens, temperature };
  if (jsonMode) generationConfig.responseMimeType = "application/json";
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: system,
    generationConfig,
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

// A hung provider call is bounded well under Vercel's maxDuration and retried
// once — the platform kills the whole function with no chance for
// application code to react, so retrying only helps if it happens *inside*
// that budget. See lib/aiRetry.ts and lib/sseWriter.ts (same pattern, applied
// to the streaming path) for the full rationale.
export async function callAI(opts: CallAIOpts): Promise<string> {
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
