import { describe, expect, it } from 'vitest';

import { matchesGeographicLocationPreference } from '@/modules/recommendations/utils/geographic-location-matching.js';

describe('matchesGeographicLocationPreference', () => {
  it('matches countries using ISO-aware aliases', () => {
    expect(matchesGeographicLocationPreference('Bengaluru, India', 'India')).toBe(true);
    expect(matchesGeographicLocationPreference('Remote', 'India')).toBe(false);
    expect(matchesGeographicLocationPreference('Toronto, Canada', 'India')).toBe(false);
    expect(matchesGeographicLocationPreference('San Francisco, CA, USA', 'United States')).toBe(
      true,
    );
    expect(matchesGeographicLocationPreference('Berlin, DE', 'Germany')).toBe(true);
    expect(matchesGeographicLocationPreference('London, UK', 'United Kingdom')).toBe(true);
  });
});
