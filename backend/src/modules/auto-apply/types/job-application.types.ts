import { EligibilityResult } from '@/modules/auto-apply/types/eligibility.types.js';

export type JobApplicationStatusValue =
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

export type AutoApplyChannelValue =
  'EMAIL' | 'EXTERNAL_MANUAL' | 'ATS_API' | 'BROWSER_ASSISTED' | 'UNSUPPORTED';

export interface JobApplicationDto {
  id: string;
  userId: string;
  jobId: string | null;
  normalisedJobUrl: string | null;
  canonicalJobId: string | null;
  companySlug: string | null;
  jobTitle: string | null;
  channel: AutoApplyChannelValue;
  status: JobApplicationStatusValue;
  approvalMode: 'PER_APPLICATION' | 'BULK_APPROVED' | 'AUTOPILOT';
  matchScore: number | null;
  eligibilityResult: EligibilityResult | null;
  resumeVersionId: string | null;
  coverLetterContent: string | null;
  consentId: string | null;
  approvedAt: Date | null;
  queuedAt: Date | null;
  submittedAt: Date | null;
  externalApplicationId: string | null;
  externalConfirmationUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  planInputsHash: string | null;
  planVersion: number;
  progressStep: string | null;
  reopenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
