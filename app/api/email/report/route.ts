import { NextRequest, NextResponse } from "next/server";
import { buildReadingEmail, type ReadingEmailData } from "@/lib/emailTemplate";
import { SHEETS_URL } from "@/lib/sheetsWebhook";
import { checkRateLimit, incrDailyCap, rateLimitResponse } from "@/lib/rateLimit";

const MAX_EMAIL_LEN = 254;
const MAX_NAME_LEN = 40;
const MAX_SUMMARY_LEN = 300;
const MAX_READING_LEN = 40_000;
const MAX_ZIWEI_JSON_LEN = 100_000;
const READING_KEYS = ["synthesis", "overview", "consensus", "bazi", "palaces", "decades", "flowYears", "baziDeep", "baziSchools", "baziDecades", "cautions"];

function badRequest(code: string) {
  return NextResponse.json({ error: code }, { status: 400 });
}

// Returns an error code if the payload is malformed or oversize.
function validatePayload(data: Record<string, unknown>): string | null {
  if (data.name !== undefined && (typeof data.name !== "string" || data.name.length > MAX_NAME_LEN)) return "name_invalid";
  if (data.gender !== "male" && data.gender !== "female") return "gender_invalid";
  for (const k of ["birthSummary", "chartSummary"]) {
    const v = data[k];
    if (typeof v !== "string" || v.length > MAX_SUMMARY_LEN) return `${k}_invalid`;
  }
  const readings = data.readings;
  if (!readings || typeof readings !== "object" || Array.isArray(readings)) return "readings_invalid";
  for (const [k, v] of Object.entries(readings as Record<string, unknown>)) {
    if (!READING_KEYS.includes(k)) return "readings_invalid";
    if (v !== undefined && (typeof v !== "string" || v.length > MAX_READING_LEN)) return "readings_too_large";
  }
  if (data.ziwei !== undefined) {
    const z = data.ziwei as { palaces?: unknown } | null;
    if (!z || typeof z !== "object" || !Array.isArray(z.palaces) || z.palaces.length > 12) return "ziwei_invalid";
    if (JSON.stringify(z).length > MAX_ZIWEI_JSON_LEN) return "ziwei_too_large";
  }
  return null;
}

function validEmail(e: string) {
  return /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/.test(e.trim());
}

// Log email address to Google Sheets (fire-and-forget — never blocks the response)
function logToSheets(email: string, name: string | undefined, birthSummary: string) {
  fetch(SHEETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      type: "email_report",
      timestamp: new Date().toISOString(),
      email,
      name: name ?? "",
      birthSummary,
    }),
  }).catch(() => {/* silent — sheet log is non-critical */});
}

export async function POST(req: NextRequest) {
  try {
    // Strict per-IP limit (3/hour) + global daily cap — this route sends real
    // mail from our domain, so it must not be usable as a relay.
    if (!(await checkRateLimit(req, { limit: 3, keyPrefix: "email-report", windowSec: 3600 })).allowed) {
      return rateLimitResponse();
    }

    const body = await req.json();
    if (!body || typeof body !== "object") return badRequest("invalid_body");
    const { email, ...data } = body as { email: string } & ReadingEmailData;

    if (typeof email !== "string" || email.length > MAX_EMAIL_LEN || !validEmail(email)) {
      return NextResponse.json({ error: "請輸入有效的電子郵件地址" }, { status: 400 });
    }
    const invalid = validatePayload(data as unknown as Record<string, unknown>);
    if (invalid) return badRequest(invalid);

    const dailyCap = Number(process.env.EMAIL_DAILY_CAP) || 300;
    if (!(await incrDailyCap("email-report", dailyCap))) {
      return NextResponse.json({ error: "今日郵件寄送量已達上限，請明日再試" }, { status: 429 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "郵件服務尚未設定，請稍後再試" }, { status: 503 });
    }

    const { html, text } = buildReadingEmail(data);
    const nameLabel = data.name ? `${data.name} 的` : '';

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "命裡 <reading@mingli.study>",
        to: [email.trim()],
        subject: `${nameLabel}命盤解讀報告 · 命裡`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", res.status, err);
      return NextResponse.json({ error: "郵件發送失敗，請確認地址後重試" }, { status: 502 });
    }

    // Log to Google Sheets for tracking (fire-and-forget)
    logToSheets(email.trim(), data.name, data.birthSummary);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("email/report error:", e);
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試" }, { status: 500 });
  }
}
