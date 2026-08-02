import type { JobListDto } from '@/features/jobs/types/job.types';

export interface RecommendationScoreResult {
  overallScore: number;
  components: Record<string, number>;
  matchedSkills: string[];
  relatedSkills: string[];
  missingSkills: string[];
  reasons: Array<{ component: string; message: string; evidence: string[] }>;
}

export interface RecommendationDto {
  id: string;
  runId: string;
  rank: number;
  job: JobListDto;
  displayScore?: number | null;
  scoreResult: RecommendationScoreResult;
  category: string;
  matchType: string;
  createdAt: string;
}

export interface RecommendationListResult {
  items: RecommendationDto[];
  page: number;
  limit: number;
  total: number;
}

export interface RecommendationReadinessStatus {
  ready: boolean;
  lifecycleState?:
    | 'NOT_STARTED'
    | 'QUEUED'
    | 'PROCESSING'
    | 'READY'
    | 'STALE'
    | 'FAILED'
    | 'FAILED_TIMEOUT'
    | 'FAILED_PROVIDER'
    | 'FAILED_EMPTY';
  canGenerateFromProfile: boolean;
  blockers: string[];
  stale?: boolean;
  lastGeneratedAt?: string | null;
  retrieval: {
    backend: string;
    configured: boolean;
    embeddingCoverageRatio?: number;
  };
}

export interface ListRecommendationsParams {
  page?: number;
  limit?: number;
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
