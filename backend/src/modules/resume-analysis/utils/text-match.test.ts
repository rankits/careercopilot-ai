import { describe, expect, it } from 'vitest';
import {
  clampScore,
  normalizeMatchText,
  replaceTextFuzzy,
  termAppearsIn,
  textAppearsFuzzy,
  uniqSkills,
} from '@/modules/resume-analysis/utils/text-match.js';

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

  it('fuzzy-matches and replaces despite bullet drift', () => {
    expect(normalizeMatchText('- Built UI components')).toBe('built ui components');
    expect(textAppearsFuzzy('- Built UI components\n- Other', 'Built UI components')).toBe(true);
    expect(
      replaceTextFuzzy(
        '- Built UI components\n- Other',
        'Built UI components',
        'Built accessible UI components',
      ),
    ).toBe('- Built accessible UI components\n- Other');
  });
});
