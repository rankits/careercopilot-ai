import { describe, expect, it } from 'vitest';

import {
  extractKeywordsFromText,
  isSkillLabelNoise,
  mergeSkillLists,
  parseSkillChips,
  splitSkillTokens,
} from './skills';

describe('skills utils', () => {
  it('splits comma skill lists and canonicalizes aliases', () => {
    const skills = splitSkillTokens('java, reactjs, nodejs, Spring Boot, CI/CD');
    expect(skills).toEqual(
      expect.arrayContaining(['Java', 'React', 'Node.js', 'Spring Boot', 'CI/CD']),
    );
  });

  it('ignores skill label noise', () => {
    expect(isSkillLabelNoise('Technical Skills:')).toBe(true);
    expect(isSkillLabelNoise('Java')).toBe(false);
  });

  it('extracts keywords from JD prose', () => {
    const keys = extractKeywordsFromText(
      'We need experience with Java, Spring Boot, and AWS microservices.',
    );
    expect(keys).toEqual(expect.arrayContaining(['Java', 'Spring Boot', 'AWS']));
  });

  it('parses skill chips and merges lists without duplicates', () => {
    expect(parseSkillChips('Python, Docker')).toEqual(expect.arrayContaining(['Python', 'Docker']));
    expect(mergeSkillLists(['Java'], ['java', 'React'], ['Custom Tool'])).toEqual(
      expect.arrayContaining(['Java', 'React', 'Custom Tool']),
    );
  });
});
