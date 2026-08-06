const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const isMaxTokensAffordabilityError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('fewer max_tokens') ||
    message.includes('can only afford') ||
    (message.includes('402') && message.includes('max_tokens'))
  );
};

const parseAffordableMaxTokens = (err: unknown): number | null => {
  const message = getErrorMessage(err);
  const match = message.match(/can only afford\s+(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 256 ? value : null;
};

const isAuthOrCreditError = (err: unknown): boolean => {
  // Recoverable: lower max_tokens and retry / try next free model.
  if (isMaxTokensAffordabilityError(err)) return false;

  const message = getErrorMessage(err).toLowerCase();
  // Groq/OpenRouter error copy often includes a billing upgrade URL — that is NOT a credit failure.
  if (message.includes('request too large') || message.includes('413')) return false;

  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('402') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('incorrect api key') ||
    message.includes('authentication') ||
    message.includes('expired') ||
    message.includes('revoked') ||
    message.includes('insufficient credits') ||
    message.includes('no credits') ||
    message.includes('payment required') ||
    message.includes('user not found') ||
    message.includes('key limit') ||
    (message.includes('invalid api key') && message.includes('api key')) ||
    (message.includes('quota') && !message.includes('tokens per minute'))
  );
};

const isProviderExhaustedError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  // Org-wide daily quotas — more models on same provider will also fail.
  if (
    (message.includes('429') || message.includes('rate limit')) &&
    (message.includes('tokens per day') ||
      message.includes('tpd') ||
      message.includes('per day') ||
      message.includes('daily'))
  ) {
    return true;
  }
  return isAuthOrCreditError(err);
};

const isRequestTooLargeError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('413') ||
    message.includes('request too large') ||
    message.includes('reduce your message size') ||
    message.includes('context length') ||
    message.includes('maximum context')
  );
};

const isRetryableModelError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  return (
    isAuthOrCreditError(err) ||
    isMaxTokensAffordabilityError(err) ||
    isRequestTooLargeError(err) ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('service unavailable') ||
    message.includes('high demand') ||
    message.includes('not found') ||
    message.includes('unavailable for free') ||
    message.includes('not supported') ||
    message.includes('temporarily') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('aborted') ||
    message.includes('empty content') ||
    message.includes('over capacity') ||
    message.includes('model_decommissioned') ||
    message.includes('unterminated string') ||
    message.includes('unexpected end of json')
  );
};

export {
  getErrorMessage,
  isMaxTokensAffordabilityError,
  parseAffordableMaxTokens,
  isProviderExhaustedError,
  isAuthOrCreditError,
  isRequestTooLargeError,
  isRetryableModelError,
};
