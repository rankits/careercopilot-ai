import { describe, expect, it, vi } from 'vitest';
import type { JobDetailDto, JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import {
  JobSourceStrategy,
  TargetTextSourceStrategy,
} from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
import { InMemoryRecommendationUnitOfWork } from '@/modules/recommendations/repositories/in-memory-recommendation.unit-of-work.js';
import { applyRecommendationFilters } from '@/modules/recommendations/utils/apply-recommendation-filters.js';
import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import { createChildLogger } from '@/shared/logger/logger.js';

const jobDetail = (id: string): JobDetailDto => ({
  id,
  title: 'Backend Engineer',
  company: { slug: 'good-co', name: 'Good Co', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 130000, maximum: 160000, currency: 'USD' },
  skills: ['TypeScript', 'PostgreSQL'],
  publishedAt: null,
  expiresAt: null,
  descriptionHtml: '<p>Build APIs</p>',
  descriptionText: 'Build APIs with TypeScript',
  benefits: [],
  tags: [],
  companyIndustry: 'SaaS',
  companySize: null,
});

const jobList = (id: string, overrides: Partial<JobListDto> = {}): JobListDto => ({
  id,
  title: overrides.title ?? 'Backend Engineer',
  company: overrides.company ?? {
    slug: 'good-co',
    name: 'Good Co',
    logoUrl: null,
    verified: true,
  },
  location: overrides.location ?? { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: overrides.employmentType ?? 'FULL_TIME',
  salary: overrides.salary ?? { minimum: 130000, maximum: 160000, currency: 'USD' },
  skills: overrides.skills ?? ['TypeScript', 'PostgreSQL'],
  publishedAt: null,
  expiresAt: null,
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

describe('heuristic scoring', () => {
  it('scores candidates with all nine calculators', async () => {
    const engine = new RecommendationScoringEngine(
      HEURISTIC_SCORE_CALCULATORS,
      defaultMatchTypeClassifier,
    );
    const scored = await engine.score(baseContext(), jobList('job-1'));
    expect(scored.scoreResult.overallScore).toBeGreaterThan(0.5);
    expect(Object.keys(scored.scoreResult.components)).toHaveLength(9);
    expect(scored.category).toBeTruthy();
    expect(scored.matchType).toBeTruthy();
  });
});

describe('RecommendationSourceAuthorizationService', () => {
  const emptyProfiles = {
    findCandidateProfileByUserId: vi.fn(),
    findOwnedResumeProfileSource: vi.fn(),
  };

  it('authorizes JOB sources from the job catalog', async () => {
    const detail = jobDetail('11111111-1111-1111-1111-111111111111');
    const jobs = {
      findById: vi.fn().mockResolvedValue(detail),
    } as unknown as IJobSearchRepository;
    const service = new RecommendationSourceAuthorizationService(jobs, emptyProfiles);

    const authorized = await service.authorizeForSource('user-1', {
      sourceType: 'JOB',
      sourceId: detail.id,
    });

    expect(authorized).toEqual({
      userId: 'user-1',
      sourceType: 'JOB',
      sourceId: detail.id,
      authorizedSourcePayload: detail,
    });
  });

  it('authorizes TARGET_TEXT from the request body', () => {
    const service = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      emptyProfiles,
    );

    expect(service.authorizeFromText('user-1', { targetText: '  Platform engineer  ' })).toEqual({
      userId: 'user-1',
      sourceType: 'TARGET_TEXT',
      authorizedSourcePayload: 'Platform engineer',
    });
  });

  it('authorizes PROFILE from candidate profile JSON', async () => {
    const service = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      {
        findCandidateProfileByUserId: vi.fn().mockResolvedValue({
          personalDetails: { currentTitle: 'Backend Engineer', summary: 'APIs' },
          skills: ['TypeScript'],
          experience: [{ title: 'Software Engineer' }],
          education: [],
          certifications: [],
        }),
        findOwnedResumeProfileSource: vi.fn(),
      },
    );

    const authorized = await service.authorizeForSource('user-1', { sourceType: 'PROFILE' });
    expect(authorized.sourceType).toBe('PROFILE');
    expect(authorized.authorizedSourcePayload).toMatchObject({
      targetTitles: ['Backend Engineer', 'Software Engineer'],
      requiredSkills: ['TypeScript'],
      sourceText: 'APIs',
    });
  });

  it('authorizes owned RESUME parse data', async () => {
    const resumeId = '22222222-2222-2222-2222-222222222222';
    const service = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      {
        findCandidateProfileByUserId: vi.fn(),
        findOwnedResumeProfileSource: vi.fn().mockResolvedValue({
          personalDetails: { primaryRole: 'Platform Engineer' },
          skills: ['Go'],
          experience: [],
          education: [],
          certifications: [],
        }),
      },
    );

    const authorized = await service.authorizeForSource('user-1', {
      sourceType: 'RESUME',
      sourceId: resumeId,
    });
    expect(authorized).toMatchObject({
      sourceType: 'RESUME',
      sourceId: resumeId,
      authorizedSourcePayload: {
        targetTitles: ['Platform Engineer'],
        requiredSkills: ['Go'],
      },
    });
  });

  it('rejects empty candidate profiles', async () => {
    const service = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      {
        findCandidateProfileByUserId: vi.fn().mockResolvedValue({
          personalDetails: {},
          skills: [],
          experience: [],
          education: [],
          certifications: [],
        }),
        findOwnedResumeProfileSource: vi.fn(),
      },
    );

    await expect(
      service.authorizeForSource('user-1', { sourceType: 'PROFILE' }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'RECOMMENDATION_CONTEXT_INVALID' });
  });

  it('keeps CAREER_GOAL authorization unimplemented', async () => {
    const service = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      emptyProfiles,
    );

    await expect(
      service.authorizeForSource('user-1', {
        sourceType: 'CAREER_GOAL',
        sourceId: '33333333-3333-3333-3333-333333333333',
      }),
    ).rejects.toMatchObject({ statusCode: 501 });
  });
});

