// Server-authoritative unlock state, persisted in @vercel/kv.
// A chart becomes "unlocked" only when the Stripe webhook confirms payment.
// Live production module — imported by the Stripe webhook and /api/unlock.

export async function isUnlocked(chartId: string): Promise<boolean> {
  if (!chartId) return false;
  try {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<boolean>(`unlock:${chartId}`)) === true;
  } catch {
    return false;
  }
}

// No TTL — the paywall promises "永久保存 · 可重複查閱" (permanent access), so an
// unlock grant must never expire. Omitting `ex` makes the KV key persist forever.
export async function markUnlocked(chartId: string): Promise<void> {
  if (!chartId) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`unlock:${chartId}`, true);
  } catch {
    /* KV unavailable — unlock simply won't persist */
  }
}
