import type { JobListDto } from '@/features/jobs/types/job.types';

export interface RecommendationScoreResult {
  overallScore: number;
  components: Record<string, number>;
  matchedSkills: string[];
  aliasSkills: string[];
  relatedSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
  reasons: Array<{ component: string; message: string; evidence: string[] }>;
}

export interface RecommendationExplanation {
  summary: string;
  bullets: Array<{
    component: string;
    label: string;
    score: number;
    weight: number;
    contribution: number;
    message: string;
    evidence: string[];
  }>;
  matchedSkills: string[];
  aliasSkills: string[];
  relatedSkills: string[];
  transferableSkills: string[];
  missingSkills: string[];
  scoreModel: {
    overallScore: number;
    displayScore?: number;
    heuristicWeight: number;
    retrievalWeight: number;
    heuristicScore?: number;
    retrievalScore?: number;
  };
}

export interface RecommendationSkillGap {
  exact: string[];
  alias: string[];
  related: string[];
  transferable: string[];
  missing: string[];
}

export interface RecommendationDto {
  id: string;
  runId: string;
  rank: number;
  job: JobListDto;
  displayScore?: number | null;
  explanation?: RecommendationExplanation;
  skillGap?: RecommendationSkillGap;
  scoreResult: RecommendationScoreResult;
  category: string;
  matchType: string;
  createdAt: string;
}

export interface SimilarJobDto {
  rank: number;
  job: JobListDto;
  displayScore?: number | null;
  scoreResult: RecommendationScoreResult;
  category: string;
  matchType: string;
}

export interface RecommendationListResult {
  items: RecommendationDto[];
  page: number;
  limit: number;
  total: number;
}

export type RecommendationLifecycleState =
  | 'NOT_STARTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY'
  | 'STALE'
  | 'FAILED'
  | 'FAILED_TIMEOUT'
  | 'FAILED_PROVIDER'
  | 'FAILED_EMPTY';

export type RecommendationReadinessBlocker =
  | 'PROFILE_INCOMPLETE'
  | 'PROFILE_NOT_FOUND'
  | 'PROFILE_UNAVAILABLE'
  | 'RECOMMENDATIONS_STALE'
  | 'EMBEDDING_COVERAGE_LOW';

export type RecommendationRetrievalBackend =
  | 'DATABASE'
  | 'PGVECTOR'
  | 'ELASTICSEARCH'
  | 'OPENSEARCH'
  | 'EXTERNAL_VECTOR';

export interface RecommendationRunDto {
  id: string;
  sourceType: string;
  sourceId: string | null;
  status: 'PENDING' | 'RETRIEVING' | 'SCORING' | 'COMPLETED' | 'FAILED';
  lifecycleState: RecommendationLifecycleState;
  candidateCount: number;
  failureCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RecommendationRunDetailsResult extends RecommendationListResult {
  run: RecommendationRunDto;
}

export interface CareerTargetDto {
  id: string;
  goalText: string;
  structured: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CareerTargetListResult {
  items: CareerTargetDto[];
  page: number;
  limit: number;
  total: number;
}

export interface RecommendationReadinessStatus {
  ready: boolean;
  lifecycleState: RecommendationLifecycleState;
  canGenerateFromProfile: boolean;
  blockers: RecommendationReadinessBlocker[];
  stale?: boolean;
  lastGeneratedAt?: string | null;
  retrieval: {
    backend: RecommendationRetrievalBackend;
    configured: boolean;
    embeddingCoverageRatio?: number;
  };
}

export interface ListRecommendationsParams {
  page?: number;
  limit?: number;
  runId?: string;
  latestOnly?: boolean;
}

export type RecommendationFeedbackAction =
  | 'DISMISSED'
  | 'NOT_RELEVANT'
  | 'SAVED'
  | 'APPLIED'
  | 'VIEWED'
  | 'OPENED'
  | 'MORE_LIKE_THIS'
  | 'LESS_LIKE_THIS';
