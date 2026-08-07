import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aiMailService } from './aiMail.service';

const { deleteMock, getMock, patchMock, postMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  getMock: vi.fn(),
  patchMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/services/httpClient', () => ({
  httpClient: {
    delete: deleteMock,
    get: getMock,
    patch: patchMock,
    post: postMock,
  },
}));

const draft = {
  id: 'draft-1',
  userId: 'user-1',
  recruiterEmail: 'recruiter@example.com',
  jobDescription: 'Job description',
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

describe('aiMailService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists page one with the requested limit', async () => {
    getMock.mockResolvedValue({
      data: { data: { items: [draft], page: 1, limit: 20, total: 1 } },
    });

    await expect(aiMailService.listDrafts({ page: 1, limit: 20 })).resolves.toMatchObject({
      total: 1,
    });
    expect(getMock).toHaveBeenCalledWith('/ai-mail/drafts', {
      params: { page: 1, limit: 20 },
    });
  });

  it('sends the optimistic-lock version in the DELETE request body', async () => {
    deleteMock.mockResolvedValue({ data: { data: draft } });

    await aiMailService.archiveDraft('draft-1', { version: 4 });

    expect(deleteMock).toHaveBeenCalledWith('/ai-mail/drafts/draft-1', {
      data: { version: 4 },
    });
  });

  it('posts mark-ready to the draft action endpoint', async () => {
    postMock.mockResolvedValue({ data: { data: draft } });

    await aiMailService.markReady('draft-1', { version: 2 });

    expect(postMock).toHaveBeenCalledWith('/ai-mail/drafts/draft-1/mark-ready', {
      version: 2,
    });
  });

  it('loads resumes, profile summary, and readiness endpoints', async () => {
    getMock
      .mockResolvedValueOnce({ data: { data: { items: [], primaryResumeId: undefined } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            exists: false,
            confirmed: false,
            topSkills: [],
            fullNamePresent: false,
            currentRolePresent: false,
            locationPresent: false,
            skillCount: 0,
            experienceCount: 0,
            educationCount: 0,
            certificationCount: 0,
            achievementCount: 0,
            professionalLinkCount: 0,
            completenessPercent: 0,
            missingRecommendedSections: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            ready: false,
            blockers: [],
            warnings: [],
            profile: {
              exists: false,
              confirmed: false,
              topSkills: [],
              fullNamePresent: false,
              currentRolePresent: false,
              locationPresent: false,
              skillCount: 0,
              experienceCount: 0,
              educationCount: 0,
              certificationCount: 0,
              achievementCount: 0,
              professionalLinkCount: 0,
              completenessPercent: 0,
              missingRecommendedSections: [],
            },
            detectedJobMetadata: {},
            suggestedJobMetadata: {},
            counts: {
              profileSkills: 0,
              resumeSkills: 0,
              experienceEntries: 0,
              jobRequirements: 0,
              jobResponsibilities: 0,
              jobKeywords: 0,
            },
          },
        },
      });

    await aiMailService.listResumes();
    await aiMailService.getProfileSummary();
    await aiMailService.getGenerationReadiness('draft-1');

    expect(getMock).toHaveBeenNthCalledWith(1, '/ai-mail/resumes');
    expect(getMock).toHaveBeenNthCalledWith(2, '/ai-mail/profile-summary');
    expect(getMock).toHaveBeenNthCalledWith(3, '/ai-mail/drafts/draft-1/generation-readiness');
  });

  it('posts generate, regenerate, rewrite, and subject endpoints', async () => {
    const generationResult = {
      draft,
      output: {
        subject: 'Hello',
        bodyText: 'Body',
        detectedContext: {},
        highlightedQualifications: [],
        warnings: [],
      },
      attemptId: 'attempt-1',
      idempotentReplay: false,
    };
    postMock.mockResolvedValue({ data: { data: generationResult } });

    await aiMailService.generateDraft('draft-1', {
      version: 1,
      idempotencyKey: 'key-12345678',
    });
    await aiMailService.regenerateDraft('draft-1', { version: 2 });
    await aiMailService.rewriteDraft('draft-1', {
      version: 2,
      operation: 'shorten',
    });
    await aiMailService.generateSubject('draft-1', { version: 2 });

    expect(postMock).toHaveBeenNthCalledWith(1, '/ai-mail/drafts/draft-1/generate', {
      version: 1,
      idempotencyKey: 'key-12345678',
    });
    expect(postMock).toHaveBeenNthCalledWith(2, '/ai-mail/drafts/draft-1/regenerate', {
      version: 2,
    });
    expect(postMock).toHaveBeenNthCalledWith(3, '/ai-mail/drafts/draft-1/rewrite', {
      version: 2,
      operation: 'shorten',
    });
    expect(postMock).toHaveBeenNthCalledWith(4, '/ai-mail/drafts/draft-1/generate-subject', {
      version: 2,
    });
  });

  it('loads revisions and restores a revision', async () => {
    getMock.mockResolvedValue({
      data: {
        data: [
          {
            id: 'revision-1',
            draftId: 'draft-1',
            draftVersion: 1,
            revisionNumber: 1,
            source: 'ai_generated',
            createdAt: '2026-08-07T00:00:00.000Z',
          },
        ],
      },
    });
    postMock.mockResolvedValue({ data: { data: draft } });

    await aiMailService.listRevisions('draft-1');
    await aiMailService.restoreRevision('draft-1', 'revision-1', { version: 2 });

    expect(getMock).toHaveBeenCalledWith('/ai-mail/drafts/draft-1/revisions');
    expect(postMock).toHaveBeenCalledWith('/ai-mail/drafts/draft-1/revisions/revision-1/restore', {
      version: 2,
    });
  });
});
