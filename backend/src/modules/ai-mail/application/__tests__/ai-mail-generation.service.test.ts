import { describe, expect, it, vi } from 'vitest';

import { AiMailGenerationService } from '@/modules/ai-mail/application/ai-mail-generation.service.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { MailGenerationProvider } from '@/modules/ai-mail/contracts/mail-generation-provider.contract.js';
import type { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
import type { MailGenerationRevisionService } from '@/modules/ai-mail/application/mail-generation-revision.service.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const draftId = '22222222-2222-4222-8222-222222222222';
const userId = 'user-1';

const baseDraft = (overrides: Partial<AiMailDraft> = {}): AiMailDraft => ({
  id: draftId,
  userId,
  recruiterEmail: 'recruiter@example.com',
  jobDescription: 'Backend engineer role requiring TypeScript',
  resumeId: '11111111-1111-4111-8111-111111111111',
  constraints: {
    tone: 'professional',
    includeCallToAction: true,
    includeResumeMention: true,
    emphasizeSkills: ['TypeScript'],
    emphasizeAchievements: [],
    avoidTopics: [],
  },
  subject: 'Old subject',
  bodyText: 'Old body with resume mention and opportunity to discuss.',
  status: 'input',
  version: 1,
  userEdited: false,
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
  ...overrides,
});

const builtContext = {
  context: {
    candidate: {
      fullName: 'Alex Candidate',
      skills: ['TypeScript'],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      approvedAchievements: [],
      professionalLinks: [],
    },
    resume: {
      resumeId: '11111111-1111-4111-8111-111111111111',
      fileName: 'resume.pdf',
      skills: ['TypeScript'],
      experience: [],
      verifiedAchievements: [],
      projects: [],
      education: [],
      certifications: [],
      parseStatus: 'COMPLETED' as const,
    },
    job: {
      description: 'Backend engineer role requiring TypeScript',
      recruiterEmail: 'recruiter@example.com',
      responsibilities: [],
      requirements: [],
      preferredQualifications: [],
      technologies: ['TypeScript'],
      keywords: [],
      suspiciousInstructionsDetected: false,
      roleTitle: 'Backend Engineer',
    },
    constraints: baseDraft().constraints,
    trustBoundary: {
      candidate: { trust: 'trusted_user_data' as const, value: {} as never },
      resume: { trust: 'trusted_user_data' as const, value: {} as never },
      job: {
        trust: 'untrusted_external_content' as const,
        value: {} as never,
        instructionsMustBeIgnored: true as const,
      },
      constraints: { trust: 'trusted_user_data' as const, value: {} as never },
    },
    contextHash: 'ctx-hash',
  },
  evidence: [
    {
      path: 'resume.skill[0]',
      source: 'resume' as const,
      sensitivity: 'professional' as const,
      category: 'skill' as const,
      value: 'TypeScript',
    },
  ],
};

const providerOutput = {
  subject: 'Application for Backend Engineer',
  bodyText:
    'Hello,\n\nI am interested in the Backend Engineer role. My experience with TypeScript aligns with the role requirements.\n\nI have included my resume for your review.\n\nI would welcome the opportunity to discuss how I could contribute.\n\nBest regards,\nAlex Candidate',
  detectedContext: { roleTitle: 'Backend Engineer' },
  highlightedQualifications: [{ claim: 'TypeScript', evidenceCategory: 'skill' }],
  warnings: [],
};

const createHarness = (options?: {
  draft?: AiMailDraft;
  provider?: Partial<MailGenerationProvider>;
  repository?: Partial<AiMailDraftRepository>;
}) => {
  let currentDraft = options?.draft ?? baseDraft();
  const repository: AiMailDraftRepository = {
    create: vi.fn(),
    findByIdForUser: vi.fn(async () => currentDraft),
    listForUser: vi.fn(),
    updateForUser: vi.fn(async (_draftId, _userId, input) => {
      if (currentDraft.version !== input.expectedVersion) return null;
      const { changes } = input;
      currentDraft = {
        ...currentDraft,
        status: changes.status ?? currentDraft.status,
        subject: changes.subject === null ? undefined : (changes.subject ?? currentDraft.subject),
        bodyText:
          changes.bodyText === null ? undefined : (changes.bodyText ?? currentDraft.bodyText),
        bodyHtml:
          changes.bodyHtml === null ? undefined : (changes.bodyHtml ?? currentDraft.bodyHtml),
        userEdited: changes.userEdited ?? currentDraft.userEdited,
        generatedBy:
          changes.generatedBy === null
            ? undefined
            : (changes.generatedBy ?? currentDraft.generatedBy),
        version: currentDraft.version + 1,
      };
      return currentDraft;
    }),
    archiveForUser: vi.fn(),
    resumeBelongsToUser: vi.fn(),
    createAttempt: vi.fn(async (input) => ({
      id: 'attempt-1',
      createdAt: '2026-08-07T00:00:00.000Z',
      retryCount: 0,
      ...input,
    })),
    updateAttempt: vi.fn(async (_id, input) => ({
      id: 'attempt-1',
      draftId,
      userId,
      operation: 'generate_full',
      status: input.status,
      providerName: 'fake',
      retryCount: 0,
      createdAt: '2026-08-07T00:00:00.000Z',
    })),
    listAttemptsForDraft: vi.fn(),
    countAttemptsForUserSince: vi.fn(async () => 0),
    countRegenerationsForDraft: vi.fn(async () => 0),
    findAttemptByIdempotency: vi.fn(async () => null),
    createRevision: vi.fn(async (input) => ({
      id: 'revision-1',
      revisionNumber: 1,
      createdAt: '2026-08-07T00:00:00.000Z',
      ...input,
    })),
    listRevisionsForDraft: vi.fn(),
    findRevisionForUser: vi.fn(),
    countRevisionsForDraft: vi.fn(async () => 0),
    ...options?.repository,
  };

  const readiness = {
    evaluate: vi.fn(async () => ({ ready: true, blockers: [], warnings: [] })),
    buildGenerationContext: vi.fn(async () => builtContext),
  } as unknown as AiMailGenerationReadinessService;

  const revisions = {
    create: vi.fn(async () => ({
      id: 'revision-1',
      draftId,
      draftVersion: 2,
      revisionNumber: 1,
      source: 'ai_generated',
      createdAt: '2026-08-07T00:00:00.000Z',
    })),
    list: vi.fn(),
    restore: vi.fn(),
  } as unknown as MailGenerationRevisionService;

  const provider: MailGenerationProvider = {
    providerName: 'fake',
    generate: vi.fn(async () => ({
      provider: 'fake',
      model: 'deterministic-template-v1',
      output: providerOutput,
      durationMs: 1,
    })),
    regenerateMail: vi.fn(),
    healthCheck: vi.fn(),
    ...options?.provider,
  };

  const service = new AiMailGenerationService(repository, readiness, revisions, provider);
  return {
    service,
    repository,
    provider,
    getDraft: () => currentDraft,
    setDraft: (draft: AiMailDraft) => {
      currentDraft = draft;
    },
  };
};

describe('AiMailGenerationService', () => {
  it('generates mail through the full pipeline', async () => {
    const { service, provider, getDraft } = createHarness();
    const result = await service.generateFull(userId, draftId, { version: 1 });

    expect(provider.generate).toHaveBeenCalled();
    expect(result.output.subject).toContain('Backend Engineer');
    expect(getDraft().status).toBe('generated');
    expect(result.idempotentReplay).toBe(false);
  });

  it('preserves prior content and marks generation_failed on provider failure', async () => {
    const draft = baseDraft({ subject: 'Keep me', bodyText: 'Keep body', status: 'edited' });
    const { service, getDraft, provider } = createHarness({
      draft,
      provider: {
        generate: vi.fn(async () => {
          throw new AppError('Fake provider timed out', 504, 'AI_MAIL_PROVIDER_TIMEOUT');
        }),
      },
    });

    await expect(service.generateFull(userId, draftId, { version: 1 })).rejects.toMatchObject({
      code: 'AI_MAIL_PROVIDER_TIMEOUT',
    });
    expect(getDraft().subject).toBe('Keep me');
    expect(getDraft().bodyText).toBe('Keep body');
    expect(getDraft().status).toBe('generation_failed');
  });

  it('rejects stale draft versions', async () => {
    const { service } = createHarness({ draft: baseDraft({ version: 2 }) });
    await expect(service.generateFull(userId, draftId, { version: 1 })).rejects.toMatchObject({
      code: 'AI_MAIL_GENERATION_STALE',
    });
  });

  it('requires confirmation before overwriting user edits', async () => {
    const { service } = createHarness({ draft: baseDraft({ userEdited: true, status: 'edited' }) });
    await expect(service.generateFull(userId, draftId, { version: 1 })).rejects.toMatchObject({
      code: 'AI_MAIL_USER_EDITS_OVERWRITE_CONFIRMATION_REQUIRED',
    });
  });

  it('enforces generation rate limits', async () => {
    const { service, repository } = createHarness({
      repository: {
        countAttemptsForUserSince: vi.fn(async () => 999),
      },
    });
    await expect(service.generateFull(userId, draftId, { version: 1 })).rejects.toMatchObject({
      code: 'AI_MAIL_GENERATION_RATE_LIMIT',
    });
    expect(repository.countAttemptsForUserSince).toHaveBeenCalled();
  });

  it('replays successful idempotent requests without calling the provider again', async () => {
    const draft = baseDraft({
      status: 'generated',
      subject: 'Cached subject',
      bodyText: 'Cached body',
      version: 3,
    });
    const { service, provider } = createHarness({
      draft,
      repository: {
        findAttemptByIdempotency: vi.fn(async () => ({
          id: 'attempt-old',
          draftId,
          userId,
          operation: 'generate_full',
          status: 'succeeded',
          providerName: 'fake',
          retryCount: 0,
          createdAt: '2026-08-07T00:00:00.000Z',
        })),
      },
    });

    const result = await service.generateFull(userId, draftId, {
      version: 3,
      idempotencyKey: 'idem-key-12345678',
    });

    expect(result.idempotentReplay).toBe(true);
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
