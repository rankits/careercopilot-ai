import axios from 'axios';

export const AI_MAIL_VERSION_CONFLICT_MESSAGE =
  'This draft changed elsewhere. Reload the latest version and try again.';

export class AiMailClientError extends Error {
  readonly code?: string;
  readonly statusCode?: number;
  readonly data?: unknown;

  constructor(message: string, options?: { code?: string; statusCode?: number; data?: unknown }) {
    super(message);
    this.name = 'AiMailClientError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
    this.data = options?.data;
  }
}

export function normalizeAiMailError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof AiMailClientError) return error;

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
        statusCode === 409 && code === 'AI_MAIL_DRAFT_VERSION_CONFLICT'
          ? AI_MAIL_VERSION_CONFLICT_MESSAGE
          : rawMessage;

      return new AiMailClientError(message, {
        code,
        statusCode,
        data: 'data' in payload ? payload.data : undefined,
      });
    }

    if (!error.response) {
      return new AiMailClientError(
        'Unable to reach the AI Mail service. Check your connection and try again.',
      );
    }
  }

  return error instanceof Error ? error : new AiMailClientError(fallbackMessage);
}

export function isAiMailVersionConflict(error: unknown): error is AiMailClientError {
  return (
    error instanceof AiMailClientError &&
    error.statusCode === 409 &&
    error.code === 'AI_MAIL_DRAFT_VERSION_CONFLICT'
  );
}

export function isAiMailUserEditsOverwriteRequired(error: unknown): error is AiMailClientError {
  return (
    error instanceof AiMailClientError &&
    error.statusCode === 409 &&
    error.code === 'AI_MAIL_USER_EDITS_OVERWRITE_CONFIRMATION_REQUIRED'
  );
}
