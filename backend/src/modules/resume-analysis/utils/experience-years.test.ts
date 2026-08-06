import { describe, expect, it } from 'vitest';

import {
  describeYearsGap,
  estimateCandidateYears,
  extractRequiredYearsFromJd,
  yearsGapSeverity,
  yearsMatchScore,
} from '@/modules/resume-analysis/utils/experience-years.js';

describe('experience-years', () => {
  it('extracts required years from common JD phrases', () => {
    expect(extractRequiredYearsFromJd('Need 5+ years of experience with React')).toBe(5);
    expect(extractRequiredYearsFromJd('Minimum of 3 years experience required')).toBe(3);
    expect(extractRequiredYearsFromJd('At least 2 years of relevant experience')).toBe(2);
  });

  it('estimates candidate years from explicit summary phrasing', () => {
    expect(
      estimateCandidateYears(
        'Senior engineer with 8 years of experience building scalable web apps.',
      ),
    ).toBe(8);
  });

  it('estimates candidate years from date ranges when no explicit phrase exists', () => {
    const resume = `
WORK EXPERIENCE
Engineer | Acme
Jan 2020 – Present
Built APIs.
`;
    const years = estimateCandidateYears(resume);
    expect(years).not.toBeNull();
    expect(years!).toBeGreaterThanOrEqual(5);
  });

  it('classifies years gap severity', () => {
    expect(yearsGapSeverity(5, 6)).toBe('ok');
    expect(yearsGapSeverity(5, 4)).toBe('minor_gap');
    expect(yearsGapSeverity(5, 1)).toBe('major_gap');
    expect(yearsGapSeverity(null, 3)).toBe('unknown');
  });

  it('scores years match and describes gaps', () => {
    expect(yearsMatchScore(5, 5)).toBe(100);
    expect(yearsMatchScore(5, 1)).toBeLessThan(50);
    expect(describeYearsGap(5, 2)).toMatch(/JD requires 5\+/i);
    expect(describeYearsGap(5, 6)).toBeNull();
  });
});
