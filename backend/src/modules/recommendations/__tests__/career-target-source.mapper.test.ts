import { describe, expect, it } from 'vitest';
import { buildCareerGoalRecommendationPayload } from '@/modules/recommendations/mappers/career-target-source.mapper.js';
import type { CandidateProfileSourcePayload } from '@/modules/recommendations/types/recommendations.types.js';

const profile = (): CandidateProfileSourcePayload => ({
  targetTitles: ['Software Engineer'],
  relatedTitles: [],
  requiredSkills: ['TypeScript'],
  preferredSkills: [],
  industries: [],
  locations: ['Toronto, Canada'],
  remotePreference: 'REMOTE',
  employmentTypes: [],
  salaryExpectation: {},
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
});

describe('buildCareerGoalRecommendationPayload', () => {
  it('uses explicit structured locations instead of profile locations', () => {
    const payload = buildCareerGoalRecommendationPayload(
      {
        id: 'target-1',
        userId: 'user-1',
        goalText: 'Target role: Software developer. Preferred location: India.',
        structured: {
          targetRole: 'Software developer',
          locationScope: 'GEOGRAPHIC',
          locations: ['India'],
          flexibilityMode: 'FLEXIBLE',
        },
      },
      profile(),
    );

    expect(payload.locations).toEqual(['India']);
    expect(payload.remotePreference).toBeUndefined();
    expect(payload.filterMode).toBe('FLEXIBLE');
  });

  it('clears profile location preferences when any location is selected', () => {
    const payload = buildCareerGoalRecommendationPayload(
      {
        id: 'target-1',
        userId: 'user-1',
        goalText: 'Target role: Software developer.',
        structured: {
          targetRole: 'Software developer',
          locationScope: 'ANY',
          locations: [],
          flexibilityMode: 'FLEXIBLE',
        },
      },
      profile(),
    );

    expect(payload.locations).toEqual([]);
    expect(payload.remotePreference).toBeUndefined();
  });

  it('uses work mode preference globally without profile location bleed-through', () => {
    const payload = buildCareerGoalRecommendationPayload(
      {
        id: 'target-1',
        userId: 'user-1',
        goalText: 'Target role: Software developer. Work mode: Remote.',
        structured: {
          targetRole: 'Software developer',
          locationScope: 'WORK_MODE',
          locations: [],
          remotePreference: 'REMOTE',
          flexibilityMode: 'FLEXIBLE',
        },
      },
      profile(),
    );

    expect(payload.locations).toEqual([]);
    expect(payload.remotePreference).toBe('REMOTE');
  });

  it('applies combined country and work mode preferences together', () => {
    const payload = buildCareerGoalRecommendationPayload(
      {
        id: 'target-1',
        userId: 'user-1',
        goalText: 'Target role: Software developer. Preferred country: India. Work mode: Remote.',
        structured: {
          targetRole: 'Software developer',
          locationScope: 'COMBINED',
          locations: ['India'],
          remotePreference: 'REMOTE',
          flexibilityMode: 'FLEXIBLE',
        },
      },
      profile(),
    );

    expect(payload.locations).toEqual(['India']);
    expect(payload.remotePreference).toBe('REMOTE');
  });
});
