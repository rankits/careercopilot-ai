import { describe, expect, it } from 'vitest';
import { formatJobLocation } from '@/modules/job-listing/utils/format-job-location.js';

describe('formatJobLocation', () => {
  it('prefers locationRaw from provider metadata', () => {
    expect(
      formatJobLocation('ONSITE', { locationRaw: 'San Francisco, CA' }),
    ).toBe('San Francisco, CA');
  });

  it('joins city and country when raw is missing', () => {
    expect(
      formatJobLocation('ONSITE', { locationCity: 'Berlin', locationCountry: 'Germany' }),
    ).toBe('Berlin, Germany');
  });

  it('falls back to remoteType labels when metadata has no location', () => {
    expect(formatJobLocation('REMOTE', {})).toBe('Remote');
    expect(formatJobLocation('HYBRID', null)).toBe('Hybrid');
    expect(formatJobLocation('ONSITE', undefined)).toBe('On-site');
  });

  it('uses an explicit fallback when nothing is available', () => {
    expect(formatJobLocation(null, {})).toBe('Location not specified');
  });
});
