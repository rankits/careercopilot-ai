import { describe, expect, it } from 'vitest';

import { extractJobKeywords } from '@/modules/auto-apply/utils/resume-keyword-extract.util.js';

describe('extractJobKeywords', () => {
  it('removes stopwords and keeps multi-word phrases', () => {
    const keywords = extractJobKeywords({
      jobTitle: 'Data Scientist',
      jobDescription:
        'We are looking for someone with machine learning, Python, SQL, and statistical modeling. Work with the team and new stakeholders.',
      requirementTexts: ['Experience with data pipelines and experimentation'],
    });

    expect(keywords).toContain('machine learning');
    expect(keywords).toContain('python');
    expect(keywords).toContain('sql');
    expect(keywords).toContain('statistical modeling');
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('and');
    expect(keywords).not.toContain('with');
    expect(keywords).not.toContain('team');
    expect(keywords).not.toContain('new');
    expect(keywords).not.toContain('driven');
  });
});
