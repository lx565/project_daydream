// Request-size guards for the AI routes. Every limit is well above what the web
// and iOS clients actually send; they exist so a hand-crafted request can't push
// megabytes of attacker text into a paid LLM prompt. Violations return
// { error: "<code>" } with status 400.

export const MAX_NAME_LEN = 40;
export const MAX_VERNACULAR_TEXT_LEN = 12_000;
export const MAX_READING_LEN = 40_000;
export const MAX_SUMMARY_LEN = 1_000;
export const MAX_CHAT_MESSAGES = 12;
export const MAX_CHAT_MESSAGE_LEN = 2_000;
export const MAX_CHAT_TOTAL_LEN = 14_000;
export const MAX_BACKGROUND_KEYS = 10;
export const MAX_BACKGROUND_VALUE_LEN = 20_000;

function bad(code: string): Response {
  return Response.json({ error: code }, { status: 400 });
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Generic guard for JSON bodies of the reading routes. Returns a 400 Response or null. */
export function inputGuard(body: unknown): Response | null {
  if (!isObj(body)) return null; // each route's own missing_fields check handles this
  for (const k of ["name", "nameA", "nameB"]) {
    const v = body[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string" || v.length > MAX_NAME_LEN) return bad("name_too_long");
  }
  if (body.text !== undefined && body.text !== null) {
    if (typeof body.text !== "string" || body.text.length > MAX_VERNACULAR_TEXT_LEN) return bad("text_too_long");
  }
  if (body.reading !== undefined && body.reading !== null) {
    if (typeof body.reading !== "string" || body.reading.length > MAX_READING_LEN) return bad("reading_too_long");
  }
  const topSummary = body.summary;
  if (topSummary !== undefined && topSummary !== null && (typeof topSummary !== "string" || topSummary.length > MAX_SUMMARY_LEN)) {
    return bad("summary_too_long");
  }
  for (const k of ["ziwei", "bazi", "ziweiA", "ziweiB", "baziA", "baziB"]) {
    const o = body[k];
    if (!isObj(o)) continue;
    const s = o.summary;
    if (s !== undefined && s !== null && (typeof s !== "string" || s.length > MAX_SUMMARY_LEN)) return bad("summary_too_long");
  }
  const notes = body.revisionNotes;
  if (notes !== undefined && notes !== null) {
    if (!Array.isArray(notes) || notes.length > 10 || notes.some((n) => typeof n !== "string" || n.length > 500)) {
      return bad("revision_notes_too_long");
    }
  }
  return null;
}

/** Chat-specific shape and size checks (messages + backgroundReadings). */
export function chatInputGuard(messages: unknown, backgroundReadings: unknown): Response | null {
  if (!Array.isArray(messages)) return bad("invalid_messages");
  if (messages.length > MAX_CHAT_MESSAGES) return bad("too_many_messages");
  let total = 0;
  for (const m of messages) {
    if (!isObj(m) || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return bad("invalid_messages");
    if (m.content.length > MAX_CHAT_MESSAGE_LEN) return bad("message_too_long");
    total += m.content.length;
  }
  if (total > MAX_CHAT_TOTAL_LEN) return bad("messages_too_long");
  if (backgroundReadings !== undefined && backgroundReadings !== null) {
    if (!isObj(backgroundReadings)) return bad("invalid_background");
    const entries = Object.entries(backgroundReadings);
    if (entries.length > MAX_BACKGROUND_KEYS) return bad("background_too_large");
    for (const [k, v] of entries) {
      if (k.length > 30 || typeof v !== "string" || v.length > MAX_BACKGROUND_VALUE_LEN) return bad("background_too_large");
    }
  }
  return null;
}
