import { describe, expect, it } from 'vitest';

import { resolveRemotePreferences } from '@/features/auto-apply/utils/setupCompleteness';

import { isValidPhone } from '../setupFormUtils';

describe('isValidPhone', () => {
  it('accepts empty phone numbers', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('   ')).toBe(true);
  });

  it('accepts 10-digit numbers without a country code prefix', () => {
    expect(isValidPhone('9876543210')).toBe(true);
  });

  it('accepts international numbers with or without a plus prefix', () => {
    expect(isValidPhone('+919876543210')).toBe(true);
    expect(isValidPhone('919876543210')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('+0123456789')).toBe(false);
    expect(isValidPhone('abcdefghij')).toBe(false);
  });
});

describe('resolveRemotePreferences AA-023', () => {
  it('hydrates legacy ANY into all work modes', () => {
    expect(
      resolveRemotePreferences({
        desiredRoles: [],
        preferredLocations: [],
        remotePreferences: [],
        remotePreference: 'ANY',
      }),
    ).toEqual(['REMOTE', 'HYBRID', 'ONSITE']);
  });
});
