import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApplicationConsentService } from '@/modules/auto-apply/services/application-consent.service.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import { ApplicationConsentDto } from '@/modules/auto-apply/types/application-consent.types.js';

describe('ApplicationConsentService', () => {
  let mockRepo: IApplicationConsentRepository;
  let service: ApplicationConsentService;

  const mockConsent: ApplicationConsentDto = {
    id: 'consent-1',
    userId: 'user-1',
    consentType: 'EMAIL_SUBMISSION',
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
    const result = await service.hasActiveConsent('user-1', 'EMAIL_SUBMISSION');
    expect(result).toBe(false);
  });

  it('reports active consent once granted and not revoked', async () => {
    vi.mocked(mockRepo.findActiveByType).mockResolvedValue(mockConsent);
    const result = await service.hasActiveConsent('user-1', 'EMAIL_SUBMISSION');
    expect(result).toBe(true);
  });

  it('grants consent scoped to the caller and consent type', async () => {
    await service.grantConsent('user-1', 'AUTOPILOT_SUBMISSION');
    expect(mockRepo.grant).toHaveBeenCalledWith('user-1', 'AUTOPILOT_SUBMISSION');
  });

  it('revokes a consent grant scoped to the caller', async () => {
    await service.revokeConsent('user-1', 'consent-1');
    expect(mockRepo.revoke).toHaveBeenCalledWith('user-1', 'consent-1');
  });
});
