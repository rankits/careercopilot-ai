import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SubmissionProcessingService } from '@/modules/auto-apply/services/submission-processing.service.js';
import { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ISubmissionAttemptRepository } from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import { IChannelDetectionJobLookup } from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import {
  IJobApplicationAdapterRegistry,
  JobApplicationAdapter,
} from '@/modules/auto-apply/contracts/adapter.contract.js';
import { IAutoApplyEventService } from '@/modules/auto-apply/contracts/audit-event.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { ApplicationConsentDto } from '@/modules/auto-apply/types/application-consent.types.js';

describe('SubmissionProcessingService', () => {
  let jobAppRepo: IJobApplicationRepository;
  let consentRepo: IApplicationConsentRepository;
  let attemptRepo: ISubmissionAttemptRepository;
  let jobLookup: IChannelDetectionJobLookup;
  let adapterRegistry: IJobApplicationAdapterRegistry;
  let mockAdapter: JobApplicationAdapter;
  let eventService: IAutoApplyEventService;
  let service: SubmissionProcessingService;

  const claimedApplication: JobApplicationDto = {
    id: 'jobapp-1',
    userId: 'user-1',
    jobId: 'job-1',
    normalisedJobUrl: null,
    canonicalJobId: 'canonical-1',
    companySlug: 'acme',
    jobTitle: 'Backend Engineer',
    channel: 'EXTERNAL_MANUAL',
    status: 'SUBMITTING',
    approvalMode: 'PER_APPLICATION',
    matchScore: null,
    eligibilityResult: null,
    resumeVersionId: 'version-1',
    coverLetterContent: null,
    consentId: null,
    approvedAt: new Date(),
    queuedAt: new Date(),
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

  const activeConsent: ApplicationConsentDto = {
    id: 'consent-1',
    userId: 'user-1',
    consentType: 'RESUME_USAGE',
    version: 1,
    grantedAt: new Date(),
    revokedAt: null,
  };

  beforeEach(() => {
    jobAppRepo = {
      findManyByUserId: vi.fn(),
      findById: vi.fn(),
      findByUserIdAndJobId: vi.fn(),
      findByUserIdAndCanonicalJobId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      updatePlan: vi.fn(),
      claimForSubmission: vi.fn().mockResolvedValue(claimedApplication),
      finalizeSubmission: vi
        .fn()
        .mockImplementation((_userId, _id, data) =>
          Promise.resolve({ ...claimedApplication, status: data.status }),
        ),
      countConsumedSince: vi.fn().mockResolvedValue(0),
      updateMatchScore: vi.fn(),
      queueAtomically: vi.fn(),
    };
    consentRepo = {
      findManyByUserId: vi.fn(),
      findActiveByType: vi.fn().mockResolvedValue(activeConsent),
      findById: vi.fn(),
      grant: vi.fn(),
      revoke: vi.fn(),
    };
    attemptRepo = {
      countByJobApplicationId: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({
        id: 'attempt-1',
        jobApplicationId: 'jobapp-1',
        attemptNumber: 1,
        outcome: 'SUCCEEDED',
        errorCode: null,
        errorMessage: null,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
      findLatest: vi.fn(),
    };
    jobLookup = {
      findJobChannelSnapshot: vi.fn().mockResolvedValue({
        id: 'job-1',
        status: 'ACTIVE',
        applyUrl: 'https://acme.com/apply',
      }),
    };
    mockAdapter = {
      channel: 'EXTERNAL_MANUAL',
      provider: 'external-redirect',
      validate: vi.fn().mockResolvedValue({ valid: true, issues: [] }),
      submit: vi.fn().mockResolvedValue({
        outcome: 'SUCCEEDED',
        requiresUserAction: true,
        externalConfirmationUrl: 'https://acme.com/apply',
      }),
    };
    adapterRegistry = { get: vi.fn().mockReturnValue(mockAdapter) };
    eventService = { record: vi.fn().mockResolvedValue(undefined), listForUser: vi.fn() };

    const readinessService = {
      evaluate: vi.fn().mockResolvedValue({
        decision: 'READY',
        ready: true,
        blockingReasons: [],
        warnings: [],
        evaluatedRules: {},
        evaluatedAt: new Date(),
      }),
    };

    service = new SubmissionProcessingService(
      jobAppRepo,
      consentRepo,
      attemptRepo,
      jobLookup,
      adapterRegistry,
      eventService,
      readinessService,
    );
  });

  it('skips processing (idempotent no-op) when the application is not claimable', async () => {
    vi.mocked(jobAppRepo.claimForSubmission).mockResolvedValue(null);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobLookup.findJobChannelSnapshot).not.toHaveBeenCalled();
    expect(jobAppRepo.finalizeSubmission).not.toHaveBeenCalled();
    expect(eventService.record).not.toHaveBeenCalled();
  });

  it('finalizes as ACTION_REQUIRED for a successful hand-off that needs user action', async () => {
    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'ACTION_REQUIRED' }),
      'SUBMITTING',
    );
    expect(eventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        jobApplicationId: 'jobapp-1',
        eventType: 'SUBMISSION_SUCCEEDED',
      }),
    );
  });

  it('finalizes as SUBMITTED for a channel that truly completes on its own', async () => {
    vi.mocked(mockAdapter.submit).mockResolvedValue({
      outcome: 'SUCCEEDED',
      requiresUserAction: false,
      externalApplicationId: 'ext-123',
    });

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMITTED', markSubmittedNow: true }),
      'SUBMITTING',
    );
  });

  it('fails without submitting when the job is no longer active', async () => {
    vi.mocked(jobLookup.findJobChannelSnapshot).mockResolvedValue({
      id: 'job-1',
      status: 'CLOSED',
      applyUrl: 'https://acme.com/apply',
    });

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(mockAdapter.submit).not.toHaveBeenCalled();
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED', failureCode: 'JOB_NO_LONGER_ACTIVE' }),
      'SUBMITTING',
    );
    expect(eventService.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SUBMISSION_FAILED' }),
    );
  });

  it('fails without submitting when consent has been revoked since approval', async () => {
    vi.mocked(consentRepo.findActiveByType).mockResolvedValue(null);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(mockAdapter.submit).not.toHaveBeenCalled();
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ failureCode: 'CONSENT_REVOKED' }),
      'SUBMITTING',
    );
  });

  it('fails cleanly when no adapter is registered for the channel', async () => {
    vi.mocked(adapterRegistry.get).mockReturnValue(null);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ failureCode: 'CHANNEL_UNSUPPORTED' }),
      'SUBMITTING',
    );
  });

  it('fails when adapter validation rejects the prepared application', async () => {
    vi.mocked(mockAdapter.validate).mockResolvedValue({ valid: false, issues: ['No apply URL'] });

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(mockAdapter.submit).not.toHaveBeenCalled();
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ failureCode: 'VALIDATION_FAILED' }),
      'SUBMITTING',
    );
  });

  it('never assumes failure on a submit exception — classifies as SUBMISSION_OUTCOME_UNKNOWN and routes to ACTION_REQUIRED, never auto-retried', async () => {
    vi.mocked(mockAdapter.submit).mockRejectedValue(new Error('socket hang up'));

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'SUBMISSION_OUTCOME_UNKNOWN' }),
    );
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'ACTION_REQUIRED' }),
      'SUBMITTING',
    );
    expect(eventService.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'SUBMISSION_OUTCOME_UNKNOWN' }),
    );
  });

  it('AJA-PERF-001: a hung submit() call past the latency budget is classified SUBMISSION_OUTCOME_UNKNOWN, never a false failure', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(mockAdapter.submit).mockImplementation(
        () => new Promise(() => undefined), // never resolves — simulates a hung network call
      );

      const processing = service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });
      await vi.advanceTimersByTimeAsync(30_000); // fast-forwards past SUBMIT_TIMEOUT_MS without a real wait
      await processing;

      expect(attemptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'SUBMISSION_OUTCOME_UNKNOWN' }),
      );
      expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
        'user-1',
        'jobapp-1',
        expect.objectContaining({ status: 'ACTION_REQUIRED' }),
        'SUBMITTING',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('records an incrementing attempt number based on prior attempts', async () => {
    vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValue(2);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.create).toHaveBeenCalledWith(expect.objectContaining({ attemptNumber: 3 }));
  });

  it('AA-005: early failure uses count+1 (not hardcoded 1) and finalizes SUBMISSION_FAILED', async () => {
    vi.mocked(consentRepo.findActiveByType).mockResolvedValue(null);
    vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValue(0);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.countByJobApplicationId).toHaveBeenCalledWith('jobapp-1');
    expect(attemptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 1, errorCode: 'CONSENT_REVOKED' }),
    );
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED' }),
      'SUBMITTING',
    );
    expect(eventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SUBMISSION_FAILED',
        metadata: expect.objectContaining({ attemptNumber: 1, errorCode: 'CONSENT_REVOKED' }),
      }),
    );
  });

  it('AA-005: fail early twice with a prior attempt row does not get stuck in SUBMITTING', async () => {
    vi.mocked(consentRepo.findActiveByType).mockResolvedValue(null);

    // First early failure — no prior attempts.
    vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValueOnce(0);
    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });
    expect(attemptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 1, errorCode: 'CONSENT_REVOKED' }),
    );
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED' }),
      'SUBMITTING',
    );

    // Second early failure after re-claim — prior attempt #1 already exists.
    vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValueOnce(1);
    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 2, errorCode: 'CONSENT_REVOKED' }),
    );
    expect(jobAppRepo.finalizeSubmission).toHaveBeenLastCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED', failureCode: 'CONSENT_REVOKED' }),
      'SUBMITTING',
    );
    expect(eventService.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'SUBMISSION_FAILED',
        metadata: expect.objectContaining({ attemptNumber: 2 }),
      }),
    );
    // Never left without finalize after the second failure.
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledTimes(2);
  });

  it('AA-005: third+ early failure inserts attemptNumber 3 and finalizes SUBMISSION_FAILED', async () => {
    vi.mocked(jobLookup.findJobChannelSnapshot).mockResolvedValue({
      id: 'job-1',
      status: 'CLOSED',
      applyUrl: 'https://acme.com/apply',
    });
    vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValue(2);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 3, errorCode: 'JOB_NO_LONGER_ACTIVE' }),
    );
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED' }),
      'SUBMITTING',
    );
  });

  it('AA-005: P2002 on attempt insert is retried once and succeeds', async () => {
    vi.mocked(consentRepo.findActiveByType).mockResolvedValue(null);
    vi.mocked(attemptRepo.countByJobApplicationId)
      .mockResolvedValueOnce(1) // first count → attempt 2
      .mockResolvedValueOnce(2); // recount after P2002 → attempt 3
    vi.mocked(attemptRepo.create)
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({
        id: 'attempt-3',
        jobApplicationId: 'jobapp-1',
        attemptNumber: 3,
        outcome: 'FAILED_DO_NOT_RETRY',
        errorCode: 'CONSENT_REVOKED',
        errorMessage: 'Required consent was revoked before submission could complete.',
        startedAt: new Date(),
        completedAt: new Date(),
      });

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.create).toHaveBeenCalledTimes(2);
    expect(attemptRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ attemptNumber: 2 }),
    );
    expect(attemptRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ attemptNumber: 3 }),
    );
    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED' }),
      'SUBMITTING',
    );
    expect(eventService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SUBMISSION_FAILED',
        metadata: expect.objectContaining({ attemptNumber: 3 }),
      }),
    );
  });

  it('routes FAILED_SAFE_TO_RETRY and FAILED_DO_NOT_RETRY both to SUBMISSION_FAILED (retry is a separate explicit action)', async () => {
    vi.mocked(mockAdapter.submit).mockResolvedValue({
      outcome: 'FAILED_SAFE_TO_RETRY',
      errorCode: 'RATE_LIMITED',
      errorMessage: 'Too many requests',
    });

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'SUBMISSION_FAILED' }),
      'SUBMITTING',
    );
  });

  describe('failure injection: concurrent / redelivered processing (AJA-QA-003)', () => {
    it('processes a redelivered message exactly once — the second delivery is a safe no-op, never a duplicate submission', async () => {
      // First delivery claims and processes normally.
      await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });
      expect(mockAdapter.submit).toHaveBeenCalledTimes(1);

      // RabbitMQ redelivers the same message (e.g. after a slow ack) —
      // the application is no longer QUEUED, so the atomic claim fails.
      vi.mocked(jobAppRepo.claimForSubmission).mockResolvedValue(null);
      await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

      // No second submit, no second attempt log, no second finalize.
      expect(mockAdapter.submit).toHaveBeenCalledTimes(1);
      expect(attemptRepo.create).toHaveBeenCalledTimes(1);
      expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledTimes(1);
    });

    it('two workers racing on the same message: only the one that wins the atomic claim submits', async () => {
      // Simulates worker A and worker B both picking up the same job
      // concurrently — the DB's conditional update means only one
      // `claimForSubmission` call can ever return non-null for a given
      // QUEUED row, regardless of which worker asks first.
      vi.mocked(jobAppRepo.claimForSubmission)
        .mockResolvedValueOnce(claimedApplication) // worker A wins
        .mockResolvedValueOnce(null); // worker B loses

      await Promise.all([
        service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' }),
        service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' }),
      ]);

      expect(mockAdapter.submit).toHaveBeenCalledTimes(1);
    });
  });
});
