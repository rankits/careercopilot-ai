import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JobApplicationService } from '@/modules/auto-apply/services/job-application.service.js';
import { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import {
  IEligibilityService,
  IJobEligibilityLookup,
  JobEligibilitySnapshot,
} from '@/modules/auto-apply/contracts/eligibility.contract.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

describe('JobApplicationService', () => {
  let mockRepo: IJobApplicationRepository;
  let mockEligibility: IEligibilityService;
  let mockJobLookup: IJobEligibilityLookup;
  let service: JobApplicationService;

  const jobSnapshot: JobEligibilitySnapshot = {
    id: 'job-1',
    title: 'Backend Engineer',
    companySlug: 'acme',
    remoteType: 'REMOTE',
    salaryMax: 150000,
    status: 'ACTIVE',
    sourceProviders: ['GREENHOUSE'],
    canonicalJobId: 'canonical-hash-1',
  };

  const baseApplication: JobApplicationDto = {
    id: 'jobapp-1',
    userId: 'user-1',
    jobId: 'job-1',
    normalisedJobUrl: null,
    canonicalJobId: 'canonical-hash-1',
    companySlug: 'acme',
    jobTitle: 'Backend Engineer',
    channel: 'UNSUPPORTED',
    status: 'DISCOVERED',
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

  beforeEach(() => {
    mockRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(baseApplication),
      findByUserIdAndJobId: vi.fn().mockResolvedValue(null),
      findByUserIdAndCanonicalJobId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(baseApplication),
      updateStatus: vi.fn().mockImplementation((_userId, _id, data) =>
        Promise.resolve({
          ...baseApplication,
          status: data.status,
          eligibilityResult: data.eligibilityResult ?? null,
        }),
      ),
      updatePlan: vi.fn().mockImplementation((_userId, _id, data) =>
        Promise.resolve({
          ...baseApplication,
          channel: data.channel,
          resumeVersionId: data.resumeVersionId,
          planInputsHash: data.planInputsHash,
        }),
      ),
      claimForSubmission: vi.fn().mockResolvedValue({ ...baseApplication, status: 'SUBMITTING' }),
      finalizeSubmission: vi
        .fn()
        .mockImplementation((_userId, _id, data) =>
          Promise.resolve({ ...baseApplication, status: data.status }),
        ),
      countConsumedSince: vi.fn().mockResolvedValue(0),
      updateMatchScore: vi.fn().mockResolvedValue(baseApplication),
      queueAtomically: vi.fn().mockResolvedValue({ ...baseApplication, status: 'QUEUED' }),
      delete: vi.fn().mockResolvedValue(true),
      reopenFromWithdrawn: vi
        .fn()
        .mockResolvedValue({ ...baseApplication, status: 'DISCOVERED', planVersion: 2 }),
    };
    mockEligibility = {
      evaluateForJob: vi.fn().mockResolvedValue({ eligible: true, checks: [] }),
    };
    mockJobLookup = { findJobSnapshot: vi.fn().mockResolvedValue(jobSnapshot) };
    service = new JobApplicationService(mockRepo, mockEligibility, mockJobLookup);
  });

  it('rejects initiating a submission for a job that does not exist', async () => {
    vi.mocked(mockJobLookup.findJobSnapshot).mockResolvedValue(null);

    await expect(service.initiate('user-1', 'missing-job')).rejects.toThrow(
      expect.objectContaining({ code: 'JOB_NOT_FOUND', statusCode: 404 }),
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('blocks initiating a duplicate submission for the exact same job (hard check)', async () => {
    vi.mocked(mockRepo.findByUserIdAndJobId).mockResolvedValue(baseApplication);

    await expect(service.initiate('user-1', 'job-1')).rejects.toThrow(
      expect.objectContaining({ code: 'APPLICATION_EXISTS', statusCode: 409 }),
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('reopens a withdrawn submission instead of blocking initiate', async () => {
    vi.mocked(mockRepo.findByUserIdAndJobId).mockResolvedValue({
      ...baseApplication,
      status: 'WITHDRAWN',
    });

    const result = await service.initiate('user-1', 'job-1');
    expect(mockRepo.reopenFromWithdrawn).toHaveBeenCalledWith('user-1', 'jobapp-1');
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(result.application.status).toBe('DISCOVERED');
  });

  it('blocks initiating a submission that matches an existing canonical job id (hard check)', async () => {
    vi.mocked(mockRepo.findByUserIdAndCanonicalJobId).mockResolvedValue(baseApplication);

    await expect(service.initiate('user-1', 'job-2-same-posting')).rejects.toThrow(
      expect.objectContaining({ code: 'APPLICATION_EXISTS', statusCode: 409 }),
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('creates a new submission with the job snapshot when no duplicate exists', async () => {
    const result = await service.initiate('user-1', 'job-1');
    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      jobId: 'job-1',
      canonicalJobId: 'canonical-hash-1',
      companySlug: 'acme',
      jobTitle: 'Backend Engineer',
    });
    expect(result.application).toEqual(baseApplication);
    expect(result.possibleDuplicates).toEqual([]);
  });

  it('surfaces a fuzzy company+title match as a warning without blocking creation', async () => {
    const fuzzyMatch: JobApplicationDto = {
      ...baseApplication,
      id: 'jobapp-2',
      jobId: 'job-2',
      companySlug: 'acme-inc',
      jobTitle: 'Backend Engineer (Remote)',
    };
    vi.mocked(mockRepo.findManyByUserId).mockResolvedValue([fuzzyMatch]);

    const result = await service.initiate('user-1', 'job-1');
    expect(mockRepo.create).toHaveBeenCalled();
    expect(result.possibleDuplicates).toEqual([fuzzyMatch]);
  });

  it('does not flag a withdrawn submission as a fuzzy duplicate', async () => {
    const withdrawn: JobApplicationDto = {
      ...baseApplication,
      id: 'jobapp-2',
      jobId: 'job-2',
      status: 'WITHDRAWN',
    };
    vi.mocked(mockRepo.findManyByUserId).mockResolvedValue([withdrawn]);

    const result = await service.initiate('user-1', 'job-1');
    expect(result.possibleDuplicates).toEqual([]);
  });

  it('moves DISCOVERED to MATCHED when eligibility passes', async () => {
    const result = await service.evaluateEligibility('user-1', 'jobapp-1');
    expect(result.status).toBe('MATCHED');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ status: 'MATCHED' }),
      'DISCOVERED',
    );
  });

  it('moves DISCOVERED to NOT_ELIGIBLE when eligibility fails, never fabricating MATCHED', async () => {
    vi.mocked(mockEligibility.evaluateForJob).mockResolvedValue({
      eligible: false,
      checks: [{ check: 'JOB_ACTIVE', status: 'FAILED', reason: 'closed' }],
    });

    const result = await service.evaluateEligibility('user-1', 'jobapp-1');
    expect(result.status).toBe('NOT_ELIGIBLE');
  });

  it('rejects evaluating eligibility on a submission with no linked job', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({ ...baseApplication, jobId: null });

    await expect(service.evaluateEligibility('user-1', 'jobapp-1')).rejects.toThrow(
      expect.objectContaining({ code: 'JOB_LINK_REQUIRED' }),
    );
  });

  it('rejects an invalid status transition (skipping straight to SUBMITTED)', async () => {
    await expect(service.transitionStatus('user-1', 'jobapp-1', 'SUBMITTED')).rejects.toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION', statusCode: 409 }),
    );
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('allows a valid status transition', async () => {
    await service.transitionStatus('user-1', 'jobapp-1', 'MATCHED');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      { status: 'MATCHED' },
      'DISCOVERED',
    );
  });

  it('withdraw transitions to WITHDRAWN from any non-terminal state', async () => {
    await service.withdraw('user-1', 'jobapp-1');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      {
        status: 'WITHDRAWN',
      },
      'DISCOVERED',
    );
  });

  it('surfaces 404 for a submission that does not belong to the caller', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(service.getApplication('user-1', 'someone-elses')).rejects.toThrow(
      new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND'),
    );
  });
});
