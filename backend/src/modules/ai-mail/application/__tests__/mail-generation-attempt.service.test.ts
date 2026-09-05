import { describe, expect, it, vi } from 'vitest';

import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import { MailGenerationAttemptService } from '@/modules/ai-mail/application/mail-generation-attempt.service.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';

const draft: AiMailDraft = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: 'user-1',
  recruiterEmail: 'recruiter@example.com',
  jobDescription: 'Role',
  resumeId: '11111111-1111-4111-8111-111111111111',
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  status: 'input',
  version: 1,
  userEdited: false,
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
};

describe('MailGenerationAttemptService', () => {
  it('records metadata only after checking draft ownership', async () => {
    const repository = {
      findByIdForUser: vi.fn().mockResolvedValue(draft),
      createAttempt: vi.fn().mockImplementation(async (input) => ({
        id: 'attempt-1',
        createdAt: '2026-08-07T00:00:00.000Z',
        retryCount: 0,
        ...input,
      })),
    } as unknown as AiMailDraftRepository;
    const service = new MailGenerationAttemptService(repository);

    await service.recordGenerationAttempt('user-1', draft.id, {
      operation: 'generate',
      providerName: 'fake',
      providerModel: 'deterministic-template-v1',
      status: 'succeeded',
      durationMs: 12,
    });

    expect(repository.createAttempt).toHaveBeenCalledWith({
      draftId: draft.id,
      userId: 'user-1',
      operation: 'generate',
      providerName: 'fake',
      providerModel: 'deterministic-template-v1',
      status: 'succeeded',
      durationMs: 12,
    });
    const persisted = vi.mocked(repository.createAttempt).mock.calls[0]?.[0];
    expect(persisted).not.toHaveProperty('prompt');
    expect(persisted).not.toHaveProperty('jobDescription');
    expect(persisted).not.toHaveProperty('recruiterEmail');
    expect(persisted).not.toHaveProperty('bodyText');
  });
});
