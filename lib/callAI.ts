// Non-streaming single AI call — for structured/JSON responses.
// Respects the same AI_PROVIDER env var as sseWriter.ts.

const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "anthropic" | "deepseek";

export async function callAI(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const { system, userMessage, maxTokens = 1500, temperature = 0.3, jsonMode = false } = opts;

  if (PROVIDER === "deepseek") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
    const res = await client.chat.completions.create({
      model: "deepseek-chat",
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
