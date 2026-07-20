// Returns whether a chart has been unlocked (paid). Read-only; the actual unlock
// is granted server-side by the Stripe webhook. Not wired into the UI yet.

import { NextRequest } from "next/server";
import { isUnlocked } from "@/lib/unlock";

export async function GET(request: NextRequest) {
  const chartId = new URL(request.url).searchParams.get("chartId") ?? "";
  return Response.json({ unlocked: await isUnlocked(chartId) });
}
