import { describe, expect, it } from 'vitest';
import { pickPrimaryApplyUrl, toSafeApplyUrl } from '@/modules/job-listing/utils/safe-apply-url.js';

describe('toSafeApplyUrl', () => {
  it('accepts http and https URLs', () => {
    expect(toSafeApplyUrl('https://jobs.example.com/apply/1')).toBe(
      'https://jobs.example.com/apply/1',
    );
    expect(toSafeApplyUrl('http://jobs.example.com/apply/1')).toBe(
      'http://jobs.example.com/apply/1',
    );
  });

  it('rejects non-http schemes and invalid values', () => {
    expect(toSafeApplyUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeApplyUrl('data:text/html,hi')).toBeNull();
    expect(toSafeApplyUrl('not a url')).toBeNull();
    expect(toSafeApplyUrl(null)).toBeNull();
    expect(toSafeApplyUrl('')).toBeNull();
  });

  it('rejects whitespace-only strings and trims surrounding whitespace', () => {
    expect(toSafeApplyUrl('   ')).toBeNull();
    expect(toSafeApplyUrl('  https://jobs.example.com/a  ')).toBe('https://jobs.example.com/a');
  });
});

describe('pickPrimaryApplyUrl', () => {
  it('prefers the first safe URL in priority order', () => {
    expect(
      pickPrimaryApplyUrl([
        { applyUrl: 'javascript:evil' },
        { applyUrl: 'https://careers.example.com/a' },
        { applyUrl: 'https://careers.example.com/b' },
      ]),
    ).toBe('https://careers.example.com/a');
  });

  it('returns null when no source has a safe URL', () => {
    expect(pickPrimaryApplyUrl([{ applyUrl: 'javascript:x' }, { applyUrl: null }])).toBeNull();
  });

  it('returns null for an empty sources list', () => {
    expect(pickPrimaryApplyUrl([])).toBeNull();
  });
});