describe('applyRecommendationFilters', () => {
  it('overlays request filters onto context', () => {
    const filtered = applyRecommendationFilters(baseContext(), {
      locations: ['Berlin'],
      workModes: ['HYBRID'],
      minimumSalary: 150000,
      employmentTypes: ['CONTRACT'],
    });
    expect(filtered.locations).toEqual(['Berlin']);
    expect(filtered.remotePreference).toBe('HYBRID');
    expect(filtered.salaryExpectation.minimum).toBe(150000);
    expect(filtered.employmentTypes).toEqual(['CONTRACT']);
  });
});

describe('RecommendationsService generation', () => {
  it('runs authorize → retrieve → score → ephemeral persist for text', async () => {
    const retrievalService = {
      retrieve: vi.fn().mockResolvedValue([
        { job: jobList('job-high', { title: 'Backend Engineer' }), retrievalScore: 0.9 },
        {
          job: jobList('job-low', {
            title: 'Marketing Manager',
            skills: ['SEO'],
            salary: { minimum: 40000, maximum: 50000, currency: 'USD' },
          }),
          retrievalScore: 0.2,
        },
      ]),
    } as unknown as RecommendationRetrievalService;

    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([
          new TargetTextSourceStrategy(),
          new JobSourceStrategy(),
        ]),
      ),
      retrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork: new InMemoryRecommendationUnitOfWork(),
      sourceAuthorization: new RecommendationSourceAuthorizationService(
        { findById: vi.fn() } as unknown as IJobSearchRepository,
        {
          findCandidateProfileByUserId: vi.fn(),
          findOwnedResumeProfileSource: vi.fn(),
        },
      ),
    });

    const records = await service.createFromText('user-1', {
      targetText: 'Backend engineer with TypeScript and PostgreSQL',
      filters: { workModes: ['REMOTE'], minimumSalary: 100000 },
    });

    expect(retrievalService.retrieve).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: 'PGVECTOR',
        limit: 20,
        context: expect.objectContaining({
          remotePreference: 'REMOTE',
          salaryExpectation: expect.objectContaining({ minimum: 100000 }),
        }),
      }),
    );
    expect(records).toHaveLength(2);
    expect(records[0]?.rank).toBe(1);
    expect(records[0]?.scoreResult.overallScore).toBeGreaterThanOrEqual(
      records[1]?.scoreResult.overallScore ?? 0,
    );
    expect(records[0]?.runId).toBeTruthy();
  });
});
