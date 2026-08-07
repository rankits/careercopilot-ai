import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrepareFollowUpService } from '@/modules/ai-mail/delivery/application/prepare-follow-up.service.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type {
  MailDeliveryRecord,
  MailDeliveryRepository,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';

vi.mock('@/modules/ai-mail/delivery/domain/recipient-hasher.js', () => ({
  hashRecipientEmail: (email: string) => `hash:${email.toLowerCase()}`,
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

const parentDraft = (): AiMailDraft => ({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  userId: '1',
  recruiterEmail: 'recruiter@example.com',
  recruiterName: 'Sam',
  companyName: 'Acme',
  roleTitle: 'Engineer',
  jobDescription: 'Build things',
  resumeId: '11111111-1111-4111-8111-111111111111',
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  subject: 'Hello',
  bodyText: 'Body',
  status: 'ready_to_send',
  version: 2,
  userEdited: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const delivery = (overrides: Partial<MailDeliveryRecord> = {}): MailDeliveryRecord => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: '1',
  draftId: parentDraft().id,
  draftVersion: 2,
  contentHash: 'hash',
  connectedAccountId: 7,
  provider: 'google',
  status: 'sent',
  idempotencyKey: 'idem',
  recipientEmail: 'recruiter@example.com',
  recipientHash: 'hash:recruiter@example.com',
  fromEmail: 'me@gmail.com',
  resumeId: parentDraft().resumeId,
  subjectSnapshot: 'Hello',
  companyNameSnapshot: 'Acme',
  roleTitleSnapshot: 'Engineer',
  attemptedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  ...overrides,
});

describe('PrepareFollowUpService', () => {
  const findByIdForUser = vi.fn();
  const findRecentByRecipientHash = vi.fn();
  const draftFindByIdForUser = vi.fn();
  const create = vi.fn();

  let service: PrepareFollowUpService;

  beforeEach(() => {
    vi.clearAllMocks();
    findRecentByRecipientHash.mockResolvedValue([]);
    const deliveries = {
      findByIdForUser,
      findRecentByRecipientHash,
    } as unknown as MailDeliveryRepository;
    const drafts = {
      findByIdForUser: draftFindByIdForUser,
      create,
    } as unknown as AiMailDraftRepository;
    service = new PrepareFollowUpService(drafts, deliveries, config);
  });

  it('creates a follow-up draft linked to the source delivery', async () => {
    findByIdForUser.mockResolvedValue(delivery());
    draftFindByIdForUser.mockResolvedValue(parentDraft());
    create.mockImplementation(async (input) => ({
      ...parentDraft(),
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      status: 'input',
      version: 1,
      followUpToDeliveryId: input.followUpToDeliveryId,
      constraints: input.constraints,
    }));

    const result = await service.prepare('1', delivery().id, { style: 'polite' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '1',
        followUpToDeliveryId: delivery().id,
        status: 'input',
        constraints: expect.objectContaining({ followUpStyle: 'polite' }),
      }),
    );
    expect(result.draft.followUpToDeliveryId).toBe(delivery().id);
    expect(result.warnings).toEqual([]);
  });

  it('allows unknown + confirmed_sent sources', async () => {
    findByIdForUser.mockResolvedValue(
      delivery({ status: 'unknown', userResolution: 'confirmed_sent' }),
    );
    draftFindByIdForUser.mockResolvedValue(parentDraft());
    create.mockResolvedValue({
      ...parentDraft(),
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      status: 'input',
      followUpToDeliveryId: delivery().id,
    });

    await expect(service.prepare('1', delivery().id, {})).resolves.toBeTruthy();
  });

  it('rejects failed deliveries', async () => {
    findByIdForUser.mockResolvedValue(delivery({ status: 'failed' }));
    await expect(service.prepare('1', delivery().id, {})).rejects.toMatchObject({
      code: 'MAIL_FOLLOW_UP_SOURCE_INVALID',
    });
  });

  it('rejects foreign delivery ids with 404', async () => {
    findByIdForUser.mockResolvedValue(null);
    await expect(service.prepare('1', delivery().id, {})).rejects.toMatchObject({
      code: 'MAIL_DELIVERY_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('soft-warns when within the minimum follow-up interval', async () => {
    findByIdForUser.mockResolvedValue(
      delivery({
        sentAt: new Date(),
        createdAt: new Date(),
      }),
    );
    draftFindByIdForUser.mockResolvedValue(parentDraft());
    create.mockResolvedValue({
      ...parentDraft(),
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      status: 'input',
      followUpToDeliveryId: delivery().id,
    });

    const result = await service.prepare('1', delivery().id, {});
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.draft.id).toBeTruthy();
  });
});
