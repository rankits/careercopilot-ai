import axios from 'axios';

export const STATUS_CONFLICT_USER_MESSAGE =
  'This application was already updated. Refresh to see its current state.';

export class AutoApplyClientError extends Error {
  readonly code?: string;
  readonly statusCode?: number;
  readonly data?: unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      data?: unknown;
    },
  ) {
    super(message);
    this.name = 'AutoApplyClientError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.data = options?.data;
  }
}

export function normalizeAutoApplyError(error: unknown, fallbackMessage: string): Error {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;
    const statusCode = error.response?.status;

    if (typeof payload === 'object' && payload !== null) {
      const code = 'code' in payload && typeof payload.code === 'string' ? payload.code : undefined;
      const rawMessage =
        'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : fallbackMessage;
      const message =
        code === 'INVALID_STATUS_TRANSITION' ? STATUS_CONFLICT_USER_MESSAGE : rawMessage;
      const data = 'data' in payload ? payload.data : undefined;

      return new AutoApplyClientError(message, { code, statusCode, data });
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

/** AA-010: stale-status race loser — refetch and show a refresh toast. */
export function isStatusConflictError(error: unknown): boolean {
  return (
    isAutoApplyClientError(error) &&
    error.code === 'INVALID_STATUS_TRANSITION' &&
    error.statusCode === 409
  );
}

export function existingApplicationIdFromError(error: unknown): string | null {
  if (!isAutoApplyClientError(error) || error.code !== 'APPLICATION_EXISTS') return null;
  if (typeof error.data !== 'object' || error.data === null) return null;
  const id = (error.data as { existingApplicationId?: unknown }).existingApplicationId;
  return typeof id === 'string' ? id : null;
}
