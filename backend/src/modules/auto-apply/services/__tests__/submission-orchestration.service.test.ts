import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SubmissionOrchestrationService } from '@/modules/auto-apply/services/submission-orchestration.service.js';
import { IJobApplicationService } from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { ISubmissionQueuePort } from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { ApplicationConsentDto } from '@/modules/auto-apply/types/application-consent.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

describe('SubmissionOrchestrationService', () => {
  let jobAppService: IJobApplicationService;
  let consentRepo: IApplicationConsentRepository;
  let attemptRepo: ISubmissionAttemptRepository;
  let queue: ISubmissionQueuePort;
  let service: SubmissionOrchestrationService;

  const application: JobApplicationDto = {
    id: 'jobapp-1',
    userId: 'user-1',
    jobId: 'job-1',
    normalisedJobUrl: null,
    canonicalJobId: null,
    companySlug: null,
    jobTitle: null,
    channel: 'EXTERNAL_MANUAL',
    status: 'READY_FOR_REVIEW',
    approvalMode: 'PER_APPLICATION',
    matchScore: null,
    eligibilityResult: null,
    resumeVersionId: null,
    coverLetterContent: null,
    consentId: null,
    approvedAt: null,
    queuedAt: null,
    submittedAt: null,
    externalApplicationId: null,
    externalConfirmationUrl: null,
    failureCode: null,
    failureMessage: null,
    planInputsHash: null,
    planVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const consent: ApplicationConsentDto = {
    id: 'consent-1',
    userId: 'user-1',
    consentType: 'RESUME_USAGE',
    version: 1,
    grantedAt: new Date(),
    revokedAt: null,
  };

  beforeEach(() => {
    jobAppService = {
      listApplications: vi.fn(),
      getApplication: vi.fn(),
      initiate: vi.fn(),
      evaluateEligibility: vi.fn(),
      transitionStatus: vi
        .fn()
        .mockImplementation((_userId, _id, toStatus) =>
          Promise.resolve({ ...application, status: toStatus }),
        ),
      withdraw: vi.fn(),
    };
    consentRepo = {
      findManyByUserId: vi.fn(),
      findActiveByType: vi.fn().mockResolvedValue(consent),
      findById: vi.fn(),
      grant: vi.fn(),
      revoke: vi.fn(),
    };
    attemptRepo = {
      countByJobApplicationId: vi.fn(),
      create: vi.fn(),
      findLatest: vi.fn().mockResolvedValue(null),
    };
    queue = { enqueue: vi.fn() };

    service = new SubmissionOrchestrationService(jobAppService, consentRepo, attemptRepo, queue);
  });

  it('rejects approval without an active RESUME_USAGE consent grant', async () => {
    vi.mocked(consentRepo.findActiveByType).mockResolvedValue(null);

    await expect(service.approve('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({ code: 'CONSENT_REQUIRED', statusCode: 403 }),
    );
    expect(jobAppService.transitionStatus).not.toHaveBeenCalled();
  });

  it('approves once consent is granted', async () => {
    await service.approve('user-1', 'jobapp-1');
    expect(jobAppService.transitionStatus).toHaveBeenCalledWith('user-1', 'jobapp-1', 'APPROVED');
  });

  it('queues for submission and publishes to the queue', async () => {
    await service.queueForSubmission('user-1', 'jobapp-1');
    expect(jobAppService.transitionStatus).toHaveBeenCalledWith('user-1', 'jobapp-1', 'QUEUED');
    expect(queue.enqueue).toHaveBeenCalledWith({ jobApplicationId: 'jobapp-1', userId: 'user-1' });
  });

  it('confirms a manually-completed application as SUBMITTED', async () => {
    await service.confirmCompleted('user-1', 'jobapp-1');
    expect(jobAppService.transitionStatus).toHaveBeenCalledWith('user-1', 'jobapp-1', 'SUBMITTED');
  });

  it('rejects retry when there is no prior attempt', async () => {
    await expect(service.retry('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({ code: 'RETRY_NOT_ALLOWED', statusCode: 409 }),
    );
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('rejects retry when the last attempt was FAILED_DO_NOT_RETRY', async () => {
    vi.mocked(attemptRepo.findLatest).mockResolvedValue({
      id: 'attempt-1',
      jobApplicationId: 'jobapp-1',
      attemptNumber: 1,
      outcome: 'FAILED_DO_NOT_RETRY',
      errorCode: 'VALIDATION_FAILED',
      errorMessage: 'bad',
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await expect(service.retry('user-1', 'jobapp-1')).rejects.toThrow(
      new AppError(
        'This submission cannot be retried automatically — only a FAILED_SAFE_TO_RETRY outcome is retryable.',
        409,
        'RETRY_NOT_ALLOWED',
      ),
    );
  });

  it('rejects retry when the last attempt outcome was SUBMISSION_OUTCOME_UNKNOWN (never auto-retry an uncertain result)', async () => {
    vi.mocked(attemptRepo.findLatest).mockResolvedValue({
      id: 'attempt-1',
      jobApplicationId: 'jobapp-1',
      attemptNumber: 1,
      outcome: 'SUBMISSION_OUTCOME_UNKNOWN',
      errorCode: null,
      errorMessage: 'timeout',
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await expect(service.retry('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({ code: 'RETRY_NOT_ALLOWED' }),
    );
  });

  it('allows retry and re-queues when the last attempt was FAILED_SAFE_TO_RETRY', async () => {
    vi.mocked(attemptRepo.findLatest).mockResolvedValue({
      id: 'attempt-1',
      jobApplicationId: 'jobapp-1',
      attemptNumber: 1,
      outcome: 'FAILED_SAFE_TO_RETRY',
      errorCode: 'RATE_LIMITED',
      errorMessage: 'too many requests',
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await service.retry('user-1', 'jobapp-1');

    expect(jobAppService.transitionStatus).toHaveBeenCalledWith('user-1', 'jobapp-1', 'QUEUED');
    expect(queue.enqueue).toHaveBeenCalledWith({ jobApplicationId: 'jobapp-1', userId: 'user-1' });
  });
});
