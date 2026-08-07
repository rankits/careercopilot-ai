import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MailDeliveryService } from '@/modules/ai-mail/delivery/application/mail-delivery.service.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type {
  CreateMailDeliveryInput,
  ListMailDeliveriesFilter,
  MailDeliveryPage,
  MailDeliveryRecord,
  MailDeliveryRepository,
  UpdateMailDeliveryInput,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { FakeMailboxProvider } from '@/modules/ai-mail/delivery/providers/fake-mailbox.provider.js';
import { hashAiMailContent } from '@/modules/ai-mail/domain/content-hasher.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

vi.mock('@/modules/connected-accounts/services/ConnectedAccountCredentialService.js', () => ({
  GMAIL_SEND_SCOPE: 'https://www.googleapis.com/auth/gmail.send',
  ConnectedAccountCredentialService: {
    resolveSendableGoogleAccount: vi.fn(async () => ({
      account: {
        id: 7,
        userId: 1,
        provider: 'GOOGLE',
        providerAccountId: 'sub-7',
        emailAddress: 'sender@gmail.com',
        displayName: 'Sender',
        status: 'ACTIVE',
        grantedScopes: ['openid', 'https://www.googleapis.com/auth/gmail.send'],
      },
      accessToken: 'access-token-test',
    })),
    getSendableGoogleAccountMeta: vi.fn(async () => ({
      id: 7,
      userId: 1,
      provider: 'GOOGLE',
      providerAccountId: 'sub-7',
      emailAddress: 'sender@gmail.com',
      displayName: 'Sender',
      status: 'ACTIVE',
      grantedScopes: ['openid', 'https://www.googleapis.com/auth/gmail.send'],
    })),
  },
}));

const draftFields = {
  recruiterEmail: 'recruiter@example.com',
  subject: 'Role at Acme',
  bodyText: 'I am interested.',
  resumeId: '11111111-1111-4111-8111-111111111111',
  version: 3,
};

const contentHash = hashAiMailContent(draftFields);

