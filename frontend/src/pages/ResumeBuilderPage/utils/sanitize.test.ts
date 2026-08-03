import { describe, expect, it } from 'vitest';

import {
  cleanBulletText,
  isContactOrMetaLine,
  isNoiseLine,
  matchTopSection,
  sanitizeExtractedText,
} from './sanitize';

describe('sanitize utils', () => {
  it('detects page noise lines', () => {
    expect(isNoiseLine('-- 1 of 2 --')).toBe(true);
    expect(isNoiseLine('Page 3')).toBe(true);
    expect(isNoiseLine('Work Experience')).toBe(false);
  });

  it('matches section headers', () => {
    expect(matchTopSection('Professional Summary')).toBe('summary');
    expect(matchTopSection('Work Experience')).toBe('experience');
    expect(matchTopSection('Technical Skills')).toBe('skills');
    expect(matchTopSection('Languages')).toBe('languages');
    expect(
      matchTopSection('This is a very long line that should not match as a section header'),
    ).toBe(null);
  });

  it('sanitizes OCR artifacts including Greek glyphs', () => {
    expect(sanitizeExtractedText('SoLware Engi\n\n\nHello')).toContain('Software Engineer');
    expect(sanitizeExtractedText('beΣer AnalyΘcs mulΘple')).toBe('better Analytics multiple');
    expect(cleanBulletText('• Built APIs')).toBe('Built APIs');
  });

  it('detects contact and meta lines', () => {
    expect(isContactOrMetaLine('jane@example.com')).toBe(true);
    expect(isContactOrMetaLine('linkedin.com/in/jane')).toBe(true);
    expect(isContactOrMetaLine('Frontend Developer')).toBe(true);
    expect(isContactOrMetaLine('Indore, India')).toBe(true);
    expect(isContactOrMetaLine('Built REST APIs for payments')).toBe(false);
  });
});
