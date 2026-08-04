export class TimeoutError extends Error {
  constructor(operationName: string, timeoutMs: number) {
    super(`Operation "${operationName}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Races a promise against a timeout. Used on the auto-apply submission
 * path (AJA-PERF-001) so a hung external call (email send, ATS API,
 * eventually) can never block a queue worker indefinitely — the caller
 * gets a `TimeoutError` instead. A timeout during a *submit* call must be
 * treated the same as any other exception there: `SUBMISSION_OUTCOME_UNKNOWN`,
 * never an assumed failure, since the remote side may have received the
 * request before the timeout fired.
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(operationName, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
