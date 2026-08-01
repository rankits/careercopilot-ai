import type {
  JobRecommendationRecord,
  RecommendationFeedbackAction,
  RecommendationFeedbackRecord,
  RecommendationPage,
  RecommendationRunRecord,
  RecommendationRunStatus,
  RecommendationSourceType,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

export interface RecommendationRunRepository {
  create(input: {
    userId: string;
    sourceType: RecommendationSourceType;
    sourceId?: string;
  }): Promise<RecommendationRunRecord>;
  updateStatus(
    userId: string,
    runId: string,
    status: RecommendationRunStatus,
  ): Promise<RecommendationRunRecord>;
  updateCandidateCount(
    userId: string,
    runId: string,
    candidateCount: number,
  ): Promise<RecommendationRunRecord>;
  markCompleted(userId: string, runId: string): Promise<RecommendationRunRecord>;
  markFailed(userId: string, runId: string, failureCode: string): Promise<RecommendationRunRecord>;
  findById(userId: string, runId: string): Promise<RecommendationRunRecord | null>;
}

export interface JobRecommendationRepository {
  createMany(
    userId: string,
    runId: string,
    recommendations: readonly ScoredJobRecommendation[],
  ): Promise<JobRecommendationRecord[]>;
  findById(userId: string, recommendationId: string): Promise<JobRecommendationRecord | null>;
  listByRun(
    userId: string,
    runId: string,
    pagination: { page: number; limit: number },
  ): Promise<RecommendationPage>;
  listByUser(
    userId: string,
    pagination: { page: number; limit: number },
  ): Promise<RecommendationPage>;
  existsByRunAndJob(userId: string, runId: string, jobId: string): Promise<boolean>;
}

export interface RecommendationFeedbackRepository {
  upsert(input: {
    userId: string;
    recommendationId: string;
    jobId: string;
    action: RecommendationFeedbackAction;
    note?: string;
  }): Promise<RecommendationFeedbackRecord>;
  findByRecommendation(
    userId: string,
    recommendationId: string,
  ): Promise<RecommendationFeedbackRecord | null>;
  listByJob(userId: string, jobId: string): Promise<RecommendationFeedbackRecord[]>;
}

export interface RecommendationUnitOfWork {
  execute<T>(
    operation: (repositories: {
      runs: RecommendationRunRepository;
      recommendations: JobRecommendationRepository;
      feedback: RecommendationFeedbackRepository;
    }) => Promise<T>,
  ): Promise<T>;
}
