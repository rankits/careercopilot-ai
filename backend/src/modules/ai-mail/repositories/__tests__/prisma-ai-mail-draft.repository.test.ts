import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  aiMailDraft: {
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateManyAndReturn: vi.fn(),
  },
  aiMailGenerationAttempt: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  aiMailDraftRevision: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  resume: {
    count: vi.fn(),
  },
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    aiMailDraft: mocks.aiMailDraft,
    aiMailGenerationAttempt: mocks.aiMailGenerationAttempt,
    resume: mocks.resume,
  },
}));

import { PrismaAiMailDraftRepository } from '@/modules/ai-mail/repositories/prisma-ai-mail-draft.repository.js';

const draftRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: 'user-1',
  recruiterEmail: 'recruiter@example.com',
  recruiterName: null,
  companyName: null,
  roleTitle: null,
  jobUrl: null,
  jobDescription: 'Role',
  additionalContext: null,
  resumeId: '11111111-1111-4111-8111-111111111111',
  profileSnapshotId: null,
  constraints: {},
  subject: null,
  bodyText: null,
  bodyHtml: null,
  status: 'input' as const,
  version: 2,
  provider: null,
  providerModel: null,
  providerRequestId: null,
  generatedAt: null,
  userEdited: false,
  contentHash: null,
  lastContextHash: null,
  archivedAt: null,
  createdAt: new Date('2026-08-07T00:00:00.000Z'),
  updatedAt: new Date('2026-08-07T00:00:01.000Z'),
};

describe('PrismaAiMailDraftRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies owner/version CAS and increments version atomically', async () => {
    mocks.aiMailDraft.updateManyAndReturn.mockResolvedValue([draftRecord]);
    const repository = new PrismaAiMailDraftRepository();
    await repository.updateForUser(draftRecord.id, 'user-1', {
      expectedVersion: 1,
      changes: { subject: 'Hello', contentHash: null },
    });
    expect(mocks.aiMailDraft.updateManyAndReturn).toHaveBeenCalledWith({
      where: { id: draftRecord.id, userId: 'user-1', version: 1 },
      data: expect.objectContaining({
        subject: 'Hello',
        contentHash: null,
        version: { increment: 1 },
      }),
    });
  });

  it('creates and reads domain drafts scoped to the owner', async () => {
    mocks.aiMailDraft.create.mockResolvedValue(draftRecord);
    mocks.aiMailDraft.findFirst.mockResolvedValue(draftRecord);
    const repository = new PrismaAiMailDraftRepository();

    const created = await repository.create({
      userId: draftRecord.userId,
      recruiterEmail: draftRecord.recruiterEmail,
      jobDescription: draftRecord.jobDescription,
      resumeId: draftRecord.resumeId,
      constraints: {
        tone: 'professional',
        includeCallToAction: true,
        includeResumeMention: true,
        emphasizeSkills: [],
        emphasizeAchievements: [],
        avoidTopics: [],
      },
      status: 'input',
      userEdited: false,
    });
    const found = await repository.findByIdForUser(draftRecord.id, draftRecord.userId);

    expect(created.id).toBe(draftRecord.id);
    expect(found?.id).toBe(draftRecord.id);
    expect(mocks.aiMailDraft.findFirst).toHaveBeenCalledWith({
      where: { id: draftRecord.id, userId: draftRecord.userId },
    });
  });

  it('excludes archived drafts from normal paginated listing', async () => {
    mocks.aiMailDraft.count.mockResolvedValue(1);
    mocks.aiMailDraft.findMany.mockResolvedValue([draftRecord]);
    const repository = new PrismaAiMailDraftRepository();

    const page = await repository.listForUser('user-1', { page: 1, limit: 20 });

    expect(page).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(mocks.aiMailDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', archivedAt: null },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  });

  it('archives using owner and version guards', async () => {
    mocks.aiMailDraft.updateManyAndReturn.mockResolvedValue([
      { ...draftRecord, status: 'archived', archivedAt: new Date() },
    ]);
    const repository = new PrismaAiMailDraftRepository();

    await repository.archiveForUser(draftRecord.id, 'user-1', 1);

    expect(mocks.aiMailDraft.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: draftRecord.id,
        userId: 'user-1',
        version: 1,
        status: { not: 'generating' },
      },
      data: expect.objectContaining({
        status: 'archived',
        contentHash: null,
        version: { increment: 1 },
      }),
    });
  });

  it('checks resume ownership with both resume and user identifiers', async () => {
    mocks.resume.count.mockResolvedValue(1);
    const repository = new PrismaAiMailDraftRepository();
    await expect(repository.resumeBelongsToUser(draftRecord.resumeId, 'user-1')).resolves.toBe(
      true,
    );
    expect(mocks.resume.count).toHaveBeenCalledWith({
      where: { id: draftRecord.resumeId, userId: 'user-1' },
    });
  });

  it('stores and maps only privacy-safe attempt metadata', async () => {
    const record = {
      id: '33333333-3333-4333-8333-333333333333',
      draftId: draftRecord.id,
      userId: 'user-1',
      operation: 'generate',
      status: 'failed' as const,
      providerName: 'fake',
      providerModel: 'test-model',
      providerRequestId: 'request-1',
      durationMs: 12,
      inputTokenCount: 10,
      outputTokenCount: 20,
      normalizedErrorCode: 'TIMEOUT',
      retryCount: 0,
      contextHash: 'ctx-hash',
      promptVersion: 'v1',
      outputSchemaVersion: 'v1',
      idempotencyKey: null,
      createdAt: new Date('2026-08-07T00:00:00.000Z'),
      updatedAt: new Date('2026-08-07T00:00:00.000Z'),
    };
    mocks.aiMailGenerationAttempt.create.mockResolvedValue(record);
    const repository = new PrismaAiMailDraftRepository();
    const attempt = await repository.createAttempt({
      draftId: record.draftId,
      userId: record.userId,
      operation: record.operation,
      status: record.status,
      providerName: record.providerName,
      providerModel: record.providerModel,
      providerRequestId: record.providerRequestId,
      durationMs: record.durationMs,
      inputTokenCount: record.inputTokenCount,
      outputTokenCount: record.outputTokenCount,
      normalizedErrorCode: record.normalizedErrorCode,
    });
    expect(attempt).toMatchObject({
      normalizedErrorCode: 'TIMEOUT',
      providerRequestId: 'request-1',
    });
    expect(mocks.aiMailGenerationAttempt.create.mock.calls[0]?.[0].data).not.toHaveProperty(
      'prompt',
    );
    expect(mocks.aiMailGenerationAttempt.create.mock.calls[0]?.[0].data).not.toHaveProperty(
      'content',
    );
  });
});
