const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const outboxConfig = {
  batchSize: positiveInteger(process.env.OUTBOX_BATCH_SIZE, 50),
  maxAttempts: positiveInteger(process.env.OUTBOX_MAX_ATTEMPTS, 10),
  lockTimeoutMs: positiveInteger(process.env.OUTBOX_LOCK_TIMEOUT_MS, 60_000),
  pollIntervalMs: positiveInteger(process.env.OUTBOX_POLL_INTERVAL_MS, 1_000),
  retryBaseDelayMs: positiveInteger(process.env.OUTBOX_RETRY_BASE_DELAY_MS, 5_000),
} as const;
