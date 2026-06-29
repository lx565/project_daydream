import { loadCaseIndex, getCaseBySlug } from "./casesData";
import type { CaseRecord, CaseIndexEntry } from "./casesData";

/**
 * Find matching cases for a user's chart.
 * Priority: rizi + geju match → rizi-only match → empty (hide section).
 */
export function findMatchingCases(
  rizi: string,
  geju: string,
  limit = 3
): CaseRecord[] {
  const index = loadCaseIndex();

  // Primary: same rizi AND same geju
  let matched: CaseIndexEntry[] = [];
  if (geju) {
    matched = index.filter(e => e.rizi === rizi && e.geju === geju);
  }

  // Fallback: same rizi only
  if (matched.length < 2) {
    matched = index.filter(e => e.rizi === rizi);
  }

  if (matched.length === 0) return [];

  // Prefer cases with outcome, then shuffle for variety
  matched.sort((a, b) => (b.hasOutcome ? 1 : 0) - (a.hasOutcome ? 1 : 0));

  return matched
    .slice(0, limit)
    .map(e => getCaseBySlug(e.slug))
    .filter((c): c is CaseRecord => c !== null);
}
