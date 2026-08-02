import { describe, expect, it, vi } from 'vitest';
import type { JobDetailDto, JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { RecommendationFeedbackService } from '@/modules/recommendations/services/recommendation-feedback.service.js';
import { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';
import { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import {
  JobSourceStrategy,
  ProfileSourceStrategy,
  ResumeSourceStrategy,
  TargetTextSourceStrategy,
} from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
import { InMemoryRecommendationUnitOfWork } from '@/modules/recommendations/repositories/in-memory-recommendation.unit-of-work.js';
import { applyRecommendationFilters } from '@/modules/recommendations/utils/apply-recommendation-filters.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
} from '@/modules/recommendations/types/recommendations.types.js';
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
  applyUrl: null,
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
  applyUrl: null,
});

const baseContext = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'TARGET_TEXT',
  contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
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

  it('rejects missing or unowned RESUME sources', async () => {
    const resumeId = '22222222-2222-2222-2222-222222222222';
    const findOwnedResumeProfileSource = vi.fn().mockResolvedValue(null);
    const service = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      {
        findCandidateProfileByUserId: vi.fn(),
        findOwnedResumeProfileSource,
      },
    );

    await expect(
      service.authorizeForSource('user-1', {
        sourceType: 'RESUME',
        sourceId: resumeId,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECOMMENDATION_SOURCE_NOT_FOUND',
    });
    expect(findOwnedResumeProfileSource).toHaveBeenCalledWith('user-1', resumeId);
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

  it('does not create a run when RESUME ownership authorization fails', async () => {
    const unitOfWork = new InMemoryRecommendationUnitOfWork();
    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new ResumeSourceStrategy()]),
      ),
      retrievalService: { retrieve: vi.fn() } as unknown as RecommendationRetrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork,
      sourceAuthorization: new RecommendationSourceAuthorizationService(
        { findById: vi.fn() } as unknown as IJobSearchRepository,
        {
          findCandidateProfileByUserId: vi.fn(),
          findOwnedResumeProfileSource: vi.fn().mockResolvedValue(null),
        },
      ),
    });

    await expect(
      service.createForSource('user-1', {
        sourceType: 'RESUME',
        sourceId: '22222222-2222-2222-2222-222222222222',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECOMMENDATION_SOURCE_NOT_FOUND',
    });
    await expect(
      unitOfWork.execute(({ runs }) => runs.findLatestByUser('user-1')),
    ).resolves.toBeNull();
  });

  it('rejects authorized contexts whose userId does not match the caller before creating a run', async () => {
    const unitOfWork = new InMemoryRecommendationUnitOfWork();
    const sourceAuthorization = {
      authorizeForSource: vi.fn().mockResolvedValue({
        userId: 'public-user-id',
        sourceType: 'PROFILE',
        authorizedSourcePayload: {
          targetTitles: ['Backend Engineer'],
          requiredSkills: ['TypeScript'],
          sourceText: 'Backend Engineer TypeScript',
        },
      }),
      authorizeFromText: vi.fn(),
    } as unknown as RecommendationSourceAuthorizationService;
    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new ProfileSourceStrategy()]),
      ),
      retrievalService: { retrieve: vi.fn() } as unknown as RecommendationRetrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork,
      sourceAuthorization,
    });

    await expect(service.createForSource('42', { sourceType: 'PROFILE' })).rejects.toMatchObject({
      statusCode: 403,
      code: RECOMMENDATION_ERROR_CODES.ACCESS_DENIED,
    });
    expect(sourceAuthorization.authorizeForSource).toHaveBeenCalledWith('42', {
      sourceType: 'PROFILE',
    });
    await expect(unitOfWork.execute(({ runs }) => runs.findLatestByUser('42'))).resolves.toBeNull();
    await expect(
      unitOfWork.execute(({ runs }) => runs.findLatestByUser('public-user-id')),
    ).resolves.toBeNull();
  });

  it('persists run recommendations and feedback with the principalId userId invariant', async () => {
    const principalUserId = '42';
    const unitOfWork = new InMemoryRecommendationUnitOfWork();
    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new TargetTextSourceStrategy()]),
      ),
      retrievalService: {
        retrieve: vi
          .fn()
          .mockResolvedValue([
            { job: jobList('job-high', { title: 'Backend Engineer' }), retrievalScore: 0.9 },
          ]),
      } as unknown as RecommendationRetrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork,
      sourceAuthorization: new RecommendationSourceAuthorizationService(
        { findById: vi.fn() } as unknown as IJobSearchRepository,
        {
          findCandidateProfileByUserId: vi.fn(),
          findOwnedResumeProfileSource: vi.fn(),
        },
      ),
    });
    const feedbackService = new RecommendationFeedbackService({
      upsert: (input) => unitOfWork.execute(({ feedback }) => feedback.upsert(input)),
      findByRecommendation: (userId, recommendationId) =>
        unitOfWork.execute(({ feedback }) =>
          feedback.findByRecommendation(userId, recommendationId),
        ),
      listByJob: (userId, jobId) =>
        unitOfWork.execute(({ feedback }) => feedback.listByJob(userId, jobId)),
      listExcludedJobIds: (userId) =>
        unitOfWork.execute(({ feedback }) => feedback.listExcludedJobIds(userId)),
    });

    const records = await service.createFromText(principalUserId, {
      targetText: 'Backend engineer TypeScript',
    });
    const run = await unitOfWork.execute(({ runs }) => runs.findLatestByUser(principalUserId));
    const feedback = await feedbackService.store({
      userId: principalUserId,
      recommendationId: records[0]!.id,
      jobId: records[0]!.job.id,
      action: 'SAVED',
    });

    expect(run).toMatchObject({ userId: principalUserId });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: principalUserId,
      runId: run?.id,
    });
    expect(feedback).toMatchObject({
      userId: principalUserId,
      recommendationId: records[0]!.id,
      jobId: records[0]!.job.id,
    });
  });

  it('lists, loads, and stores feedback for persisted recommendations', async () => {
    const unitOfWork = new InMemoryRecommendationUnitOfWork();
    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new TargetTextSourceStrategy()]),
      ),
      retrievalService: {
        retrieve: vi
          .fn()
          .mockResolvedValue([
            { job: jobList('job-high', { title: 'Backend Engineer' }), retrievalScore: 0.9 },
          ]),
      } as unknown as RecommendationRetrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork,
      sourceAuthorization: new RecommendationSourceAuthorizationService(
        { findById: vi.fn() } as unknown as IJobSearchRepository,
        {
          findCandidateProfileByUserId: vi.fn(),
          findOwnedResumeProfileSource: vi.fn(),
        },
      ),
    });
    const feedbackService = new RecommendationFeedbackService({
      upsert: (input) => unitOfWork.execute(({ feedback }) => feedback.upsert(input)),
      findByRecommendation: (userId, recommendationId) =>
        unitOfWork.execute(({ feedback }) =>
          feedback.findByRecommendation(userId, recommendationId),
        ),
      listByJob: (userId, jobId) =>
        unitOfWork.execute(({ feedback }) => feedback.listByJob(userId, jobId)),
      listExcludedJobIds: (userId) =>
        unitOfWork.execute(({ feedback }) => feedback.listExcludedJobIds(userId)),
    });

    const created = await service.createFromText('user-1', {
      targetText: 'Backend engineer TypeScript',
    });
    const page = await service.listForUser('user-1', { page: 1, limit: 20 });
    const detail = await service.getForUser('user-1', created[0]!.id);
    const feedback = await feedbackService.store({
      userId: 'user-1',
      recommendationId: created[0]!.id,
      jobId: created[0]!.job.id,
      action: 'SAVED',
      note: 'Strong match',
    });

    expect(page.total).toBe(1);
    expect(page.items[0]?.id).toBe(created[0]?.id);
    expect(detail.job.id).toBe('job-high');
    expect(feedback.action).toBe('SAVED');
    await expect(
      feedbackService.findForRecommendation('user-1', created[0]!.id),
    ).resolves.toMatchObject({ action: 'SAVED', note: 'Strong match' });
  });

  it('drops stretch/related categories when includeStretchOpportunities is false', async () => {
    const retrievalService = {
      retrieve: vi.fn().mockResolvedValue([
        { job: jobList('job-high', { title: 'Backend Engineer' }), retrievalScore: 0.9 },
        {
          job: jobList('job-low', {
            title: 'Marketing Manager',
            skills: ['SEO'],
            salary: { minimum: 40000, maximum: 50000, currency: 'USD' },
          }),
          retrievalScore: 0.1,
        },
      ]),
    } as unknown as RecommendationRetrievalService;

    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new TargetTextSourceStrategy()]),
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
      filters: { includeStretchOpportunities: false },
    });

    expect(records.every((item) => ['BEST_MATCH', 'GOOD_MATCH'].includes(item.category))).toBe(
      true,
    );
    expect(records.some((item) => item.job.id === 'job-high')).toBe(true);
  });
});

