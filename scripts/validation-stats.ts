// Daily Gemini-validator outcome tally (written by lib/sseWriter.ts into KV hashes
// `stats:validation:YYYY-MM-DD`, UTC, 90-day expiry).
//
// Usage: npx tsx scripts/validation-stats.ts [days]   (default 7)
// Credentials: KV_REST_API_URL and KV_REST_API_TOKEN must be in the environment.
// Get them locally with `vercel env pull .env.local` (then
// `set -a; source .env.local; set +a` before running).

import { createClient } from "@vercel/kv";

async function main() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error("Missing KV_REST_API_URL / KV_REST_API_TOKEN (see header comment).");
    process.exit(1);
  }
  const kv = createClient({ url, token });
  const days = Math.max(1, parseInt(process.argv[2] ?? "7", 10) || 7);

  console.log("date        pass  fail  unrev  total  pass-rate  unreviewed-rate");
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const h = (await kv.hgetall<Record<string, number>>(`stats:validation:${date}`)) ?? {};
    const pass = Number(h.pass ?? 0), fail = Number(h.fail ?? 0), unrev = Number(h.unreviewed ?? 0);
    const total = pass + fail + unrev;
    const reviewed = pass + fail;
    const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "-");
    console.log(
      `${date}  ${String(pass).padStart(4)}  ${String(fail).padStart(4)}  ${String(unrev).padStart(5)}  ${String(total).padStart(5)}  ${pct(pass, reviewed).padStart(9)}  ${pct(unrev, total).padStart(15)}`
    );
  }
  console.log("pass-rate = pass/(pass+fail); unreviewed-rate = unreviewed/total");
}

main();
