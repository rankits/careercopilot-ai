import { describe, expect, it } from 'vitest';

import { getCountryOptions } from '@/constants/countries';

describe('countries', () => {
  it('exposes a searchable ISO country list', () => {
    const options = getCountryOptions();
    expect(options.length).toBeGreaterThan(190);
    expect(options.some((option) => option.name === 'India')).toBe(true);
    expect(options.some((option) => option.name === 'United States')).toBe(true);
    expect(options.some((option) => option.name === 'Germany')).toBe(true);
  });
});
