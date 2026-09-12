import { buildVernacularSystem } from "@/lib/modernInstruction";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/lib/rateLimit";
import { makeSSEResponse, streamWithRefs } from "@/lib/sseWriter";

// Shared "白話版" companion call for couple/route.ts + bazi-couple/route.ts —
// takes their already-generated classical text (share card already stripped
// by the caller) and rewrites it section-by-section. One route serves both
// callers since the prompt and behavior are identical; only the input text
// differs, and that alone already makes each cache key unique.
export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(request, { limit: 20, keyPrefix: "vernacular" })).allowed) return rateLimitResponse();

  let body: { text?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const { text } = body;
  if (!text || text.trim().length < 20) return Response.json({ error: "invalid_request" }, { status: 400 });

  const userMessage = `請把以下命理合盤解讀，依系統指示逐段改寫成白話版：\n\n${text.trim()}`;

  return makeSSEResponse((writer, encoder) =>
    streamWithRefs(writer, encoder, {
      // Rewriting ~8-10 short sections into shorter prose — well under the
      // classical routes' 6400-6800 ceiling, but keep headroom for DeepSeek's
      // reasoning_content (see couple/route.ts's maxTokens comment for why
      // that eats into this same budget).
      maxTokens: 3200,
      rateLimit: { ip: clientIp(request), keyPrefix: "vernacular" },
      temperature: 0.75,
      system: buildVernacularSystem(),
      messages: [{ role: "user", content: userMessage }],
    })
  );
}
