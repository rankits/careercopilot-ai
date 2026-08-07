import { describe, expect, it, vi } from 'vitest';

import { DuplicateSendAssessor } from '@/modules/ai-mail/delivery/policy/duplicate-send-assessor.js';
import type {
  MailDeliveryRecord,
  MailDeliveryRepository,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { hashAiMailContent } from '@/modules/ai-mail/domain/content-hasher.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';

vi.mock('@/modules/ai-mail/delivery/domain/recipient-hasher.js', () => ({
  hashRecipientEmail: (email: string) => `hash:${email.toLowerCase()}`,
}));

const draft = (overrides: Partial<AiMailDraft> = {}): AiMailDraft => ({
  id: '33333333-3333-4333-8333-333333333333',
  userId: '1',
  recruiterEmail: 'recruiter@example.com',
  companyName: 'Acme',
  roleTitle: 'Engineer',
  jobDescription: 'JD',
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
  contentHash: hashAiMailContent({
    recruiterEmail: 'recruiter@example.com',
    subject: 'Hello',
    bodyText: 'Body',
    resumeId: '11111111-1111-4111-8111-111111111111',
    version: 2,
  }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const sentRow = (overrides: Partial<MailDeliveryRecord> = {}): MailDeliveryRecord => ({
  id: 'del-1',
  userId: '1',
  draftId: draft().id,
  draftVersion: 2,
  contentHash: draft().contentHash!,
  connectedAccountId: 1,
  provider: 'google',
  status: 'sent',
  idempotencyKey: 'idem-1',
  recipientEmail: 'recruiter@example.com',
  recipientHash: 'hash:recruiter@example.com',
  fromEmail: 'me@gmail.com',
  resumeId: draft().resumeId,
  companyNameSnapshot: 'Acme',
  roleTitleSnapshot: 'Engineer',
  attemptedAt: new Date(),
  sentAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('DuplicateSendAssessor', () => {
  it('hard-blocks exact draft/version/contentHash duplicates', async () => {
    const deliveries = {
      findSuccessfulByDraftHash: vi.fn(async () => sentRow()),
      findRecentByRecipientHash: vi.fn(async () => []),
    } as unknown as MailDeliveryRepository;

    const assessor = new DuplicateSendAssessor(deliveries, 72);
    const result = await assessor.assess({
      userId: '1',
      draft: draft(),
      contentHash: draft().contentHash!,
      version: 2,
    });
    expect(result.level).toBe('hard_block');
  });

  it('warns for same draft with different content', async () => {
    const deliveries = {
      findSuccessfulByDraftHash: vi.fn(async () => null),
      findRecentByRecipientHash: vi.fn(async () => [sentRow({ contentHash: 'different-hash' })]),
    } as unknown as MailDeliveryRepository;

    const assessor = new DuplicateSendAssessor(deliveries, 72);
    const result = await assessor.assess({
      userId: '1',
      draft: draft(),
      contentHash: draft().contentHash!,
      version: 2,
    });
    expect(result.level).toBe('warning');
  });

  it('returns info for same recruiter on unrelated jobs', async () => {
    const deliveries = {
      findSuccessfulByDraftHash: vi.fn(async () => null),
      findRecentByRecipientHash: vi.fn(async () => [
        sentRow({
          draftId: '44444444-4444-4444-8444-444444444444',
          companyNameSnapshot: 'OtherCo',
          roleTitleSnapshot: 'Analyst',
          contentHash: 'other',
        }),
      ]),
    } as unknown as MailDeliveryRepository;

    const assessor = new DuplicateSendAssessor(deliveries, 72);
    const result = await assessor.assess({
      userId: '1',
      draft: draft(),
      contentHash: draft().contentHash!,
      version: 2,
    });
    expect(result.level).toBe('info');
  });
});
