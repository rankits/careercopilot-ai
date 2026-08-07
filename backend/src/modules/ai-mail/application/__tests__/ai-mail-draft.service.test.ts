import { describe, expect, it, vi } from 'vitest';

import { AiMailDraftService } from '@/modules/ai-mail/application/ai-mail-draft.service.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';

const draftId = '22222222-2222-4222-8222-222222222222';
const resumeId = '11111111-1111-4111-8111-111111111111';

const draft = (overrides: Partial<AiMailDraft> = {}): AiMailDraft => ({
  id: draftId,
  userId: 'user-1',
  recruiterEmail: 'recruiter@example.com',
  jobDescription: 'Senior engineer',
  resumeId,
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: [],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  subject: 'Application',
  bodyText: 'Hello Jane',
  status: 'edited',
  version: 1,
  userEdited: true,
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
  ...overrides,
});

const repository = (): AiMailDraftRepository => ({
  create: vi.fn(),
  findByIdForUser: vi.fn(),
  listForUser: vi.fn(),
  updateForUser: vi.fn(),
  archiveForUser: vi.fn(),
  resumeBelongsToUser: vi.fn(),
  createAttempt: vi.fn(),
  updateAttempt: vi.fn(),
  listAttemptsForDraft: vi.fn(),
  countAttemptsForUserSince: vi.fn(),
  countRegenerationsForDraft: vi.fn(),
  findAttemptByIdempotency: vi.fn(),
  createRevision: vi.fn(),
  listRevisionsForDraft: vi.fn(),
  findRevisionForUser: vi.fn(),
  countRevisionsForDraft: vi.fn(),
});

describe('AiMailDraftService', () => {
  it('uses the same resume-not-found response for missing and non-owned resumes', async () => {
    const repo = repository();
    vi.mocked(repo.resumeBelongsToUser).mockResolvedValue(false);
    const service = new AiMailDraftService(repo);
    await expect(
      service.create('user-1', {
        recruiterEmail: 'recruiter@example.com',
        jobDescription: 'Role',
        resumeId,
        constraints: draft().constraints,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'AI_MAIL_RESUME_NOT_FOUND' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns ready drafts to edited and clears their content hash', async () => {
    const repo = repository();
    vi.mocked(repo.findByIdForUser).mockResolvedValue(
      draft({ status: 'ready_to_send', contentHash: 'old-hash' }),
    );
    vi.mocked(repo.updateForUser).mockResolvedValue(draft({ status: 'edited', version: 2 }));
    const service = new AiMailDraftService(repo);

    await service.update('user-1', draftId, { version: 1, subject: 'Updated subject' });

    expect(repo.updateForUser).toHaveBeenCalledWith(draftId, 'user-1', {
      expectedVersion: 1,
      changes: {
        subject: 'Updated subject',
        userEdited: true,
        status: 'edited',
        contentHash: null,
      },
    });
  });

  it('blocks mutation and archival while generation is in progress', async () => {
    const repo = repository();
    vi.mocked(repo.findByIdForUser).mockResolvedValue(draft({ status: 'generating' }));
    const service = new AiMailDraftService(repo);

    await expect(service.archive('user-1', draftId, 1)).rejects.toMatchObject({
      code: 'AI_MAIL_INVALID_STATUS_TRANSITION',
    });
    await expect(
      service.update('user-1', draftId, { version: 1, subject: 'Changed' }),
    ).rejects.toMatchObject({ code: 'AI_MAIL_INVALID_STATUS_TRANSITION' });
  });

  it('rejects placeholders and hashes the incremented ready version', async () => {
    const repo = repository();
    vi.mocked(repo.findByIdForUser)
      .mockResolvedValueOnce(draft({ bodyText: 'Hello {{name}}' }))
      .mockResolvedValueOnce(draft());
    vi.mocked(repo.updateForUser).mockImplementation(async (_id, _userId, input) =>
      draft({
        status: 'ready_to_send',
        version: 2,
        contentHash: input.changes.contentHash ?? undefined,
      }),
    );
    const service = new AiMailDraftService(repo);

    await expect(service.markReady('user-1', draftId, 1)).rejects.toMatchObject({
      code: 'AI_MAIL_UNRESOLVED_PLACEHOLDERS',
    });
    const ready = await service.markReady('user-1', draftId, 1);
    expect(ready.contentHash).toHaveLength(64);
    expect(repo.updateForUser).toHaveBeenCalledWith(
      draftId,
      'user-1',
      expect.objectContaining({
        expectedVersion: 1,
        changes: expect.objectContaining({ status: 'ready_to_send' }),
      }),
    );
  });

  it('maps a lost compare-and-swap to a version conflict', async () => {
    const repo = repository();
    vi.mocked(repo.findByIdForUser)
      .mockResolvedValueOnce(draft())
      .mockResolvedValueOnce(draft({ version: 2 }));
    vi.mocked(repo.updateForUser).mockResolvedValue(null);
    const service = new AiMailDraftService(repo);

    await expect(
      service.update('user-1', draftId, { version: 1, subject: 'Changed' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'AI_MAIL_DRAFT_VERSION_CONFLICT' });
  });
});
