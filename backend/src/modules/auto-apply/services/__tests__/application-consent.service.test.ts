import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApplicationConsentService } from '@/modules/auto-apply/services/application-consent.service.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ApplicationConsentDto } from '@/modules/auto-apply/types/application-consent.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

describe('ApplicationConsentService', () => {
  let mockRepo: IApplicationConsentRepository;
  let service: ApplicationConsentService;

  const mockConsent: ApplicationConsentDto = {
    id: 'consent-1',
    userId: 'user-1',
    consentType: 'RESUME_USAGE',
    version: 1,
    grantedAt: new Date(),
    revokedAt: null,
  };

  beforeEach(() => {
    mockRepo = {
      findManyByUserId: vi.fn().mockResolvedValue([]),
      findActiveByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(mockConsent),
      grant: vi.fn().mockResolvedValue(mockConsent),
      revoke: vi.fn().mockResolvedValue({ ...mockConsent, revokedAt: new Date() }),
    };
    service = new ApplicationConsentService(mockRepo);
  });

  it('reports no active consent when none has been granted', async () => {
    const result = await service.hasActiveConsent('user-1', 'RESUME_USAGE');
    expect(result).toBe(false);
  });

  it('reports active consent once granted and not revoked', async () => {
    vi.mocked(mockRepo.findActiveByType).mockResolvedValue(mockConsent);
    const result = await service.hasActiveConsent('user-1', 'RESUME_USAGE');
    expect(result).toBe(true);
  });

  it('grants an allowed consent type scoped to the caller', async () => {
    await service.grantConsent('user-1', 'RESUME_USAGE');
    expect(mockRepo.grant).toHaveBeenCalledWith('user-1', 'RESUME_USAGE');
  });

  it('grants CONTENT_GENERATION consent', async () => {
    await service.grantConsent('user-1', 'CONTENT_GENERATION');
    expect(mockRepo.grant).toHaveBeenCalledWith('user-1', 'CONTENT_GENERATION');
  });

  it.each(['EMAIL_SUBMISSION', 'AUTOPILOT_SUBMISSION'] as const)(
    'rejects grant of %s with CONSENT_NOT_AVAILABLE_YET and does not persist',
    async (consentType) => {
      await expect(service.grantConsent('user-1', consentType)).rejects.toMatchObject({
        statusCode: 403,
        code: 'CONSENT_NOT_AVAILABLE_YET',
        message: "This consent type isn't available yet.",
      } satisfies Partial<AppError>);
      expect(mockRepo.grant).not.toHaveBeenCalled();
    },
  );

  it('revokes a consent grant scoped to the caller (including legacy future types)', async () => {
    await service.revokeConsent('user-1', 'consent-1');
    expect(mockRepo.revoke).toHaveBeenCalledWith('user-1', 'consent-1');
  });
});
