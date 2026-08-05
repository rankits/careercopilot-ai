import axios from 'axios';

export class AutoApplyClientError extends Error {
  readonly code?: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
    },
  ) {
    super(message);
    this.name = 'AutoApplyClientError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
  }
}

export function normalizeAutoApplyError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;
    const statusCode = error.response?.status;

    if (typeof payload === 'object' && payload !== null) {
      const message =
        'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : fallbackMessage;
      const code =
        'code' in payload && typeof payload.code === 'string' ? payload.code : undefined;

      return new AutoApplyClientError(message, { code, statusCode });
    }

    if (!error.response) {
      return new AutoApplyClientError(
        'Unable to reach the auto-apply service. Check your connection and try again.',
      );
    }
  }

  if (error instanceof AutoApplyClientError) {
    return error;
  }

  return error instanceof Error ? error : new AutoApplyClientError(fallbackMessage);
}

export function isAutoApplyClientError(error: unknown): error is AutoApplyClientError {
  return error instanceof AutoApplyClientError;
}
