import { describe, expect, it } from 'vitest';
import type { JobRecommendationRecord } from '@/modules/recommendations/types/recommendations.types.js';
import {
  toDisplayScore,
  toRecommendationResponse,
  toSimilarJobResponse,
} from '@/modules/recommendations/mappers/recommendation.mapper.js';

const recommendation = (overallScore: number): JobRecommendationRecord => ({
  id: 'rec-1',
  runId: 'run-1',
  userId: 'user-1',
  rank: 1,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  job: {
    id: 'job-1',
    title: 'Backend Engineer',
    company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
    location: { formatted: 'Remote', remoteType: 'REMOTE' },
    employmentType: 'FULL_TIME',
    salary: { minimum: 120000, maximum: 160000, currency: 'USD' },
    skills: ['TypeScript'],
    publishedAt: null,
    applyUrl: null,
  },
  scoreResult: {
    overallScore,
    components: {
      requiredSkills: 0.8,
      title: 0.8,
      experience: 0.8,
      responsibilities: 0.8,
      preferredSkills: 0.8,
      location: 0.8,
      industry: 0.8,
      salary: 0.8,
      qualifications: 0.8,
    },
    matchedSkills: ['TypeScript'],
    relatedSkills: [],
    missingSkills: [],
    reasons: [],
  },
  category: 'BEST_MATCH',
  matchType: 'EXACT',
});

describe('recommendation response score mapping', () => {
  it('adds integer displayScore while preserving unit-interval overallScore', () => {
    const response = toRecommendationResponse(recommendation(0.874));

    expect(response.displayScore).toBe(87);
    expect(response.explanation).toMatchObject({
      summary: '87% match with 1 matched skill',
      scoreModel: { overallScore: 0.874, displayScore: 87 },
    });
    expect(response.skillGap).toEqual({
      exact: ['TypeScript'],
      alias: [],
      related: [],
      transferable: [],
      missing: [],
    });
    expect(response.scoreResult.overallScore).toBe(0.874);
  });

  it('uses the same displayScore policy for similar job responses', () => {
    const item = recommendation(0.995);
    const response = toSimilarJobResponse(item, 2);

    expect(response.rank).toBe(2);
    expect(response.displayScore).toBe(100);
    expect(response.scoreResult.overallScore).toBe(0.995);
  });

  it('omits displayScore when the internal score is invalid', () => {
    expect(toDisplayScore(Number.NaN)).toBeUndefined();
    expect(toDisplayScore(-0.1)).toBeUndefined();
    expect(toDisplayScore(1.1)).toBeUndefined();
  });
});
