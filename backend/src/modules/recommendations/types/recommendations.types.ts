import type { JobDetailDto, JobListDto } from '@/modules/job-listing/types/job-listing.types.js';

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

/**
 * Frozen schema version for RecommendationContext.
 * Bump when optional fields or semantics change in a breaking way.
 * Documented in docs/job-recommendation-engine-tickets/CONTEXT_CONTRACT.md
 */
export const RECOMMENDATION_CONTEXT_SCHEMA_VERSION = '1.1.0' as const;

export type RecommendationFilterMode = 'STRICT' | 'FLEXIBLE';
export type RecommendationFlexibilityMode = 'STRICT' | 'FLEXIBLE' | 'STRETCH';

export type WorkAuthorizationStatus =
  | 'AUTHORIZED'
  | 'NEEDS_SPONSORSHIP'
  | 'UNKNOWN'
  | 'NOT_APPLICABLE';

export interface WorkAuthorizationRequirement {
  status?: WorkAuthorizationStatus;
  eligibleCountries: string[];
  requiresSponsorship?: boolean;
}

export interface CareerGoalIntent {
  currentRole?: string;
  targetRole?: string;
  summary?: string;
  targetIndustries: string[];
  timeframe?: string;
}

export interface SavedSearchSnapshot {
  searchId?: string;
  criteriaVersion?: string;
  query?: string;
  filters: {
    titles: string[];
    locations: string[];
    remotePreference?: ExtractedRecommendationContext['remotePreference'];
    employmentTypes: string[];
    industries: string[];
    minimumSalary?: number;
    maximumSalary?: number;
    currency?: string;
  };
}

/**
 * Canonical extracted recommendation intent shared by all six source types.
 * Optional fields default to empty / undefined; PROFILE must remain valid
 * without populating full-engine-only fields.
 */
export interface ExtractedRecommendationContext {
  targetTitles: string[];
  relatedTitles: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  yearsOfExperience?: number;
  minimumExperience?: number;
  maximumExperience?: number;
  seniority?: string;
  careerLevel?: string;
  industries: string[];
  locations: string[];
  eligibleCountries?: string[];
  remotePreference?: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'ANY' | string;
  employmentTypes: string[];
  salaryExpectation: SalaryExpectation;
  /** Non-negotiable floor for hard filters when flexibility is STRICT. */
  salaryMinimumNonNegotiable?: number;
  education: string[];
  certifications: string[];
  excludedCompanies: string[];
  excludedSkills: string[];
  excludedJobIds?: string[];
  excludedRoles?: string[];
  filterMode?: RecommendationFilterMode;
  workAuthorization?: WorkAuthorizationStatus;
  workAuthorizationRequirement?: WorkAuthorizationRequirement;
  requiresSponsorship?: boolean;
  languages?: string[];
  /** STRICT excludes stretch; FLEXIBLE softens some filters; STRETCH allows gaps. */
  flexibilityMode?: RecommendationFlexibilityMode;
  /** Career-goal transition intent (populated by CAREER_GOAL / TARGET_TEXT extractors). */
  goalIntent?: CareerGoalIntent;
  currentRole?: string;
  targetRole?: string;
  careerTransitionSummary?: string;
  transferableSkillsHint?: string[];
  /** Opaque snapshot id for SAVED_SEARCH reruns. */
  savedSearchCriteriaVersion?: string;
  savedSearchSnapshot?: SavedSearchSnapshot;
  sourceText?: string;
  /** Schema version stamped at build time. */
  contextSchemaVersion?: string;
  generatedAt?: Date;
}

export interface RecommendationContext extends ExtractedRecommendationContext {
  sourceId?: string;
  userId: string;
  sourceType: RecommendationSourceType;
  contextSchemaVersion: string;
}

export interface CandidateProfileSourcePayload extends Partial<ExtractedRecommendationContext> {
  targetTitles: string[];
  requiredSkills: string[];
}

export type NormalizedExtractedRecommendationContext = ExtractedRecommendationContext & {
  contextSchemaVersion: string;
};

