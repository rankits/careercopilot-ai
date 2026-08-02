import type {
  ExtractedRecommendationContext,
  JobRecommendationRecord,
  RecommendationContext,
  RecommendationExplanation,
  RecommendationFeedbackRecord,
  RecommendationLifecycleState,
  RecommendationPage,
  RecommendationRunPage,
  RecommendationRunRecord,
  RecommendationSourceType,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';
import { normalizeExtractedRecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import { mapRecommendationLifecycleState } from '@/modules/recommendations/services/recommendation-readiness.helpers.js';
import { buildRecommendationExplanation } from '@/modules/recommendations/services/recommendation-explanation.service.js';

export interface RecommendationContextMapper {
  toContext(input: {
    userId: string;
    sourceType: RecommendationSourceType;
    sourceId?: string;
    extracted: ExtractedRecommendationContext;
  }): RecommendationContext;
}

export interface RecommendationPersistenceInput {
  userId: string;
  runId: string;
  jobId: string;
  rank: number;
  scoreResult: JobRecommendationRecord['scoreResult'];
  category: JobRecommendationRecord['category'];
  matchType: JobRecommendationRecord['matchType'];
}

export interface RecommendationResponse {
  id: string;
  runId: string;
  job: JobRecommendationRecord['job'];
  rank: number;
  displayScore?: number;
  explanation: RecommendationExplanation;
  scoreResult: JobRecommendationRecord['scoreResult'];
  category: JobRecommendationRecord['category'];
  matchType: JobRecommendationRecord['matchType'];
  createdAt: string;
}

export interface RecommendationRunResponse {
  id: string;
  sourceType: RecommendationRunRecord['sourceType'];
  sourceId: string | null;
  status: RecommendationRunRecord['status'];
  lifecycleState: RecommendationLifecycleState;
  candidateCount: number;
  failureCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RecommendationRunPageResponse {
  run: RecommendationRunResponse;
  items: RecommendationResponse[];
  page: number;
  limit: number;
  total: number;
}

export interface RecommendationMapper {
  toPersistenceInput(record: JobRecommendationRecord): RecommendationPersistenceInput;
  toResponse(record: JobRecommendationRecord): RecommendationResponse;
}

export const toRecommendationContext: RecommendationContextMapper['toContext'] = ({
  userId,
  sourceType,
  sourceId,
  extracted,
}) => ({ userId, sourceType, sourceId, ...normalizeExtractedRecommendationContext(extracted) });

export const toRecommendationPersistenceInput: RecommendationMapper['toPersistenceInput'] = (
  record,
) => ({
  userId: record.userId,
  runId: record.runId,
  jobId: record.job.id,
  rank: record.rank,
  scoreResult: record.scoreResult,
  category: record.category,
  matchType: record.matchType,
});

export const toDisplayScore = (overallScore: number): number | undefined => {
  if (!Number.isFinite(overallScore) || overallScore < 0 || overallScore > 1) return undefined;
  return Math.round(overallScore * 100);
};

export const toRecommendationResponse: RecommendationMapper['toResponse'] = (record) => ({
  id: record.id,
  runId: record.runId,
  job: record.job,
  rank: record.rank,
  displayScore: toDisplayScore(record.scoreResult.overallScore),
  explanation: buildRecommendationExplanation(record),
  scoreResult: record.scoreResult,
  category: record.category,
  matchType: record.matchType,
  createdAt: record.createdAt.toISOString(),
});

export const toRecommendationFeedbackResponse = (record: RecommendationFeedbackRecord) => ({
  id: record.id,
  recommendationId: record.recommendationId,
  action: record.action,
  note: record.note,
  createdAt: record.createdAt.toISOString(),
});

export const toRecommendationRunResponse = (
  record: RecommendationRunRecord,
  options: { stale?: boolean } = {},
): RecommendationRunResponse => ({
  id: record.id,
  sourceType: record.sourceType,
  sourceId: record.sourceId,
  status: record.status,
  lifecycleState: mapRecommendationLifecycleState({
    latestRun: record,
    stale: options.stale ?? false,
  }),
  candidateCount: record.candidateCount,
  failureCode: record.failureCode,
  createdAt: record.createdAt.toISOString(),
  completedAt: record.completedAt?.toISOString() ?? null,
});

export const toRecommendationRunPageResponse = (
  page: RecommendationRunPage,
): RecommendationRunPageResponse => ({
  run: toRecommendationRunResponse(page.run),
  items: page.items.map(toRecommendationResponse),
  page: page.page,
  limit: page.limit,
  total: page.total,
});

export const toRecommendationPageResponse = (
  page: RecommendationPage,
): Omit<RecommendationRunPageResponse, 'run'> => ({
  items: page.items.map(toRecommendationResponse),
  page: page.page,
  limit: page.limit,
  total: page.total,
});

export const toSimilarJobResponse = (item: ScoredJobRecommendation, rank: number) => ({
  rank,
  job: item.job,
  displayScore: toDisplayScore(item.scoreResult.overallScore),
  scoreResult: item.scoreResult,
  category: item.category,
  matchType: item.matchType,
});
