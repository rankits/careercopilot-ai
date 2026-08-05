import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupStatusService } from '@/modules/auto-apply/services/setup-status.service.js';
import type { IApplicationReadinessService } from '@/modules/auto-apply/contracts/application-readiness.contract.js';

/**
 * AA-031 — Phase 0 release-gate coverage at the aggregation layer.
 * Full browser E2E is deferred when FE workers hang; these tests lock the
 * completeness ↔ revoke interaction that RELEASE_GATES.md requires.
 */
describe('Phase 0 release gate — setup-status journey (AA-031)', () => {
  const readiness = {
    evaluateSetupCompleteness: vi.fn(),
  };

  const profileRepo = {
    findByUserId: vi.fn(),
  };
  const answerRepo = {
    findManyByUserId: vi.fn(),
  };
  const resumeRepo = {
    findManyByUserId: vi.fn(),
  };
  const consentRepo = {
    findActiveByType: vi.fn(),
    findManyByUserId: vi.fn(),
  };
  const contactLookup = {
    findByUserId: vi.fn(),
  };

  let service: SetupStatusService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SetupStatusService(
      readiness as unknown as IApplicationReadinessService,
      profileRepo as never,
      answerRepo as never,
      resumeRepo as never,
      consentRepo as never,
      contactLookup as never,
    );
  });

  it('starts incomplete for a brand-new user and is not ready for Assisted Apply', async () => {
    readiness.evaluateSetupCompleteness.mockResolvedValue({
      ready: false,
      blockingReasons: [{ code: 'WORK_AUTHORIZATION_MISSING' }],
    });
    profileRepo.findByUserId.mockResolvedValue(null);
    answerRepo.findManyByUserId.mockResolvedValue([]);
    resumeRepo.findManyByUserId.mockResolvedValue([]);
    consentRepo.findActiveByType.mockResolvedValue(null);
    contactLookup.findByUserId.mockResolvedValue(null);

    const status = await service.getSetupStatus('user-new');

    expect(status.percent).toBe(0);
    expect(status.readyForAssistedApply).toBe(false);
    expect(status.sections).toHaveLength(8);
    expect(status.sections.every((s) => (s.required ? !s.complete : true) || !s.required)).toBe(
      true,
    );
  });

  it('marks readyForAssistedApply false again after RESUME_USAGE revoke (gate regression)', async () => {
    readiness.evaluateSetupCompleteness.mockResolvedValue({
      ready: false,
      blockingReasons: [{ code: 'RESUME_USAGE_CONSENT_MISSING' }],
    });
    profileRepo.findByUserId.mockResolvedValue({
      preferences: {
        desiredRoles: ['Engineer'],
        preferredLocations: ['Remote'],
        remotePreferences: ['REMOTE'],
        salaryCurrency: 'USD',
        noticePeriodDays: 30,
        requiresSponsorship: false,
      },
      links: {},
    });
    answerRepo.findManyByUserId.mockResolvedValue([
      { questionKey: 'work_authorization', source: 'USER_VERIFIED', answer: 'yes' },
      { questionKey: 'notice_period_days', source: 'USER_VERIFIED', answer: '30' },
      { questionKey: 'years_of_experience', source: 'USER_VERIFIED', answer: '5' },
    ]);
    resumeRepo.findManyByUserId.mockResolvedValue([{ id: 'rv-1', isActive: true }]);
    consentRepo.findActiveByType.mockResolvedValue(null);
    contactLookup.findByUserId.mockResolvedValue({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
    });

    const status = await service.getSetupStatus('user-revoked');

    expect(status.readyForAssistedApply).toBe(false);
    expect(status.sections.find((s) => s.id === 'consents')?.complete).toBe(false);
  });
});
