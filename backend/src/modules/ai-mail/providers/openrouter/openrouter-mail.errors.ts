import { AppError } from '@/shared/utils/errors/AppError.js';

export type OpenRouterErrorKind =
  | 'auth'
  | 'quota'
  | 'rate_limit'
  | 'timeout'
  | 'unavailable'
  | 'structured_output_unsupported'
  | 'truncated'
  | 'cancelled'
  | 'generation_failed'
  | 'output_truncated'
  | 'refusal'
  | 'response_too_large';

export class OpenRouterMailProviderError extends AppError {
  readonly kind: OpenRouterErrorKind;
  readonly retryable: boolean;
  readonly fallbackEligible: boolean;
  readonly httpStatus?: number;
  readonly providerRequestId?: string;

  constructor(input: {
    message: string;
    statusCode: number;
    code: string;
    kind: OpenRouterErrorKind;
    retryable?: boolean;
    fallbackEligible?: boolean;
    httpStatus?: number;
    providerRequestId?: string;
  }) {
    super(input.message, input.statusCode, input.code);
    this.name = 'OpenRouterMailProviderError';
    this.kind = input.kind;
    this.retryable = input.retryable ?? false;
    this.fallbackEligible = input.fallbackEligible ?? false;
    this.httpStatus = input.httpStatus;
    this.providerRequestId = input.providerRequestId;
  }
}

const STRUCTURED_OUTPUT_HINTS = [
  'response_format',
  'json_schema',
  'structured output',
  'structured outputs',
  'not supported',
  'unsupported',
  'does not support',
];

export const isStructuredOutputUnsupportedError = (status: number, message: string): boolean => {
  if (status !== 400 && status !== 422) return false;
  const lower = message.toLowerCase();
  return STRUCTURED_OUTPUT_HINTS.some((hint) => lower.includes(hint));
};

export const mapHttpStatusToProviderError = (input: {
  status: number;
  message?: string;
  providerRequestId?: string;
  retryAfterSeconds?: number;
}): OpenRouterMailProviderError => {
  const message = input.message?.trim() || `OpenRouter request failed (${input.status})`;
  const base = {
    httpStatus: input.status,
    providerRequestId: input.providerRequestId,
  };

  if (isStructuredOutputUnsupportedError(input.status, message)) {
    return new OpenRouterMailProviderError({
      ...base,
      message: 'Configured model does not support structured output',
      statusCode: 400,
      code: 'AI_MAIL_STRUCTURED_OUTPUT_UNSUPPORTED',
      kind: 'structured_output_unsupported',
      retryable: false,
      fallbackEligible: false,
    });
  }

  switch (input.status) {
    case 401:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter authentication failed',
        statusCode: 401,
        code: 'AI_PROVIDER_AUTHENTICATION_FAILED',
        kind: 'auth',
      });
    case 402:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter quota exhausted',
        statusCode: 402,
        code: 'AI_PROVIDER_QUOTA_EXHAUSTED',
        kind: 'quota',
      });
    case 403:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter request forbidden',
        statusCode: 403,
        code: 'AI_PROVIDER_AUTHENTICATION_FAILED',
        kind: 'auth',
      });
    case 408:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter request timed out',
        statusCode: 504,
        code: 'AI_MAIL_PROVIDER_TIMEOUT',
        kind: 'timeout',
        retryable: true,
        fallbackEligible: true,
      });
    case 429:
      return new OpenRouterMailProviderError({
        ...base,
        message: input.retryAfterSeconds
          ? `OpenRouter rate limited; retry after ${input.retryAfterSeconds}s`
          : 'OpenRouter rate limited',
        statusCode: 429,
        code: 'AI_PROVIDER_RATE_LIMITED',
        kind: 'rate_limit',
        retryable: true,
        fallbackEligible: true,
      });
    case 400:
    case 422:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter rejected the request',
        statusCode: 400,
        code: 'AI_MAIL_GENERATION_FAILED',
        kind: 'generation_failed',
      });
    case 500:
    case 502:
    case 503:
    case 504:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter provider unavailable',
        statusCode: 503,
        code: 'AI_MAIL_PROVIDER_UNAVAILABLE',
        kind: 'unavailable',
        retryable: true,
        fallbackEligible: true,
      });
    default:
      return new OpenRouterMailProviderError({
        ...base,
        message: 'OpenRouter generation failed',
        statusCode: 502,
        code: 'AI_MAIL_GENERATION_FAILED',
        kind: 'generation_failed',
        retryable: input.status >= 500,
        fallbackEligible: input.status >= 500,
      });
  }
};

export const providerTimeoutError = (providerRequestId?: string): OpenRouterMailProviderError =>
  new OpenRouterMailProviderError({
    message: 'OpenRouter request timed out',
    statusCode: 504,
    code: 'AI_MAIL_PROVIDER_TIMEOUT',
    kind: 'timeout',
    retryable: true,
    fallbackEligible: true,
    providerRequestId,
  });

export const providerCancelledError = (): OpenRouterMailProviderError =>
  new OpenRouterMailProviderError({
    message: 'OpenRouter request was cancelled',
    statusCode: 499,
    code: 'AI_MAIL_GENERATION_FAILED',
    kind: 'cancelled',
  });

export const outputTruncatedError = (): OpenRouterMailProviderError =>
  new OpenRouterMailProviderError({
    message: 'OpenRouter output was truncated',
    statusCode: 502,
    code: 'AI_MAIL_OUTPUT_TRUNCATED',
    kind: 'output_truncated',
  });

export const outputRefusalError = (): OpenRouterMailProviderError =>
  new OpenRouterMailProviderError({
    message: 'OpenRouter refused to generate content',
    statusCode: 422,
    code: 'AI_MAIL_GENERATION_FAILED',
    kind: 'refusal',
  });

export const responseTooLargeError = (): OpenRouterMailProviderError =>
  new OpenRouterMailProviderError({
    message: 'OpenRouter response exceeded size limit',
    statusCode: 502,
    code: 'AI_MAIL_GENERATION_FAILED',
    kind: 'response_too_large',
  });

export const unusableCompletionError = (detail: string): OpenRouterMailProviderError =>
  new OpenRouterMailProviderError({
    message: detail,
    statusCode: 502,
    code: 'AI_MAIL_GENERATION_FAILED',
    kind: 'generation_failed',
  });
