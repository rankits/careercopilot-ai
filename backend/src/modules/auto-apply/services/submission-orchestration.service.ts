import { JobApplicationStatus } from '@prisma/client';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import {
  IJobApplicationRepository,
  IJobApplicationService,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import {
  ISubmissionOrchestrationService,
  ISubmissionQueuePort,
} from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';
import { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import {
  JobApplicationDto,
  JobApplicationStatusValue,
} from '@/modules/auto-apply/types/job-application.types.js';
import { DEFAULT_APPLICATION_RULE } from '@/modules/auto-apply/types/application-rule.types.js';
import { assertReadinessReady } from '@/modules/auto-apply/services/application-readiness.service.js';

/**
 * Consent-gating and queue-publishing around APPROVED/QUEUED, backed by
 * the central Application Readiness Gate at APPROVE and QUEUE.
 */
export class SubmissionOrchestrationService implements ISubmissionOrchestrationService {
  constructor(
    private readonly jobApplicationService: IJobApplicationService,
    private readonly jobApplicationRepository: IJobApplicationRepository,
    private readonly submissionAttemptRepository: ISubmissionAttemptRepository,
    private readonly submissionQueue: ISubmissionQueuePort,
    private readonly readinessService: IApplicationReadinessService,
    private readonly ruleRepository: IApplicationRuleRepository,
  ) {}

  async approve(userId: string, jobApplicationId: string): Promise<JobApplicationDto> {
    const application = await this.jobApplicationService.getApplication(userId, jobApplicationId);
    if (!application.jobId) {
      throw new AppError('This submission has no linked platform job.', 400, 'JOB_LINK_REQUIRED');
    }

    const readiness = await this.readinessService.evaluate({
      userId,
      jobId: application.jobId,
      jobApplicationId,
      stage: 'APPROVE',
    });
    assertReadinessReady(readiness, 'APPROVE');

    return this.jobApplicationService.transitionStatus(userId, jobApplicationId, 'APPROVED');
  }

  async queueForSubmission(userId: string, jobApplicationId: string): Promise<JobApplicationDto> {
    const application = await this.jobApplicationService.getApplication(userId, jobApplicationId);
    if (!application.jobId) {
      throw new AppError('This submission has no linked platform job.', 400, 'JOB_LINK_REQUIRED');
    }

    const readiness = await this.readinessService.evaluate({
      userId,
      jobId: application.jobId,
      jobApplicationId,
      stage: 'QUEUE',
    });
    assertReadinessReady(readiness, 'QUEUE');

    const rule = (await this.ruleRepository.findByUserId(userId)) ?? DEFAULT_APPLICATION_RULE;

    const previousStatus = application.status;

    let queued: JobApplicationDto;
    try {
      queued = await this.jobApplicationRepository.queueAtomically(userId, jobApplicationId, {
        dailyLimit: rule.dailyApplicationLimit,
        weeklyLimit: rule.weeklyApplicationLimit,
      });
    } catch (error) {
      throw error;
    }

    try {
      await this.submissionQueue.enqueue({ jobApplicationId, userId });
      logger.info(
        { jobApplicationId, userId, previousStatus, status: 'QUEUED' },
        'Auto-apply submission published to APPLICATION_SUBMIT queue',
      );
    } catch (error) {
      await this.compensateQueuePublishFailure(userId, jobApplicationId, previousStatus);
      throw new AppError(
        "We couldn't queue this application. Try again.",
        503,
        'QUEUE_PUBLISH_FAILED',
        { cause: error instanceof Error ? error.message : 'unknown' },
      );
    }

    return queued;
  }

  /**
   * Compensating rollback after a failed broker publish (AA-011).
   * Not a forward state-machine edge — see compensating-transitions note on
   * `state-machine.util.ts`. Guarded with `expectedStatus: QUEUED` (AA-010).
   * Guard misses are a warned no-op so the original publish failure still surfaces.
   */
  async compensateQueuePublishFailure(
    userId: string,
    jobApplicationId: string,
    previousStatus: JobApplicationStatus | JobApplicationStatusValue,
  ): Promise<void> {
    const toStatus: JobApplicationStatusValue =
      previousStatus === 'SUBMISSION_FAILED' ? 'SUBMISSION_FAILED' : 'APPROVED';

    try {
      await this.jobApplicationRepository.updateStatus(
        userId,
        jobApplicationId,
        { status: toStatus },
        'QUEUED',
      );
      logger.info(
        {
          operation: 'compensateQueuePublishFailure',
          jobApplicationId,
          userId,
          fromStatus: 'QUEUED',
          toStatus,
        },
        'Compensating rollback after queue publish failure',
      );
    } catch (error) {
      if (error instanceof AppError && error.code === 'INVALID_STATUS_TRANSITION') {
        logger.warn(
          {
            operation: 'compensateQueuePublishFailure',
            jobApplicationId,
            userId,
            toStatus,
          },
          'compensateQueuePublishFailure no-op — row no longer QUEUED',
        );
        return;
      }
      if (error instanceof AppError && error.code === 'APPLICATION_NOT_FOUND') {
        logger.warn(
          {
            operation: 'compensateQueuePublishFailure',
            jobApplicationId,
            userId,
          },
          'compensateQueuePublishFailure no-op — application not found',
        );
        return;
      }
      logger.error(
        { err: error, operation: 'compensateQueuePublishFailure', jobApplicationId, userId },
        'Unexpected error during compensateQueuePublishFailure — continuing with publish failure',
      );
    }
  }

  async confirmCompleted(userId: string, jobApplicationId: string): Promise<JobApplicationDto> {
    return this.jobApplicationService.transitionStatus(userId, jobApplicationId, 'SUBMITTED');
  }

  async retry(userId: string, jobApplicationId: string): Promise<JobApplicationDto> {
    const lastAttempt = await this.submissionAttemptRepository.findLatest(jobApplicationId);
    if (!lastAttempt || lastAttempt.outcome !== 'FAILED_SAFE_TO_RETRY') {
      throw new AppError(
        'This submission cannot be retried automatically — only a FAILED_SAFE_TO_RETRY outcome is retryable.',
        409,
        'RETRY_NOT_ALLOWED',
      );
    }
    return this.queueForSubmission(userId, jobApplicationId);
  }
}
