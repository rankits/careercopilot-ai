import type {
  CareerTargetDto,
  CareerTargetListResult,
  ListRecommendationsParams,
  RecommendationDto,
  RecommendationFeedbackAction,
  RecommendationListResult,
  RecommendationLifecycleState,
  RecommendationReadinessStatus,
  RecommendationRetrievalBackend,
  RecommendationRunDetailsResult,
  SimilarJobDto,
} from '@/features/recommendations/types/recommendation.types';
import { httpClient } from '@/services/httpClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const lifecycleStates = new Set<RecommendationLifecycleState>([
  'NOT_STARTED',
  'QUEUED',
  'PROCESSING',
  'READY',
  'STALE',
  'FAILED',
  'FAILED_TIMEOUT',
  'FAILED_PROVIDER',
  'FAILED_EMPTY',
]);

const retrievalBackends = new Set<RecommendationRetrievalBackend>([
  'DATABASE',
  'PGVECTOR',
  'ELASTICSEARCH',
  'OPENSEARCH',
  'EXTERNAL_VECTOR',
]);

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
  const payload = response.data.data;
  if (
    typeof payload.ready !== 'boolean' ||
    typeof payload.canGenerateFromProfile !== 'boolean' ||
    typeof payload.lifecycleState !== 'string' ||
    !lifecycleStates.has(payload.lifecycleState as RecommendationLifecycleState) ||
    !Array.isArray(payload.blockers) ||
    !isRecord(payload.retrieval) ||
    typeof payload.retrieval.backend !== 'string' ||
    !retrievalBackends.has(payload.retrieval.backend as RecommendationRetrievalBackend) ||
    typeof payload.retrieval.configured !== 'boolean'
  ) {
    throw new Error('Unexpected recommendation readiness response shape');
  }
  return payload as unknown as RecommendationReadinessStatus;
};

const unwrapSimilarJobs = (response: unknown): SimilarJobDto[] => {
  if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.data)) {
    throw new Error('Unexpected similar jobs response shape');
  }
  return response.data.data as SimilarJobDto[];
};

const unwrapCareerTarget = (response: unknown): CareerTargetDto => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
    throw new Error('Unexpected career-target response shape');
  }
  const payload = response.data.data;
  if (typeof payload.id !== 'string' || typeof payload.goalText !== 'string') {
    throw new Error('Unexpected career-target response shape');
  }
  return payload as unknown as CareerTargetDto;
};

const unwrapCareerTargetList = (response: unknown): CareerTargetListResult => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.data)) {
    throw new Error('Unexpected career-target list response shape');
  }
  const payload = response.data.data;
  const items = Array.isArray(payload.items) ? (payload.items as CareerTargetDto[]) : [];
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

  async generateFromResume(
    resumeId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationDto[]> {
    const response = await httpClient.post(
      '/job-recommendations',
      { sourceType: 'RESUME', sourceId: resumeId },
      { signal: options.signal, timeout: 60_000 },
    );
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.data)) {
      throw new Error('Unexpected generate-resume-recommendations response shape');
    }
    return response.data.data as RecommendationDto[];
  },

  async generateFromCareerGoal(
    careerTargetId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationDto[]> {
    const response = await httpClient.post(
      '/job-recommendations',
      { sourceType: 'CAREER_GOAL', sourceId: careerTargetId },
      { signal: options.signal, timeout: 60_000 },
    );
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.data)) {
      throw new Error('Unexpected career-goal recommendations response shape');
    }
    return response.data.data as RecommendationDto[];
  },

  async generateFromText(
    targetText: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<RecommendationDto[]> {
    const response = await httpClient.post(
      '/job-recommendations/from-text',
      { targetText },
      { signal: options.signal, timeout: 60_000 },
    );
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.data)) {
      throw new Error('Unexpected text-recommendations response shape');
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

  async getSimilarJobs(
    jobId: string,
    params: { limit?: number } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<SimilarJobDto[]> {
    const response = await httpClient.get(`/job-recommendations/similar/${jobId}`, {
      params: {
        limit: params.limit ?? 10,
      },
      signal: options.signal,
    });
    return unwrapSimilarJobs(response);
  },

  async listCareerTargets(
    params: Pick<ListRecommendationsParams, 'page' | 'limit'> = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<CareerTargetListResult> {
    const response = await httpClient.get('/job-recommendations/career-targets', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      signal: options.signal,
    });
    return unwrapCareerTargetList(response);
  },

  async createCareerTarget(
    goalText: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<CareerTargetDto> {
    const response = await httpClient.post(
      '/job-recommendations/career-targets',
      { goalText },
      { signal: options.signal },
    );
    return unwrapCareerTarget(response);
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
