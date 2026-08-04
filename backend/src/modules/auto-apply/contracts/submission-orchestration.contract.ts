import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

export interface ISubmissionQueuePort {
  enqueue(payload: { jobApplicationId: string; userId: string }): Promise<void>;
}

export interface ISubmissionOrchestrationService {
  /** READY_FOR_REVIEW -> APPROVED. Requires an active RESUME_USAGE consent
   * grant — approval is meaningless if Career Copilot isn't authorized to
   * use the selected resume at all (AJA-SEC-001). */
  approve(userId: string, jobApplicationId: string): Promise<JobApplicationDto>;
  /** APPROVED -> QUEUED, then publishes the submission job. */
  queueForSubmission(userId: string, jobApplicationId: string): Promise<JobApplicationDto>;
  /** ACTION_REQUIRED -> SUBMITTED, once the user has completed an
   * externally-handed-off application themselves. */
  confirmCompleted(userId: string, jobApplicationId: string): Promise<JobApplicationDto>;
  /** SUBMISSION_FAILED -> QUEUED, but only when the most recent attempt was
   * classified FAILED_SAFE_TO_RETRY — never for FAILED_DO_NOT_RETRY or
   * SUBMISSION_OUTCOME_UNKNOWN (AJA-PROD-008). */
  retry(userId: string, jobApplicationId: string): Promise<JobApplicationDto>;
}
