import { describe, expect, it } from 'vitest';

import { CandidateApplicationPreferencesSchema } from '@/modules/auto-apply/validations/candidate-profile.validation.js';

describe('CandidateApplicationPreferencesSchema', () => {
  it('accepts currentLocation and currentCountry', () => {
    const result = CandidateApplicationPreferencesSchema.parse({
      desiredRoles: ['Engineer'],
      preferredLocations: ['Remote'],
      currentLocation: 'Austin, TX',
      currentCountry: 'US',
    });

    expect(result.currentLocation).toBe('Austin, TX');
    expect(result.currentCountry).toBe('US');
  });

  it('rejects currentLocation shorter than 2 characters', () => {
    expect(() =>
      CandidateApplicationPreferencesSchema.parse({
        desiredRoles: [],
        preferredLocations: [],
        currentLocation: 'A',
      }),
    ).toThrow();
  });

  it('rejects invalid currentCountry codes', () => {
    expect(() =>
      CandidateApplicationPreferencesSchema.parse({
        desiredRoles: [],
        preferredLocations: [],
        currentCountry: 'USA',
      }),
    ).toThrow();
  });

  it('allows requiresSponsorship to be cleared with null', () => {
    const result = CandidateApplicationPreferencesSchema.parse({
      desiredRoles: [],
      preferredLocations: [],
      requiresSponsorship: null,
    });

    expect(result.requiresSponsorship).toBeNull();
  });
});