const makeDraft = (): AiMailDraft => ({
  id: '33333333-3333-4333-8333-333333333333',
  userId: '1',
  recruiterEmail: draftFields.recruiterEmail,
  companyName: 'Acme',
  roleTitle: 'Engineer',
  jobDescription: 'Build things',
  resumeId: draftFields.resumeId,
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  subject: draftFields.subject,
  bodyText: draftFields.bodyText,
  status: 'ready_to_send',
  version: draftFields.version,
  userEdited: false,
  contentHash,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

class MemoryDeliveryRepo implements MailDeliveryRepository {
  rows: MailDeliveryRecord[] = [];

  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<MailDeliveryRecord | null> {
    return (
      this.rows.find((r) => r.userId === userId && r.idempotencyKey === idempotencyKey) ?? null
    );
  }

  async findSuccessfulByDraftHash(input: {
    draftId: string;
    contentHash: string;
    draftVersion: number;
  }): Promise<MailDeliveryRecord | null> {
    return (
      this.rows.find(
        (r) =>
          r.draftId === input.draftId &&
          r.contentHash === input.contentHash &&
          r.draftVersion === input.draftVersion &&
          r.status === 'sent',
      ) ?? null
    );
  }

  async findByIdForUser(id: string, userId: string): Promise<MailDeliveryRecord | null> {
    return this.rows.find((r) => r.id === id && r.userId === userId) ?? null;
  }

  async listForUser(filter: ListMailDeliveriesFilter): Promise<MailDeliveryPage> {
    const items = this.rows.filter((r) => r.userId === filter.userId);
    return { items, page: filter.page, limit: filter.limit, total: items.length };
  }

  async listForDraft(draftId: string, userId: string): Promise<MailDeliveryRecord[]> {
    return this.rows.filter((r) => r.draftId === draftId && r.userId === userId);
  }

  async findRecentByRecipientHash(): Promise<MailDeliveryRecord[]> {
    return [];
  }

  async countAttemptsInWindow(): Promise<number> {
    return this.rows.length;
  }

  async create(input: CreateMailDeliveryInput): Promise<MailDeliveryRecord> {
    const existing = await this.findByIdempotencyKey(input.userId, input.idempotencyKey);
    if (existing) return existing;
    const now = new Date();
    const row: MailDeliveryRecord = {
      id: `del-${this.rows.length + 1}`,
      ...input,
      attemptedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return row;
  }

  async update(id: string, input: UpdateMailDeliveryInput): Promise<MailDeliveryRecord> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index < 0) throw new Error('missing');
    this.rows[index] = {
      ...this.rows[index],
      ...input,
      sentAt: input.sentAt === null ? undefined : (input.sentAt ?? this.rows[index].sentAt),
      updatedAt: new Date(),
    };
    return this.rows[index];
  }
}

describe('MailDeliveryService', () => {
  let drafts: AiMailDraftRepository;
  let deliveries: MemoryDeliveryRepo;
  let mailbox: FakeMailboxProvider;

  const enabledConfig = {
    phase2: { mailSendingEnabled: true, gmailIntegrationEnabled: true },
    limits: {
      sendsPerUserPerHour: 10,
      sendsPerUserPerDay: 30,
      minFollowUpIntervalHours: 72,
    },
  };

  beforeEach(() => {
    deliveries = new MemoryDeliveryRepo();
    mailbox = new FakeMailboxProvider('success');
    drafts = {
      findByIdForUser: vi.fn(async () => makeDraft()),
    } as unknown as AiMailDraftRepository;
  });

  const buildService = (mode: 'success' | 'failed' | 'unknown' = 'success') => {
    mailbox = new FakeMailboxProvider(mode);
    return new MailDeliveryService(
      drafts,
      deliveries,
      mailbox,
      {
        resolve: async () => ({
          filename: 'resume.pdf',
          mimeType: 'application/pdf',
          content: Buffer.from('%PDF'),
        }),
      },
      enabledConfig as never,
    );
  };

  it('fails closed when sending is disabled', async () => {
    const service = new MailDeliveryService(
      drafts,
      deliveries,
      mailbox,
      {
        resolve: async () => ({
          filename: 'a.pdf',
          mimeType: 'application/pdf',
          content: Buffer.from('x'),
        }),
      },
      {
        phase2: { mailSendingEnabled: false, gmailIntegrationEnabled: true },
        limits: enabledConfig.limits,
      } as never,
    );

    await expect(
      service.sendApprovedDraft({
        userId: '1',
        draftId: makeDraft().id,
        version: 3,
        contentHash,
        connectedAccountId: 7,
        idempotencyKey: 'idem-key-001',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_SENDING_DISABLED' });
  });

  it('sends successfully and persists delivery without a second Gmail call on idempotent replay', async () => {
    const service = buildService('success');
    const first = await service.sendApprovedDraft({
      userId: '1',
      draftId: makeDraft().id,
      version: 3,
      contentHash,
      connectedAccountId: 7,
      idempotencyKey: 'idem-key-abc',
    });

    expect(first.status).toBe('sent');
    expect(first.idempotentReplay).toBe(false);
    expect(mailbox.calls).toHaveLength(1);
    expect(deliveries.rows[0]?.subjectSnapshot).toBe('Role at Acme');
    expect(deliveries.rows[0]?.recipientHash).toBeTruthy();

    const second = await service.sendApprovedDraft({
      userId: '1',
      draftId: makeDraft().id,
      version: 3,
      contentHash,
      connectedAccountId: 7,
      idempotencyKey: 'idem-key-abc',
    });

    expect(second.idempotentReplay).toBe(true);
    expect(mailbox.calls).toHaveLength(1);
  });

  it('marks unknown outcomes and rejects blind retry', async () => {
    const service = buildService('unknown');

    await expect(
      service.sendApprovedDraft({
        userId: '1',
        draftId: makeDraft().id,
        version: 3,
        contentHash,
        connectedAccountId: 7,
        idempotencyKey: 'idem-unknown',
      }),
    ).rejects.toMatchObject({ code: 'MAIL_DELIVERY_UNKNOWN' });

    expect(deliveries.rows[0]?.status).toBe('unknown');

    await expect(
      service.sendApprovedDraft({
        userId: '1',
        draftId: makeDraft().id,
        version: 3,
        contentHash,
        connectedAccountId: 7,
        idempotencyKey: 'idem-unknown',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
