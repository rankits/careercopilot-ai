import { describe, expect, it } from 'vitest';

import { RESUME_SECTIONS, RESUME_TEMPLATES, SECTION_ALIASES, newId } from './types';

describe('types / constants', () => {
  it('exposes Default, Classic, and Modern templates', () => {
    expect(RESUME_TEMPLATES.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Default', 'Classic', 'Modern']),
    );
    expect(RESUME_TEMPLATES[0]?.id).toBe('original');
  });

  it('lists all editable resume sections', () => {
    expect(RESUME_SECTIONS.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'summary',
        'experience',
        'skills',
        'education',
        'projects',
        'certifications',
        'achievements',
      ]),
    );
  });

  it('matches section aliases and creates ids', () => {
    expect(SECTION_ALIASES.summary.test('Profile Summary')).toBe(true);
    expect(SECTION_ALIASES.experience.test('Work Experience')).toBe(true);
    expect(newId()).toBeTruthy();
  });
});
