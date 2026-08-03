import { describe, expect, it, vi } from 'vitest';
import { InMemoryRecommendationUnitOfWork } from '@/modules/recommendations/repositories/in-memory-recommendation.unit-of-work.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';
import { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import { CareerTargetService } from '@/modules/recommendations/services/career-target.service.js';
import { SavedSearchService } from '@/modules/recommendations/services/saved-search.service.js';

const sampleJob = (id: string): JobListDto => ({
  id,
  title: 'Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: null, maximum: null, currency: null },
  skills: ['TypeScript'],
  publishedAt: null,
  applyUrl: null,
});

describe('recommendation repository IDOR guards', () => {
  const createRecommendation = async (
    uow: InMemoryRecommendationUnitOfWork,
    userId: string,
    jobId = 'job-1',
  ) => {
    const run = await uow.execute(({ runs }) => runs.create({ userId, sourceType: 'PROFILE' }));
    const [record] = await uow.execute(({ recommendations }) =>
      recommendations.createMany(run.userId, run.id, [
        {
          job: sampleJob(jobId),
          category: 'GOOD_MATCH',
          matchType: 'RELATED',
          scoreResult: {
            overallScore: 0.7,
            components: {
              requiredSkills: 0.7,
              title: 0.7,
              experience: 0.7,
              responsibilities: 0.7,
              preferredSkills: 0.7,
              location: 0.7,
              industry: 0.7,
              salary: 0.7,
              qualifications: 0.7,
            },
            matchedSkills: [],
            aliasSkills: [],
            relatedSkills: [],
            transferableSkills: [],
            missingSkills: [],
            reasons: [],
          },
        },
      ]),
    );
    return { run, record: record! };
  };

  it('scopes recommendation findById to the owning user', async () => {
    const uow = new InMemoryRecommendationUnitOfWork();
    const { record } = await createRecommendation(uow, 'owner');

    const ownerView = await uow.execute(({ recommendations }) =>
      recommendations.findById('owner', record.id),
    );
    const intruderView = await uow.execute(({ recommendations }) =>
      recommendations.findById('intruder', record.id),
    );

    expect(ownerView?.id).toBe(record.id);
    expect(intruderView).toBeNull();
  });

  it('scopes recommendation list and run lookups to the owning user', async () => {
    const uow = new InMemoryRecommendationUnitOfWork();
    const owner = await createRecommendation(uow, 'owner', 'owner-job');
    await createRecommendation(uow, 'intruder', 'intruder-job');

    const ownerList = await uow.execute(({ recommendations }) =>
      recommendations.listByUser('owner', { page: 1, limit: 20 }),
    );
    const intruderList = await uow.execute(({ recommendations }) =>
      recommendations.listByUser('intruder', { page: 1, limit: 20 }),
    );
    const crossRun = await uow.execute(({ runs }) => runs.findById('intruder', owner.run.id));
    const crossRunRecommendations = await uow.execute(({ recommendations }) =>
      recommendations.listByRun('intruder', owner.run.id, { page: 1, limit: 20 }),
    );

    expect(ownerList.items.map((item) => item.job.id)).toEqual(['owner-job']);
    expect(intruderList.items.map((item) => item.job.id)).toEqual(['intruder-job']);
    expect(crossRun).toBeNull();
    expect(crossRunRecommendations.items).toEqual([]);
  });

  it('rejects cross-user feedback writes and reads', async () => {
    const uow = new InMemoryRecommendationUnitOfWork();
    const { record } = await createRecommendation(uow, 'owner');

    await expect(
      uow.execute(({ feedback }) =>
        feedback.upsert({
          userId: 'intruder',
          recommendationId: record.id,
          jobId: record.job.id,
          action: 'SAVED',
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.RECOMMENDATION_NOT_FOUND,
    });

    await uow.execute(({ feedback }) =>
      feedback.upsert({
        userId: 'owner',
        recommendationId: record.id,
        jobId: record.job.id,
        action: 'DISMISSED',
      }),
    );

    const intruderFeedback = await uow.execute(({ feedback }) =>
      feedback.findByRecommendation('intruder', record.id),
    );
    const ownerExclusions = await uow.execute(({ feedback }) =>
      feedback.listExcludedJobIds('owner'),
    );
    const intruderExclusions = await uow.execute(({ feedback }) =>
      feedback.listExcludedJobIds('intruder'),
    );

    expect(intruderFeedback).toBeNull();
    expect(ownerExclusions).toEqual([record.job.id]);
    expect(intruderExclusions).toEqual([]);
  });

  it('scopes resume, career goal, and saved search recommendation sources to the owning user', async () => {
    const mockJobs = { findById: vi.fn() } as any;
    const mockProfiles = {
      findCandidateProfileByUserId: vi.fn(),
      findOwnedResumeProfileSource: vi.fn(async (userId: string, id: string) =>
        userId === 'owner'
          ? {
              personalDetails: {},
              experience: [],
              education: [],
              skills: ['ts'],
              certifications: [],
            }
          : null,
      ),
      findOwnedCareerTargetSource: vi.fn(async (userId: string, id: string) =>
        userId === 'owner' ? { id, userId, goalText: 'Goal', structured: {} } : null,
      ),
      findOwnedSavedSearchSource: vi.fn(async (userId: string, id: string) =>
        userId === 'owner'
          ? { id, userId, name: 'Search', query: 'TS', filters: {}, context: {} }
          : null,
      ),
    } as any;
    const authService = new RecommendationSourceAuthorizationService(mockJobs, mockProfiles);

    await expect(
      authService.authorizeForSource('intruder', {
        sourceType: 'RESUME',
        sourceId: 'owner-resume',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });

    await expect(
      authService.authorizeForSource('intruder', {
        sourceType: 'CAREER_GOAL',
        sourceId: 'owner-goal',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });

    await expect(
      authService.authorizeForSource('intruder', {
        sourceType: 'SAVED_SEARCH',
        sourceId: 'owner-search',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });
  });

  it('rejects cross-user access to career targets and saved searches via service layer', async () => {
    const careerTargetRepo = {
      findOwned: vi.fn(async (userId: string, id: string) =>
        userId === 'owner' ? { id, userId, goalText: 'Goal' } : null,
      ),
    } as any;
    const savedSearchRepo = {
      findOwned: vi.fn(async (userId: string, id: string) =>
        userId === 'owner' ? { id, userId, name: 'Search' } : null,
      ),
    } as any;

    const careerTargetService = new CareerTargetService(careerTargetRepo);
    const savedSearchService = new SavedSearchService(savedSearchRepo);

    await expect(careerTargetService.get('intruder', 'target-1')).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });

    await expect(savedSearchService.get('intruder', 'search-1')).rejects.toMatchObject({
      statusCode: 404,
      code: RECOMMENDATION_ERROR_CODES.SOURCE_NOT_FOUND,
    });
  });

  it('prevents IDOR on from-text, career goal, and saved search runs by isolating user runs in repository', async () => {
    const uow = new InMemoryRecommendationUnitOfWork();
    const runText = await uow.execute(({ runs }) =>
      runs.create({ userId: 'owner', sourceType: 'TARGET_TEXT' }),
    );
    const runGoal = await uow.execute(({ runs }) =>
      runs.create({ userId: 'owner', sourceType: 'CAREER_GOAL', sourceId: 'goal-1' }),
    );
    const runSearch = await uow.execute(({ runs }) =>
      runs.create({ userId: 'owner', sourceType: 'SAVED_SEARCH', sourceId: 'search-1' }),
    );

    expect(await uow.execute(({ runs }) => runs.findById('intruder', runText.id))).toBeNull();
    expect(await uow.execute(({ runs }) => runs.findById('intruder', runGoal.id))).toBeNull();
    expect(await uow.execute(({ runs }) => runs.findById('intruder', runSearch.id))).toBeNull();
  });
});
