import { describe, expect, it, vi } from 'vitest';
import type { JobDetailDto, JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import { SimilarJobsService } from '@/modules/recommendations/services/similar-jobs.service.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { JobSourceStrategy } from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
import { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';

const sourceJobId = '11111111-1111-1111-1111-111111111111';

const sourceJob: JobDetailDto = {
  id: sourceJobId,
  title: 'Backend Engineer',
  company: { slug: 'good-co', name: 'Good Co', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 120000, maximum: 150000, currency: 'USD' },
  skills: ['TypeScript', 'PostgreSQL'],
  publishedAt: null,
  applyUrl: null,
  descriptionHtml: '<p>APIs</p>',
  descriptionText: 'Build APIs with TypeScript',
  benefits: [],
  tags: [],
  companyIndustry: 'SaaS',
  companySize: null,
};

const candidate = (id: string, title: string): JobListDto => ({
  id,
  title,
  company: { slug: 'other', name: 'Other', logoUrl: null, verified: false },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 110000, maximum: 140000, currency: 'USD' },
  skills: ['TypeScript'],
  publishedAt: null,
  applyUrl: null,
});

describe('SimilarJobsService', () => {
  it('authorizes the source job, excludes it, retrieves, and scores neighbors', async () => {
    const authorizeForSource = vi.fn().mockResolvedValue({
      userId: 'user-1',
      sourceType: 'JOB',
      sourceId: sourceJobId,
      authorizedSourcePayload: sourceJob,
    });
    const retrievalService = {
      retrieve: vi.fn().mockResolvedValue([
        { job: candidate('job-b', 'Platform Engineer'), retrievalScore: 0.9 },
        { job: candidate('job-c', 'Marketing Lead'), retrievalScore: 0.2 },
      ]),
    } as unknown as RecommendationRetrievalService;

    const service = new SimilarJobsService(
      { authorizeForSource } as unknown as RecommendationSourceAuthorizationService,
      new RecommendationContextService(
        new RecommendationStrategyResolver([new JobSourceStrategy()]),
      ),
      retrievalService,
      new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
    );

    const result = await service.findSimilar('user-1', sourceJobId, 5);

    expect(authorizeForSource).toHaveBeenCalledWith('user-1', {
      sourceType: 'JOB',
      sourceId: sourceJobId,
    });
    expect(retrievalService.retrieve).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 'PGVECTOR',
        limit: 5,
        excludeJobIds: [sourceJobId],
        context: expect.objectContaining({
          userId: 'user-1',
          sourceType: 'JOB',
          targetTitles: ['Backend Engineer'],
        }),
      }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.scoreResult.overallScore).toBeGreaterThanOrEqual(
      result[1]?.scoreResult.overallScore ?? 0,
    );
  });
});
