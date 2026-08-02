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

export interface RecommendationListResult {
  items: RecommendationDto[];
  page: number;
  limit: number;
  total: number;
}

export interface RecommendationRunDto {
  id: string;
  sourceType: string;
  sourceId: string | null;
  status: 'PENDING' | 'RETRIEVING' | 'SCORING' | 'COMPLETED' | 'FAILED';
  lifecycleState:
    | 'NOT_STARTED'
    | 'QUEUED'
    | 'PROCESSING'
    | 'READY'
    | 'STALE'
    | 'FAILED'
    | 'FAILED_TIMEOUT'
    | 'FAILED_PROVIDER'
    | 'FAILED_EMPTY';
  candidateCount: number;
  failureCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RecommendationRunDetailsResult extends RecommendationListResult {
  run: RecommendationRunDto;
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
