import { describe, expect, it } from 'vitest';

import { extractJobDetailSections } from './extractJobDetailSections';

describe('extractJobDetailSections', () => {
  it('extracts responsibilities and requirements from headed plain text', () => {
    const text = [
      'About the company',
      'We build tools.',
      '',
      'Responsibilities',
      '- Ship features',
      '- Review PRs',
      '',
      'Requirements',
      '1. 3+ years React',
      '2. TypeScript',
      '',
      'Benefits',
      '- Health cover',
    ].join('\n');

    const sections = extractJobDetailSections(text, ['Remote stipend']);

    expect(sections.responsibilities).toEqual(['Ship features', 'Review PRs']);
    expect(sections.requirements).toEqual(['3+ years React', 'TypeScript']);
    expect(sections.benefits).toEqual(['Remote stipend']);
    expect(sections.remainingDescription).toContain('About the company');
    expect(sections.remainingDescription).not.toMatch(/Ship features/i);
  });

  it('returns empty lists when headings are absent', () => {
    const sections = extractJobDetailSections('Just a short blurb.', []);
    expect(sections.responsibilities).toEqual([]);
    expect(sections.requirements).toEqual([]);
    expect(sections.remainingDescription).toBe('Just a short blurb.');
  });
});
