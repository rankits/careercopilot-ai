import { logger } from '@/shared/logger/logger.js';

export interface OpenRouterRequestMetricEvent {
  model: string;
  inputCount: number;
  batchSize: number;
  durationMs: number;
  success: boolean;
  retryCount?: number;
  errorType?: string;
  tokenUsage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

export interface EmbeddingMetricsSnapshot {
  openrouterRequestCount: number;
  openrouterSuccessCount: number;
  openrouterFailureCount: number;
  openrouterRateLimitCount: number;
  openrouterRetryCount: number;
  totalDurationMs: number;
  totalInputCount: number;
  totalPromptTokens: number;
  totalTokens: number;
  dimensionMismatchCount: number;
  activeModel?: {
    provider: string;
    model: string;
  };
}

let openrouterRequestCount = 0;
let openrouterSuccessCount = 0;
let openrouterFailureCount = 0;
let openrouterRateLimitCount = 0;
let openrouterRetryCount = 0;
let totalDurationMs = 0;
let totalInputCount = 0;
let totalPromptTokens = 0;
let totalTokens = 0;
let dimensionMismatchCount = 0;
let activeModel: { provider: string; model: string } | undefined;

export function recordOpenRouterRequest(event: OpenRouterRequestMetricEvent): void {
  openrouterRequestCount++;
  totalDurationMs += event.durationMs;
  totalInputCount += event.inputCount;
  if (event.retryCount && event.retryCount > 0) {
    openrouterRetryCount += event.retryCount;
  }
  if (event.success) {
    openrouterSuccessCount++;
  } else {
    openrouterFailureCount++;
    if (event.errorType === 'OPENROUTER_EMBEDDING_RATE_LIMITED') {
      openrouterRateLimitCount++;
    }
  }
  if (event.tokenUsage) {
    totalPromptTokens += event.tokenUsage.prompt_tokens ?? 0;
    totalTokens += event.tokenUsage.total_tokens ?? 0;
  }
}

export function recordDimensionMismatch(
  provider: string,
  model: string,
  expectedDimensions: number,
  actualDimensions: number,
): void {
  dimensionMismatchCount++;
  logger.error(
    {
      provider,
      model,
      expectedDimensions,
      actualDimensions,
    },
    'Embedding provider returned mismatched vector dimensions',
  );
}

export function recordActiveEmbeddingModel(provider: string, model: string): void {
  activeModel = { provider, model };
}

export function getEmbeddingMetricsSnapshot(): EmbeddingMetricsSnapshot {
  return {
    openrouterRequestCount,
    openrouterSuccessCount,
    openrouterFailureCount,
    openrouterRateLimitCount,
    openrouterRetryCount,
    totalDurationMs,
    totalInputCount,
    totalPromptTokens,
    totalTokens,
    dimensionMismatchCount,
    activeModel,
  };
}

export function resetEmbeddingMetricsForTests(): void {
  openrouterRequestCount = 0;
  openrouterSuccessCount = 0;
  openrouterFailureCount = 0;
  openrouterRateLimitCount = 0;
  openrouterRetryCount = 0;
  totalDurationMs = 0;
  totalInputCount = 0;
  totalPromptTokens = 0;
  totalTokens = 0;
  dimensionMismatchCount = 0;
  activeModel = undefined;
}
