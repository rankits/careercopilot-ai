import { describe, expect, it } from 'vitest';
import { extractVacancyEmailCandidates } from '@/modules/auto-apply/utils/vacancy-email.util.js';

describe('extractVacancyEmailCandidates', () => {
  it('extracts an email explicitly published in the job description', () => {
    const result = extractVacancyEmailCandidates(
      'We are hiring! Send your resume to careers@acme.com to apply.',
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe('careers@acme.com');
  });

  it('never fabricates an address when none is present in the text', () => {
    const result = extractVacancyEmailCandidates('Great backend role, apply on our careers page.');
    expect(result).toEqual([]);
  });

  it('ranks a careers/jobs/hr-style local part as HIGH confidence', () => {
    const result = extractVacancyEmailCandidates('Apply via jobs@acme.com or ask questions.');
    expect(result[0]?.confidence).toBe('HIGH');
  });

  it('ranks an unrelated-looking address as LOW confidence', () => {
    const result = extractVacancyEmailCandidates('Contact john.smith@acme.com with questions.');
    expect(result[0]?.confidence).toBe('LOW');
  });

  it('sorts HIGH confidence candidates before LOW', () => {
    const result = extractVacancyEmailCandidates(
      'CC john.smith@acme.com but formally apply to careers@acme.com.',
    );
    expect(result.map((c) => c.email)).toEqual(['careers@acme.com', 'john.smith@acme.com']);
  });

  it('de-duplicates repeated occurrences of the same address', () => {
    const result = extractVacancyEmailCandidates(
      'Apply to careers@acme.com. Questions? careers@acme.com.',
    );
    expect(result).toHaveLength(1);
  });

  it('captures surrounding context for user review', () => {
    const result = extractVacancyEmailCandidates(
      'Send your resume to careers@acme.com to apply now.',
    );
    expect(result[0]?.context).toContain('careers@acme.com');
  });
});
