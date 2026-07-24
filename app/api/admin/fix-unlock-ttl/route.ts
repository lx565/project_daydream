// ONE-TIME migration route. lib/unlock.ts used to set a 1-year TTL on unlock
// grants (fixed 2026-07-23 — real customers' access would have silently expired
// after 365 days, contradicting the "永久保存" promise). This re-persists every
// existing unlock:* key with no expiry so past purchases get the same permanent
// guarantee new ones now get. Idempotent — safe to call more than once.
// Delete this route after running it once.

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-migration-secret");
  if (!secret || secret !== process.env.MIGRATION_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { kv } = await import("@vercel/kv");
    const keys = await kv.keys("unlock:*");
    const results: { key: string; ok: boolean }[] = [];

    for (const key of keys) {
      try {
        const val = await kv.get<boolean>(key);
        if (val === true) {
          await kv.set(key, true); // no `ex` — persists forever
          results.push({ key, ok: true });
        }
      } catch (err) {
        results.push({ key, ok: false });
        console.error("[fix-unlock-ttl] failed for", key, err);
      }
    }

    return Response.json({ total: keys.length, migrated: results.filter(r => r.ok).length, results });
  } catch (err) {
    return Response.json({ error: "kv_unavailable", message: (err as Error).message }, { status: 500 });
  }
}
