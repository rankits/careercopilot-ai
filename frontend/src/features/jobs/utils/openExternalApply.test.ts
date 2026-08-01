import { afterEach, describe, expect, it, vi } from 'vitest';

import { openExternalApply, toSafeApplyUrl } from './openExternalApply';

describe('toSafeApplyUrl', () => {
  it('accepts http and https URLs', () => {
    expect(toSafeApplyUrl('https://careers.example.com/job/1')).toBe(
      'https://careers.example.com/job/1',
    );
    expect(toSafeApplyUrl('http://careers.example.com/job/1')).toBe(
      'http://careers.example.com/job/1',
    );
  });

  it('rejects non-http schemes and invalid values', () => {
    expect(toSafeApplyUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeApplyUrl('data:text/html,hi')).toBeNull();
    expect(toSafeApplyUrl('')).toBeNull();
    expect(toSafeApplyUrl(null)).toBeNull();
    expect(toSafeApplyUrl('not-a-url')).toBeNull();
  });
});

describe('openExternalApply', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens safe URLs with noopener and noreferrer', () => {
    const fakeWindow = { opener: window } as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow);

    expect(openExternalApply('https://jobs.example.com/apply')).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      'https://jobs.example.com/apply',
      '_blank',
      'noopener,noreferrer',
    );
    expect(fakeWindow.opener).toBeNull();
  });

  it('does not open unsafe or missing URLs', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    expect(openExternalApply('javascript:alert(1)')).toBe(false);
    expect(openExternalApply(null)).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
