import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MailDeliveryHistoryService } from '@/modules/ai-mail/delivery/application/mail-delivery-history.service.js';
import type {
  MailDeliveryRecord,
  MailDeliveryRepository,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    connectedAccount: {
      findMany: vi.fn(async () => [{ id: 7, emailAddress: 'sender@gmail.com', status: 'REVOKED' }]),
    },
  },
}));

vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const config = {
  phase2: { gmailIntegrationEnabled: true, mailSendingEnabled: true },
  limits: {
    sendsPerUserPerHour: 10,
    sendsPerUserPerDay: 30,
    minFollowUpIntervalHours: 72,
  },
} as const;

const row = (overrides: Partial<MailDeliveryRecord> = {}): MailDeliveryRecord => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: '1',
  draftId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  draftVersion: 2,
  contentHash: 'hash-content',
  connectedAccountId: 7,
  provider: 'google',
  status: 'sent',
  idempotencyKey: 'idem-1',
  recipientEmail: 'recruiter@example.com',
  recipientHash: 'hash:recruiter',
  fromEmail: 'sender@gmail.com',
  resumeId: '11111111-1111-4111-8111-111111111111',
  subjectSnapshot: 'Hello Acme',
  companyNameSnapshot: 'Acme',
  roleTitleSnapshot: 'Engineer',
  attemptedAt: new Date('2026-08-01T12:00:00.000Z'),
  sentAt: new Date('2026-08-01T12:00:01.000Z'),
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-01T12:00:01.000Z'),
  ...overrides,
});

describe('MailDeliveryHistoryService', () => {
  let deliveries: MailDeliveryRepository;
  let service: MailDeliveryHistoryService;
  const update = vi.fn();
  const listForUser = vi.fn();
  const findByIdForUser = vi.fn();
  const listForDraft = vi.fn();
  const countAttemptsInWindow = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    deliveries = {
      listForUser,
      findByIdForUser,
      listForDraft,
      countAttemptsInWindow,
      update,
    } as unknown as MailDeliveryRepository;
    service = new MailDeliveryHistoryService(deliveries, config);
  });

  it('lists deliveries for the owner with disconnected account flag', async () => {
    listForUser.mockResolvedValue({
      items: [row()],
      page: 1,
      limit: 20,
      total: 1,
    });

    const result = await service.list('1', { page: 1, limit: 20 });

    expect(listForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '1', page: 1, limit: 20 }),
    );
    expect(result.items[0]).toMatchObject({
      deliveryId: row().id,
      subject: 'Hello Acme',
      connectedAccountEmail: 'sender@gmail.com',
      connectedAccountDisconnected: true,
    });
  });

  it('returns 404 for foreign delivery ids', async () => {
    findByIdForUser.mockResolvedValue(null);
    await expect(service.get('1', row().id)).rejects.toMatchObject({
      code: 'MAIL_DELIVERY_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('resolves unknown status without mutating provider status', async () => {
    const unknownRow = row({ status: 'unknown', userResolution: undefined });
    findByIdForUser.mockResolvedValue(unknownRow);
    update.mockResolvedValue({
      ...unknownRow,
      userResolution: 'confirmed_sent',
      userResolvedAt: new Date('2026-08-07T00:00:00.000Z'),
    });

    const result = await service.resolveStatus('1', unknownRow.id, 'confirmed_sent');

    expect(update).toHaveBeenCalledWith(unknownRow.id, {
      userResolution: 'confirmed_sent',
      userResolvedAt: expect.any(Date),
    });
    expect(result.status).toBe('unknown');
    expect(result.userResolution).toBe('confirmed_sent');
  });

  it('rejects resolve when status is not unknown', async () => {
    findByIdForUser.mockResolvedValue(row({ status: 'sent' }));
    await expect(service.resolveStatus('1', row().id, 'confirmed_sent')).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(service.resolveStatus('1', row().id, 'confirmed_sent')).rejects.toMatchObject({
      code: 'MAIL_DELIVERY_NOT_UNKNOWN',
    });
  });

  it('returns hourly and daily send limits', async () => {
    countAttemptsInWindow.mockResolvedValueOnce(2).mockResolvedValueOnce(5);
    const limits = await service.getSendLimits('1');
    expect(limits).toEqual({
      hourly: { used: 2, limit: 10 },
      daily: { used: 5, limit: 30 },
    });
  });
});
