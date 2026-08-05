import { describe, expect, it } from 'vitest';

import { guessCompanyDomain, resolveCompanyLogoUrl } from './resolveCompanyLogoUrl';

describe('guessCompanyDomain', () => {
  it('prefers slug and strips corporate suffixes', () => {
    expect(guessCompanyDomain('microsoft', 'Microsoft Corp')).toBe('microsoft.com');
    expect(guessCompanyDomain('acme-labs', 'Acme Labs Inc')).toBe('acme.com');
  });

  it('falls back to name when slug is missing', () => {
    expect(guessCompanyDomain(null, 'Google')).toBe('google.com');
  });

  it('returns null for empty or too-short input', () => {
    expect(guessCompanyDomain(null, null)).toBeNull();
    expect(guessCompanyDomain('a', '')).toBeNull();
  });
});

describe('resolveCompanyLogoUrl', () => {
  it('prefers a stored logo URL', () => {
    expect(
      resolveCompanyLogoUrl({
        logoUrl: 'https://cdn.example/logo.png',
        companySlug: 'microsoft',
        companyName: 'Microsoft',
      }),
    ).toBe('https://cdn.example/logo.png');
  });

  it('builds a favicon URL when no stored logo exists', () => {
    expect(
      resolveCompanyLogoUrl({
        logoUrl: null,
        companySlug: 'google',
        companyName: 'Google',
      }),
    ).toBe('https://www.google.com/s2/favicons?domain=google.com&sz=128');
  });

  it('returns undefined when domain cannot be guessed', () => {
    expect(
      resolveCompanyLogoUrl({ logoUrl: null, companySlug: '', companyName: '' }),
    ).toBeUndefined();
  });
});
