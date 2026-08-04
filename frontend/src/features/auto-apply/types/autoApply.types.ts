export interface BackendSuccessResponse<T> {
  data: T;
  message: string;
  status: 'success';
}

export type RemotePreference = 'REMOTE' | 'HYBRID' | 'ONSITE' | 'ANY';

export interface CandidateApplicationPreferences {
  desiredRoles: string[];
  preferredLocations: string[];
  remotePreference: RemotePreference;
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
  isActive: boolean;
}

export interface CreateResumeVersionPayload {
  resumeId: string;
  label: string;
  category: string;
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

export interface ApplicationPlanResult {
  application: JobApplicationDto;
  decision: ApplicationPlanDecision;
  channel: AutoApplyChannel;
  eligibility: EligibilityResult;
  selectedResumeVersion: ApprovedResumeVersionDto | null;
  unresolvedQuestions: string[];
  contentGenerationAvailable: false;
}
