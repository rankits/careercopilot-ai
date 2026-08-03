export const FRIENDLY_RESUME_PARSE_ERROR =
  'Resume parsing is temporarily unavailable. Please try again in a few minutes.';

export type ResumeAiProviderId = 'gemini' | 'openrouter';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const readStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as Record<string, unknown>;
  const direct = record.status ?? record.statusCode;
  if (typeof direct === 'number') return direct;
  if (typeof direct === 'string' && /^\d+$/.test(direct)) return Number(direct);

  const response = record.response;
  if (response && typeof response === 'object') {
    const status = (response as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }

  return undefined;
};

/** True for transient provider failures we should retry / fall back on. */
export const isRetryableAiError = (error: unknown): boolean => {
  const status = readStatusCode(error);
  if (status !== undefined && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  return (
    /timeout|etimedout|econnaborted|econnreset|econnrefused|enotfound|network|fetch failed|socket hang up|overloaded|rate.?limit|too many requests|unavailable|503|502|504|429/.test(
      normalized,
    ) &&
    !/did not return valid json|empty response|invalid request|bad request|401|403|404/.test(
      normalized,
    )
  );
};
