// Shared timeout/retry primitive for AI provider calls. Vercel kills the
// whole function at maxDuration (60s) with no chance for application code to
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

export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AttemptTimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
