import { describe, expect, it } from 'vitest';

import { toTitleCase } from './toTitleCase';

describe('toTitleCase', () => {
  it('title-cases lower-case names', () => {
    expect(toTitleCase('pankaj saini')).toBe('Pankaj Saini');
  });

  it('normalizes mixed and upper-case names', () => {
    expect(toTitleCase('ADA lovelace')).toBe('Ada Lovelace');
    expect(toTitleCase('PANKAJ SAINI')).toBe('Pankaj Saini');
  });

  it('trims extra whitespace', () => {
    expect(toTitleCase('  dimple   malviya  ')).toBe('Dimple Malviya');
  });

  it('returns an empty string for blank input', () => {
    expect(toTitleCase('   ')).toBe('');
  });
});
