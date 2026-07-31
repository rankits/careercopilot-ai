import type { JobDetailDto, JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { CanonicalResume } from '@/modules/resumes/types/resume.types.js';

export const RECOMMENDATION_SOURCE_TYPE_VALUES = [
  'PROFILE',
  'RESUME',
  'JOB',
  'TARGET_TEXT',
  'CAREER_GOAL',
  'SAVED_SEARCH',
] as const;
export type RecommendationSourceType = (typeof RECOMMENDATION_SOURCE_TYPE_VALUES)[number];

export const RECOMMENDATION_CATEGORY_VALUES = [
  'BEST_MATCH',
  'GOOD_MATCH',
  'STRETCH_OPPORTUNITY',
  'RELATED_CAREER_PATH',
] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORY_VALUES)[number];

export const RECOMMENDATION_FEEDBACK_ACTION_VALUES = [
  'VIEWED',
  'OPENED',
  'SAVED',
  'APPLIED',
  'DISMISSED',
  'NOT_RELEVANT',
  'MORE_LIKE_THIS',
  'LESS_LIKE_THIS',
] as const;
export type RecommendationFeedbackAction = (typeof RECOMMENDATION_FEEDBACK_ACTION_VALUES)[number];

export const RECOMMENDATION_MATCH_TYPE_VALUES = [
  'EXACT',
  'ALIAS',
  'RELATED',
  'TRANSFERABLE',
  'MISSING',
] as const;
export type RecommendationMatchType = (typeof RECOMMENDATION_MATCH_TYPE_VALUES)[number];

export const RETRIEVAL_BACKEND_VALUES = [
  'DATABASE',
  'PGVECTOR',
  'ELASTICSEARCH',
  'OPENSEARCH',
  'EXTERNAL_VECTOR',
] as const;
export type RetrievalBackend = (typeof RETRIEVAL_BACKEND_VALUES)[number];

export interface SalaryExpectation {
  minimum?: number;
  maximum?: number;
  currency?: string;
}

export interface ExtractedRecommendationContext {
  targetTitles: string[];
  relatedTitles: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  yearsOfExperience?: number;
  seniority?: string;
  industries: string[];
  locations: string[];
  remotePreference?: string;
  employmentTypes: string[];
  salaryExpectation: SalaryExpectation;
  education: string[];
  certifications: string[];
  excludedCompanies: string[];
  excludedSkills: string[];
  sourceText?: string;
}

export interface RecommendationContext extends ExtractedRecommendationContext {
  sourceId?: string;
  userId: string;
  sourceType: RecommendationSourceType;
}

export interface CandidateProfileSourcePayload extends Partial<ExtractedRecommendationContext> {
  targetTitles: string[];
  requiredSkills: string[];
}

export interface RecommendationSourcePayloadMap {
  PROFILE: CandidateProfileSourcePayload;
  RESUME: CanonicalResume;
  JOB: JobDetailDto;
  TARGET_TEXT: string;
  CAREER_GOAL: CandidateProfileSourcePayload;
  SAVED_SEARCH: CandidateProfileSourcePayload;
}

export type BuildRecommendationContextInput = {
  [S in RecommendationSourceType]: {
    userId: string;
    sourceType: S;
    sourceId?: string;
    authorizedSourcePayload: RecommendationSourcePayloadMap[S];
  };
}[RecommendationSourceType];

export const RECOMMENDATION_SCORE_COMPONENT_VALUES = [
  'requiredSkills',
  'title',
  'experience',
  'responsibilities',
  'preferredSkills',
  'location',
  'industry',
  'salary',
  'qualifications',
] as const;
export type RecommendationScoreComponentName =
  (typeof RECOMMENDATION_SCORE_COMPONENT_VALUES)[number];
export type RecommendationScoreComponents = Record<RecommendationScoreComponentName, number>;

export interface RecommendationReason {
  component: RecommendationScoreComponentName;
  message: string;
  evidence: string[];
}

export interface RecommendationScoreResult {
  overallScore: number;
  components: RecommendationScoreComponents;
  matchedSkills: string[];
  relatedSkills: string[];
  missingSkills: string[];
  reasons: RecommendationReason[];
}

export interface RecommendationCandidate {
  job: JobListDto;
  retrievalScore?: number;
}

export interface ScoredJobRecommendation {
  job: JobListDto;
  scoreResult: RecommendationScoreResult;
  category: RecommendationCategory;
  matchType: RecommendationMatchType;
}

export const RECOMMENDATION_RUN_STATUS_VALUES = [
  'PENDING',
  'RETRIEVING',
  'SCORING',
  'COMPLETED',
  'FAILED',
] as const;
export type RecommendationRunStatus = (typeof RECOMMENDATION_RUN_STATUS_VALUES)[number];

export interface RecommendationRunRecord {
  id: string;
  userId: string;
  sourceType: RecommendationSourceType;
  sourceId: string | null;
  status: RecommendationRunStatus;
  candidateCount: number;
  failureCode: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface JobRecommendationRecord extends ScoredJobRecommendation {
  id: string;
  runId: string;
  userId: string;
  rank: number;
  createdAt: Date;
}

export interface RecommendationFeedbackRecord {
  id: string;
  recommendationId: string;
  jobId: string;
  userId: string;
  action: RecommendationFeedbackAction;
  note: string | null;
  createdAt: Date;
}

export interface RecommendationPage {
  items: JobRecommendationRecord[];
  page: number;
  limit: number;
  total: number;
}
