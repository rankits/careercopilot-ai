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
  requiresSponsorship?: boolean | null;
  currentLocation?: string;
  currentCountry?: string;
}

export interface CandidateApplicationLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  behance?: string;
  stackoverflow?: string;
  medium?: string;
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

export interface DeleteResumeVersionResult {
  newDefaultResumeVersionId: string | null;
  newDefaultLabel: string | null;
}

export interface UpdateResumeVersionPayload {
  label?: string;
  category?: string;
  tags?: string[];
  isDefault?: boolean;
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
  | 'WITHDRAWN'
  | 'COULD_NOT_APPLY'
  | 'JOB_CLOSED';

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
  wasReopened?: boolean;
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

export type ApplicationReadinessStage = 'PLAN' | 'APPROVE' | 'QUEUE' | 'SUBMIT' | 'HANDOFF';

export interface ApplicationReadinessDto {
  decision: string;
  ready: boolean;
  blockingReasons: ApplicationReadinessReasonDto[];
  warnings: ApplicationReadinessReasonDto[];
}

export type AutoApplyEventType =
  | 'PLAN_CREATED'
  | 'ELIGIBILITY_EVALUATED'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'SUBMISSION_INITIATED'
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_QUEUED'
  | 'SUBMISSION_SUCCEEDED'
  | 'SUBMISSION_FAILED'
  | 'SUBMISSION_OUTCOME_UNKNOWN'
  | 'SUBMISSION_CONFIRMED'
  | 'SUBMISSION_WITHDRAWN'
  | 'SUBMISSION_RECLAIMED'
  | (string & {});

export interface AutoApplyAuditEventDto {
  id: string;
  userId: string;
  jobApplicationId: string | null;
  eventType: AutoApplyEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
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
  status?: 'COMPLETE' | 'LIMITED' | 'FAILED';
  requirements: ApplicationPageRequirementSummary[];
}

export interface ApplicationPageRequirementDto {
  code: string;
  operator?: string;
  value?: unknown;
  required?: boolean;
  assertion?: string;
  importance?: string;
  sourceText?: string;
  sourceUrl?: string;
  evidenceStrength?: string;
  extractionMethod?: string;
  confidence?: number;
  reviewStatus?: string;
  geographic?: {
    rawValue?: string;
    normalizedRegion?: string;
    explicitCountries?: string[];
    interpretationStatus?: string;
  };
}

export interface ApplicationPageFieldDto {
  externalKey: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  mapping?: string | null;
}

export interface ApplicationPageSnapshotDto {
  contentHash: string;
  sanitizedTextLength?: number;
  httpStatus?: number;
  fetchedAt: string;
  finalUrl?: string;
}

export interface ApplicationPageAnalysisDto {
  id: string;
  jobId: string;
  jobApplicationId?: string | null;
  provider: string;
  jobPageUrl: string;
  applicationUrl?: string | null;
  formStatus: string;
  submissionCapability: string;
  outcomeStatus: string;
  jobPageStatus?: string;
  status?: 'COMPLETE' | 'LIMITED' | 'FAILED';
  previousAnalysisId?: string;
  extractorVersion?: string;
  requirements: ApplicationPageRequirementDto[];
  fields?: ApplicationPageFieldDto[];
  snapshot?: ApplicationPageSnapshotDto | null;
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
  /** Application-specific profile→job match (authoritative). */
  profileMatch?: ProfileJobMatchDto | null;
  /** Cached recommendation score — historical/fallback only. */
  recommendationScoreFallback?: number | null;
}

export interface PrepareApplicationResult {
  analysis: ApplicationPageAnalysisDto;
  /** @deprecated Prefer profileMatch — recommendation cache snapshot. */
  match: ApplicationMatchSnapshotDto;
  profileMatch?: ProfileJobMatchDto | null;
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

export type SetupSectionId =
  | 'personal'
  | 'work-auth'
  | 'preferences'
  | 'links'
  | 'answers'
  | 'resumes'
  | 'education'
  | 'consents'
  | 'extension';

export interface SetupGapDto {
  code: string;
  label: string;
  section: SetupSectionId;
}

export interface SetupSectionStatusDto {
  id: SetupSectionId;
  label: string;
  complete: boolean;
  required: boolean;
}

export interface SetupStatusDto {
  complete: boolean;
  percent: number;
  readyForAssistedApply: boolean;
  gaps: SetupGapDto[];
  sections: SetupSectionStatusDto[];
}

export type WorkspaceStepId = 'analysis' | 'fit' | 'resume' | 'open' | 'done';

export type WorkspaceStepStatus =
  'COMPLETE' | 'WARNING' | 'UNKNOWN' | 'CURRENT' | 'AVAILABLE' | 'LOCKED';

export interface WorkspaceStepStatusDto {
  id: WorkspaceStepId;
  label: string;
  complete: boolean;
  status?: WorkspaceStepStatus;
}

export interface AssistedApplyWorkspaceDto {
  application: {
    id: string;
    jobId: string | null;
    jobTitle: string | null;
    company: string | null;
    companyName?: string | null;
    workplaceMode?: string | null;
    status: string;
  };
  viewState: string;
  viewLabel: string;
  steps: WorkspaceStepStatusDto[];
  progressStep: WorkspaceStepId | null;
  wasReopened: boolean;
  analysisSummary: { id: string; outcomeStatus: string; analyzedAt: string } | null;
  fit: {
    matchScore: number | null;
    profileMatch?: ProfileJobMatchDto | null;
  } | null;
  resume: { resumeVersionId: string } | null;
  handoff: {
    externalConfirmationUrl: string | null;
    submittedAt: string | null;
    openedAt?: string | null;
  } | null;
}

export interface ProfileMatchEvidenceDto {
  code: string;
  message: string;
  field?: string;
  source?: 'PROFILE' | 'ANSWER_VAULT' | 'JOB' | 'ANALYSIS';
}

export interface ProfileJobMatchDto {
  overallAlignment: number | null;
  eligibility: {
    status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'INFORMATION_REQUIRED';
    blockers: ProfileMatchEvidenceDto[];
  };
  roleMatch: {
    status: 'MATCH' | 'PARTIAL' | 'NO_MATCH' | 'UNKNOWN';
    evidence: ProfileMatchEvidenceDto[];
    jobTitle: string | null;
    desiredRoles: string[];
  };
  skillsMatch: {
    matched: string[];
    missing: string[];
    unknown: string[];
  };
  experienceMatch: {
    requiredYears: number | null;
    candidateYears: number | null;
    status: 'MATCH' | 'GAP' | 'UNKNOWN';
    evidence: ProfileMatchEvidenceDto[];
  };
  locationMatch: {
    status: string;
    evidence: ProfileMatchEvidenceDto[];
    jobRequirement?: unknown;
    candidateRegion: string | null;
  };
  workAuthorizationMatch: {
    status: string;
    evidence: ProfileMatchEvidenceDto[];
    candidateAnswer: string | null;
  };
  sponsorshipMatch: {
    status: string;
    evidence: ProfileMatchEvidenceDto[];
    candidateRequiresSponsorship: boolean | null;
    jobProvidesSponsorship: boolean | null;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: ProfileMatchEvidenceDto[];
  missingInformation: ProfileMatchEvidenceDto[];
  /** Present on newly computed matches; older cached rows may omit. */
  topStrengths?: string[];
  keyGaps?: string[];
  dataSources?: {
    verifiedProfile: boolean;
    answerVault: boolean;
    storedJobData: boolean;
    jobPageAnalysis: boolean;
  };
  recommendationScoreFallback: number | null;
  analysisId: string | null;
  jobId: string;
  matchedAt: string;
  schemaVersion: 1;
}

export interface ResumeAnalysisDto {
  strengths: string[];
  concerns: string[];
  missingEvidence: string[];
  unknowns: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  analyzedAt: string;
  degraded?: boolean;
  cached?: boolean;
  status?: 'COMPLETE' | 'LIMITED' | 'FAILED';
  overallAlignment?: number | null;
  summary?: {
    criteriaAnalyzed: number;
    requiredCriteriaAnalyzed: number;
    criteriaWithEvidence: number;
    criteriaMissingEvidence: number;
    criteriaUnknown: number;
  };
  keywords?: {
    matched: string[];
    missing: string[];
    optional: string[];
  };
  warnings?: Array<{ code: string; message: string }>;
  excludedRequirements?: Array<{ code: string; domain: string; reason: string }>;
  schemaVersion?: number;
  analyzerVersion?: string;
}

export interface ResumeBuilderContextDto {
  jobApplicationId: string;
  selectedResume: {
    approvedResumeVersionId: string | null;
    resumeId: string | null;
    builderVersionId: number | null;
  };
  targetRole: string;
  industry: string | null;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  employmentType: string | null;
  skills: string[];
  jobDescription: string;
  requirements: Array<{
    code: string;
    title: string;
    description: string;
    required: boolean;
    importance: string;
    sourceText: string;
    domain: string;
  }>;
  returnTo: string;
}

export interface HandoffResultDto {
  applyUrl: string;
  openedAt: string;
  viewState: string;
}

export interface PrivacyAcknowledgementDto {
  policyVersion: string;
  acknowledgedAt: string;
}

export interface PrivacyAcknowledgementPayload {
  policyVersion: string;
}
