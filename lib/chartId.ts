// Solo chart ID. Originally `${y}${m}${d}${h}${gender}` with NO zero-padding, which
// collided (1990-01-12 h3 and 1990-11-02 h3 were both "19901123female"). New IDs pad
// month/day/hour. Paid unlocks are stored under the ID in effect at purchase time, so
// legacyChartId() always returns the old-format ID and a legacy unlock is honored.
// Decision (2026-10-19): for the ~18% of birth times whose old ID is ambiguous, a legacy
// unlock may also open one colliding chart for free; that is accepted so paying
// customers are never locked out.
const pad = (n: number) => String(n).padStart(2, "0");

export function buildChartId(y: number, m: number, d: number, h: number, gender: string): string {
  return `${y}${pad(m)}${pad(d)}${pad(h)}${gender}`;
}

export function legacyChartId(y: number, m: number, d: number, h: number, gender: string): string {
  return `${y}${m}${d}${h}${gender}`;
}
