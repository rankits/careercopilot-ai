import { describe, expect, it } from 'vitest';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import {
  HEURISTIC_SCORE_BLEND_WEIGHT,
  RETRIEVAL_SCORE_BLEND_WEIGHT,
} from '@/modules/recommendations/constants/recommendation.constants.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
} from '@/modules/recommendations/types/recommendations.types.js';
import { sortRecommendationsForRanking } from '@/modules/recommendations/utils/recommendation-ranking.js';

const job = (): JobListDto => ({
  id: 'job-1',
  title: 'Backend Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 120000, maximum: 160000, currency: 'USD' },
  skills: ['TypeScript', 'PostgreSQL'],
  publishedAt: null,
  applyUrl: null,
});

const context = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'PROFILE',
  contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  targetTitles: ['Backend Engineer'],
  relatedTitles: [],
  requiredSkills: ['TypeScript'],
  preferredSkills: [],
  industries: [],
  locations: ['Remote'],
  employmentTypes: ['FULL_TIME'],
  salaryExpectation: {},
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
  sourceText: 'Backend engineer',
});

describe('RecommendationScoringService hybrid fusion', () => {
  const service = new RecommendationScoringService(
    new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
  );

  it('fuses retrieval and heuristic scores with JR-PROD-001 weights', async () => {
    const [scored] = await service.score(context(), [{ job: job(), retrievalScore: 0.8 }]);
    const engineOnly = await new RecommendationScoringEngine(
      HEURISTIC_SCORE_CALCULATORS,
      defaultMatchTypeClassifier,
    ).score(context(), job());
    const expected =
      RETRIEVAL_SCORE_BLEND_WEIGHT * 0.8 + HEURISTIC_SCORE_BLEND_WEIGHT * engineOnly.scoreResult.overallScore;
    expect(scored.scoreResult.overallScore).toBeCloseTo(expected, 5);
  });

  it('treats missing retrieval score as zero contribution', async () => {
    const [withRetrieval, withoutRetrieval] = await Promise.all([
      service.score(context(), [{ job: job(), retrievalScore: 0.9 }]),
      service.score(context(), [{ job: job() }]),
    ]);
    expect(withoutRetrieval[0]!.scoreResult.overallScore).toBeLessThan(
      withRetrieval[0]!.scoreResult.overallScore,
    );
  });

  it('adds hybrid explanation reason text', async () => {
    const [scored] = await service.score(context(), [{ job: job(), retrievalScore: 0.7 }]);
    const hybrid = scored.scoreResult.reasons.find((reason) => reason.message.includes('Hybrid match'));
    expect(hybrid).toBeTruthy();
    expect(hybrid?.evidence.some((entry) => entry.startsWith('retrievalWeight='))).toBe(true);
  });

  it('uses neutral component scores for missing candidate preferences', async () => {
    const sparseContext: RecommendationContext = {
      ...context(),
      requiredSkills: [],
      preferredSkills: [],
      locations: [],
      industries: [],
      salaryExpectation: {},
      education: [],
      certifications: [],
      sourceText: '',
    };
    const [scored] = await service.score(sparseContext, [{ job: job(), retrievalScore: 0.5 }]);

    expect(scored.scoreResult.components).toMatchObject({
      requiredSkills: 0.5,
      preferredSkills: 0.5,
      experience: 0.5,
      responsibilities: 0.5,
      location: 0.5,
      industry: 0.5,
      salary: 0.5,
      qualifications: 0.5,
    });
    expect(
      scored.scoreResult.reasons.some((reason) =>
        reason.message.includes('No salary expectation provided; used neutral score'),
      ),
    ).toBe(true);
    expect(
      scored.scoreResult.reasons.some((reason) =>
        reason.message.includes('No location preference provided; used neutral score'),
      ),
    ).toBe(true);
  });

  it('uses neutral skill scores when job skills are unavailable', async () => {
    const [scored] = await service.score({ ...context(), preferredSkills: ['React'] }, [
      { job: { ...job(), skills: [] }, retrievalScore: 0.5 },
    ]);

    expect(scored.scoreResult.components.requiredSkills).toBe(0.5);
    expect(scored.scoreResult.components.preferredSkills).toBe(0.5);
    expect(scored.scoreResult.reasons.filter((reason) =>
      reason.message.includes('Job skills unavailable; used neutral score'),
    )).toHaveLength(2);
  });

  it('treats curated skill aliases as full-credit alias matches', async () => {
    const [scored] = await service.score(
      { ...context(), requiredSkills: ['Node.js'], preferredSkills: ['Postgres'] },
      [{ job: { ...job(), skills: ['NodeJS', 'PostgreSQL'] }, retrievalScore: 0.5 }],
    );

    expect(scored.scoreResult.components.requiredSkills).toBe(1);
    expect(scored.scoreResult.components.preferredSkills).toBe(1);
    expect(scored.scoreResult.matchedSkills).toEqual([]);
    expect(scored.scoreResult.aliasSkills).toEqual(['Node.js', 'PostgreSQL']);
    expect(scored.scoreResult.relatedSkills).toEqual([]);
    expect(scored.scoreResult.transferableSkills).toEqual([]);
    expect(scored.scoreResult.missingSkills).toEqual([]);
    expect(scored.matchType).toBe('ALIAS');
  });

  it('uses related skill edges as partial matches without marking them exact', async () => {
    const [scored] = await service.score(
      { ...context(), requiredSkills: ['React'], preferredSkills: [] },
      [{ job: { ...job(), skills: ['NextJS'] }, retrievalScore: 1 }],
    );

    expect(scored.scoreResult.components.requiredSkills).toBe(0.65);
    expect(scored.scoreResult.matchedSkills).toEqual([]);
    expect(scored.scoreResult.aliasSkills).toEqual([]);
    expect(scored.scoreResult.relatedSkills).toEqual(['Next.js']);
    expect(scored.scoreResult.transferableSkills).toEqual([]);
    expect(scored.scoreResult.missingSkills).toEqual([]);
    expect(scored.matchType).toBe('RELATED');
  });

  it('uses transferable skill edges with lower credit and explicit evidence', async () => {
    const [scored] = await service.score(
      { ...context(), requiredSkills: ['TypeScript'], preferredSkills: [] },
      [{ job: { ...job(), skills: ['JavaScript'] }, retrievalScore: 1 }],
    );

    expect(scored.scoreResult.components.requiredSkills).toBe(0.35);
    expect(scored.scoreResult.matchedSkills).toEqual([]);
    expect(scored.scoreResult.aliasSkills).toEqual([]);
    expect(scored.scoreResult.relatedSkills).toEqual([]);
    expect(scored.scoreResult.transferableSkills).toEqual(['JavaScript']);
    expect(scored.scoreResult.missingSkills).toEqual([]);
    expect(scored.matchType).toBe('TRANSFERABLE');
    expect(
      scored.scoreResult.reasons.some((reason) =>
        reason.message.includes(
          'Transferable skill JavaScript can help with TypeScript, but it is lower confidence than an exact required-skill match',
        ),
      ),
    ).toBe(true);
    expect(
      scored.scoreResult.reasons.some((reason) =>
        reason.evidence.includes('transferable: JavaScript covers TypeScript'),
      ),
    ).toBe(true);
  });

  it('keeps exact, alias, related, transferable, and missing skill arrays disjoint', async () => {
    const [scored] = await service.score(
      {
        ...context(),
        requiredSkills: ['TypeScript', 'Node.js', 'React', 'Amazon Web Services', 'Redis'],
        preferredSkills: [],
      },
      [
        {
          job: {
            ...job(),
            skills: ['TypeScript', 'NodeJS', 'NextJS', 'Google Cloud Platform'],
          },
          retrievalScore: 0.5,
        },
      ],
    );

    expect(scored.scoreResult.matchedSkills).toEqual(['TypeScript']);
    expect(scored.scoreResult.aliasSkills).toEqual(['Node.js']);
    expect(scored.scoreResult.relatedSkills).toEqual(['Next.js']);
    expect(scored.scoreResult.transferableSkills).toEqual(['Google Cloud Platform']);
    expect(scored.scoreResult.missingSkills).toEqual(['Redis']);
  });

  it('supports deterministic tie-break when sorted by the production comparator', async () => {
    const jobB = { ...job(), id: 'job-b' };
    const jobA = { ...job(), id: 'job-a', title: 'Platform Engineer', skills: ['Go'] };
    const results = await service.score(context(), [
      { job: jobA, retrievalScore: 0.5 },
      { job: jobB, retrievalScore: 0.9 },
    ]);
    const sorted = sortRecommendationsForRanking(results);
    expect(sorted[0]!.job.id).toBe('job-b');
    expect(sorted.map((item) => item.job.id)).toEqual(['job-b', 'job-a']);
  });
});
