import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApplicationPlannerService } from '@/modules/auto-apply/services/application-planner.service.js';
import {
  IJobApplicationRepository,
  IJobApplicationService,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import { IChannelDetectionService } from '@/modules/auto-apply/contracts/channel-detection.contract.js';
import { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { IApplicationAnswerRepository } from '@/modules/auto-apply/contracts/application-answer.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';
import { ApplicationAnswerDto } from '@/modules/auto-apply/types/application-answer.types.js';

describe('ApplicationPlannerService', () => {
  let jobAppRepo: IJobApplicationRepository;
  let jobAppService: IJobApplicationService;
  let channelService: IChannelDetectionService;
  let resumeVersionRepo: IApprovedResumeVersionRepository;
  let answerRepo: IApplicationAnswerRepository;
  let planner: ApplicationPlannerService;

  const baseApplication: JobApplicationDto = {
    id: 'jobapp-1',
    userId: 'user-1',
    jobId: 'job-1',
    normalisedJobUrl: null,
    canonicalJobId: 'canonical-1',
    companySlug: 'acme',
    jobTitle: 'Backend Engineer',
    channel: 'UNSUPPORTED',
    status: 'MATCHED',
    approvalMode: 'PER_APPLICATION',
    matchScore: null,
    eligibilityResult: { eligible: true, checks: [] },
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

  const activeResumeVersion: ApprovedResumeVersionDto = {
    id: 'version-1',
    userId: 'user-1',
    resumeId: 'resume-1',
    label: 'Backend Resume',
    category: 'Backend',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const workAuthAnswer: ApplicationAnswerDto = {
    id: 'answer-1',
    userId: 'user-1',
    questionKey: 'work_authorization',
    answer: 'Yes',
    source: 'USER_VERIFIED',
    sensitive: true,
    autoSubmitAllowed: false,
    lastVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const noticePeriodAnswer: ApplicationAnswerDto = {
    ...workAuthAnswer,
    id: 'answer-2',
    questionKey: 'notice_period_days',
    answer: '30',
  };

  function applyStatusTransition(
    app: JobApplicationDto,
    toStatus: JobApplicationDto['status'],
  ): JobApplicationDto {
    return { ...app, status: toStatus };
  }

  beforeEach(() => {
    jobAppRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByUserIdAndJobId: vi.fn().mockResolvedValue(baseApplication),
      findByUserIdAndCanonicalJobId: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      updateStatus: vi.fn(),
      updatePlan: vi.fn().mockImplementation((_userId, _id, data) =>
        Promise.resolve({
          ...baseApplication,
          channel: data.channel,
          resumeVersionId: data.resumeVersionId,
          planInputsHash: data.planInputsHash,
        }),
      ),
      claimForSubmission: vi.fn(),
      finalizeSubmission: vi.fn(),
    };

    jobAppService = {
      listApplications: vi.fn(),
      getApplication: vi.fn(),
      initiate: vi.fn().mockResolvedValue({ application: baseApplication, possibleDuplicates: [] }),
      evaluateEligibility: vi
        .fn()
        .mockResolvedValue(applyStatusTransition(baseApplication, 'MATCHED')),
      transitionStatus: vi
        .fn()
        .mockImplementation((_userId, _id, toStatus) =>
          Promise.resolve(applyStatusTransition(baseApplication, toStatus)),
        ),
      withdraw: vi.fn(),
    };

    channelService = {
      detectChannel: vi.fn().mockResolvedValue({ channel: 'EXTERNAL_MANUAL', reason: 'ok' }),
    };

    resumeVersionRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([activeResumeVersion]),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    answerRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([workAuthAnswer, noticePeriodAnswer]),
      findByUserIdAndKey: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    planner = new ApplicationPlannerService(
      jobAppRepo,
      jobAppService,
      channelService,
      resumeVersionRepo,
      answerRepo,
    );
  });

  it('initiates a new submission when none exists yet', async () => {
    vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(null);

    await planner.createPlan('user-1', 'job-1');

    expect(jobAppService.initiate).toHaveBeenCalledWith('user-1', 'job-1');
  });

  it('rejects planning a withdrawn submission', async () => {
    vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
      applyStatusTransition(baseApplication, 'WITHDRAWN'),
    );

    await expect(planner.createPlan('user-1', 'job-1')).rejects.toThrow(
      expect.objectContaining({ code: 'APPLICATION_WITHDRAWN', statusCode: 409 }),
    );
  });

  it('returns NOT_ELIGIBLE and skips channel/resume/answers work when eligibility fails', async () => {
    vi.mocked(jobAppService.evaluateEligibility).mockResolvedValue({
      ...applyStatusTransition(baseApplication, 'NOT_ELIGIBLE'),
      eligibilityResult: {
        eligible: false,
        checks: [{ check: 'JOB_ACTIVE', status: 'FAILED', reason: 'closed' }],
      },
    });

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('NOT_ELIGIBLE');
    expect(channelService.detectChannel).not.toHaveBeenCalled();
    expect(resumeVersionRepo.findManyByUserId).not.toHaveBeenCalled();
  });

  it('returns UNSUPPORTED_CHANNEL and stops at APPLICATION_PLANNING when no channel is available', async () => {
    vi.mocked(channelService.detectChannel).mockResolvedValue({
      channel: 'UNSUPPORTED',
      reason: 'no apply url',
    });

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('UNSUPPORTED_CHANNEL');
    expect(jobAppService.transitionStatus).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      'APPLICATION_PLANNING',
    );
    expect(jobAppService.transitionStatus).not.toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      'READY_FOR_REVIEW',
    );
  });

  it('returns INFORMATION_REQUIRED when no active resume version is approved', async () => {
    vi.mocked(resumeVersionRepo.findManyByUserId).mockResolvedValue([]);

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('INFORMATION_REQUIRED');
    expect(result.selectedResumeVersion).toBeNull();
  });

  it('returns INFORMATION_REQUIRED and lists unresolved baseline questions when answers are missing', async () => {
    vi.mocked(answerRepo.findManyByUserId).mockResolvedValue([workAuthAnswer]);

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('INFORMATION_REQUIRED');
    expect(result.unresolvedQuestions).toEqual(['notice_period_days']);
  });

  it('returns READY_FOR_REVIEW when eligible, channeled, resumed, and answered', async () => {
    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('READY_FOR_REVIEW');
    expect(result.selectedResumeVersion).toEqual(activeResumeVersion);
    expect(result.unresolvedQuestions).toEqual([]);
    expect(result.contentGenerationAvailable).toBe(false);
  });

  it('never fabricates cover-letter content', async () => {
    const result = await planner.createPlan('user-1', 'job-1');
    expect(result.contentGenerationAvailable).toBe(false);
  });

  it('persists the selected channel and resume version via updatePlan', async () => {
    await planner.createPlan('user-1', 'job-1');

    expect(jobAppRepo.updatePlan).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({ channel: 'EXTERNAL_MANUAL', resumeVersionId: 'version-1' }),
    );
  });

  it('is idempotent: replanning with unchanged inputs does not throw and returns the same decision', async () => {
    // First run lands the application at READY_FOR_REVIEW.
    vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
      applyStatusTransition(baseApplication, 'READY_FOR_REVIEW'),
    );
    vi.mocked(jobAppService.evaluateEligibility).mockClear();

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('READY_FOR_REVIEW');
    // No eligibility re-evaluation triggered from a resting non-DISCOVERED/MATCHED/NOT_ELIGIBLE status in this call path is fine either way — the key assertion is no error was thrown and no backward transition was attempted.
    expect(jobAppService.transitionStatus).not.toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      'INFORMATION_REQUIRED',
    );
  });

  it('rejects a would-be regression from READY_FOR_REVIEW back to INFORMATION_REQUIRED', async () => {
    vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
      applyStatusTransition(baseApplication, 'READY_FOR_REVIEW'),
    );
    vi.mocked(resumeVersionRepo.findManyByUserId).mockResolvedValue([]); // now would compute INFORMATION_REQUIRED

    await expect(planner.createPlan('user-1', 'job-1')).rejects.toThrow(
      expect.objectContaining({ code: 'PLAN_REGRESSION_UNSUPPORTED', statusCode: 409 }),
    );
  });

  describe('getPlan', () => {
    it('returns null when no submission exists for the job', async () => {
      vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(null);
      const result = await planner.getPlan('user-1', 'job-1');
      expect(result).toBeNull();
    });

    it('returns null when the submission is still DISCOVERED (not yet planned)', async () => {
      vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
        applyStatusTransition(baseApplication, 'DISCOVERED'),
      );
      const result = await planner.getPlan('user-1', 'job-1');
      expect(result).toBeNull();
    });

    it('maps NOT_ELIGIBLE status to the NOT_ELIGIBLE decision', async () => {
      vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
        applyStatusTransition(baseApplication, 'NOT_ELIGIBLE'),
      );
      const result = await planner.getPlan('user-1', 'job-1');
      expect(result?.decision).toBe('NOT_ELIGIBLE');
    });

    it('maps a later lifecycle status (e.g. SUBMITTED) back to READY_FOR_REVIEW for plan-view purposes', async () => {
      vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
        applyStatusTransition(baseApplication, 'SUBMITTED'),
      );
      const result = await planner.getPlan('user-1', 'job-1');
      expect(result?.decision).toBe('READY_FOR_REVIEW');
    });
  });
});
