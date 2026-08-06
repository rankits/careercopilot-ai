import { AppError } from '@/shared/utils/errors/AppError.js';
import type { EmbeddingHttpClient } from '@/modules/ai-embeddings/providers/embedding-http.client.js';

export interface OpenRouterClientOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly httpReferer?: string;
  readonly appTitle?: string;
  readonly allowFallbacks?: boolean;
  readonly providerOrder?: readonly string[];
  readonly dataCollectionPolicy?: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

export interface OpenRouterEmbeddingItem {
  readonly index: number;
  readonly embedding: number[];
}

export interface OpenRouterEmbeddingResponse {
  readonly id?: string;
  readonly object?: string;
  readonly data?: ReadonlyArray<{
    readonly index?: number;
    readonly embedding?: ReadonlyArray<number> | string;
  }>;
  readonly model?: string;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly total_tokens?: number;
  };
  readonly error?: {
    readonly code?: number | string;
    readonly message?: string;
    readonly type?: string;
  };
}

export interface OpenRouterEmbeddingResult {
  readonly id?: string;
  readonly model?: string;
  readonly data: ReadonlyArray<OpenRouterEmbeddingItem>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly total_tokens?: number;
  };
}

export interface OpenRouterModelProbeResult {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
}

export class OpenRouterEmbeddingClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpReferer?: string;
  private readonly appTitle?: string;
  private readonly allowFallbacks?: boolean;
  private readonly providerOrder?: readonly string[];
  private readonly dataCollectionPolicy?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly http: EmbeddingHttpClient;

  constructor(options: OpenRouterClientOptions, http?: EmbeddingHttpClient) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.httpReferer = options.httpReferer;
    this.appTitle = options.appTitle;
    this.allowFallbacks = options.allowFallbacks;
    this.providerOrder = options.providerOrder;
    this.dataCollectionPolicy = options.dataCollectionPolicy;
    this.timeoutMs = options.timeoutMs;
    this.maxRetries = Math.max(1, options.maxRetries || 3);
    this.http = http ?? new OpenRouterFetchHttpClient();
  }

  async createEmbeddings(options: {
    model: string;
    input: readonly string[];
    dimensions?: number;
  }): Promise<OpenRouterEmbeddingResult> {
    const url = `${this.baseUrl}/embeddings`;
    const body: Record<string, unknown> = {
      model: options.model,
      input: options.input,
    };
    if (options.dimensions !== undefined) {
      body.dimensions = options.dimensions;
    }
    const providerRouting = this.buildProviderRouting();
    if (providerRouting) {
      body.provider = providerRouting;
    }

    const headers = this.buildHeaders();

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const response = await this.http.post<OpenRouterEmbeddingResponse>(
          url,
          body,
          headers,
          this.timeoutMs,
        );
        return this.validateAndParseResponse(response);
      } catch (err: unknown) {
        const classified = this.classifyError(err);
        if (!classified.retryable || attempt >= this.maxRetries) {
          throw classified.error;
        }
        const backoffMs = this.calculateBackoff(attempt, classified.retryAfterMs);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  async probeModelAvailability(modelId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models`;
      const headers = this.buildHeaders();
      const response = await this.http.post<{
        data?: ReadonlyArray<{ id?: string }>;
      }>(url, {}, headers, this.timeoutMs);
      if (Array.isArray(response.data)) {
        return response.data.some((item) => item.id === modelId);
      }
      return true;
    } catch {
      // Fallback: if models endpoint is unavailable, assume true and let actual requests validate
      return true;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.httpReferer) {
      headers['HTTP-Referer'] = this.httpReferer;
    }
    if (this.appTitle) {
      headers['X-Title'] = this.appTitle;
    }
    return headers;
  }

  private buildProviderRouting():
    | {
        order?: readonly string[];
        allow_fallbacks?: boolean;
        data_collection?: string;
      }
    | undefined {
    const routing: {
      order?: readonly string[];
      allow_fallbacks?: boolean;
      data_collection?: string;
    } = {};
    let hasRouting = false;
    if (this.providerOrder && this.providerOrder.length > 0) {
      routing.order = this.providerOrder;
      hasRouting = true;
    }
    if (this.allowFallbacks !== undefined) {
      routing.allow_fallbacks = this.allowFallbacks;
      hasRouting = true;
    }
    if (this.dataCollectionPolicy !== undefined) {
      routing.data_collection = this.dataCollectionPolicy;
      hasRouting = true;
    }
    return hasRouting ? routing : undefined;
  }

  private validateAndParseResponse(
    response: OpenRouterEmbeddingResponse,
  ): OpenRouterEmbeddingResult {
    if (response.error) {
      const msg = response.error.message || 'OpenRouter API error';
      const code = response.error.code;
      if (code === 401 || String(code) === '401') {
        throw new AppError(msg, 401, 'OPENROUTER_EMBEDDING_UNAUTHORIZED');
      }
      if (code === 404 || String(code) === '404') {
        throw new AppError(msg, 404, 'OPENROUTER_EMBEDDING_MODEL_NOT_FOUND');
      }
      if (code === 429 || String(code) === '429') {
        throw new AppError(msg, 429, 'OPENROUTER_EMBEDDING_RATE_LIMITED');
      }
      if (code === 402 || String(code) === '402') {
        throw new AppError(msg, 402, 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS');
      }
      throw new AppError(msg, 502, 'OPENROUTER_EMBEDDING_REQUEST_FAILED');
    }

    if (!response.data || !Array.isArray(response.data)) {
      throw new AppError(
        'OpenRouter embedding response omitted data array',
        502,
        'OPENROUTER_EMBEDDING_RESPONSE_INVALID',
      );
    }

    const items: OpenRouterEmbeddingItem[] = response.data.map((item, idx) => {
      if (!item || !Array.isArray(item.embedding)) {
        throw new AppError(
          `OpenRouter embedding item at index ${idx} is invalid`,
          502,
          'OPENROUTER_EMBEDDING_RESPONSE_INVALID',
        );
      }
      const embedding = item.embedding.map((val: unknown) => Number(val));
      if (embedding.some((val: number) => !Number.isFinite(val))) {
        throw new AppError(
          `OpenRouter embedding item at index ${idx} contains non-finite numbers`,
          502,
          'OPENROUTER_EMBEDDING_RESPONSE_INVALID',
        );
      }
      return {
        index: typeof item.index === 'number' ? item.index : idx,
        embedding,
      };
    });

    items.sort((left, right) => left.index - right.index);

    return {
      id: response.id,
      model: response.model,
      data: items,
      usage: response.usage,
    };
  }

  private classifyError(err: unknown): {
    retryable: boolean;
    error: AppError;
    retryAfterMs?: number;
  } {
    if (err instanceof AppError) {
      const code = err.code;
      if (
        code === 'OPENROUTER_EMBEDDING_UNAUTHORIZED' ||
        code === 'OPENROUTER_EMBEDDING_MODEL_NOT_FOUND' ||
        code === 'OPENROUTER_EMBEDDING_RESPONSE_INVALID' ||
        code === 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS' ||
        code === 'EMBEDDING_DIMENSION_MISMATCH'
      ) {
        return { retryable: false, error: err };
      }
      if (code === 'OPENROUTER_EMBEDDING_RATE_LIMITED') {
        return {
          retryable: true,
          error: err,
          retryAfterMs:
            err.data &&
            typeof err.data === 'object' &&
            'retryAfterMs' in err.data &&
            typeof err.data.retryAfterMs === 'number'
              ? err.data.retryAfterMs
              : undefined,
        };
      }

      if (
        err.statusCode === 400 ||
        err.statusCode === 401 ||
        err.statusCode === 402 ||
        err.statusCode === 404
      ) {
        return { retryable: false, error: err };
      }
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504, 524, 529];
      const isRetryable = retryableStatusCodes.includes(err.statusCode);
      return { retryable: isRetryable, error: err };
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      retryable: true,
      error: new AppError(
        'OpenRouter embedding request failed',
        503,
        'OPENROUTER_EMBEDDING_REQUEST_FAILED',
        { cause: message },
      ),
    };
  }

  private calculateBackoff(attempt: number, retryAfterMs?: number): number {
    const exponentialMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 200, 10_000);
    return retryAfterMs && retryAfterMs > 0 ? Math.max(retryAfterMs, exponentialMs) : exponentialMs;
  }
}

class OpenRouterFetchHttpClient implements EmbeddingHttpClient {
  async post<T>(
    url: string,
    body: unknown,
    headers: Readonly<Record<string, string>>,
    timeoutMs: number,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(
        'OpenRouter request network failure',
        503,
        'OPENROUTER_EMBEDDING_REQUEST_FAILED',
        { cause: message },
      );
    }

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('retry-after');
      let retryAfterMs: number | undefined;
      if (retryAfterHeader) {
        const parsedSeconds = Number(retryAfterHeader);
        if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
          retryAfterMs = parsedSeconds * 1000;
        }
      }

      let errorJson: unknown;
      try {
        errorJson = await response.json();
      } catch {
        // Ignore JSON parsing failure for error bodies
      }

      const errorMessage =
        errorJson &&
        typeof errorJson === 'object' &&
        'error' in errorJson &&
        errorJson.error &&
        typeof errorJson.error === 'object' &&
        'message' in errorJson.error &&
        typeof errorJson.error.message === 'string'
          ? errorJson.error.message
          : `OpenRouter returned HTTP ${response.status}`;

      if (response.status === 401) {
        throw new AppError(errorMessage, 401, 'OPENROUTER_EMBEDDING_UNAUTHORIZED');
      }
      if (response.status === 404) {
        throw new AppError(errorMessage, 404, 'OPENROUTER_EMBEDDING_MODEL_NOT_FOUND');
      }
      if (response.status === 429) {
        throw new AppError(errorMessage, 429, 'OPENROUTER_EMBEDDING_RATE_LIMITED', {
          retryAfterMs,
        });
      }
      if (response.status === 400) {
        throw new AppError(errorMessage, 400, 'OPENROUTER_EMBEDDING_REQUEST_FAILED');
      }
      if (response.status === 402) {
        throw new AppError(errorMessage, 402, 'OPENROUTER_EMBEDDING_INSUFFICIENT_CREDITS');
      }

      throw new AppError(errorMessage, response.status, 'OPENROUTER_EMBEDDING_REQUEST_FAILED', {
        retryAfterMs,
      });
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new AppError(
        'OpenRouter returned invalid JSON',
        502,
        'OPENROUTER_EMBEDDING_RESPONSE_INVALID',
      );
    }
  }
}
