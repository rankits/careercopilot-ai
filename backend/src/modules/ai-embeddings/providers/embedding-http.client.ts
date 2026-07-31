import { AppError } from '@/shared/utils/errors/AppError.js';

export interface EmbeddingHttpClient {
  post<T>(
    url: string,
    body: unknown,
    headers: Readonly<Record<string, string>>,
    timeoutMs: number,
  ): Promise<T>;
}

export class FetchEmbeddingHttpClient implements EmbeddingHttpClient {
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
        headers: {
          'content-type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new AppError(
        'Embedding provider request failed',
        503,
        'EMBEDDING_PROVIDER_UNAVAILABLE',
        {
          cause: error instanceof Error ? error.message : String(error),
        },
      );
    }

    if (!response.ok) {
      throw new AppError(
        `Embedding provider returned HTTP ${response.status}`,
        502,
        'EMBEDDING_PROVIDER_ERROR',
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new AppError(
        'Embedding provider returned invalid JSON',
        502,
        'INVALID_EMBEDDING_RESPONSE',
      );
    }
  }
}
