import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PrivacyAcknowledgementService } from '@/modules/auto-apply/services/privacy-acknowledgement.service.js';
import { CURRENT_PRIVACY_POLICY_VERSION } from '@/modules/auto-apply/types/privacy-acknowledgement.types.js';

const { findUniqueMock, upsertMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    candidateApplicationProfile: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

describe('PrivacyAcknowledgementService AA-028', () => {
  let service: PrivacyAcknowledgementService;

  beforeEach(() => {
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    service = new PrivacyAcknowledgementService();
  });

  it('returns null when no profile exists', async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(service.getAcknowledgement('user-1')).resolves.toBeNull();
  });

  it('saves acknowledgement in profile verification metadata', async () => {
    findUniqueMock.mockResolvedValue(null);
    upsertMock.mockResolvedValue({});

    const result = await service.acknowledge('user-1', {
      policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    expect(result.policyVersion).toBe(CURRENT_PRIVACY_POLICY_VERSION);
    expect(result.acknowledgedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          verification: expect.objectContaining({
            privacyPolicy: expect.objectContaining({
              version: CURRENT_PRIVACY_POLICY_VERSION,
            }),
          }),
        }),
      }),
    );
  });

  it('is idempotent when the same version is saved again', async () => {
    const existing = {
      verification: {
        privacyPolicy: {
          version: CURRENT_PRIVACY_POLICY_VERSION,
          acknowledgedAt: '2026-08-05T12:00:00.000Z',
        },
      },
    };
    findUniqueMock.mockResolvedValue(existing);

    const result = await service.acknowledge('user-1', {
      policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
    });

    expect(result).toEqual({
      policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
      acknowledgedAt: '2026-08-05T12:00:00.000Z',
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