describe('RecommendationsService readiness', () => {
  it('reports profile readiness for generate', async () => {
    const findCandidateProfileByUserId = vi.fn().mockResolvedValue({
      titles: ['Backend Engineer'],
      skills: ['TypeScript'],
      summary: 'Backend engineer',
      locations: [],
      industries: [],
      employmentTypes: [],
      experienceLevels: [],
      education: [],
      certifications: [],
    });
    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new ProfileSourceStrategy()]),
      ),
      retrievalService: { retrieve: vi.fn() } as unknown as RecommendationRetrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork: new InMemoryRecommendationUnitOfWork(),
      sourceAuthorization: new RecommendationSourceAuthorizationService(
        { findById: vi.fn() } as unknown as IJobSearchRepository,
        {
          findCandidateProfileByUserId,
          findOwnedResumeProfileSource: vi.fn(),
        },
      ),
    });

    await expect(service.getReadinessStatus('user-1')).resolves.toMatchObject({
      ready: true,
      lifecycleState: 'NOT_STARTED',
      canGenerateFromProfile: true,
      blockers: [],
      retrieval: { backend: 'PGVECTOR', configured: true },
    });
  });

  it('reports STALE when a completed run is older than the profile', async () => {
    const findCandidateProfileByUserId = vi.fn().mockResolvedValue({
      titles: ['Backend Engineer'],
      skills: ['TypeScript'],
      summary: 'Backend engineer',
    });
    const unitOfWork = new InMemoryRecommendationUnitOfWork();
    const run = await unitOfWork.execute(({ runs }) =>
      runs.create({ userId: 'user-1', sourceType: 'PROFILE' }),
    );
    await unitOfWork.execute(({ runs }) => runs.markCompleted('user-1', run.id));
    const service = new RecommendationsService(createChildLogger({ scope: 'test-recs' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new ProfileSourceStrategy()]),
      ),
      retrievalService: { retrieve: vi.fn() } as unknown as RecommendationRetrievalService,
      scoringService: new RecommendationScoringService(
        new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
      ),
      unitOfWork,
      sourceAuthorization: new RecommendationSourceAuthorizationService(
        { findById: vi.fn() } as unknown as IJobSearchRepository,
        {
          findCandidateProfileByUserId,
          findOwnedResumeProfileSource: vi.fn(),
        },
      ),
      profileUpdatedAfter: vi.fn().mockResolvedValue(true),
    });

    await expect(service.getReadinessStatus('user-1')).resolves.toMatchObject({
      ready: true,
      lifecycleState: 'STALE',
      stale: true,
      blockers: ['RECOMMENDATIONS_STALE'],
      lastGeneratedAt: expect.any(String),
    });
  });
});
