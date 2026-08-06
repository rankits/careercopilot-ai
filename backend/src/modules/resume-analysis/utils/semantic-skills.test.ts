import { describe, expect, it } from 'vitest';

import {
  dedupeSemanticSkills,
  cleanSemanticSkill,
} from '@/modules/resume-analysis/utils/semantic-skills';

describe('semantic-skills', () => {
  it('keeps AI domain skills that are outside the chip catalog', () => {
    expect(cleanSemanticSkill('Patient Care')).toBe('Patient Care');
    expect(cleanSemanticSkill('Salesforce CRM')).toBeTruthy();
    expect(dedupeSemanticSkills(['React.js', 'React', 'Patient Care', 'ReactJS'])).toEqual(
      expect.arrayContaining(['React', 'Patient Care']),
    );
    expect(dedupeSemanticSkills(['React.js', 'React', 'ReactJS']).length).toBe(1);
  });

  it('drops obvious noise tokens', () => {
    expect(cleanSemanticSkill('Required')).toBeNull();
    expect(cleanSemanticSkill('Skills')).toBeNull();
  });
});
