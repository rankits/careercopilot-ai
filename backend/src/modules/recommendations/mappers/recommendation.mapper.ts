import type {
  ExtractedRecommendationContext,
  JobRecommendationRecord,
  RecommendationContext,
  RecommendationFeedbackRecord,
  RecommendationSourceType,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';
import { normalizeExtractedRecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';

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
  scoreResult: JobRecommendationRecord['scoreResult'];
  category: JobRecommendationRecord['category'];
  matchType: JobRecommendationRecord['matchType'];
  createdAt: string;
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

export const toRecommendationResponse: RecommendationMapper['toResponse'] = (record) => ({
  id: record.id,
  runId: record.runId,
  job: record.job,
  rank: record.rank,
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

export const toSimilarJobResponse = (item: ScoredJobRecommendation, rank: number) => ({
  rank,
  job: item.job,
  scoreResult: item.scoreResult,
  category: item.category,
  matchType: item.matchType,
});
