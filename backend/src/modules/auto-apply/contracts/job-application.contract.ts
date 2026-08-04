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
}
