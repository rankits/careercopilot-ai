import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SubmissionOrchestrationService } from '@/modules/auto-apply/services/submission-orchestration.service.js';
import {
  IJobApplicationRepository,
  IJobApplicationService,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { ISubmissionQueuePort } from '@/modules/auto-apply/contracts/submission-orchestration.contract.js';
import { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';
import { IApplicationRuleRepository } from '@/modules/auto-apply/contracts/application-rule.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { DEFAULT_APPLICATION_RULE } from '@/modules/auto-apply/types/application-rule.types.js';

describe('SubmissionOrchestrationService', () => {
  let jobAppService: IJobApplicationService;
  let jobAppRepo: IJobApplicationRepository;
  let attemptRepo: ISubmissionAttemptRepository;
  let queue: ISubmissionQueuePort;
  let readiness: IApplicationReadinessService;
  let ruleRepo: IApplicationRuleRepository;
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
    matchScore: 0.9,
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

  const readyResult = {
    decision: 'READY' as const,
    ready: true,
    blockingReasons: [],
    warnings: [],
    evaluatedRules: {},
    evaluatedAt: new Date(),
  };

  beforeEach(() => {
    jobAppService = {
      listApplications: vi.fn(),
      getApplication: vi.fn().mockResolvedValue(application),
      initiate: vi.fn(),
      evaluateEligibility: vi.fn(),
      transitionStatus: vi
        .fn()
        .mockImplementation((_userId, _id, toStatus) =>
          Promise.resolve({ ...application, status: toStatus }),
        ),
      withdraw: vi.fn(),
    };
    jobAppRepo = {
      findManyByUserId: vi.fn(),
      findById: vi.fn(),
      findByUserIdAndJobId: vi.fn(),
      findByUserIdAndCanonicalJobId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      updatePlan: vi.fn(),
      claimForSubmission: vi.fn(),
      finalizeSubmission: vi.fn(),
      countConsumedSince: vi.fn().mockResolvedValue(0),
      updateMatchScore: vi.fn(),
      queueAtomically: vi
        .fn()
        .mockImplementation(async () => ({ ...application, status: 'QUEUED' })),
    };
    attemptRepo = {
      countByJobApplicationId: vi.fn(),
      create: vi.fn(),
      findLatest: vi.fn().mockResolvedValue(null),
    };
    queue = { enqueue: vi.fn() };
    readiness = {
      evaluate: vi.fn().mockResolvedValue(readyResult),
    };
    ruleRepo = {
      findByUserId: vi.fn().mockResolvedValue({
        id: 'rule-1',
        userId: 'user-1',
        ...DEFAULT_APPLICATION_RULE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      upsert: vi.fn(),
      setPaused: vi.fn(),
    };

    service = new SubmissionOrchestrationService(
      jobAppService,
      jobAppRepo,
      attemptRepo,
      queue,
      readiness,
      ruleRepo,
    );
  });

  it('rejects approval when readiness is not ready (consent)', async () => {
    vi.mocked(readiness.evaluate).mockResolvedValue({
      ...readyResult,
      ready: false,
      decision: 'CONSENT_REQUIRED',
      blockingReasons: [
        {
          code: 'CONSENT_REQUIRED',
          message: 'Grant consent',
          severity: 'BLOCKING',
        },
      ],
    });

    await expect(service.approve('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({ code: 'READINESS_CONSENT_REQUIRED', statusCode: 403 }),
    );
    expect(jobAppService.transitionStatus).not.toHaveBeenCalled();
  });

  it('approves once readiness passes', async () => {
    await service.approve('user-1', 'jobapp-1');
    expect(readiness.evaluate).toHaveBeenCalledWith(expect.objectContaining({ stage: 'APPROVE' }));
    expect(jobAppService.transitionStatus).toHaveBeenCalledWith('user-1', 'jobapp-1', 'APPROVED');
  });

  it('queues for submission via atomic reservation and publishes', async () => {
    await service.queueForSubmission('user-1', 'jobapp-1');
    expect(readiness.evaluate).toHaveBeenCalledWith(expect.objectContaining({ stage: 'QUEUE' }));
    expect(jobAppRepo.queueAtomically).toHaveBeenCalled();
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

  it('rejects retry when the last attempt outcome was SUBMISSION_OUTCOME_UNKNOWN', async () => {
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

    expect(jobAppRepo.queueAtomically).toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith({ jobApplicationId: 'jobapp-1', userId: 'user-1' });
  });

  it('rolls back QUEUED when queue publish fails', async () => {
    vi.mocked(queue.enqueue).mockRejectedValue(new Error('broker down'));
    await expect(service.queueForSubmission('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({
        code: 'QUEUE_PUBLISH_FAILED',
        statusCode: 503,
        message: "We couldn't queue this application. Try again.",
      }),
    );
    expect(jobAppRepo.updateStatus).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      {
        status: 'APPROVED',
      },
      'QUEUED',
    );
  });

  describe('compensateQueuePublishFailure (AA-011)', () => {
    it('rolls QUEUED back to APPROVED via the guarded updateStatus', async () => {
      vi.mocked(jobAppRepo.updateStatus).mockResolvedValue({
        ...application,
        status: 'APPROVED',
      });

      await service.compensateQueuePublishFailure('user-1', 'jobapp-1', 'APPROVED');

      expect(jobAppRepo.updateStatus).toHaveBeenCalledWith(
        'user-1',
        'jobapp-1',
        { status: 'APPROVED' },
        'QUEUED',
      );
    });

    it('rolls back to SUBMISSION_FAILED when that was the prior status', async () => {
      vi.mocked(jobAppRepo.updateStatus).mockResolvedValue({
        ...application,
        status: 'SUBMISSION_FAILED',
      });

      await service.compensateQueuePublishFailure('user-1', 'jobapp-1', 'SUBMISSION_FAILED');

      expect(jobAppRepo.updateStatus).toHaveBeenCalledWith(
        'user-1',
        'jobapp-1',
        { status: 'SUBMISSION_FAILED' },
        'QUEUED',
      );
    });

    it('treats INVALID_STATUS_TRANSITION as a safe no-op (does not throw)', async () => {
      vi.mocked(jobAppRepo.updateStatus).mockRejectedValue(
        new AppError(
          'This application was already updated. Refresh to see its current state.',
          409,
          'INVALID_STATUS_TRANSITION',
        ),
      );

      await expect(
        service.compensateQueuePublishFailure('user-1', 'jobapp-1', 'APPROVED'),
      ).resolves.toBeUndefined();
    });

    it('publish-failure path still returns QUEUE_PUBLISH_FAILED when compensate is a no-op', async () => {
      vi.mocked(queue.enqueue).mockRejectedValue(new Error('broker down'));
      vi.mocked(jobAppRepo.updateStatus).mockRejectedValue(
        new AppError(
          'This application was already updated. Refresh to see its current state.',
          409,
          'INVALID_STATUS_TRANSITION',
        ),
      );

      await expect(service.queueForSubmission('user-1', 'jobapp-1')).rejects.toMatchObject({
        code: 'QUEUE_PUBLISH_FAILED',
        statusCode: 503,
      });
    });
  });

  it('AA-009: rolls back QUEUED when enqueue throws QueuePublishError (falsy publish path)', async () => {
    const { QueuePublishError } =
      await import('@/modules/auto-apply/errors/queue-publish.error.js');
    vi.mocked(queue.enqueue).mockRejectedValue(
      new QueuePublishError('Broker publish returned failure'),
    );

    await expect(service.queueForSubmission('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({ code: 'QUEUE_PUBLISH_FAILED', statusCode: 503 }),
    );
    expect(jobAppRepo.updateStatus).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      {
        status: 'APPROVED',
      },
      'QUEUED',
    );
  });

  it('AA-009: retry after publish failure behaves as a fresh queue attempt', async () => {
    const { QueuePublishError } =
      await import('@/modules/auto-apply/errors/queue-publish.error.js');
    vi.mocked(queue.enqueue)
      .mockRejectedValueOnce(new QueuePublishError('first fail'))
      .mockResolvedValueOnce(undefined);

    await expect(service.queueForSubmission('user-1', 'jobapp-1')).rejects.toMatchObject({
      code: 'QUEUE_PUBLISH_FAILED',
    });

    const result = await service.queueForSubmission('user-1', 'jobapp-1');
    expect(result.status).toBe('QUEUED');
    expect(queue.enqueue).toHaveBeenCalledTimes(2);
  });
});
