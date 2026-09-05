import axios from 'axios';

import type { ApiErrorResponse } from '@/interfaces/api';

const DEFAULT_NETWORK_MESSAGE = 'Unable to reach the server. Please try again.';

/**
 * Extract a user-facing message from an API/Axios error, or return the fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
    }
    if (!error.response) {
      return DEFAULT_NETWORK_MESSAGE;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

/** Normalize unknown thrown values into an Error with a stable user-facing message. */
export function normalizeApiError(
  error: unknown,
  fallbackMessage: string,
  networkMessage = DEFAULT_NETWORK_MESSAGE,
): Error {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string' &&
      payload.message.trim().length > 0
    ) {
      return new Error(payload.message);
    }

    if (!error.response) {
      return new Error(networkMessage);
    }
  }

  return error instanceof Error ? error : new Error(fallbackMessage);
}
