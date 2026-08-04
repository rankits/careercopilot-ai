import { AppError } from '@/shared/utils/errors/AppError.js';
import { IJobApplicationService } from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import {
  ISubmissionOrchestrationService,
  ISubmissionQueuePort,
} from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

/**
 * Sits on top of the already-validated `JobApplicationService` state
 * machine (never duplicates its transition rules) and adds the
 * consent-gating and queue-publishing steps around APPROVED/QUEUED —
 * deliberately a separate service rather than more constructor
 * dependencies bolted onto `JobApplicationService`, so the well-tested
 * planning/eligibility path stays untouched.
 */
export class SubmissionOrchestrationService implements ISubmissionOrchestrationService {
  constructor(
    private readonly jobApplicationService: IJobApplicationService,
    private readonly consentRepository: IApplicationConsentRepository,
    private readonly submissionAttemptRepository: ISubmissionAttemptRepository,
    private readonly submissionQueue: ISubmissionQueuePort,
  ) {}

  async approve(userId: string, jobApplicationId: string): Promise<JobApplicationDto> {
    const hasConsent = await this.consentRepository.findActiveByType(userId, 'RESUME_USAGE');
    if (!hasConsent) {
      throw new AppError(
        'Grant RESUME_USAGE consent before approving an application.',
        403,
        'CONSENT_REQUIRED',
      );
    }
    return this.jobApplicationService.transitionStatus(userId, jobApplicationId, 'APPROVED');
  }

  async queueForSubmission(userId: string, jobApplicationId: string): Promise<JobApplicationDto> {
    const application = await this.jobApplicationService.transitionStatus(
      userId,
      jobApplicationId,
      'QUEUED',
    );
    await this.submissionQueue.enqueue({ jobApplicationId, userId });
    return application;
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
    const application = await this.jobApplicationService.transitionStatus(
      userId,
      jobApplicationId,
      'QUEUED',
    );
    await this.submissionQueue.enqueue({ jobApplicationId, userId });
    return application;
  }
}
