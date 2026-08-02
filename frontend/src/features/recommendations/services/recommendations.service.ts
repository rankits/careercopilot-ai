import type {
  ListRecommendationsParams,
  RecommendationDto,
  RecommendationFeedbackAction,
  RecommendationListResult,
  RecommendationReadinessStatus,
  RecommendationRunDetailsResult,
} from '@/features/recommendations/types/recommendation.types';
import { httpClient } from '@/services/httpClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unwrapList = (response: unknown): RecommendationListResult => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
    throw new Error('Unexpected recommendations response shape');
  }
  const payload = response.data.data;
  const items = Array.isArray(payload.items) ? (payload.items as RecommendationDto[]) : [];
  return {
    items,
    page: typeof payload.page === 'number' ? payload.page : 1,
    limit: typeof payload.limit === 'number' ? payload.limit : items.length,
    total: typeof payload.total === 'number' ? payload.total : items.length,
  };
};

const unwrapRunDetails = (response: unknown): RecommendationRunDetailsResult => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
    throw new Error('Unexpected recommendation run response shape');
  }
  const payload = response.data.data;
  if (!isRecord(payload.run)) {
    throw new Error('Unexpected recommendation run response shape');
  }
  const list = unwrapList(response);
  return {
    ...list,
    run: payload.run as RecommendationRunDetailsResult['run'],
  };
};

const unwrapReadiness = (response: unknown): RecommendationReadinessStatus => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
    throw new Error('Unexpected recommendation readiness response shape');
  }
  return response.data.data as RecommendationReadinessStatus;
};

export const recommendationsService = {
  async list(
    params: ListRecommendationsParams = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationListResult> {
    const response = await httpClient.get('/job-recommendations', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.runId ? { runId: params.runId } : {}),
        ...(params.latestOnly !== undefined ? { latestOnly: params.latestOnly } : {}),
      },
      signal: options.signal,
    });
    return unwrapList(response);
  },

  async getReadiness(options: { signal?: AbortSignal } = {}): Promise<RecommendationReadinessStatus> {
    const response = await httpClient.get('/job-recommendations/status', {
      signal: options.signal,
    });
    return unwrapReadiness(response);
  },

  async generateFromProfile(options: { signal?: AbortSignal } = {}): Promise<RecommendationDto[]> {
    const response = await httpClient.post(
      '/job-recommendations',
      { sourceType: 'PROFILE' },
      { signal: options.signal, timeout: 60_000 },
    );
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.data)) {
      throw new Error('Unexpected generate-recommendations response shape');
    }
    return response.data.data as RecommendationDto[];
  },

  async refreshFromProfile(
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationRunDetailsResult> {
    const response = await httpClient.post(
      '/job-recommendations/refresh',
      { sourceType: 'PROFILE' },
      { signal: options.signal, timeout: 60_000 },
    );
    return unwrapRunDetails(response);
  },

  async getRunDetails(
    runId: string,
    params: Pick<ListRecommendationsParams, 'page' | 'limit'> = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationRunDetailsResult> {
    const response = await httpClient.get(`/job-recommendations/runs/${runId}`, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      signal: options.signal,
    });
    return unwrapRunDetails(response);
  },

  async submitFeedback(
    recommendationId: string,
    action: RecommendationFeedbackAction,
    note?: string,
  ): Promise<void> {
    await httpClient.post(`/job-recommendations/${recommendationId}/feedback`, {
      action,
      ...(note ? { note } : {}),
    });
  },
};
