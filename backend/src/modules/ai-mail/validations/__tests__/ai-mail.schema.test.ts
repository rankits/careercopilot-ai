import { describe, expect, it } from 'vitest';

import {
  createAiMailDraftSchema,
  listAiMailDraftsSchema,
  updateAiMailDraftSchema,
} from '@/modules/ai-mail/validations/ai-mail.schema.js';

const resumeId = '11111111-1111-4111-8111-111111111111';

describe('AI Mail request schemas', () => {
  it('normalizes create input and deduplicates constraints', () => {
    const parsed = createAiMailDraftSchema.parse({
      body: {
        recruiterEmail: ' Recruiter@Example.COM ',
        jobDescription: '  Senior engineer  ',
        resumeId,
        constraints: {
          emphasizeSkills: [' TypeScript ', 'typescript', 'PostgreSQL'],
        },
      },
    });
    expect(parsed.body.recruiterEmail).toBe('recruiter@example.com');
    expect(parsed.body.jobDescription).toBe('Senior engineer');
    expect(parsed.body.constraints.emphasizeSkills).toEqual(['TypeScript', 'PostgreSQL']);
  });

  it('rejects unknown properties, non-http URLs, and HTML markup', () => {
    expect(() =>
      createAiMailDraftSchema.parse({
        body: {
          recruiterEmail: 'r@example.com',
          jobDescription: 'Role',
          resumeId,
          unexpected: true,
        },
      }),
    ).toThrow();
    expect(() =>
      createAiMailDraftSchema.parse({
        body: {
          recruiterEmail: 'r@example.com',
          jobDescription: 'Role',
          resumeId,
          jobUrl: 'ftp://example.com/job',
        },
      }),
    ).toThrow();
    expect(() =>
      createAiMailDraftSchema.parse({
        body: {
          recruiterEmail: 'r@example.com',
          jobDescription: 'Role',
          resumeId,
          bodyHtml: '<strong>Hello</strong>',
        },
      }),
    ).toThrow();
  });

  it('requires a version and at least one patch field', () => {
    expect(() =>
      updateAiMailDraftSchema.parse({ params: { draftId: resumeId }, body: { version: 1 } }),
    ).toThrow();
    expect(
      updateAiMailDraftSchema.parse({
        params: { draftId: resumeId },
        body: { version: 1, subject: 'Hello' },
      }).body,
    ).toMatchObject({ version: 1, subject: 'Hello' });
  });

  it('coerces and bounds list pagination', () => {
    expect(listAiMailDraftsSchema.parse({ query: { page: '2', limit: '25' } }).query).toMatchObject(
      {
        page: 2,
        limit: 25,
      },
    );
    expect(() => listAiMailDraftsSchema.parse({ query: { limit: '101' } })).toThrow();
  });
});
