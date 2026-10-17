// Solo chart ID. Originally `${y}${m}${d}${h}${gender}` with NO zero-padding, which
// collided (1990-01-12 h3 and 1990-11-02 h3 were both "19901123female"). New IDs pad
// month/day/hour. Paid unlocks are stored under the ID in effect at purchase time, so
// legacyChartId() returns the old ID only when no other valid birth time in the same
// year could have produced it — then a legacy unlock is safe to honor for this chart.
const pad = (n: number) => String(n).padStart(2, "0");

export function buildChartId(y: number, m: number, d: number, h: number, gender: string): string {
  return `${y}${pad(m)}${pad(d)}${pad(h)}${gender}`;
}

export function legacyChartId(y: number, m: number, d: number, h: number, gender: string): string | null {
  const mine = `${m}${d}${h}`;
  let matches = 0;
  for (let mm = 1; mm <= 12; mm++) {
    const days = new Date(y, mm, 0).getDate();
    for (let dd = 1; dd <= days; dd++) {
      for (let hh = 0; hh < 24; hh++) {
        if (`${mm}${dd}${hh}` === mine && ++matches > 1) return null;
      }
    }
  }
  return `${y}${mine}${gender}`;
}
