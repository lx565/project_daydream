// scripts/verify-unlock-logic.mjs
// One-off manual verification for lib/unlock.ts's checkUnlock branching.
// Run: npx tsx --env-file=.env.local scripts/verify-unlock-logic.mjs
// Requires KV_REST_API_URL / KV_REST_API_TOKEN in .env.local (same KV the
// live app uses — this script writes and deletes test keys, does not touch
// any real chartId).

import { markUnlocked, checkUnlock } from "../lib/unlock.ts";

const TEST_CHART = "verify-unlock-logic-test-chart";
const { kv } = await import("@vercel/kv");

let failures = 0;
function check(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  (got ${actual}, expected ${expected})`);
  if (!pass) failures++;
}

// Clean slate
await kv.del(`unlock:${TEST_CHART}`);

// 1. Missing key
check("missing key -> false", await checkUnlock(TEST_CHART), false);

// 2. Legacy true value, no token required
await kv.set(`unlock:${TEST_CHART}`, true);
check("legacy true, no token provided -> true", await checkUnlock(TEST_CHART), true);
check("legacy true, wrong token provided -> true (grandfather ignores token)", await checkUnlock(TEST_CHART, "anything"), true);

// 3. Token-bound value
await markUnlocked(TEST_CHART, "token-a");
check("token-bound, matching token -> true", await checkUnlock(TEST_CHART, "token-a"), true);
check("token-bound, wrong token -> false", await checkUnlock(TEST_CHART, "token-b"), false);
check("token-bound, no token provided -> false", await checkUnlock(TEST_CHART), false);

// Cleanup
await kv.del(`unlock:${TEST_CHART}`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
