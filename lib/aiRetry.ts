// Shared timeout/retry primitive for AI provider calls. Vercel kills the
// whole function at maxDuration with no chance for application code to
// react — so retrying only helps if each individual attempt is bounded well
// under that ceiling, leaving budget for a second attempt within the same
// invocation. This throws AttemptTimeoutError on expiry so callers can tell
// "the provider was slow" apart from "the provider actually errored" (only
// the former is worth retrying — a bad API key will fail identically twice).

export class AttemptTimeoutError extends Error {
  constructor(ms: number) {
    super(`AI provider call exceeded ${ms}ms`);
    this.name = "AttemptTimeoutError";
  }
}

export function withDeadline<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new AttemptTimeoutError(ms));
    }, ms);
  });
  // Once the timeout branch wins the race below, nothing is listening to
  // `promise` itself anymore — if it later rejects too (e.g. an aborted
  // upstream request throwing AbortError after onTimeout() cancelled it),
  // that would otherwise surface as an unhandled rejection. This extra
  // listener doesn't affect Promise.race's own outcome.
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Two-phase deadline for a streaming AI attempt:
 *  - `firstContentTimeoutMs`: if `hasContent()` is still false when this
 *    fires, the attempt is abandoned (AttemptTimeoutError) — this is the
 *    "stalled before saying anything" case (e.g. a reasoning model thinking
 *    silently). `onAbandon` (typically an AbortController.abort()) fires here.
 *  - `totalTimeoutMs`: a hard cap on the WHOLE attempt, regardless of
 *    `hasContent()`. Once content has started streaming, the attempt is never
 *    killed before this — it's just a backstop against a genuinely runaway
 *    generation. `onAbandon` fires here too.
 * If `hasContent()` is true when `firstContentTimeoutMs` fires, that timer is
 * a no-op — the attempt keeps running toward `totalTimeoutMs`.
 */
export function withTwoPhaseDeadline<T>(
  promise: Promise<T>,
  firstContentTimeoutMs: number,
  totalTimeoutMs: number,
  hasContent: () => boolean,
  onAbandon?: () => void
): Promise<T> {
  let firstTimer: ReturnType<typeof setTimeout>;
  let totalTimer: ReturnType<typeof setTimeout>;
  const guard = new Promise<never>((_, reject) => {
    firstTimer = setTimeout(() => {
      if (hasContent()) return; // already streaming — let it run toward totalTimeoutMs
      onAbandon?.();
      reject(new AttemptTimeoutError(firstContentTimeoutMs));
    }, firstContentTimeoutMs);
    totalTimer = setTimeout(() => {
      onAbandon?.();
      reject(new AttemptTimeoutError(totalTimeoutMs));
    }, totalTimeoutMs);
  });
  promise.catch(() => {}); // see withDeadline's matching comment
  return Promise.race([promise, guard]).finally(() => {
    clearTimeout(firstTimer);
    clearTimeout(totalTimer);
  });
}
