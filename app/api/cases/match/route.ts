import { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { findMatchingCases } from "@/lib/caseMatch";
import { detectGeju } from "@/lib/detectGeju";
import type { BaziResult } from "@/lib/bazi";

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, { limit: 60, keyPrefix: "cases-match" });
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { bazi: BaziResult };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { bazi } = body;
  if (!bazi?.day?.stem || !bazi?.day?.branch) {
    return Response.json({ cases: [] });
  }

  const rizi = `${bazi.day.stem}${bazi.dayMasterElement}`; // e.g. "甲木"
  const geju = detectGeju(bazi);
  const cases = findMatchingCases(rizi, geju, 3);

  return Response.json({ cases, rizi, geju });
}
