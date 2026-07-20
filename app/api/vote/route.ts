import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  const path = (new URL(request.url).searchParams.get("path") ?? "").slice(0, 200);
  if (!path) return Response.json({ up: 0, down: 0 });
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
  if (!(await checkRateLimit(request, { limit: 20, keyPrefix: "vote" })).allowed) return rateLimitResponse();

  let body: { path?: string; vote?: "up" | "down" };
  try { body = await request.json(); } catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }

  const path = (body.path ?? "").slice(0, 200);
  const vote = body.vote;
  if (!path || (vote !== "up" && vote !== "down")) {
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
