import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupStatusService } from '@/modules/auto-apply/services/setup-status.service.js';
import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';

describe('SetupStatusService', () => {
  const userId = 'user-1';

  let readinessService: { evaluateSetupCompleteness: ReturnType<typeof vi.fn> };
  let profileRepo: { findByUserId: ReturnType<typeof vi.fn> };
  let answerRepo: { findManyByUserId: ReturnType<typeof vi.fn> };
  let resumeRepo: { findManyByUserId: ReturnType<typeof vi.fn> };
  let consentRepo: { findActiveByType: ReturnType<typeof vi.fn> };
  let userContact: { findByUserId: ReturnType<typeof vi.fn> };
  let service: SetupStatusService;

  const readyProfile = {
    id: 'p1',
    userId,
    preferences: {
      desiredRoles: ['Engineer'],
      preferredLocations: ['Remote'],
      remotePreferences: ['REMOTE'] as const,
      expectedSalary: { currency: 'USD' },
      requiresSponsorship: false,
      currentLocation: 'Austin, TX',
      currentCountry: 'US',
      noticePeriodDays: 30,
    },
    links: { portfolio: 'https://example.com' },
    verification: {
      privacyPolicy: {
        version: '2026-08-01',
        acknowledgedAt: '2026-08-05T12:00:00.000Z',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const readyAnswers = [
    {
      id: 'a1',
      userId,
      questionKey: 'work_authorization',
      answer: 'Authorized',
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
    readinessService = {
      evaluateSetupCompleteness: vi.fn().mockResolvedValue({
        ready: true,
        blockingReasons: [],
        evaluatedAt: new Date(),
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
    userContact = {
      findByUserId: vi.fn().mockResolvedValue({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: null,
      }),
    };

    service = new SetupStatusService(
      readinessService,
      profileRepo,
      answerRepo,
      resumeRepo,
      consentRepo,
      userContact,
    );
  });

  it('returns complete setup when all required sections are satisfied', async () => {
    const result = await service.getSetupStatus(userId);

    expect(result.complete).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.readyForAssistedApply).toBe(true);
    expect(result.gaps).toHaveLength(0);
    expect(result.sections).toHaveLength(8);
    expect(result.sections.find((section) => section.id === 'personal')).toMatchObject({
      complete: true,
      required: true,
    });
  });

  it('maps readiness blocking reasons into setup gaps including work authorization', async () => {
    readinessService.evaluateSetupCompleteness.mockResolvedValue({
      ready: false,
      blockingReasons: [
        {
          code: READINESS_REASON_CODES.WORK_AUTHORIZATION_MISSING,
          message: 'Work authorization must be verified before this application can continue.',
          rule: 'workAuthorization',
          severity: 'BLOCKING',
        },
      ],
      evaluatedAt: new Date(),
    });
    answerRepo.findManyByUserId.mockResolvedValue(
      readyAnswers.filter((answer) => answer.questionKey !== 'work_authorization'),
    );

    const result = await service.getSetupStatus(userId);

    expect(result.readyForAssistedApply).toBe(false);
    expect(result.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'WORK_AUTHORIZATION_MISSING',
          section: 'work-auth',
        }),
      ]),
    );
    expect(result.sections.find((section) => section.id === 'work-auth')).toMatchObject({
      complete: false,
    });
  });

  it('reports preference gaps and lowers completion percent', async () => {
    profileRepo.findByUserId.mockResolvedValue({
      ...readyProfile,
      preferences: {
        desiredRoles: [],
        preferredLocations: [],
        remotePreferences: [],
        expectedSalary: {},
        requiresSponsorship: false,
      },
    });

    const result = await service.getSetupStatus(userId);

    expect(result.complete).toBe(false);
    expect(result.percent).toBeLessThan(100);
    expect(result.gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DESIRED_ROLES', section: 'preferences' }),
        expect.objectContaining({ code: 'PREFERRED_LOCATIONS', section: 'preferences' }),
        expect.objectContaining({ code: 'REMOTE_PREFERENCES', section: 'preferences' }),
        expect.objectContaining({ code: 'SALARY_CURRENCY', section: 'preferences' }),
      ]),
    );
  });

  it('can be incomplete while readyForAssistedApply stays true when only preferences are missing', async () => {
    profileRepo.findByUserId.mockResolvedValue({
      ...readyProfile,
      preferences: {
        ...readyProfile.preferences,
        desiredRoles: [],
      },
    });

    const result = await service.getSetupStatus(userId);

    expect(result.complete).toBe(false);
    expect(result.readyForAssistedApply).toBe(true);
  });
});
