import { JobApplicationStatus } from '@prisma/client';
import { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { IChannelDetectionJobLookup } from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import {
  IJobApplicationAdapterRegistry,
  SubmissionResult,
} from '@/modules/auto-apply/contracts/adapter.contract.js';
import { IAutoApplyEventService } from '@/modules/auto-apply/contracts/audit-event.contract.js';
import { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import { AutoApplyEventType } from '@/modules/auto-apply/types/audit-event.types.js';
import { READINESS_WORKER_ERROR_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';
import { logger } from '@/shared/logger/logger.js';
import { withTimeout } from '@/shared/utils/withTimeout.js';

const VALIDATE_TIMEOUT_MS = 10_000;
const SUBMIT_TIMEOUT_MS = 30_000;

function eventTypeFor(result: SubmissionResult): AutoApplyEventType {
  if (result.outcome === 'SUCCEEDED') return 'SUBMISSION_SUCCEEDED';
  if (result.outcome === 'SUBMISSION_OUTCOME_UNKNOWN') return 'SUBMISSION_OUTCOME_UNKNOWN';
  return 'SUBMISSION_FAILED';
}

export interface SubmissionJobPayload {
  jobApplicationId: string;
  userId: string;
}

function nextStatusFor(result: SubmissionResult): JobApplicationStatus {
  if (result.outcome === 'SUCCEEDED') {
    return result.requiresUserAction ? 'ACTION_REQUIRED' : 'SUBMITTED';
  }
  if (result.outcome === 'SUBMISSION_OUTCOME_UNKNOWN') return 'ACTION_REQUIRED';
  return 'SUBMISSION_FAILED';
}

/**
 * AJA-QUEUE-001 reliability sequence with central readiness revalidation
 * immediately after claim and before adapter execution.
 */
export class SubmissionProcessingService {
  constructor(
    private readonly jobApplicationRepository: IJobApplicationRepository,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly submissionAttemptRepository: ISubmissionAttemptRepository,
    private readonly jobLookup: IChannelDetectionJobLookup,
    private readonly adapterRegistry: IJobApplicationAdapterRegistry,
    private readonly eventService: IAutoApplyEventService,
    private readonly readinessService: IApplicationReadinessService,
  ) {}

  async processJob(payload: SubmissionJobPayload): Promise<void> {
    const { jobApplicationId, userId } = payload;
    logger.info({ jobApplicationId, userId }, 'Auto-apply submission worker received job');

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

    logger.info(
      { jobApplicationId, userId, channel: claimed.channel, jobId: claimed.jobId },
      'Auto-apply submission claimed — running readiness + adapter',
    );

    if (!claimed.jobId) {
      await this.fail(
        userId,
        jobApplicationId,
        'FAILED_DO_NOT_RETRY',
        'NO_LINKED_JOB',
        'This submission has no linked platform job.',
      );
      return;
    }

    const readiness = await this.readinessService.evaluate({
      userId,
      jobId: claimed.jobId,
      jobApplicationId,
      stage: 'SUBMIT',
    });

    if (!readiness.ready) {
      const errorCode =
        READINESS_WORKER_ERROR_CODES[readiness.decision] ?? 'READINESS_INFORMATION_REQUIRED';
      const message =
        readiness.blockingReasons[0]?.message ??
        `Readiness gate blocked submission: ${readiness.decision}`;
      await this.eventService.record({
        userId,
        eventType: 'SUBMISSION_FAILED',
        jobApplicationId,
        metadata: {
          stage: 'SUBMIT',
          decision: readiness.decision,
          blockingCodes: readiness.blockingReasons.map((r) => r.code),
        },
      });
      await this.fail(
        userId,
        jobApplicationId,
        'FAILED_DO_NOT_RETRY',
        errorCode,
        message,
      );
      return;
    }

    const job = await this.jobLookup.findJobChannelSnapshot(claimed.jobId);
    if (!job || job.status !== 'ACTIVE') {
      await this.fail(
        userId,
        jobApplicationId,
        'FAILED_DO_NOT_RETRY',
        'JOB_NO_LONGER_ACTIVE',
        'The job is no longer active — it may have been filled or removed.',
      );
      return;
    }

    // Consent already revalidated by readiness; keep explicit check as defense-in-depth.
    const hasConsent = await this.consentRepository.findActiveByType(userId, 'RESUME_USAGE');
    if (!hasConsent) {
      await this.fail(
        userId,
        jobApplicationId,
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

    let validation;
    try {
      validation = await withTimeout(
        adapter.validate(prepared),
        VALIDATE_TIMEOUT_MS,
        'adapter.validate',
      );
    } catch (error) {
      await this.fail(
        userId,
        jobApplicationId,
        'FAILED_DO_NOT_RETRY',
        'VALIDATION_FAILED',
        error instanceof Error ? error.message : 'Validation failed',
      );
      return;
    }
    if (!validation.valid) {
      await this.fail(
        userId,
        jobApplicationId,
        'FAILED_DO_NOT_RETRY',
        'VALIDATION_FAILED',
        validation.issues.join('; '),
      );
      return;
    }

    let result: SubmissionResult;
    try {
      result = await withTimeout(adapter.submit(prepared), SUBMIT_TIMEOUT_MS, 'adapter.submit');
    } catch (error) {
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

    await this.eventService.record({
      userId,
      eventType: eventTypeFor(result),
      jobApplicationId,
      metadata: { attemptNumber, channel: claimed.channel },
    });

    logger.info(
      {
        jobApplicationId,
        userId,
        channel: claimed.channel,
        outcome: result.outcome,
        nextStatus: nextStatusFor(result),
        requiresUserAction: result.requiresUserAction ?? false,
      },
      'Auto-apply submission finished',
    );
  }

  private async fail(
    userId: string,
    jobApplicationId: string,
    outcome: 'FAILED_DO_NOT_RETRY' | 'FAILED_SAFE_TO_RETRY',
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    const attemptNumber = await this.createFailureAttemptWithUniqueRetry(
      jobApplicationId,
      outcome,
      errorCode,
      errorMessage,
    );
    await this.jobApplicationRepository.finalizeSubmission(userId, jobApplicationId, {
      status: 'SUBMISSION_FAILED',
      failureCode: errorCode,
      failureMessage: errorMessage,
    });
    await this.eventService.record({
      userId,
      eventType: 'SUBMISSION_FAILED',
      jobApplicationId,
      metadata: { attemptNumber, errorCode },
    });
  }

  /**
   * Mirror the success-path `count + 1` numbering. Retry once on P2002 so a
   * second early failure never leaves the application stuck in SUBMITTING.
   */
  private async createFailureAttemptWithUniqueRetry(
    jobApplicationId: string,
    outcome: 'FAILED_DO_NOT_RETRY' | 'FAILED_SAFE_TO_RETRY',
    errorCode: string,
    errorMessage: string,
  ): Promise<number> {
    let attemptNumber =
      (await this.submissionAttemptRepository.countByJobApplicationId(jobApplicationId)) + 1;
    try {
      await this.submissionAttemptRepository.create({
        jobApplicationId,
        attemptNumber,
        outcome,
        errorCode,
        errorMessage,
      });
      return attemptNumber;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') {
        throw error;
      }
      attemptNumber =
        (await this.submissionAttemptRepository.countByJobApplicationId(jobApplicationId)) + 1;
      await this.submissionAttemptRepository.create({
        jobApplicationId,
        attemptNumber,
        outcome,
        errorCode,
        errorMessage,
      });
      return attemptNumber;
    }
  }
}
