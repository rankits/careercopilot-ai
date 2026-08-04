export interface BackoffOptions {
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly maxRetries?: number;
  readonly backoffFactor?: number;
}

export function calculateJitteredBackoff(attempt: number, options?: BackoffOptions): number {
  const initialDelay = options?.initialDelayMs ?? 500;
  const maxDelay = options?.maxDelayMs ?? 10000;
  const factor = options?.backoffFactor ?? 2;

  const exponentialDelay = initialDelay * Math.pow(factor, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Full Jitter algorithm: random value between 0 and cappedDelay
  return Math.floor(Math.random() * cappedDelay);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
