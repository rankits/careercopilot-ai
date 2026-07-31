import { describe, expect, it } from 'vitest';
import {
  buildJobEmbeddingDocument,
  createJobEmbeddingContentHash,
} from '@/modules/job-embeddings/utils/job-embedding-content.js';
import type { JobSemanticContent } from '@/modules/jobs/utils/job-semantic-content.js';

const content = (overrides: Partial<JobSemanticContent> = {}): JobSemanticContent => ({
  companySlug: 'acme',
  companyName: 'Acme',
  title: 'Senior Engineer',
  descriptionText: 'Build reliable systems.',
  remoteType: 'REMOTE',
  skills: ['TypeScript', 'Node.js'],
  tags: ['Platform', 'Backend'],
  employmentType: 'FULL_TIME',
  ...overrides,
});

describe('job embedding content', () => {
  it('builds a stable labeled document from semantic job fields', () => {
    expect(buildJobEmbeddingDocument(content())).toBe(
      [
        'Title: senior engineer',
        'Company: acme',
        'Employment type: FULL_TIME',
        'Work arrangement: REMOTE',
        'Skills: node.js, typescript',
        'Tags: backend, platform',
        'Description: Build reliable systems.',
      ].join('\n'),
    );
  });

  it('keeps the checksum stable across normalized casing and array order', () => {
    const first = createJobEmbeddingContentHash(content());
    const equivalent = createJobEmbeddingContentHash(
      content({
        companyName: ' ACME ',
        title: 'senior engineer',
        skills: ['node.js', 'typescript'],
        tags: ['backend', 'platform'],
      }),
    );

    expect(equivalent).toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes the checksum for content or document schema changes', () => {
    const first = createJobEmbeddingContentHash(content(), '1');

    expect(
      createJobEmbeddingContentHash(
        content({ descriptionText: 'Build reliable distributed systems.' }),
        '1',
      ),
    ).not.toBe(first);
    expect(createJobEmbeddingContentHash(content(), '2')).not.toBe(first);
  });
});
