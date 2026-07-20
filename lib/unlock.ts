// Server-authoritative unlock state, persisted in @vercel/kv.
// A chart becomes "unlocked" only when the Stripe webhook confirms payment.
// (Not currently wired into the UI — scaffolding for future paid unlock.)

const TTL = 60 * 60 * 24 * 365; // 1 year

export async function isUnlocked(chartId: string): Promise<boolean> {
  if (!chartId) return false;
  try {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<boolean>(`unlock:${chartId}`)) === true;
  } catch {
    return false;
  }
}

export async function markUnlocked(chartId: string): Promise<void> {
  if (!chartId) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`unlock:${chartId}`, true, { ex: TTL });
  } catch {
    /* KV unavailable — unlock simply won't persist */
  }
}
