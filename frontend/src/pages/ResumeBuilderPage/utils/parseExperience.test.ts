import { describe, expect, it } from 'vitest';

import { parseExperienceBlocks } from './parseExperience';

describe('parseExperienceBlocks', () => {
  it('parses company, title, dates, and bullets', () => {
    const jobs = parseExperienceBlocks(`
Acme Technologies - Software Engineer
Jan 2022 - Present, Indore
- Built REST APIs with Java
- Improved latency by optimizing queries
`);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toContain('Acme');
    expect(jobs[0].title).toMatch(/Software Engineer/i);
    expect(jobs[0].startDate).toMatch(/Jan 2022/i);
    expect(jobs[0].endDate).toMatch(/Present/i);
    expect(jobs[0].details).toContain('Built REST APIs with Java');
  });

  it('returns empty for blank input', () => {
    expect(parseExperienceBlocks('')).toEqual([]);
  });
});
