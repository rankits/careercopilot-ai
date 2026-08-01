import type {
  ListRecommendationsParams,
  RecommendationDto,
  RecommendationListResult,
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

export const recommendationsService = {
  async list(
    params: ListRecommendationsParams = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationListResult> {
    const response = await httpClient.get('/job-recommendations', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      signal: options.signal,
    });
    return unwrapList(response);
  },

  async generateFromProfile(): Promise<RecommendationDto[]> {
    const response = await httpClient.post('/job-recommendations', {
      sourceType: 'PROFILE',
    });
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.data)) {
      throw new Error('Unexpected generate-recommendations response shape');
    }
    return response.data.data as RecommendationDto[];
  },
};
