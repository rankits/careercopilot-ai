import { describe, expect, it } from 'vitest';

import {
  isSafeAssistedApplyReturnTo,
  resolveSafeReturnTo,
} from '@/features/auto-apply/utils/returnToNavigation';

describe('returnToNavigation (AA-062)', () => {
  it('allows assisted-apply workspace paths', () => {
    expect(
      isSafeAssistedApplyReturnTo(
        '/assisted-apply/11111111-1111-4111-8111-111111111111?step=resume',
      ),
    ).toBe(true);
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(isSafeAssistedApplyReturnTo('https://evil.example/phish')).toBe(false);
    expect(isSafeAssistedApplyReturnTo('//evil.example/phish')).toBe(false);
    expect(isSafeAssistedApplyReturnTo('/jobs/123')).toBe(false);
  });

  it('falls back on invalid returnTo', () => {
    expect(resolveSafeReturnTo('https://evil.example', '/safe')).toBe('/safe');
  });
});
