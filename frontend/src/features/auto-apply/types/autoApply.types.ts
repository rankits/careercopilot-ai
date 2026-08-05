export interface BackendSuccessResponse<T> {
  data: T;
  message: string;
  status: 'success';
}

export type WorkModePreference = 'REMOTE' | 'HYBRID' | 'ONSITE';

/** @deprecated Prefer remotePreferences. */
export type RemotePreference = WorkModePreference | 'ANY';

export interface CandidateApplicationPreferences {
  desiredRoles: string[];
  preferredLocations: string[];
  remotePreferences: WorkModePreference[];
  /** @deprecated Prefer remotePreferences. */
  remotePreference?: RemotePreference;
  expectedSalary?: { min?: number; max?: number; currency?: string };
  noticePeriodDays?: number;
  willingToRelocate?: boolean;
  requiresSponsorship?: boolean;
}

export interface CandidateApplicationLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface CandidateApplicationProfileDto {
  id: string;
  userId: string;
  preferences: CandidateApplicationPreferences;
  links: CandidateApplicationLinks;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCandidateProfilePayload {
  preferences?: Partial<CandidateApplicationPreferences>;
  links?: Partial<CandidateApplicationLinks>;
}

export interface ApplicationAnswerDto {
  id: string;
  questionKey: string;
  answer: string;
  source: 'USER_VERIFIED';
  sensitive: boolean;
  autoSubmitAllowed: boolean;
  lastVerifiedAt: string;
}

export interface CreateAnswerPayload {
  questionKey: string;
  answer: string;
  autoSubmitAllowed?: boolean;
}

export interface ApprovedResumeVersionDto {
  id: string;
  resumeId: string;
  label: string;
  category: string;
  tags: string[];
  isActive: boolean;
}

export interface CreateResumeVersionPayload {
  resumeId: string;
  label: string;
  category: string;
  tags?: string[];
  isActive?: boolean;
}

export interface ApplicationRuleDto {
  id: string;
  minMatchScore: number;
  dailyApplicationLimit: number;
  weeklyApplicationLimit: number | null;
  blacklistedCompanySlugs: string[];
  excludedTitleKeywords: string[];
  excludedSources: string[];
  autopilotEnabled: boolean;
  autopilotPausedAt: string | null;
}

export interface UpsertRulePayload {
  minMatchScore?: number;
  dailyApplicationLimit?: number;
  weeklyApplicationLimit?: number | null;
  blacklistedCompanySlugs?: string[];
  excludedTitleKeywords?: string[];
  excludedSources?: string[];
}

export type ConsentType =
  'RESUME_USAGE' | 'CONTENT_GENERATION' | 'EMAIL_SUBMISSION' | 'AUTOPILOT_SUBMISSION';

export interface ApplicationConsentDto {
  id: string;
  consentType: ConsentType;
  version: number;
  grantedAt: string;
  revokedAt: string | null;
}

export type AutoApplyChannel =
  'EMAIL' | 'EXTERNAL_MANUAL' | 'ATS_API' | 'BROWSER_ASSISTED' | 'UNSUPPORTED';

export type JobApplicationStatus =
  | 'DISCOVERED'
  | 'MATCHED'
  | 'NOT_ELIGIBLE'
  | 'APPLICATION_PLANNING'
  | 'INFORMATION_REQUIRED'
  | 'READY_FOR_REVIEW'
  | 'READY_FOR_AUTOPILOT'
  | 'APPROVED'
  | 'QUEUED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'CONFIRMATION_RECEIVED'
  | 'SUBMISSION_FAILED'
  | 'ACTION_REQUIRED'
  | 'WITHDRAWN';

export interface EligibilityCheckResult {
  check: string;
  status: 'PASSED' | 'FAILED' | 'NOT_EVALUATED';
  reason?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheckResult[];
}

export interface JobApplicationDto {
  id: string;
  jobId: string | null;
  companySlug: string | null;
  jobTitle: string | null;
  channel: AutoApplyChannel;
  status: JobApplicationStatus;
  eligibilityResult: EligibilityResult | null;
  resumeVersionId: string | null;
  externalConfirmationUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  planVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateSubmissionResult {
  application: JobApplicationDto;
  possibleDuplicates: JobApplicationDto[];
}

export type ApplicationPlanDecision =
  'NOT_ELIGIBLE' | 'UNSUPPORTED_CHANNEL' | 'INFORMATION_REQUIRED' | 'READY_FOR_REVIEW';

export interface ApplicationReadinessReasonDto {
  code: string;
  message: string;
  field?: string;
  rule?: string;
  severity: 'BLOCKING' | 'WARNING';
  collectionMode?: 'ONBOARDING' | 'PROGRESSIVE' | 'JOB_SPECIFIC';
  metadata?: Record<string, unknown>;
}

export interface ApplicationReadinessDto {
  decision: string;
  ready: boolean;
  blockingReasons: ApplicationReadinessReasonDto[];
  warnings: ApplicationReadinessReasonDto[];
}

export interface ApplicationPlanResult {
  application: JobApplicationDto;
  decision: ApplicationPlanDecision;
  channel: AutoApplyChannel;
  eligibility: EligibilityResult;
  selectedResumeVersion: ApprovedResumeVersionDto | null;
  unresolvedQuestions: string[];
  contentGenerationAvailable: boolean;
  coverLetter?: string | null;
  screeningAnswers?: PreparedScreeningAnswerDto[];
  contentWarnings?: string[];
  readiness?: ApplicationReadinessDto;
  pageAnalysis?: ApplicationPageAnalysisSummary | null;
}

export interface PreparedScreeningAnswerDto {
  questionKey: string;
  questionLabel: string;
  answer: string | null;
  status: 'READY' | 'REQUIRES_USER_ACTION';
  source: 'USER_VERIFIED' | 'AI_GENERATED' | null;
  confidence: number;
  evidence: string[];
  requiresUserReview: boolean;
}

export type ApplyMode = 'PREPARE' | 'ASSISTED' | 'AUTOPILOT' | 'EXTENSION';

export interface ApplicationPageRequirementSummary {
  code: string;
  importance: string;
  assertion: string;
  required: boolean;
  confidence: number;
  evidenceStrength: string;
  sourceText?: string;
  reviewStatus?: string;
}

export interface ApplicationPageAnalysisSummary {
  id: string;
  provider: string;
  submissionCapability: string;
  formStatus: string;
  outcomeStatus: string;
  jobPageUrl: string;
  analyzedAt: string;
  expiresAt: string;
  requirements: ApplicationPageRequirementSummary[];
}

export interface ApplicationPageAnalysisDto {
  id: string;
  jobId: string;
  provider: string;
  jobPageUrl: string;
  formStatus: string;
  submissionCapability: string;
  outcomeStatus: string;
  requirements: Array<{
    code: string;
    required?: boolean;
    assertion?: string;
    importance?: string;
    sourceText?: string;
    evidenceStrength?: string;
    confidence?: number;
  }>;
  analyzedAt: string;
  expiresAt: string;
}

export interface ApplicationMatchSnapshotDto {
  status: string;
  overallScore: number | null;
  displayScore: number | null;
  jobId: string;
  errorCode?: string;
}

export interface ApplicationPackageStubDto {
  provider: string;
  submissionMode: string;
  finalSubmissionRequiresUser: boolean;
  analysisId: string;
  matchStatus: string;
  overallScore: number | null;
}

export interface PrepareApplicationResult {
  analysis: ApplicationPageAnalysisDto;
  match: ApplicationMatchSnapshotDto;
  readiness: ApplicationReadinessDto;
  package: ApplicationPackageStubDto;
  application: JobApplicationDto | null;
}

export interface PrepareApplicationPayload {
  applyMode?: ApplyMode;
  jobApplicationId?: string;
  resumeVersionId?: string;
  allowMatchCompute?: boolean;
  forceRefreshAnalysis?: boolean;
}
