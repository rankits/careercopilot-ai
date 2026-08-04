import { JobApplicationStatus } from '@prisma/client';
import { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { IChannelDetectionJobLookup } from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import {
  IJobApplicationAdapterRegistry,
  SubmissionResult,
} from '@/modules/auto-apply/contracts/adapter.contract.js';
import { logger } from '@/shared/logger/logger.js';

export interface SubmissionJobPayload {
  jobApplicationId: string;
  userId: string;
}

function nextStatusFor(result: SubmissionResult): JobApplicationStatus {
  if (result.outcome === 'SUCCEEDED') {
    return result.requiresUserAction ? 'ACTION_REQUIRED' : 'SUBMITTED';
  }
  // SUBMISSION_OUTCOME_UNKNOWN also lands in ACTION_REQUIRED — it needs a
  // human to investigate, and must never be auto-retried (AJA-PROD-008).
  // FAILED_SAFE_TO_RETRY / FAILED_DO_NOT_RETRY both land in
  // SUBMISSION_FAILED — retry (when actually safe) is a separate, explicit
  // action gated on the recorded attempt's outcome, never automatic.
  if (result.outcome === 'SUBMISSION_OUTCOME_UNKNOWN') return 'ACTION_REQUIRED';
  return 'SUBMISSION_FAILED';
}

/**
 * Implements the reliability sequence from AJA-QUEUE-001: reload + lock →
 * revalidate job/consent → submit once through the adapter registry →
 * store the sanitized response → classify the outcome → never auto-retry
 * an uncertain result. Framework-agnostic (no RabbitMQ import) so it's
 * unit-testable without a live broker or database —
 * `workers/application-submission.worker.ts` is the thin messaging
 * adapter that calls `processJob`.
 */
export class SubmissionProcessingService {
  constructor(
    private readonly jobApplicationRepository: IJobApplicationRepository,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly submissionAttemptRepository: ISubmissionAttemptRepository,
    private readonly jobLookup: IChannelDetectionJobLookup,
    private readonly adapterRegistry: IJobApplicationAdapterRegistry,
  ) {}

  async processJob(payload: SubmissionJobPayload): Promise<void> {
    const { jobApplicationId, userId } = payload;

    const claimed = await this.jobApplicationRepository.claimForSubmission(
      userId,
      jobApplicationId,
    );
    if (!claimed) {
      logger.warn(
        { jobApplicationId },
        'Submission job skipped — application was not in QUEUED state (already processed or invalid redelivery)',
      );
      return;
    }

    if (!claimed.jobId) {
      await this.fail(
        userId,
        jobApplicationId,
        1,
        'FAILED_DO_NOT_RETRY',
        'NO_LINKED_JOB',
        'This submission has no linked platform job.',
      );
      return;
    }

    const job = await this.jobLookup.findJobChannelSnapshot(claimed.jobId);
    if (!job || job.status !== 'ACTIVE') {
      await this.fail(
        userId,
        jobApplicationId,
        1,
        'FAILED_DO_NOT_RETRY',
        'JOB_NO_LONGER_ACTIVE',
        'The job is no longer active — it may have been filled or removed.',
      );
      return;
    }

    const hasConsent = await this.consentRepository.findActiveByType(userId, 'RESUME_USAGE');
    if (!hasConsent) {
      await this.fail(
        userId,
        jobApplicationId,
        1,
        'FAILED_DO_NOT_RETRY',
        'CONSENT_REVOKED',
        'Required consent was revoked before submission could complete.',
      );
      return;
    }

    const adapter = this.adapterRegistry.get(claimed.channel);
    if (!adapter) {
      await this.fail(
        userId,
        jobApplicationId,
        1,
        'FAILED_DO_NOT_RETRY',
        'CHANNEL_UNSUPPORTED',
        `No submission adapter is registered for channel ${claimed.channel}.`,
      );
      return;
    }

    const prepared = {
      jobApplicationId,
      userId,
      jobId: claimed.jobId,
      externalApplyUrl: job.applyUrl ?? undefined,
    };

    const validation = await adapter.validate(prepared);
    if (!validation.valid) {
      await this.fail(
        userId,
        jobApplicationId,
        1,
        'FAILED_DO_NOT_RETRY',
        'VALIDATION_FAILED',
        validation.issues.join('; '),
      );
      return;
    }

    let result: SubmissionResult;
    try {
      result = await adapter.submit(prepared);
    } catch (error) {
      // An exception during submit is exactly the "we don't know if it
      // went through" case — never assume failure and never auto-retry it.
      result = {
        outcome: 'SUBMISSION_OUTCOME_UNKNOWN',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during submission',
      };
    }

    const attemptNumber =
      (await this.submissionAttemptRepository.countByJobApplicationId(jobApplicationId)) + 1;
    await this.submissionAttemptRepository.create({
      jobApplicationId,
      attemptNumber,
      outcome: result.outcome,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      rawResponseSanitized: result.rawResponseSanitized,
    });

    await this.jobApplicationRepository.finalizeSubmission(userId, jobApplicationId, {
      status: nextStatusFor(result),
      externalApplicationId: result.externalApplicationId,
      externalConfirmationUrl: result.externalConfirmationUrl,
      failureCode: result.outcome !== 'SUCCEEDED' ? result.errorCode : undefined,
      failureMessage: result.outcome !== 'SUCCEEDED' ? result.errorMessage : undefined,
      markSubmittedNow: result.outcome === 'SUCCEEDED' && !result.requiresUserAction,
    });
  }

  private async fail(
    userId: string,
    jobApplicationId: string,
    attemptNumber: number,
    outcome: 'FAILED_DO_NOT_RETRY' | 'FAILED_SAFE_TO_RETRY',
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.submissionAttemptRepository.create({
      jobApplicationId,
      attemptNumber,
      outcome,
      errorCode,
      errorMessage,
    });
    await this.jobApplicationRepository.finalizeSubmission(userId, jobApplicationId, {
      status: 'SUBMISSION_FAILED',
      failureCode: errorCode,
      failureMessage: errorMessage,
    });
  }
}
