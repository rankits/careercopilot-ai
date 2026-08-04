import { describe, expect, it } from 'vitest';

import { estimateImprovedAtsScore, scoreTone } from './estimateAts';

describe('estimateImprovedAtsScore', () => {
  it('returns baseline when no improvements are present', () => {
    expect(
      estimateImprovedAtsScore({
        baseline: 70,
        content: 'React TypeScript resume',
        missingSkills: ['Java', 'Spring Boot'],
        missingKeywords: ['Hibernate'],
        appliedCount: 0,
      }),
    ).toBe(70);
  });

  it('raises estimate when missing skills and applied suggestions are present', () => {
    const score = estimateImprovedAtsScore({
      baseline: 62,
      content: 'Java Spring Boot Hibernate React TypeScript',
      missingSkills: ['Java', 'Spring Boot', 'Hibernate'],
      missingKeywords: ['Java', 'Spring Boot'],
      appliedCount: 2,
      highAppliedCount: 2,
    });

    expect(score).toBeGreaterThan(62);
    expect(score).toBeLessThanOrEqual(99);
  });
});

describe('scoreTone', () => {
  it('maps score bands', () => {
    expect(scoreTone(85)).toBe('success');
    expect(scoreTone(65)).toBe('warning');
    expect(scoreTone(40)).toBe('error');
  });
});
