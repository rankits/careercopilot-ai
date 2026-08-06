import { describe, expect, it } from 'vitest';

import { ANY_COUNTRY } from '@/constants/countries';

import { mapCareerPreferences } from './mapCareerPreferences';

describe('mapCareerPreferences', () => {
  it('maps split work mode and country preferences independently', () => {
    expect(mapCareerPreferences('Any work mode', ANY_COUNTRY)).toEqual({
      locationScope: 'ANY',
      locations: [],
      goalTextSegments: [],
    });
    expect(mapCareerPreferences('Remote', ANY_COUNTRY)).toEqual({
      locationScope: 'WORK_MODE',
      locations: [],
      remotePreference: 'REMOTE',
      goalTextSegments: ['Work mode: Remote'],
    });
    expect(mapCareerPreferences('Any work mode', 'India')).toEqual({
      locationScope: 'GEOGRAPHIC',
      locations: ['India'],
      goalTextSegments: ['Preferred country: India'],
    });
    expect(mapCareerPreferences('Hybrid', 'Germany')).toEqual({
      locationScope: 'COMBINED',
      locations: ['Germany'],
      remotePreference: 'HYBRID',
      goalTextSegments: ['Preferred country: Germany', 'Work mode: Hybrid'],
    });
  });
});
