import type { OpenRouterChatMessage } from '@/modules/ai-mail/providers/openrouter/openrouter-message.mapper.js';
import { OpenRouterMailProviderError } from '@/modules/ai-mail/providers/openrouter/openrouter-mail.errors.js';
import {
  mapHttpStatusToProviderError,
  providerCancelledError,
  providerTimeoutError,
  responseTooLargeError,
} from '@/modules/ai-mail/providers/openrouter/openrouter-mail.errors.js';

export interface OpenRouterMailHttpClientConfig {
  apiKey: string;
  baseUrl: string;
  httpReferer?: string;
  appName: string;
  /** Max response body bytes (default derived from max tokens). */
  maxResponseBytes: number;
  fetchImpl?: typeof fetch;
}

export interface OpenRouterChatCompletionRequest {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenRouterChatCompletionSuccess {
  status: number;
  providerRequestId?: string;
  body: Record<string, unknown>;
  durationMs: number;
}

const parseRetryAfterSeconds = (header: string | null): number | undefined => {
  if (!header) return undefined;
  const asInt = Number.parseInt(header, 10);
  if (Number.isFinite(asInt) && asInt >= 0 && asInt <= 120) return asInt;
  const dateMs = Date.parse(header);
  if (!Number.isFinite(dateMs)) return undefined;
  const deltaSec = Math.ceil((dateMs - Date.now()) / 1000);
  if (deltaSec < 0 || deltaSec > 120) return undefined;
  return deltaSec;
};

const extractErrorMessage = (body: unknown): string | undefined => {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  const error = record.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  if (typeof record.message === 'string') return record.message;
  return undefined;
};

export class OpenRouterMailHttpClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenRouterMailHttpClientConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch.bind(globalThis);
  }

  async chatCompletions(
    request: OpenRouterChatCompletionRequest,
    options: { signal?: AbortSignal; timeoutMs: number },
  ): Promise<OpenRouterChatCompletionSuccess> {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const url = `${base}/chat/completions`;
    const started = Date.now();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.config.httpReferer) {
      headers['HTTP-Referer'] = this.config.httpReferer;
    }
    if (this.config.appName) {
      headers['X-Title'] = this.config.appName;
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      if (options.signal?.aborted) {
        throw providerCancelledError();
      }

      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const providerRequestId =
        response.headers.get('x-request-id') ??
        response.headers.get('x-openrouter-request-id') ??
        undefined;

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const length = Number.parseInt(contentLength, 10);
        if (Number.isFinite(length) && length > this.config.maxResponseBytes) {
          throw responseTooLargeError();
        }
      }

      const rawText = await response.text();
      if (rawText.length > this.config.maxResponseBytes) {
        throw responseTooLargeError();
      }

      let body: Record<string, unknown> = {};
      if (rawText.trim()) {
        try {
          const parsed = JSON.parse(rawText) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            body = parsed as Record<string, unknown>;
          } else {
            body = { raw: parsed };
          }
        } catch {
          body = { parseError: true };
        }
      }

      if (!response.ok) {
        throw mapHttpStatusToProviderError({
          status: response.status,
          message: extractErrorMessage(body),
          providerRequestId,
          retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after')),
        });
      }

      return {
        status: response.status,
        providerRequestId,
        body,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      if (error instanceof OpenRouterMailProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        if (options.signal?.aborted) {
          throw providerCancelledError();
        }
        throw providerTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }
}
