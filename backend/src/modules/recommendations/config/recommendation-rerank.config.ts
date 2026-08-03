const optional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const booleanFromEnv = (value: string | undefined, defaultValue: boolean): boolean => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const positiveInteger = (value: string | undefined, defaultValue: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

export interface RecommendationRerankConfig {
  readonly enabled: boolean;
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly model?: string;
  readonly topN: number;
  readonly timeoutMs: number;
}

export const recommendationRerankConfig: RecommendationRerankConfig = {
  enabled: booleanFromEnv(process.env.ENABLE_RECOMMENDATION_RERANK, false),
  apiKey:
    optional(process.env.RECOMMENDATION_RERANK_API_KEY) ?? optional(process.env.OPENAI_API_KEY),
  baseUrl:
    optional(process.env.RECOMMENDATION_RERANK_BASE_URL) ??
    optional(process.env.OPENAI_BASE_URL) ??
    'https://api.openai.com/v1',
  model: optional(process.env.RECOMMENDATION_RERANK_MODEL),
  topN: positiveInteger(process.env.RECOMMENDATION_RERANK_TOP_N, 10),
  timeoutMs: positiveInteger(process.env.RECOMMENDATION_RERANK_TIMEOUT_MS, 2_000),
};