export const normalizeExtractedRecommendationContext = (
  extracted: Partial<ExtractedRecommendationContext>,
): NormalizedExtractedRecommendationContext => ({
  targetTitles: extracted.targetTitles ?? [],
  relatedTitles: extracted.relatedTitles ?? [],
  requiredSkills: extracted.requiredSkills ?? [],
  preferredSkills: extracted.preferredSkills ?? [],
  yearsOfExperience: extracted.yearsOfExperience,
  minimumExperience: extracted.minimumExperience,
  maximumExperience: extracted.maximumExperience,
  seniority: extracted.seniority,
  careerLevel: extracted.careerLevel,
  industries: extracted.industries ?? [],
  locations: extracted.locations ?? [],
  eligibleCountries: extracted.eligibleCountries,
  remotePreference: extracted.remotePreference,
  employmentTypes: extracted.employmentTypes ?? [],
  salaryExpectation: extracted.salaryExpectation ?? {},
  salaryMinimumNonNegotiable: extracted.salaryMinimumNonNegotiable,
  education: extracted.education ?? [],
  certifications: extracted.certifications ?? [],
  excludedCompanies: extracted.excludedCompanies ?? [],
  excludedSkills: extracted.excludedSkills ?? [],
  excludedJobIds: extracted.excludedJobIds,
  excludedRoles: extracted.excludedRoles,
  filterMode: extracted.filterMode,
  workAuthorization: extracted.workAuthorization,
  workAuthorizationRequirement: extracted.workAuthorizationRequirement
    ? {
        status: extracted.workAuthorizationRequirement.status,
        eligibleCountries: extracted.workAuthorizationRequirement.eligibleCountries ?? [],
        requiresSponsorship: extracted.workAuthorizationRequirement.requiresSponsorship,
      }
    : undefined,
  requiresSponsorship: extracted.requiresSponsorship,
  languages: extracted.languages,
  flexibilityMode: extracted.flexibilityMode,
  goalIntent: extracted.goalIntent
    ? {
        currentRole: extracted.goalIntent.currentRole,
        targetRole: extracted.goalIntent.targetRole,
        summary: extracted.goalIntent.summary,
        targetIndustries: extracted.goalIntent.targetIndustries ?? [],
        timeframe: extracted.goalIntent.timeframe,
      }
    : undefined,
  currentRole: extracted.currentRole,
  targetRole: extracted.targetRole,
  careerTransitionSummary: extracted.careerTransitionSummary,
  transferableSkillsHint: extracted.transferableSkillsHint,
  savedSearchCriteriaVersion: extracted.savedSearchCriteriaVersion,
  savedSearchSnapshot: extracted.savedSearchSnapshot
    ? {
        searchId: extracted.savedSearchSnapshot.searchId,
        criteriaVersion: extracted.savedSearchSnapshot.criteriaVersion,
        query: extracted.savedSearchSnapshot.query,
        filters: {
          titles: extracted.savedSearchSnapshot.filters?.titles ?? [],
          locations: extracted.savedSearchSnapshot.filters?.locations ?? [],
          remotePreference: extracted.savedSearchSnapshot.filters?.remotePreference,
          employmentTypes: extracted.savedSearchSnapshot.filters?.employmentTypes ?? [],
          industries: extracted.savedSearchSnapshot.filters?.industries ?? [],
          minimumSalary: extracted.savedSearchSnapshot.filters?.minimumSalary,
          maximumSalary: extracted.savedSearchSnapshot.filters?.maximumSalary,
          currency: extracted.savedSearchSnapshot.filters?.currency,
        },
      }
    : undefined,
  sourceText: extracted.sourceText,
  contextSchemaVersion:
    extracted.contextSchemaVersion ?? RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  generatedAt: extracted.generatedAt,
});

export interface RecommendationSourcePayloadMap {
  PROFILE: CandidateProfileSourcePayload;
  /** Mapped from owned ParsedResumeData / extraction JSON at authorization time. */
  RESUME: CandidateProfileSourcePayload;
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

export const RECOMMENDATION_LIFECYCLE_STATE_VALUES = [
  'NOT_STARTED',
  'QUEUED',
  'PROCESSING',
  'READY',
  'STALE',
  'FAILED',
  'FAILED_TIMEOUT',
  'FAILED_PROVIDER',
  'FAILED_EMPTY',
] as const;
export type RecommendationLifecycleState =
  (typeof RECOMMENDATION_LIFECYCLE_STATE_VALUES)[number];

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

export interface RecommendationRunPage extends RecommendationPage {
  run: RecommendationRunRecord;
}

/** Foundation response for readiness/status API (JR-ARCH-001). */
export interface RecommendationReadinessStatus {
  ready: boolean;
  lifecycleState: RecommendationLifecycleState;
  canGenerateFromProfile: boolean;
  blockers: string[];
  stale?: boolean;
  lastGeneratedAt?: string | null;
  retrieval: {
    backend: RetrievalBackend;
    configured: boolean;
    embeddingCoverageRatio?: number;
  };
}
