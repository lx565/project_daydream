import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Only real site pathnames may become KV keys (no control chars, no ":" so a
// caller can't reach other key namespaces, no spaces).
const PATH_RE = /^\/[A-Za-z0-9\-._~%\/\u3400-\u9fff]{0,198}$/;

export async function GET(request: NextRequest) {
  const rlGet = await checkRateLimit(request, { limit: 600, keyPrefix: "vote-get" });
  if (!rlGet.allowed) return rateLimitResponse(rlGet);
  const path = (new URL(request.url).searchParams.get("path") ?? "").slice(0, 200);
  if (!path) return Response.json({ up: 0, down: 0 });
  if (!PATH_RE.test(path)) return Response.json({ error: "invalid_path" }, { status: 400 });
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv");
      const counts = await kv.hgetall<{ up?: number; down?: number }>(`vote:${path}`);
      return Response.json({ up: Number(counts?.up ?? 0), down: Number(counts?.down ?? 0) });
    } catch {}
  }
  return Response.json({ up: 0, down: 0 });
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, { limit: 20, keyPrefix: "vote" });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { path?: string; vote?: "up" | "down" };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "";
  const vote = body.vote;
  if (!path || !PATH_RE.test(path) || (vote !== "up" && vote !== "down")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  let up = 0, down = 0;
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import("@vercel/kv");
      const field = vote === "up" ? "up" : "down";
      await kv.hincrby(`vote:${path}`, field, 1);
      const counts = await kv.hgetall<{ up?: number; down?: number }>(`vote:${path}`);
      up = Number(counts?.up ?? 0);
      down = Number(counts?.down ?? 0);
    } catch (e) {
      console.warn("[vote] kv error:", (e as Error).message);
    }
  }

  // Vote/like counts live in Vercel KV (source of truth, read by LikeButton).
  // No longer mirrored to the Google Sheet — that was redundant audit noise.
  return Response.json({ ok: true, up, down });
}
