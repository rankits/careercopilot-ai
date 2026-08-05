import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApplicationReadinessService } from '@/modules/auto-apply/services/application-readiness.service.js';
import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';
import { JobApplicationAdapterRegistry } from '@/modules/auto-apply/adapters/adapter-registry.js';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';
import { DEFAULT_APPLICATION_RULE } from '@/modules/auto-apply/types/application-rule.types.js';

describe('ApplicationReadinessService', () => {
  const userId = '1';
  const jobId = 'job-1';

  let featureFlags: { isAutoApplyEnabled: ReturnType<typeof vi.fn> };
  let jobLookup: { findJobSnapshot: ReturnType<typeof vi.fn> };
  let channelJobLookup: { findJobChannelSnapshot: ReturnType<typeof vi.fn> };
  let channelDetection: { detectChannel: ReturnType<typeof vi.fn> };
  let profileRepo: { findByUserId: ReturnType<typeof vi.fn> };
  let answerRepo: { findManyByUserId: ReturnType<typeof vi.fn> };
  let resumeRepo: { findManyByUserId: ReturnType<typeof vi.fn> };
  let ruleRepo: { findByUserId: ReturnType<typeof vi.fn> };
  let consentRepo: { findActiveByType: ReturnType<typeof vi.fn> };
  let jobAppRepo: {
    findById: ReturnType<typeof vi.fn>;
    findByUserIdAndJobId: ReturnType<typeof vi.fn>;
    countConsumedSince: ReturnType<typeof vi.fn>;
    updateMatchScore: ReturnType<typeof vi.fn>;
  };
  let userContact: { findByUserId: ReturnType<typeof vi.fn> };
  let matchScore: { findOverallScore: ReturnType<typeof vi.fn> };
  let trackerDup: { findActiveByUserAndJobId: ReturnType<typeof vi.fn> };
  let eligibility: { evaluateForJob: ReturnType<typeof vi.fn> };
  let service: ApplicationReadinessService;

  const registry = new JobApplicationAdapterRegistry();
  registry.register(new ExternalRedirectAdapter());

  const readyProfile = {
    id: 'p1',
    userId,
    preferences: {
      desiredRoles: ['Engineer'],
      preferredLocations: ['Remote'],
      remotePreference: 'ANY' as const,
      remotePreferences: ['REMOTE', 'HYBRID', 'ONSITE'] as const,
      requiresSponsorship: false,
      willingToRelocate: false,
    },
    links: { portfolio: 'https://example.com' },
    verification: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const readyAnswers = [
    {
      id: 'a1',
      userId,
      questionKey: 'work_authorization',
      answer: 'Authorized to work in the US',
      source: 'USER_VERIFIED' as const,
      sensitive: true,
      autoSubmitAllowed: false,
      lastVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'a2',
      userId,
      questionKey: 'notice_period_days',
      answer: '30',
      source: 'USER_VERIFIED' as const,
      sensitive: true,
      autoSubmitAllowed: false,
      lastVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'a3',
      userId,
      questionKey: 'years_of_experience',
      answer: '5',
      source: 'USER_VERIFIED' as const,
      sensitive: false,
      autoSubmitAllowed: true,
      lastVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    featureFlags = { isAutoApplyEnabled: vi.fn().mockReturnValue(true) };
    jobLookup = {
      findJobSnapshot: vi.fn().mockResolvedValue({
        id: jobId,
        title: 'Engineer',
        companySlug: 'acme',
        remoteType: 'REMOTE',
        salaryMax: 150000,
        status: 'ACTIVE',
        sourceProviders: ['greenhouse'],
        canonicalJobId: 'canon-1',
      }),
    };
    channelJobLookup = {
      findJobChannelSnapshot: vi.fn().mockResolvedValue({
        id: jobId,
        status: 'ACTIVE',
        applyUrl: 'https://jobs.example.com/apply',
      }),
    };
    channelDetection = {
      detectChannel: vi.fn().mockResolvedValue({
        channel: 'EXTERNAL_MANUAL',
        reason: 'has url',
      }),
    };
    profileRepo = { findByUserId: vi.fn().mockResolvedValue(readyProfile) };
    answerRepo = { findManyByUserId: vi.fn().mockResolvedValue(readyAnswers) };
    resumeRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([
        {
          id: 'rv1',
          userId,
          resumeId: 'r1',
          label: 'Primary',
          category: 'general',
          tags: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    ruleRepo = {
      findByUserId: vi.fn().mockResolvedValue({
        id: 'rule-1',
        userId,
        ...DEFAULT_APPLICATION_RULE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    consentRepo = {
      findActiveByType: vi.fn().mockResolvedValue({
        id: 'c1',
        userId,
        consentType: 'RESUME_USAGE',
        version: 1,
        grantedAt: new Date(),
        revokedAt: null,
      }),
    };
    jobAppRepo = {
      findById: vi.fn().mockResolvedValue(null),
      findByUserIdAndJobId: vi.fn().mockResolvedValue(null),
      countConsumedSince: vi.fn().mockResolvedValue(0),
      updateMatchScore: vi.fn(),
    };
    userContact = {
      findByUserId: vi.fn().mockResolvedValue({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: null,
      }),
    };
    matchScore = { findOverallScore: vi.fn().mockResolvedValue(0.9) };
    trackerDup = { findActiveByUserAndJobId: vi.fn().mockResolvedValue(null) };
    eligibility = {
      evaluateForJob: vi.fn().mockResolvedValue({
        eligible: true,
        checks: [{ check: 'JOB_ACTIVE', status: 'PASSED' }],
      }),
    };

    service = new ApplicationReadinessService(
      featureFlags,
      jobLookup,
      channelJobLookup,
      channelDetection,
      registry,
      profileRepo,
      answerRepo,
      resumeRepo,
      ruleRepo,
      consentRepo,
      jobAppRepo as never,
      userContact,
      matchScore,
      trackerDup,
      eligibility,
    );
  });

  it('returns READY when all gates pass', async () => {
    const result = await service.evaluate({ userId, jobId, stage: 'APPROVE' });
    expect(result.ready).toBe(true);
    expect(result.decision).toBe('READY');
    expect(result.blockingReasons).toHaveLength(0);
  });

  it('fails closed when feature flag is disabled', async () => {
    featureFlags.isAutoApplyEnabled.mockReturnValue(false);
    const result = await service.evaluate({ userId, jobId, stage: 'PLAN' });
    expect(result.decision).toBe('FEATURE_DISABLED');
    expect(result.blockingReasons[0]?.code).toBe(READINESS_REASON_CODES.FEATURE_DISABLED);
  });

  it('blocks when paused', async () => {
    ruleRepo.findByUserId.mockResolvedValue({
      id: 'rule-1',
      userId,
      ...DEFAULT_APPLICATION_RULE,
      autopilotPausedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.evaluate({ userId, jobId, stage: 'QUEUE' });
    expect(result.decision).toBe('FEATURE_DISABLED');
    expect(
      result.blockingReasons.some((r) => r.code === READINESS_REASON_CODES.AUTO_APPLY_PAUSED),
    ).toBe(true);
  });

  it('requires work authorization answer', async () => {
    answerRepo.findManyByUserId.mockResolvedValue(
      readyAnswers.filter((a) => a.questionKey !== 'work_authorization'),
    );
    const result = await service.evaluate({ userId, jobId, stage: 'PLAN' });
    expect(result.decision).toBe('INFORMATION_REQUIRED');
    expect(
      result.blockingReasons.some(
        (r) => r.code === READINESS_REASON_CODES.WORK_AUTHORIZATION_MISSING,
      ),
    ).toBe(true);
  });

  it('requires sponsorship preference', async () => {
    profileRepo.findByUserId.mockResolvedValue({
      ...readyProfile,
      preferences: { ...readyProfile.preferences, requiresSponsorship: undefined },
    });
    const result = await service.evaluate({ userId, jobId, stage: 'APPROVE' });
    expect(
      result.blockingReasons.some(
        (r) => r.code === READINESS_REASON_CODES.SPONSORSHIP_REQUIREMENT_MISSING,
      ),
    ).toBe(true);
  });

  it('blocks when match score is below threshold at QUEUE', async () => {
    matchScore.findOverallScore.mockResolvedValue(0.5);
    const result = await service.evaluate({ userId, jobId, stage: 'QUEUE' });
    expect(result.decision).toBe('NOT_ELIGIBLE');
    expect(
      result.blockingReasons.some(
        (r) => r.code === READINESS_REASON_CODES.MATCH_SCORE_BELOW_THRESHOLD,
      ),
    ).toBe(true);
  });

  it('warns when match score is below threshold at PLAN for assisted prepare', async () => {
    matchScore.findOverallScore.mockResolvedValue(0.5);
    const result = await service.evaluate({
      userId,
      jobId,
      stage: 'PLAN',
      applyMode: 'ASSISTED',
    });
    expect(
      result.warnings.some((r) => r.code === READINESS_REASON_CODES.MATCH_SCORE_BELOW_THRESHOLD),
    ).toBe(true);
    expect(
      result.blockingReasons.some(
        (r) => r.code === READINESS_REASON_CODES.MATCH_SCORE_BELOW_THRESHOLD,
      ),
    ).toBe(false);
  });

  it('warns when match score is missing instead of blocking the plan', async () => {
    matchScore.findOverallScore.mockResolvedValue(null);
    const result = await service.evaluate({ userId, jobId, stage: 'PLAN' });
    expect(result.decision).toBe('READY');
    expect(result.warnings.some((r) => r.code === READINESS_REASON_CODES.MATCH_SCORE_MISSING)).toBe(
      true,
    );
    expect(
      result.blockingReasons.some((r) => r.code === READINESS_REASON_CODES.MATCH_SCORE_MISSING),
    ).toBe(false);
  });

  it('enforces daily limit at QUEUE', async () => {
    jobAppRepo.countConsumedSince.mockResolvedValue(5);
    const result = await service.evaluate({ userId, jobId, stage: 'QUEUE' });
    expect(result.decision).toBe('LIMIT_REACHED');
    expect(
      result.blockingReasons.some((r) => r.code === READINESS_REASON_CODES.DAILY_LIMIT_REACHED),
    ).toBe(true);
  });

  it('treats daily limit as warning at PLAN', async () => {
    jobAppRepo.countConsumedSince.mockResolvedValue(5);
    const result = await service.evaluate({ userId, jobId, stage: 'PLAN' });
    expect(result.warnings.some((r) => r.code === READINESS_REASON_CODES.DAILY_LIMIT_REACHED)).toBe(
      true,
    );
    expect(
      result.blockingReasons.some((r) => r.code === READINESS_REASON_CODES.DAILY_LIMIT_REACHED),
    ).toBe(false);
  });

  it('requires consent at APPROVE but warns at PLAN', async () => {
    consentRepo.findActiveByType.mockResolvedValue(null);
    const plan = await service.evaluate({ userId, jobId, stage: 'PLAN' });
    expect(plan.warnings.some((r) => r.code === READINESS_REASON_CODES.CONSENT_REQUIRED)).toBe(
      true,
    );

    const approve = await service.evaluate({ userId, jobId, stage: 'APPROVE' });
    expect(approve.decision).toBe('CONSENT_REQUIRED');
  });

  it('blocks unsupported channel', async () => {
    channelDetection.detectChannel.mockResolvedValue({
      channel: 'UNSUPPORTED',
      reason: 'none',
    });
    const result = await service.evaluate({ userId, jobId, stage: 'SUBMIT' });
    expect(result.decision).toBe('CHANNEL_UNSUPPORTED');
  });

  it('blocks inactive job', async () => {
    jobLookup.findJobSnapshot.mockResolvedValue({
      id: jobId,
      title: 'Engineer',
      companySlug: 'acme',
      remoteType: 'REMOTE',
      salaryMax: 150000,
      status: 'CLOSED',
      sourceProviders: [],
      canonicalJobId: 'canon-1',
    });
    const result = await service.evaluate({ userId, jobId, stage: 'SUBMIT' });
    expect(result.decision).toBe('JOB_UNAVAILABLE');
  });

  it('requires approved resume', async () => {
    resumeRepo.findManyByUserId.mockResolvedValue([]);
    const result = await service.evaluate({ userId, jobId, stage: 'APPROVE' });
    expect(
      result.blockingReasons.some((r) => r.code === READINESS_REASON_CODES.RESUME_MISSING),
    ).toBe(true);
  });

  describe('evaluateSetupCompleteness', () => {
    it('returns ready when profile-side PLAN checks pass', async () => {
      const result = await service.evaluateSetupCompleteness(userId);
      expect(result.ready).toBe(true);
      expect(result.blockingReasons).toHaveLength(0);
    });

    it('blocks when work authorization is missing', async () => {
      answerRepo.findManyByUserId.mockResolvedValue(
        readyAnswers.filter((a) => a.questionKey !== 'work_authorization'),
      );
      const result = await service.evaluateSetupCompleteness(userId);
      expect(result.ready).toBe(false);
      expect(
        result.blockingReasons.some(
          (r) => r.code === READINESS_REASON_CODES.WORK_AUTHORIZATION_MISSING,
        ),
      ).toBe(true);
    });

    it('blocks when feature flag is disabled', async () => {
      featureFlags.isAutoApplyEnabled.mockReturnValue(false);
      const result = await service.evaluateSetupCompleteness(userId);
      expect(result.ready).toBe(false);
      expect(result.blockingReasons[0]?.code).toBe(READINESS_REASON_CODES.FEATURE_DISABLED);
    });
  });
});
