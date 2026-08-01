import { describe, expect, it } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';

const jobList = (id: string): JobListDto => ({
  id,
  title: 'Backend Engineer',
  company: { slug: 'good-co', name: 'Good Co', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 130000, maximum: 160000, currency: 'USD' },
  skills: ['TypeScript', 'PostgreSQL'],
  publishedAt: null,
  applyUrl: null,
});

const baseContext = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'TARGET_TEXT',
  targetTitles: ['Backend Engineer'],
  relatedTitles: [],
  requiredSkills: ['TypeScript'],
  preferredSkills: [],
  industries: [],
  locations: ['Remote'],
  remotePreference: 'REMOTE',
  employmentTypes: ['FULL_TIME'],
  salaryExpectation: { minimum: 100000, currency: 'USD' },
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
  sourceText: 'Backend engineer TypeScript PostgreSQL',
});

describe('RecommendationScoringService hybrid ranking', () => {
  const service = new RecommendationScoringService(
    new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
  );

  it('fuses retrievalScore into overallScore per JR-PROD-001', async () => {
    const [scored] = await service.score(baseContext(), [
      { job: jobList('job-1'), retrievalScore: 0.9 },
    ]);
    const engineOnly = await new RecommendationScoringEngine(
      HEURISTIC_SCORE_CALCULATORS,
      defaultMatchTypeClassifier,
    ).score(baseContext(), jobList('job-1'));

    expect(RETRIEVAL_SCORE_BLEND_WEIGHT + HEURISTIC_SCORE_BLEND_WEIGHT).toBeCloseTo(1);
    expect(scored?.scoreResult.overallScore).toBeCloseTo(
      RETRIEVAL_SCORE_BLEND_WEIGHT * 0.9 +
        HEURISTIC_SCORE_BLEND_WEIGHT * engineOnly.scoreResult.overallScore,
    );
  });

  it('treats missing retrievalScore as zero retrieval contribution', async () => {
    const [withRetrieval, withoutRetrieval] = await Promise.all([
      service.score(baseContext(), [{ job: jobList('job-1'), retrievalScore: 0.5 }]),
      service.score(baseContext(), [{ job: jobList('job-1') }]),
    ]);

    expect(withoutRetrieval[0]?.scoreResult.overallScore).toBeLessThan(
      withRetrieval[0]?.scoreResult.overallScore ?? 0,
    );
  });
});
