import axios from 'axios';

export function normalizeApplicationError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
    ) {
      return new Error(payload.message);
    }

    if (!error.response) {
      return new Error(
        'Unable to reach the applications service. Check your connection and try again.',
      );
    }
  }

  return error instanceof Error ? error : new Error(fallbackMessage);
}
