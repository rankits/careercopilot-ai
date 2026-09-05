import axios from 'axios';

import type { ApiErrorResponse } from '@/interfaces/api';

const SERVER_UNREACHABLE_MESSAGE = 'Unable to reach the server. Please try again.';
const GENERIC_SERVER_MESSAGE = 'Something went wrong. Please try again later.';

/** Infra / rate-limit style backend copy that should not surface as-is in the UI. */
const SYSTEM_ERROR_MESSAGE_PATTERNS: ReadonlyArray<RegExp> = [
  /too many requests/i,
  /rate limit/i,
  /internal server error/i,
  /database error/i,
  /malformed json/i,
  /something went wrong\. please try again later/i,
];

const SYSTEM_ERROR_CODES = new Set([
  'TOO_MANY_REQUESTS',
  'INTERNAL_SERVER_ERROR',
  'DATABASE_ERROR',
  'DATABASE_VALIDATION_ERROR',
  'INVALID_JSON',
]);

export class AuthRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

function sanitizeAuthMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return GENERIC_SERVER_MESSAGE;
  }
  if (SYSTEM_ERROR_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return GENERIC_SERVER_MESSAGE;
  }
  return trimmed;
}

export function getAuthApiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data;
    const code = typeof data?.code === 'string' ? data.code : undefined;

    if (code && SYSTEM_ERROR_CODES.has(code)) {
      return GENERIC_SERVER_MESSAGE;
    }

    const message = data?.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return sanitizeAuthMessage(message);
    }

    if (error.response?.status === 429 || (error.response?.status ?? 0) >= 500) {
      return GENERIC_SERVER_MESSAGE;
    }
  }

  return undefined;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string;
export function getAuthErrorMessage(error: unknown, fallback?: string): string | undefined;
export function getAuthErrorMessage(error: unknown, fallback?: string): string | undefined {
  const apiMessage = getAuthApiErrorMessage(error);

  if (apiMessage) {
    return apiMessage;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return sanitizeAuthMessage(error);
  }

  if (error instanceof AuthRequestError) {
    return sanitizeAuthMessage(error.message);
  }

  if (error instanceof Error) {
    if (
      (axios.isAxiosError(error) || error.name === 'TypeError') &&
      /network|timeout|failed to fetch|ECONNREFUSED/i.test(error.message)
    ) {
      return SERVER_UNREACHABLE_MESSAGE;
    }

    if (!fallback && error.message.trim().length > 0) {
      return sanitizeAuthMessage(error.message);
    }
  }

  return fallback;
}
