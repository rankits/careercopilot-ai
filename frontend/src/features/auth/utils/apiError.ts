import axios from 'axios';

import type { ApiErrorResponse } from '@/interfaces/api';

const SERVER_UNREACHABLE_MESSAGE = 'Unable to reach the server. Please try again.';

export class AuthRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export function getAuthApiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
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
    return error.trim();
  }

  if (error instanceof AuthRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (
      (axios.isAxiosError(error) || error.name === 'TypeError') &&
      /network|timeout|failed to fetch|ECONNREFUSED/i.test(error.message)
    ) {
      return SERVER_UNREACHABLE_MESSAGE;
    }

    if (!fallback && error.message.trim().length > 0) {
      return error.message.trim();
    }
  }

  return fallback;
}
