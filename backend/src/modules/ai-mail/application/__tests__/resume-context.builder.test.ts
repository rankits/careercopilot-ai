import { describe, expect, it } from 'vitest';

import {
  ResumeContextBuilder,
  ResumeContextLoader,
} from '@/modules/ai-mail/application/resume-context.builder.js';
import type {
  ResumeContextRepository,
  SafeResumeRecord,
} from '@/modules/ai-mail/contracts/resume-context.repository.js';

const record = (overrides: Partial<SafeResumeRecord> = {}): SafeResumeRecord => ({
  id: 'resume-1',
  fileName: 'resume.pdf',
  originalName: 'Ada Lovelace.pdf',
  status: 'PROCESSED',
  uploadedAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  processedAt: new Date('2026-01-01T00:01:00Z'),
  latestParse: {
    status: 'COMPLETED',
    parsedData: { skills: ['TypeScript'], personalDetails: { name: 'Ada' } },
    extractedData: null,
  },
  ...overrides,
});

const builder = new ResumeContextBuilder({
  maxProfileSkills: 50,
  maxExperienceEntries: 10,
  maxExperienceHighlightsPerEntry: 8,
  maxProjects: 10,
  maxAchievements: 20,
});

describe('ResumeContextLoader', () => {
  it('uses profile source, then active approved, then newest eligible as primary', async () => {
    const records = [
      record({ id: 'newest', uploadedAt: new Date('2026-03-01') }),
      record({ id: 'approved', uploadedAt: new Date('2026-02-01') }),
      record({ id: 'source', uploadedAt: new Date('2026-01-01') }),
    ];
    const repository: ResumeContextRepository = {
      findForUser: async (id) => records.find((item) => item.id === id) ?? null,
      listForUser: async () => records,
      selectionHints: async () => ({
        sourceResumeId: 'source',
        activeApprovedResumeId: 'approved',
      }),
    };

    const list = await new ResumeContextLoader(repository, builder).listForUser('user-1');
    expect(list.primaryResumeId).toBe('source');
    expect(list.items.find((item) => item.id === 'source')?.isPrimary).toBe(true);
  });

  it.each([
    ['foreign or missing', null, 'AI_MAIL_RESUME_NOT_FOUND'],
    ['processing', record({ status: 'PROCESSING' }), 'AI_MAIL_RESUME_PROCESSING'],
    [
      'failed',
      record({ latestParse: { status: 'FAILED', parsedData: null, extractedData: null } }),
      'AI_MAIL_RESUME_FAILED',
    ],
    [
      'not parsed',
      record({ latestParse: { status: 'COMPLETED', parsedData: {}, extractedData: null } }),
      'AI_MAIL_RESUME_NOT_PARSED',
    ],
  ])('rejects %s resumes with a stable code', async (_label, value, code) => {
    const repository: ResumeContextRepository = {
      findForUser: async () => value,
      listForUser: async () => [],
      selectionHints: async () => ({}),
    };
    await expect(
      new ResumeContextLoader(repository, builder).loadForUser('resume-1', 'user-1'),
    ).rejects.toMatchObject({ code });
  });

  it('allows NEEDS_REVIEW with an explicit warning in metadata', async () => {
    const needsReview = record({
      latestParse: {
        status: 'NEEDS_REVIEW',
        parsedData: { skills: ['React'] },
        extractedData: null,
      },
    });
    const repository: ResumeContextRepository = {
      findForUser: async () => needsReview,
      listForUser: async () => [needsReview],
      selectionHints: async () => ({}),
    };
    const loader = new ResumeContextLoader(repository, builder);

    await expect(loader.loadForUser('resume-1', 'user-1')).resolves.toMatchObject({
      parseStatus: 'NEEDS_REVIEW',
    });
    await expect(loader.listForUser('user-1')).resolves.toMatchObject({
      items: [{ availability: 'needs_review', warning: expect.any(String) }],
    });
  });
});
