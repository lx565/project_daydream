// Server-authoritative unlock state, persisted in @vercel/kv.
// A chart becomes "unlocked" only when the Stripe webhook confirms payment.
// Live production module — imported by the Stripe webhook and /api/unlock.
//
// KV value shape at unlock:${chartId}:
//   - legacy `true` (2 pre-existing records: unlock:19901217female,
//     unlock:2002112515female) — grandfathered permanently, resolves
//     unlocked=true regardless of any token. These predate the token model;
//     the real customers behind them must never lose access or need a
//     token they were never issued.
//   - `{ token: string }` (every unlock from here on) — resolves
//     unlocked=true only when the caller's providedToken matches exactly.
//     This binds "unlocked" to a specific purchase, not just a chartId,
//     which is what closes the same-birthday collision leak: a different
//     device/session with matching birth data has no way to know the
//     token, so it still sees the paywall.

type UnlockValue = true | { token: string };

// No TTL — the paywall promises "永久保存 · 可重複查閱" (permanent access), so an
// unlock grant must never expire. Omitting `ex` makes the KV key persist forever.
export async function markUnlocked(chartId: string, token: string): Promise<void> {
  if (!chartId || !token) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(`unlock:${chartId}`, { token });
  } catch {
    /* KV unavailable — unlock simply won't persist */
  }
}

export async function checkUnlock(chartId: string, providedToken?: string): Promise<boolean> {
  if (!chartId) return false;
  try {
    const { kv } = await import("@vercel/kv");
    const value = await kv.get<UnlockValue>(`unlock:${chartId}`);
    if (value === null || value === undefined) return false;
    if (value === true) return true; // legacy grandfather — no token ever required
    return !!providedToken && providedToken === value.token;
  } catch {
    return false;
  }
}
