import { describe, expect, it } from 'vitest';
import { clampScore, termAppearsIn, uniqSkills } from './text-match.js';

describe('text-match', () => {
  it('matches multi-word and special tech tokens', () => {
    expect(termAppearsIn('Used Spring Boot and C++ daily', 'Spring Boot')).toBe(true);
    expect(termAppearsIn('Used Spring Boot and C++ daily', 'C++')).toBe(true);
    expect(termAppearsIn('Worked with .NET Core', '.NET')).toBe(true);
  });

  it('does not false-positive on partial tokens', () => {
    expect(termAppearsIn('JavaScript developer', 'Java')).toBe(false);
  });

  it('clamps and dedupes', () => {
    expect(clampScore(140)).toBe(100);
    expect(clampScore(-5)).toBe(0);
    expect(uniqSkills(['Java', 'java', 'Spring Boot'])).toEqual(['Java', 'Spring Boot']);
  });
});
