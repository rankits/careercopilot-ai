import { JobApplicationStatus } from '@prisma/client';
import {
  AutoApplyChannelValue,
  JobApplicationDto,
  JobApplicationStatusValue,
} from '@/modules/auto-apply/types/job-application.types.js';
import { EligibilityResult } from '@/modules/auto-apply/types/eligibility.types.js';

export interface UpdateJobApplicationStatusData {
  status: JobApplicationStatusValue;
  eligibilityResult?: EligibilityResult;
}

export interface CreateJobApplicationData {
  userId: string;
  jobId: string;
  canonicalJobId: string;
  companySlug: string;
  jobTitle: string;
}

export interface UpdatePlanData {
  channel: AutoApplyChannelValue;
  resumeVersionId: string | null;
  planInputsHash: string;
  coverLetterContent?: string | null;
}

export interface FinalizeSubmissionData {
  status: JobApplicationStatusValue;
  externalApplicationId?: string;
  externalConfirmationUrl?: string;
  failureCode?: string;
  failureMessage?: string;
  markSubmittedNow?: boolean;
}

export interface IJobApplicationRepository {
  findManyByUserId(userId: string): Promise<JobApplicationDto[]>;
  findById(userId: string, id: string): Promise<JobApplicationDto | null>;
  findByUserIdAndJobId(userId: string, jobId: string): Promise<JobApplicationDto | null>;
  findByUserIdAndCanonicalJobId(
    userId: string,
    canonicalJobId: string,
  ): Promise<JobApplicationDto | null>;
  create(data: CreateJobApplicationData): Promise<JobApplicationDto>;
  updateStatus(
    userId: string,
    id: string,
    data: UpdateJobApplicationStatusData,
  ): Promise<JobApplicationDto>;
  /** Persists planner output (channel, selected resume, inputs hash) —
   * bumps `planVersion` only when `planInputsHash` actually changes from
   * the stored value, so it reflects meaningful regenerations rather than
   * every idempotent re-poll. Never itself changes `status`. */
  updatePlan(userId: string, id: string, data: UpdatePlanData): Promise<JobApplicationDto>;
  /** Atomically claims a QUEUED application for processing by moving it to
   * SUBMITTING — the worker's locking mechanism. Returns null (no-op) if
   * the application isn't currently QUEUED, so redelivered/duplicate queue
   * messages never double-process the same submission. */
  claimForSubmission(userId: string, id: string): Promise<JobApplicationDto | null>;
  /** Writes the final outcome of a submission attempt (status + external
   * ids/failure info). Called exactly once per attempt by the submission
   * processing service, after the attempt has already been logged. */
  finalizeSubmission(
    userId: string,
    id: string,
    data: FinalizeSubmissionData,
  ): Promise<JobApplicationDto>;
  /** Counts submissions in consumed statuses (queued/submitting/submitted/…)
   * created or queued since `since` — used by the readiness limit gate. */
  countConsumedSince(userId: string, since: Date): Promise<number>;
  /** Persists a trusted match score snapshot used by the readiness gate. */
  updateMatchScore(userId: string, id: string, matchScore: number): Promise<JobApplicationDto>;
  /**
   * Atomically re-checks daily/weekly consumed counts under a row lock on
   * the user's ApplicationRule, then transitions APPROVED|SUBMISSION_FAILED → QUEUED.
   * Throws LIMIT_REACHED / INVALID_STATUS_TRANSITION / APPLICATION_NOT_FOUND.
   */
  queueAtomically(
    userId: string,
    id: string,
    limits: { dailyLimit: number; weeklyLimit: number | null },
  ): Promise<JobApplicationDto>;
  delete(userId: string, id: string): Promise<boolean>;
  /** Resets a withdrawn submission so the same job can be applied again. */
  reopenFromWithdrawn(userId: string, id: string): Promise<JobApplicationDto>;
}

export interface InitiateJobApplicationResult {
  application: JobApplicationDto;
  /** Fuzzy company+title matches among the caller's other active
   * submissions — a warning, never a block (AJA-PROD-007 / AJA-DATA-003). */
  possibleDuplicates: JobApplicationDto[];
}

export interface IJobApplicationService {
  listApplications(userId: string): Promise<JobApplicationDto[]>;
  getApplication(userId: string, id: string): Promise<JobApplicationDto>;
  initiate(userId: string, jobId: string): Promise<InitiateJobApplicationResult>;
  evaluateEligibility(userId: string, id: string): Promise<JobApplicationDto>;
  transitionStatus(
    userId: string,
    id: string,
    toStatus: JobApplicationStatus,
  ): Promise<JobApplicationDto>;
  withdraw(userId: string, id: string): Promise<JobApplicationDto>;
  delete(userId: string, id: string): Promise<boolean>;
  reopen(userId: string, id: string): Promise<JobApplicationDto>;
}
