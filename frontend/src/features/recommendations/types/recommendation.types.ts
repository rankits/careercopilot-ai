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

export interface ListRecommendationsParams {
  page?: number;
  limit?: number;
}
