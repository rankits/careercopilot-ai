import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  ApplicationPlannerService,
  toSafeContentPrepLogError,
} from '@/modules/auto-apply/services/application-planner.service.js';
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
import { logger } from '@/shared/logger/logger.js';

describe('toSafeContentPrepLogError (AA-013)', () => {
  it('keeps only name, message, code, and stack — strips custom payload props', () => {
    const err = new Error('provider unavailable') as Error & {
      code?: string;
      resumeText?: string;
      requestBody?: unknown;
    };
    err.code = 'AI_PROVIDER_DOWN';
    err.resumeText = 'SECRET_RESUME_BODY';
    err.requestBody = { prompt: 'SECRET_COVER_LETTER_PROMPT' };

    expect(toSafeContentPrepLogError(err)).toEqual({
      type: 'Error',
      message: 'provider unavailable',
      code: 'AI_PROVIDER_DOWN',
      stack: err.stack,
    });
  });

  it('maps non-Error values to a generic UnknownError without stringifying payloads', () => {
    expect(toSafeContentPrepLogError({ resumeText: 'SECRET' })).toEqual({
      type: 'UnknownError',
      message: 'Content preparation failed',
    });
  });
});

describe('ApplicationPlannerService', () => {
  let jobAppRepo: IJobApplicationRepository;
  let jobAppService: IJobApplicationService;
  let channelService: IChannelDetectionService;
  let resumeVersionRepo: IApprovedResumeVersionRepository;
  let answerRepo: IApplicationAnswerRepository;
  let readinessService: { evaluate: ReturnType<typeof vi.fn> };
  let planner: ApplicationPlannerService;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const readyReadiness = {
    decision: 'READY' as const,
    ready: true,
    blockingReasons: [] as [],
    warnings: [] as [],
    evaluatedRules: {},
    evaluatedAt: new Date(),
  };

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
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
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
      countConsumedSince: vi.fn().mockResolvedValue(0),
      updateMatchScore: vi.fn(),
      queueAtomically: vi.fn(),
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

    readinessService = {
      evaluate: vi.fn().mockResolvedValue(readyReadiness),
    };

    planner = new ApplicationPlannerService(
      jobAppRepo,
      jobAppService,
      channelService,
      resumeVersionRepo,
      answerRepo,
      readinessService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('includes page analysis summary when an analysis repository is wired', async () => {
    const analysisRepo = {
      findLatestByJobId: vi.fn().mockResolvedValue({
        id: 'analysis-1',
        provider: 'ASHBY',
        submissionCapability: 'EXTERNAL_MANUAL',
        formStatus: 'NOT_INSPECTED',
        outcomeStatus: 'JOB_PAGE_ANALYZED',
        jobPageUrl: 'https://jobs.ashbyhq.com/linear/x',
        analyzedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        requirements: [
          {
            code: 'WORK_REGION',
            importance: 'REQUIRED',
            assertion: 'REQUIRES',
            required: true,
            confidence: 0.9,
            evidenceStrength: 'EXPLICIT_TEXT',
            sourceText: 'North America',
            reviewStatus: 'AUTO_ACCEPTED',
          },
        ],
      }),
      findByIdempotencyKey: vi.fn(),
      create: vi.fn(),
    };

    planner = new ApplicationPlannerService(
      jobAppRepo,
      jobAppService,
      channelService,
      resumeVersionRepo,
      answerRepo,
      readinessService,
      undefined,
      analysisRepo,
    );

    const result = await planner.createPlan('user-1', 'job-1');
    expect(result.pageAnalysis?.provider).toBe('ASHBY');
    expect(result.pageAnalysis?.submissionCapability).toBe('EXTERNAL_MANUAL');
    expect(result.pageAnalysis?.formStatus).toBe('NOT_INSPECTED');
    expect(result.pageAnalysis?.requirements[0]?.code).toBe('WORK_REGION');
  });

  it('returns UNSUPPORTED_CHANNEL and stops at APPLICATION_PLANNING when no channel is available', async () => {
    vi.mocked(channelService.detectChannel).mockResolvedValue({
      channel: 'UNSUPPORTED',
      reason: 'no apply url',
    });
    readinessService.evaluate.mockResolvedValue({
      ...readyReadiness,
      ready: false,
      decision: 'CHANNEL_UNSUPPORTED',
      blockingReasons: [
        {
          code: 'CHANNEL_UNSUPPORTED',
          message: 'unsupported',
          severity: 'BLOCKING',
        },
      ],
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
    readinessService.evaluate.mockResolvedValue({
      ...readyReadiness,
      ready: false,
      decision: 'INFORMATION_REQUIRED',
      blockingReasons: [
        {
          code: 'RESUME_MISSING',
          message: 'resume required',
          field: 'resumeVersionId',
          severity: 'BLOCKING',
        },
      ],
    });

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('INFORMATION_REQUIRED');
    expect(result.selectedResumeVersion).toBeNull();
  });

  it('returns INFORMATION_REQUIRED and lists unresolved baseline questions when answers are missing', async () => {
    vi.mocked(answerRepo.findManyByUserId).mockResolvedValue([workAuthAnswer]);
    readinessService.evaluate.mockResolvedValue({
      ...readyReadiness,
      ready: false,
      decision: 'INFORMATION_REQUIRED',
      blockingReasons: [
        {
          code: 'NOTICE_PERIOD_MISSING',
          message: 'notice required',
          field: 'noticePeriodDays',
          severity: 'BLOCKING',
        },
      ],
    });

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('INFORMATION_REQUIRED');
    expect(result.unresolvedQuestions).toEqual(['noticePeriodDays']);
  });

  it('returns READY_FOR_REVIEW when eligible, channeled, resumed, and answered', async () => {
    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('READY_FOR_REVIEW');
    expect(result.selectedResumeVersion).toEqual(activeResumeVersion);
    expect(result.unresolvedQuestions).toEqual([]);
    expect(result.contentGenerationAvailable).toBe(false);
    expect(result.coverLetter).toBeNull();
    expect(result.screeningAnswers).toEqual([]);
  });

  it('never fabricates cover-letter content without a content preparation service', async () => {
    const result = await planner.createPlan('user-1', 'job-1');
    expect(result.contentGenerationAvailable).toBe(false);
    expect(result.coverLetter).toBeNull();
  });

  it('attaches prepared cover letter and screening answers when content preparation succeeds', async () => {
    const contentPreparation = {
      prepare: vi.fn().mockResolvedValue({
        coverLetter: 'Dear Hiring Team,\n\nI am interested.',
        screeningAnswers: [
          {
            questionKey: 'work_authorization',
            questionLabel: 'Work authorization',
            answer: 'Authorized',
            status: 'READY',
            source: 'USER_VERIFIED',
            confidence: 1,
            evidence: ['Verified answer vault (work_authorization)'],
            requiresUserReview: true,
          },
        ],
        contentGenerationAvailable: true,
        warnings: [],
      }),
    };

    planner = new ApplicationPlannerService(
      jobAppRepo,
      jobAppService,
      channelService,
      resumeVersionRepo,
      answerRepo,
      readinessService,
      contentPreparation as never,
    );

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.contentGenerationAvailable).toBe(true);
    expect(result.coverLetter).toContain('I am interested');
    expect(result.screeningAnswers).toHaveLength(1);
    expect(jobAppRepo.updatePlan).toHaveBeenCalledWith(
      'user-1',
      'jobapp-1',
      expect.objectContaining({
        coverLetterContent: expect.stringContaining('I am interested'),
      }),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      'Content preparation failed',
    );
  });

  it('keeps the plan ready when content preparation fails and logs a safe warning (AA-013)', async () => {
    const sensitiveResume = 'SECRET_RESUME_TEXT_SHOULD_NOT_LOG';
    const sensitiveAnswer = 'SECRET_ANSWER_TEXT_SHOULD_NOT_LOG';
    const failure = Object.assign(new Error('AI down'), {
      resumeText: sensitiveResume,
      answer: sensitiveAnswer,
      coverLetter: 'SECRET_COVER_LETTER',
      requestBody: { prompt: sensitiveResume },
    });
    const contentPreparation = {
      prepare: vi.fn().mockRejectedValue(failure),
    };

    planner = new ApplicationPlannerService(
      jobAppRepo,
      jobAppService,
      channelService,
      resumeVersionRepo,
      answerRepo,
      readinessService,
      contentPreparation as never,
    );

    const result = await planner.createPlan('user-1', 'job-1');
    expect(result.decision).toBe('READY_FOR_REVIEW');
    expect(result.contentGenerationAvailable).toBe(false);
    expect(result.contentWarnings[0]).toMatch(/Content preparation failed/i);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        jobApplicationId: 'jobapp-1',
        userId: 'user-1',
        jobId: 'job-1',
        err: expect.objectContaining({
          type: 'Error',
          message: 'AI down',
        }),
      }),
      'Content preparation failed',
    );

    const logged = JSON.stringify(warnSpy.mock.calls);
    expect(logged).not.toContain(sensitiveResume);
    expect(logged).not.toContain(sensitiveAnswer);
    expect(logged).not.toContain('SECRET_COVER_LETTER');
    expect(logged).not.toContain('resumeText');
    expect(logged).not.toContain('requestBody');
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
    vi.mocked(resumeVersionRepo.findManyByUserId).mockResolvedValue([]);
    readinessService.evaluate.mockResolvedValue({
      ...readyReadiness,
      ready: false,
      decision: 'INFORMATION_REQUIRED',
      blockingReasons: [
        {
          code: 'RESUME_MISSING',
          message: 'resume required',
          field: 'resumeVersionId',
          severity: 'BLOCKING',
        },
      ],
    });

    await expect(planner.createPlan('user-1', 'job-1')).rejects.toThrow(
      expect.objectContaining({ code: 'PLAN_REGRESSION_UNSUPPORTED', statusCode: 409 }),
    );
  });

  it('does not regress a QUEUED submission when createPlan is re-run', async () => {
    vi.mocked(jobAppRepo.findByUserIdAndJobId).mockResolvedValue(
      applyStatusTransition(baseApplication, 'QUEUED'),
    );
    vi.mocked(jobAppRepo.updatePlan).mockImplementation(async (_userId, _id, patch) =>
      applyStatusTransition(
        { ...baseApplication, ...patch, status: 'QUEUED' } as typeof baseApplication,
        'QUEUED',
      ),
    );

    const result = await planner.createPlan('user-1', 'job-1');

    expect(result.decision).toBe('READY_FOR_REVIEW');
    expect(result.application.status).toBe('QUEUED');
    expect(jobAppService.transitionStatus).not.toHaveBeenCalled();
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
