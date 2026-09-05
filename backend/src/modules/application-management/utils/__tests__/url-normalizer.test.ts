import { describe, expect, it } from 'vitest';
import { normalizeJobUrl } from '@/modules/application-management/utils/url-normalizer.js';

describe('normalizeJobUrl', () => {
  it('returns null for empty or null input', () => {
    expect(normalizeJobUrl(null)).toBeNull();
    expect(normalizeJobUrl(undefined)).toBeNull();
    expect(normalizeJobUrl('')).toBeNull();
  });

  it('lowercases the hostname and removes trailing slash', () => {
    const url = 'https://Example.COM/careers/software-engineer/';
    expect(normalizeJobUrl(url)).toBe('https://example.com/careers/software-engineer');
  });

  it('preserves root slash when pathname is just "/"', () => {
    const url = 'https://Example.COM/';
    expect(normalizeJobUrl(url)).toBe('https://example.com/');
  });

  it('removes tracking parameters like utm_source, utm_medium, and gclid', () => {
    const url =
      'https://example.com/jobs/123?utm_source=linkedin&utm_medium=social&id=456&gclid=abc99&utm_campaign=hiring';
    expect(normalizeJobUrl(url)).toBe('https://example.com/jobs/123?id=456');
  });

  it('returns trimmed string if URL parsing fails', () => {
    const notAUrl = '  invalid-url-string  ';
    expect(normalizeJobUrl(notAUrl)).toBe('invalid-url-string');
  });
});
