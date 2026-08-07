import { describe, expect, it } from 'vitest';

import { hashAiMailContent } from '@/modules/ai-mail/domain/content-hasher.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';
import {
  assertDraftReadyToSend,
  assertMailSendingEnabled,
} from '@/modules/ai-mail/delivery/policy/send-policy.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { SendableGoogleAccountMeta } from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';
import { GMAIL_SEND_SCOPE } from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';

const baseDraftFields = {
  recruiterEmail: 'recruiter@example.com',
  subject: 'Hello',
  bodyText: 'Body content',
  resumeId: '11111111-1111-4111-8111-111111111111',
  version: 2,
};

const contentHash = hashAiMailContent(baseDraftFields);

const readyDraft = (): AiMailDraft =>
  ({
    id: '22222222-2222-4222-8222-222222222222',
    userId: '1',
    recruiterEmail: baseDraftFields.recruiterEmail,
    jobDescription: 'JD',
    resumeId: baseDraftFields.resumeId,
    constraints: {
      tone: 'professional',
      includeCallToAction: true,
      includeResumeMention: true,
      emphasizeSkills: [],
      emphasizeAchievements: [],
      avoidTopics: [],
    },
    subject: baseDraftFields.subject,
    bodyText: baseDraftFields.bodyText,
    status: 'ready_to_send',
    version: baseDraftFields.version,
    userEdited: false,
    contentHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as AiMailDraft;

const activeAccount = (): SendableGoogleAccountMeta => ({
  id: 9,
  userId: 1,
  provider: 'GOOGLE',
  providerAccountId: 'sub-1',
  emailAddress: 'me@gmail.com',
  displayName: 'Me',
  status: 'ACTIVE',
  grantedScopes: ['openid', 'email', GMAIL_SEND_SCOPE],
});

describe('send-policy', () => {
  it('fails closed when mail sending flags are off', () => {
    expect(() =>
      assertMailSendingEnabled({
        phase2: { mailSendingEnabled: false, gmailIntegrationEnabled: true },
      }),
    ).toThrow(AppError);

    try {
      assertMailSendingEnabled({
        phase2: { mailSendingEnabled: true, gmailIntegrationEnabled: false },
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('MAIL_SENDING_DISABLED');
    }
  });

  it('rejects drafts that are not ready_to_send', () => {
    const draft = { ...readyDraft(), status: 'edited' as const };
    expect(() =>
      assertDraftReadyToSend({
        config: { phase2: { mailSendingEnabled: true, gmailIntegrationEnabled: true } },
        draft,
        expectedVersion: draft.version,
        expectedContentHash: contentHash,
        account: activeAccount(),
      }),
    ).toThrow(/ready_to_send/);
  });

  it('rejects content hash mismatch and missing gmail.send scope', () => {
    expect(() =>
      assertDraftReadyToSend({
        config: { phase2: { mailSendingEnabled: true, gmailIntegrationEnabled: true } },
        draft: readyDraft(),
        expectedVersion: 2,
        expectedContentHash: 'deadbeef'.repeat(8),
        account: activeAccount(),
      }),
    ).toThrow(AppError);

    expect(() =>
      assertDraftReadyToSend({
        config: { phase2: { mailSendingEnabled: true, gmailIntegrationEnabled: true } },
        draft: readyDraft(),
        expectedVersion: 2,
        expectedContentHash: contentHash,
        account: { ...activeAccount(), grantedScopes: ['openid', 'email'] },
      }),
    ).toThrow(/gmail.send/);
  });

  it('accepts a ready draft with matching hash and scope', () => {
    expect(() =>
      assertDraftReadyToSend({
        config: { phase2: { mailSendingEnabled: true, gmailIntegrationEnabled: true } },
        draft: readyDraft(),
        expectedVersion: 2,
        expectedContentHash: contentHash,
        account: activeAccount(),
      }),
    ).not.toThrow();
  });
});
