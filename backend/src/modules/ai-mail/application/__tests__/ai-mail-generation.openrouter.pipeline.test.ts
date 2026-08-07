import { describe, expect, it, vi } from 'vitest';

import { AiMailGenerationService } from '@/modules/ai-mail/application/ai-mail-generation.service.js';
import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { AiMailGenerationReadinessService } from '@/modules/ai-mail/application/ai-mail-generation-readiness.service.js';
import type { MailGenerationRevisionService } from '@/modules/ai-mail/application/mail-generation-revision.service.js';
import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { OpenRouterMailGenerationAdapter } from '@/modules/ai-mail/providers/openrouter/openrouter-mail.adapter.js';

const draftId = '22222222-2222-4222-8222-222222222222';
const userId = 'user-1';

const baseDraft = (): AiMailDraft => ({
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

const createPipeline = (output: Record<string, unknown>) => {
  let currentDraft = baseDraft();
  const fetchImpl = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          id: 'or-1',
          model: 'routed/free-model',
          choices: [
            {
              finish_reason: 'stop',
              message: { role: 'assistant', content: JSON.stringify(output) },
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 9 },
        }),
        { status: 200, headers: { 'x-request-id': 'pipe-req' } },
      ),
  ) as unknown as typeof fetch;

  const provider = new OpenRouterMailGenerationAdapter({
    apiKey: 'test-key',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/free',
    fallbackModels: [],
    appName: 'Career Copilot',
    structuredOutputEnabled: false,
    freeRouterAllowed: true,
    temperature: 0.4,
    maxOutputTokens: 1200,
    timeoutMs: 5_000,
    maxRetries: 0,
    fetchImpl,
  });

  const repository: AiMailDraftRepository = {
    create: vi.fn(),
    findByIdForUser: vi.fn(async () => currentDraft),
    listForUser: vi.fn(),
    updateForUser: vi.fn(async (_id, _userId, input) => {
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
      providerName: 'openrouter',
      providerModel: input.providerModel,
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

  const service = new AiMailGenerationService(repository, readiness, revisions, provider);
  return { service, repository, revisions, fetchImpl, getDraft: () => currentDraft };
};

describe('AiMailGenerationService + OpenRouterMailGenerationAdapter', () => {
  it('runs the existing pipeline end-to-end with mocked OpenRouter HTTP', async () => {
    const { service, repository, revisions, getDraft } = createPipeline({
      subject: 'Application for Backend Engineer',
      bodyText:
        'Hello,\n\nI am interested in the Backend Engineer role. My experience with TypeScript aligns with the role requirements.\n\nI have included my resume for your review.\n\nI would welcome the opportunity to discuss how I could contribute.\n\nBest regards,\nAlex Candidate',
      detectedContext: { roleTitle: 'Backend Engineer' },
      highlightedQualifications: [{ claim: 'TypeScript', evidenceCategory: 'skill' }],
      warnings: [],
    });

    const result = await service.generateFull(userId, draftId, { version: 1 });

    expect(result.draft.status).toBe('generated');
    expect(result.output.subject).toContain('Backend Engineer');
    expect(getDraft().generatedBy?.provider).toBe('openrouter');
    expect(getDraft().generatedBy?.model).toBe('routed/free-model');
    expect(repository.createAttempt).toHaveBeenCalled();
    expect(repository.updateAttempt).toHaveBeenCalled();
    expect(revisions.create).toHaveBeenCalled();
  });

  it('still blocks unsupported claims via MailTruthfulnessValidator outside the adapter', async () => {
    const { service } = createPipeline({
      subject: 'Application for Backend Engineer',
      bodyText:
        'I led a mission to Mars and invented quantum teleportation for your Backend Engineer role. Please see my resume. I would welcome the opportunity to discuss.',
      detectedContext: { roleTitle: 'Backend Engineer' },
      highlightedQualifications: [{ claim: 'mission to Mars', evidenceCategory: 'achievement' }],
      warnings: [],
    });

    await expect(service.generateFull(userId, draftId, { version: 1 })).rejects.toMatchObject({
      code: expect.stringMatching(
        /AI_MAIL_(UNSUPPORTED_CLAIM|CLAIM_REVIEW_REQUIRED|OUTPUT_INVALID)/,
      ),
    });
  });
});
