// Server-authoritative hepan invite state, persisted in @vercel/kv — same
// pattern as lib/unlock.ts's unlock:${chartId} keys, new key namespace.
// A visitor creates an invite from their own birth data (Person A); a second
// visitor opening the link supplies their own (Person B); once both are
// present, the compare page computes both charts client-side and hands off
// to the existing (unmodified) HepanResultView.

import type { RelationshipType } from "./coupleTypes";

export interface PersonSnapshot {
  date: string;   // "YYYY-MM-DD"
  hour: number;
  gender: "male" | "female";
  name?: string;
}

export interface CompareInvite {
  personA: PersonSnapshot;
  personB?: PersonSnapshot & { respondedAt: number };
  relType: RelationshipType;
  createdAt: number;
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches lib/sseWriter.ts's CACHE_TTL convention

function keyFor(inviteId: string): string {
  return `compare:${inviteId}`;
}

function randomInviteId(): string {
  // 16 hex chars — short enough for a shareable URL, long enough that
  // guessing another user's invite ID isn't practical.
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createInvite(personA: PersonSnapshot, relType: RelationshipType): Promise<string> {
  const inviteId = randomInviteId();
  const record: CompareInvite = { personA, relType, createdAt: Date.now() };
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(keyFor(inviteId), record, { ex: TTL_SECONDS });
  } catch {
    /* KV unavailable — invite simply won't persist; caller still gets an id back
       but the compare page will report it as expired/missing, which is the
       correct degraded behavior rather than a hard failure. */
  }
  return inviteId;
}

export async function getInvite(inviteId: string): Promise<CompareInvite | null> {
  if (!inviteId) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<CompareInvite>(keyFor(inviteId))) ?? null;
  } catch {
    return null;
  }
}

export async function respondToInvite(inviteId: string, personB: PersonSnapshot): Promise<boolean> {
  const existing = await getInvite(inviteId);
  if (!existing) return false;
  const updated: CompareInvite = { ...existing, personB: { ...personB, respondedAt: Date.now() } };
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(keyFor(inviteId), updated, { ex: TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}
