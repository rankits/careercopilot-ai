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
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { ApplicationConsentDto } from '@/modules/auto-apply/types/application-consent.types.js';

describe('SubmissionProcessingService', () => {
  let jobAppRepo: IJobApplicationRepository;
  let consentRepo: IApplicationConsentRepository;
  let attemptRepo: ISubmissionAttemptRepository;
  let jobLookup: IChannelDetectionJobLookup;
  let adapterRegistry: IJobApplicationAdapterRegistry;
  let mockAdapter: JobApplicationAdapter;
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

    service = new SubmissionProcessingService(
      jobAppRepo,
      consentRepo,
      attemptRepo,
      jobLookup,
      adapterRegistry,
    );
  });

  it('skips processing (idempotent no-op) when the application is not claimable', async () => {
    vi.mocked(jobAppRepo.claimForSubmission).mockResolvedValue(null);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobLookup.findJobChannelSnapshot).not.toHaveBeenCalled();
    expect(jobAppRepo.finalizeSubmission).not.toHaveBeenCalled();
  });

  it('finalizes as ACTION_REQUIRED for a successful hand-off that needs user action', async () => {
    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'ACTION_REQUIRED' }),
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
    );
  });

  it('fails cleanly when no adapter is registered for the channel', async () => {
    vi.mocked(adapterRegistry.get).mockReturnValue(null);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(jobAppRepo.finalizeSubmission).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ failureCode: 'CHANNEL_UNSUPPORTED' }),
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
    );
  });

  it('records an incrementing attempt number based on prior attempts', async () => {
    vi.mocked(attemptRepo.countByJobApplicationId).mockResolvedValue(2);

    await service.processJob({ jobApplicationId: 'jobapp-1', userId: 'user-1' });

    expect(attemptRepo.create).toHaveBeenCalledWith(expect.objectContaining({ attemptNumber: 3 }));
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
    );
  });
});
