import { NextRequest, NextResponse } from "next/server";
import { parseBaziInput, findBaziCandidates } from "@/lib/baziReverse";
import { calculateZiwei } from "@/lib/ziwei";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Cap how many candidates we enrich (each runs iztro chart calc) to bound compute.
const MAX_ENRICHED = 12;

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(req, { limit: 20, keyPrefix: "bazi-candidates" })).allowed) {
    return rateLimitResponse();
  }

  let body: { input?: string; gender?: "male" | "female" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { input, gender } = body;

  if (!input || (gender !== "male" && gender !== "female")) {
    return NextResponse.json({ error: "missing input or gender" }, { status: 400 });
  }

  const pillars = parseBaziInput(input);
  if (!pillars) {
    return NextResponse.json({ error: "invalid_bazi" }, { status: 422 });
  }

  const candidates = findBaziCandidates(pillars, gender);

  if (candidates.length === 0) {
    return NextResponse.json({ error: "no_match" }, { status: 404 });
  }

  // Enrich each candidate with key Ziwei identifiers so the user can cross-check
  const enriched = await Promise.all(
    candidates.slice(0, MAX_ENRICHED).map(async (c) => {
      try {
        const ziwei = await calculateZiwei(c.year, c.month, c.day, c.hour, gender);
        return {
          ...c,
          fiveElementsClass: ziwei.fiveElementsClass,
          mainStar: ziwei.mainStar,
          bodyStar: ziwei.bodyStar,
          soulPalace: ziwei.soulPalace,
          bodyPalace: ziwei.bodyPalace,
          summary: ziwei.summary,
          date: `${c.year}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`,
          hourStr: String(c.hour),
        };
      } catch {
        return { ...c, date: `${c.year}-${String(c.month).padStart(2,"0")}-${String(c.day).padStart(2,"0")}`, hourStr: String(c.hour) };
      }
    })
  );

  return NextResponse.json({ pillars, candidates: enriched });
}
