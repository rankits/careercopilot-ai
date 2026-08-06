import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    resume: { findFirst: vi.fn() },
    resumeVersion: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/shared/config/db.conf.js';
import { BuilderResumeSyncService } from '@/modules/auto-apply/services/builder-resume-sync.service.js';

describe('BuilderResumeSyncService', () => {
  const userId = 'user-1';
  const appId = 'app-1';
  const resumeId = '11111111-1111-4111-8111-111111111111';

  let applications: {
    findById: ReturnType<typeof vi.fn>;
    updateResumeSelection: ReturnType<typeof vi.fn>;
  };
  let consents: { findActiveByType: ReturnType<typeof vi.fn> };
  let service: BuilderResumeSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    applications = {
      findById: vi.fn().mockResolvedValue({ id: appId, userId, resumeVersionId: null }),
      updateResumeSelection: vi.fn().mockResolvedValue({}),
    };
    consents = {
      findActiveByType: vi.fn().mockResolvedValue({ id: 'c1' }),
    };
    service = new BuilderResumeSyncService(applications as never, consents as never);

    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      id: resumeId,
      originalName: 'resume.pdf',
    } as never);
    vi.mocked(prisma.resumeVersion.findFirst).mockResolvedValue({
      id: 77,
      label: 'Improved v2',
      content: 'Fresh builder content with Go and Kubernetes.',
    } as never);
  });

  it('updates approved version pin and selects it on the application', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({
        approvedResumeVersion: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'approved-1',
            userId,
            resumeId,
          }),
          update: vi.fn().mockResolvedValue({
            id: 'approved-1',
            builderResumeVersionId: 77,
          }),
          count: vi.fn(),
          create: vi.fn(),
        },
      }),
    );

    const result = await service.syncFromBuilderVersion({
      userId,
      jobApplicationId: appId,
      resumeId,
      builderVersionId: 77,
    });

    expect(result.approvedResumeVersionId).toBe('approved-1');
    expect(result.builderResumeVersionId).toBe(77);
    expect(applications.updateResumeSelection).toHaveBeenCalledWith(userId, appId, 'approved-1');
  });

  it('rejects revoked consent', async () => {
    consents.findActiveByType.mockResolvedValue(null);
    await expect(
      service.syncFromBuilderVersion({
        userId,
        jobApplicationId: appId,
        resumeId,
        builderVersionId: 77,
      }),
    ).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
  });

  it('rejects cross-user builder version', async () => {
    vi.mocked(prisma.resumeVersion.findFirst).mockResolvedValue(null as never);
    await expect(
      service.syncFromBuilderVersion({
        userId,
        jobApplicationId: appId,
        resumeId,
        builderVersionId: 77,
      }),
    ).rejects.toMatchObject({ code: 'BUILDER_VERSION_NOT_FOUND' });
  });
});
