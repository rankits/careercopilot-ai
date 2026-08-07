import { describe, expect, it } from 'vitest';

import type { RecommendationDto } from '@/features/recommendations/types/recommendation.types';

import { mapRecommendationToPickerJob } from './mapRecommendationToPickerJob';

const baseRecommendation = {
  id: 'rec-1',
  runId: 'run-1',
  rank: 1,
  displayScore: 87,
  category: 'STRONG',
  matchType: 'PROFILE',
  createdAt: '2026-08-01T00:00:00.000Z',
  scoreResult: {
    overallScore: 0.87,
    components: {},
    matchedSkills: [],
    aliasSkills: [],
    relatedSkills: [],
    transferableSkills: [],
    missingSkills: [],
    reasons: [],
  },
  job: {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Senior Frontend Engineer',
    company: {
      slug: 'microsoft',
      name: 'Microsoft',
      logoUrl: null,
      verified: true,
    },
    location: {
      formatted: 'Bangalore, India',
      remoteType: 'REMOTE',
    },
    employmentType: 'FULL_TIME',
    salary: { minimum: null, maximum: null, currency: null },
    skills: ['React', 'TypeScript'],
    publishedAt: '2026-08-01T00:00:00.000Z',
    applyUrl: 'https://example.com/jobs/1',
  },
} satisfies RecommendationDto;

describe('mapRecommendationToPickerJob', () => {
  it('maps recommendation score and job UUID for tracking', () => {
    expect(mapRecommendationToPickerJob(baseRecommendation, 0)).toEqual(
      expect.objectContaining({
        company: 'Microsoft',
        id: '11111111-1111-4111-8111-111111111111',
        match: 87,
        title: 'Senior Frontend Engineer',
        type: 'Remote',
      }),
    );
  });

  it('falls back to overallScore when displayScore is missing', () => {
    expect(
      mapRecommendationToPickerJob(
        {
          ...baseRecommendation,
          displayScore: null,
          scoreResult: { ...baseRecommendation.scoreResult, overallScore: 0.64 },
        },
        1,
      ).match,
    ).toBe(64);
  });
});
