import { NextRequest, NextResponse } from "next/server";
import { buildReadingEmail, type ReadingEmailData } from "@/lib/emailTemplate";

const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxex1lpJZNi1FEbYb1phB0YegnDLjjXP3SczsQKyk__g-IfrAE-JbHyap0iPEmLGQuscg/exec";

function validEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// Log email address to Google Sheets (fire-and-forget — never blocks the response)
function logToSheets(email: string, name: string | undefined, birthSummary: string) {
  fetch(SHEETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    const body = await req.json();
    const { email, ...data } = body as { email: string } & ReadingEmailData;

    if (!email || !validEmail(email)) {
      return NextResponse.json({ error: "請輸入有效的電子郵件地址" }, { status: 400 });
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
