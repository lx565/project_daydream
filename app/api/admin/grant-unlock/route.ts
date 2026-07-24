// ONE-TIME admin route to grant a permanent unlock for a specific chartId —
// used to give Niki a free/permanent test chart on production without
// building a standing paywall-bypass mechanism. Writes the same legacy
// `true` value the two real pre-token customers have (lib/unlock.ts
// grandfathers that value as permanently unlocked, no token required), so
// this keeps working unchanged even after the token redesign ships.
// Delete this route after running it once.

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-grant-secret");
  if (!secret || secret !== process.env.GRANT_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const chartId = new URL(request.url).searchParams.get("chartId") ?? "";
  if (!chartId) return Response.json({ error: "missing_chartId" }, { status: 400 });

  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`unlock:${chartId}`, true);
    const verify = await kv.get<boolean>(`unlock:${chartId}`);
    return Response.json({ chartId, granted: true, verified: verify === true });
  } catch (err) {
    return Response.json({ error: "kv_unavailable", message: (err as Error).message }, { status: 500 });
  }
}
