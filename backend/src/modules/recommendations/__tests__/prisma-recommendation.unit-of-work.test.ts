import { afterEach, describe, expect, it, vi } from 'vitest';

const { tx, jobs } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    recommendationRun: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    jobRecommendation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    recommendationFeedback: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };
  const jobs = { findByIds: vi.fn() };
  return { tx, jobs };
});

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation(tx)),
  },
  default: {
    $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation(tx)),
  },
}));

import { Prisma } from '@prisma/client';
import { resetRecommendationMetricsForTests } from '@/modules/recommendations/observability/recommendation.metrics.js';
import { PrismaRecommendationUnitOfWork } from '@/modules/recommendations/repositories/prisma-recommendation.unit-of-work.js';
import type {
  JobRecommendationRecord,
  RecommendationRunRecord,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';

const runRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'run-1',
  userId: 'user-1',
  sourceType: 'PROFILE',
  sourceId: 'profile-1',
  status: 'PENDING',
  candidateCount: 0,
  failureCode: null,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  completedAt: null,
  ...overrides,
});

const recommendationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'rec-1',
  runId: 'run-1',
  userId: 'user-1',
  jobId: 'job-1',
  rank: 1,
  overallScore: 87.5,
  category: 'STRONG',
  matchType: 'GOOD_MATCH',
  matchedSkills: ['typescript'],
  aliasSkills: [],
  relatedSkills: [],
  transferableSkills: [],
  missingSkills: ['go'],
  reasons: [
    { component: 'title', message: 'Title matches', evidence: ['engineer'] },
    { component: 'unknown', message: 'No component', evidence: [42, 'text'] },
    null,
    'junk',
    { component: 'location', message: 'Loc' },
    { component: 'salary', message: 'Pay', evidence: [] },
  ],
  scoreComponents: [
    {
      id: 'sc-1',
      recommendationId: 'rec-1',
      component: 'title',
      weight: 1,
      score: 90,
      explanationMetadata: {},
    },
    {
      id: 'sc-2',
      recommendationId: 'rec-1',
      component: 'salary',
      weight: 1,
      score: 50,
      explanationMetadata: {},
    },
  ],
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  ...overrides,
});

const jobDto = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  title: 'Platform Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 100000, maximum: 150000, currency: 'USD' },
  skills: ['typescript'],
  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
  applyUrl: 'https://acme.example/apply',
  ...overrides,
});

const makeScored = (overrides: Record<string, unknown> = {}): ScoredJobRecommendation => ({
  job: jobDto(),
  scoreResult: {
    overallScore: 87.5,
    components: {
      requiredSkills: 0,
      title: 90,
      experience: 0,
      responsibilities: 0,
      preferredSkills: 0,
      location: 0,
      industry: 0,
      salary: 50,
      qualifications: 0,
    },
    matchedSkills: ['typescript'],
    aliasSkills: [],
    relatedSkills: [],
    transferableSkills: [],
    missingSkills: ['go'],
    reasons: [
      { component: 'title', message: 'Title matches', evidence: ['engineer'] },
      { component: 'salary', message: 'Pay', evidence: [] },
    ],
  },
  category: 'STRONG',
  matchType: 'GOOD_MATCH',
  ...overrides,
});

const uowRepos = <T>(
  operation: (repos: {
    runs: RecommendationRunRepositoryLike;
    recommendations: JobRecommendationRepositoryLike;
    feedback: FeedbackRepositoryLike;
  }) => Promise<T>,
): Promise<T> => {
  const uow = new PrismaRecommendationUnitOfWork(jobs);
  return uow.execute(operation as never) as Promise<T>;
};

type RecommendationRunRepositoryLike = {
  create(input: {
    userId: string;
    sourceType: string;
    sourceId?: string;
  }): Promise<RecommendationRunRecord>;
  updateStatus(userId: string, runId: string, status: string): Promise<RecommendationRunRecord>;
  updateCandidateCount(
    userId: string,
    runId: string,
    count: number,
  ): Promise<RecommendationRunRecord>;
  markCompleted(userId: string, runId: string): Promise<RecommendationRunRecord>;
  markFailed(userId: string, runId: string, failureCode: string): Promise<RecommendationRunRecord>;
  findById(userId: string, runId: string): Promise<RecommendationRunRecord | null>;
  findLatestByUser(userId: string): Promise<RecommendationRunRecord | null>;
};

type JobRecommendationRepositoryLike = {
  createMany(
    userId: string,
    runId: string,
    recommendations: readonly ScoredJobRecommendation[],
    options?: { preserveOrder?: boolean },
  ): Promise<JobRecommendationRecord[]>;
  findById(userId: string, recommendationId: string): Promise<JobRecommendationRecord | null>;
  listByRun(
    userId: string,
    runId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ items: JobRecommendationRecord[]; total: number }>;
  listByUser(
    userId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ items: JobRecommendationRecord[]; total: number }>;
  existsByRunAndJob(userId: string, runId: string, jobId: string): Promise<boolean>;
};

type FeedbackRepositoryLike = {
  upsert(input: {
    userId: string;
    recommendationId: string;
    jobId: string;
    action: string;
    note?: string;
  }): Promise<{ action: string; note: string | null }>;
  findByRecommendation(userId: string, recommendationId: string): Promise<unknown>;
  listByJob(userId: string, jobId: string): Promise<unknown>;
  listByAction(userId: string, action: string, options?: { limit?: number }): Promise<unknown>;
  listExcludedJobIds(userId: string): Promise<string[]>;
};

describe('PrismaRecommendationUnitOfWork', () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetRecommendationMetricsForTests();
  });

  describe('runs', () => {
    it('creates a run and maps to a run record', async () => {
      vi.mocked(tx.recommendationRun.create).mockResolvedValue(runRow());
      await uowRepos(async ({ runs }) => {
        const result = await runs.create({ userId: 'user-1', sourceType: 'PROFILE' });
        expect(result).toMatchObject({ id: 'run-1', status: 'PENDING' });
      });
      expect(tx.recommendationRun.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', sourceType: 'PROFILE', sourceId: undefined },
      });
    });

    it('updates run status when the run exists', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(runRow({ status: 'SCORING' }));
      await uowRepos(async ({ runs }) => {
        const result = await runs.updateStatus('user-1', 'run-1', 'SCORING');
        expect(result.status).toBe('SCORING');
      });
    });

    it('throws when updating status of a missing run', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 0 });
      await expect(
        uowRepos(async ({ runs }) => runs.updateStatus('user-1', 'nope', 'SCORING')),
      ).rejects.toMatchObject({ statusCode: 404, code: RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND });
    });

    it('updates candidate count when the run exists', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(runRow({ candidateCount: 7 }));
      await uowRepos(async ({ runs }) => {
        const result = await runs.updateCandidateCount('user-1', 'run-1', 7);
        expect(result.candidateCount).toBe(7);
      });
    });

    it('throws when updating candidate count of a missing run', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 0 });
      await expect(
        uowRepos(async ({ runs }) => runs.updateCandidateCount('user-1', 'nope', 7)),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('marks a run completed', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(
        runRow({ status: 'COMPLETED', completedAt: new Date() }),
      );
      await uowRepos(async ({ runs }) => {
        const result = await runs.markCompleted('user-1', 'run-1');
        expect(result.status).toBe('COMPLETED');
      });
      expect(tx.recommendationRun.updateMany).toHaveBeenCalledWith({
        where: { id: 'run-1', userId: 'user-1' },
        data: { status: 'COMPLETED', completedAt: expect.any(Date), failureCode: null },
      });
    });

    it('throws when marking a missing run completed', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 0 });
      await expect(
        uowRepos(async ({ runs }) => runs.markCompleted('user-1', 'nope')),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('marks a run failed', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(
        runRow({ status: 'FAILED', failureCode: 'PROVIDER_ERR' }),
      );
      await uowRepos(async ({ runs }) => {
        const result = await runs.markFailed('user-1', 'run-1', 'PROVIDER_ERR');
        expect(result.failureCode).toBe('PROVIDER_ERR');
      });
    });

    it('throws when marking a missing run failed', async () => {
      vi.mocked(tx.recommendationRun.updateMany).mockResolvedValue({ count: 0 });
      await expect(
        uowRepos(async ({ runs }) => runs.markFailed('user-1', 'nope', 'PROVIDER_ERR')),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('finds a run by id', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(runRow());
      await uowRepos(async ({ runs }) => {
        const result = await runs.findById('user-1', 'run-1');
        expect(result?.id).toBe('run-1');
      });
    });

    it('returns null when a run is missing', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(null);
      await uowRepos(async ({ runs }) => {
        await expect(runs.findById('user-1', 'nope')).resolves.toBeNull();
      });
    });

    it('finds the latest run for a user', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(runRow());
      await uowRepos(async ({ runs }) => {
        const result = await runs.findLatestByUser('user-1');
        expect(result?.id).toBe('run-1');
      });
      expect(tx.recommendationRun.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    });

    it('returns null when the user has no runs', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(null);
      await uowRepos(async ({ runs }) => {
        await expect(runs.findLatestByUser('user-1')).resolves.toBeNull();
      });
    });
  });

  describe('recommendations', () => {
    const seedQueryResults = (
      rawCount: unknown,
      count: unknown,
      ids: Array<{ id: string }>,
      eligibleIds: Array<{ id: string }> = [{ id: 'job-1' }],
    ) => {
      vi.mocked(tx.$queryRaw)
        .mockResolvedValueOnce([{ count: rawCount }])
        .mockResolvedValueOnce([{ count }])
        .mockResolvedValueOnce(ids)
        .mockResolvedValue(eligibleIds);
    };

    it('throws when creating recommendations for a missing run', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(null);
      await expect(
        uowRepos(async ({ recommendations }) =>
          recommendations.createMany('user-1', 'nope', [makeScored()]),
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('creates ranked recommendations preserving given order', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(runRow());
      vi.mocked(tx.jobRecommendation.create).mockResolvedValue(recommendationRow());
      const result = await uowRepos(async ({ recommendations }) =>
        recommendations.createMany(
          'user-1',
          'run-1',
          [makeScored(), makeScored({ job: jobDto({ id: 'job-2', title: 'SRE' }) })],
          { preserveOrder: true },
        ),
      );
      expect(result).toHaveLength(2);
      const firstCall = vi.mocked(tx.jobRecommendation.create).mock.calls[0][0];
      expect(firstCall.data.rank).toBe(1);
      expect(firstCall.data.reasons).toBeInstanceOf(Array);
      expect(firstCall.data.scoreComponents.create).toHaveLength(9);
    });

    it('creates recommendations without preserving order', async () => {
      vi.mocked(tx.recommendationRun.findFirst).mockResolvedValue(runRow());
      vi.mocked(tx.jobRecommendation.create).mockResolvedValue(recommendationRow());
      const result = await uowRepos(async ({ recommendations }) =>
        recommendations.createMany('user-1', 'run-1', [makeScored(), makeScored()]),
      );
      expect(result).toHaveLength(2);
    });

    it('returns null for a missing recommendation', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue(null);
      await uowRepos(async ({ recommendations }) => {
        await expect(recommendations.findById('user-1', 'nope')).resolves.toBeNull();
      });
    });

    it('hydrates a found recommendation with its job', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue(recommendationRow());
      vi.mocked(tx.$queryRaw).mockResolvedValue([{ id: 'job-1' }]);
      vi.mocked(jobs.findByIds).mockResolvedValue([jobDto()]);
      await uowRepos(async ({ recommendations }) => {
        const result = await recommendations.findById('user-1', 'rec-1');
        expect(result?.job.title).toBe('Platform Engineer');
        expect(result?.scoreResult.components.title).toBe(90);
        expect(result?.scoreResult.reasons).toHaveLength(3);
      });
    });

    it('drops recommendations whose jobs are no longer eligible', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue(
        recommendationRow({ jobId: 'job-gone' }),
      );
      vi.mocked(tx.$queryRaw).mockResolvedValue([]);
      vi.mocked(jobs.findByIds).mockResolvedValue([]);
      await uowRepos(async ({ recommendations }) => {
        const result = await recommendations.findById('user-1', 'rec-1');
        expect(result).toBeNull();
      });
    });

    it('drops recommendations whose job DTO is missing from the search repo', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue(recommendationRow());
      vi.mocked(tx.$queryRaw).mockResolvedValue([{ id: 'job-1' }]);
      vi.mocked(jobs.findByIds).mockResolvedValue([]);
      await uowRepos(async ({ recommendations }) => {
        const result = await recommendations.findById('user-1', 'rec-1');
        expect(result).toBeNull();
      });
    });

    it('lists eligible recommendations for a run', async () => {
      seedQueryResults(10n, 8, [{ id: 'rec-1' }, { id: 'missing-id' }]);
      vi.mocked(tx.jobRecommendation.findMany).mockResolvedValue([recommendationRow()]);
      vi.mocked(jobs.findByIds).mockResolvedValue([jobDto()]);
      const result = await uowRepos(async ({ recommendations }) =>
        recommendations.listByRun('user-1', 'run-1', { page: 1, limit: 10 }),
      );
      expect(result.total).toBe(8);
      expect(result.items).toHaveLength(1);
    });

    it('lists recommendations for a run with no matching ids', async () => {
      seedQueryResults(0, 0, []);
      const result = await uowRepos(async ({ recommendations }) =>
        recommendations.listByRun('user-1', 'run-1', { page: 1, limit: 10 }),
      );
      expect(result.items).toEqual([]);
      expect(tx.jobRecommendation.findMany).not.toHaveBeenCalled();
    });

    it('lists recommendations by user', async () => {
      seedQueryResults(2, 2, [{ id: 'rec-1' }]);
      vi.mocked(tx.jobRecommendation.findMany).mockResolvedValue([recommendationRow()]);
      vi.mocked(jobs.findByIds).mockResolvedValue([jobDto()]);
      const result = await uowRepos(async ({ recommendations }) =>
        recommendations.listByUser('user-1', { page: 1, limit: 10 }),
      );
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
    });

    it('reports hidden counts via metrics', async () => {
      seedQueryResults(5, 3, [{ id: 'rec-1' }]);
      vi.mocked(tx.jobRecommendation.findMany).mockResolvedValue([recommendationRow()]);
      await uowRepos(async ({ recommendations }) =>
        recommendations.listByUser('user-1', { page: 1, limit: 10 }),
      );
      expect(vi.mocked(tx.$queryRaw).mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('checks whether a recommendation exists for a run and job', async () => {
      vi.mocked(tx.jobRecommendation.count).mockResolvedValue(1);
      await uowRepos(async ({ recommendations }) => {
        await expect(recommendations.existsByRunAndJob('user-1', 'run-1', 'job-1')).resolves.toBe(
          true,
        );
      });
      vi.mocked(tx.jobRecommendation.count).mockResolvedValue(0);
      await uowRepos(async ({ recommendations }) => {
        await expect(recommendations.existsByRunAndJob('user-1', 'run-1', 'job-1')).resolves.toBe(
          false,
        );
      });
    });
  });

  describe('feedback', () => {
    const feedbackRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'fb-1',
      recommendationId: 'rec-1',
      jobId: 'job-1',
      userId: 'user-1',
      action: 'HIDE',
      note: null,
      createdAt: new Date('2026-08-02T00:00:00.000Z'),
      ...overrides,
    });

    it('throws when upserting feedback for an unowned recommendation', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue(null);
      await expect(
        uowRepos(async ({ feedback }) =>
          feedback.upsert({
            userId: 'user-1',
            recommendationId: 'rec-1',
            jobId: 'job-1',
            action: 'HIDE',
          }),
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: RECOMMENDATION_ERROR_CODES.RECOMMENDATION_NOT_FOUND,
      });
    });

    it('throws when the feedback job does not match the owned recommendation', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue({
        id: 'rec-1',
        jobId: 'job-other',
      });
      await expect(
        uowRepos(async ({ feedback }) =>
          feedback.upsert({
            userId: 'user-1',
            recommendationId: 'rec-1',
            jobId: 'job-1',
            action: 'HIDE',
          }),
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('upserts feedback with a note', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue({ id: 'rec-1', jobId: 'job-1' });
      vi.mocked(tx.recommendationFeedback.upsert).mockResolvedValue(
        feedbackRow({ action: 'HIDE', note: 'not interested' }),
      );
      await uowRepos(async ({ feedback }) => {
        const result = await feedback.upsert({
          userId: 'user-1',
          recommendationId: 'rec-1',
          jobId: 'job-1',
          action: 'HIDE',
          note: 'not interested',
        });
        expect(result.note).toBe('not interested');
      });
      expect(tx.recommendationFeedback.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_recommendationId: { userId: 'user-1', recommendationId: 'rec-1' },
          },
          update: expect.objectContaining({ action: 'HIDE', note: 'not interested' }),
        }),
      );
    });

    it('upserts feedback without a note', async () => {
      vi.mocked(tx.jobRecommendation.findFirst).mockResolvedValue({ id: 'rec-1', jobId: 'job-1' });
      vi.mocked(tx.recommendationFeedback.upsert).mockResolvedValue(feedbackRow());
      await uowRepos(async ({ feedback }) => {
        const result = await feedback.upsert({
          userId: 'user-1',
          recommendationId: 'rec-1',
          jobId: 'job-1',
          action: 'HIDE',
        });
        expect(result.action).toBe('HIDE');
      });
      const upsertCall = vi.mocked(tx.recommendationFeedback.upsert).mock.calls[0][0];
      expect(upsertCall.update.note).toBeNull();
    });

    it('finds feedback by recommendation', async () => {
      vi.mocked(tx.recommendationFeedback.findFirst).mockResolvedValue(feedbackRow());
      await uowRepos(async ({ feedback }) => {
        await expect(feedback.findByRecommendation('user-1', 'rec-1')).resolves.toMatchObject({
          id: 'fb-1',
        });
      });
      vi.mocked(tx.recommendationFeedback.findFirst).mockResolvedValue(null);
      await uowRepos(async ({ feedback }) => {
        await expect(feedback.findByRecommendation('user-1', 'rec-1')).resolves.toBeNull();
      });
    });

    it('lists feedback by job', async () => {
      vi.mocked(tx.recommendationFeedback.findMany).mockResolvedValue([feedbackRow()]);
      await uowRepos(async ({ feedback }) => {
        const result = await feedback.listByJob('user-1', 'job-1');
        expect(result).toHaveLength(1);
      });
      expect(tx.recommendationFeedback.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', jobId: 'job-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('lists feedback by action with and without a limit', async () => {
      vi.mocked(tx.recommendationFeedback.findMany).mockResolvedValue([feedbackRow()]);
      await uowRepos(async ({ feedback }) => {
        const limited = await feedback.listByAction('user-1', 'HIDE', { limit: 5 });
        expect(limited).toHaveLength(1);
        const unlimited = await feedback.listByAction('user-1', 'HIDE');
        expect(unlimited).toHaveLength(1);
      });
      const calls = vi.mocked(tx.recommendationFeedback.findMany).mock.calls;
      expect(calls[0][0].take).toBe(5);
      expect(calls[1][0].take).toBeUndefined();
    });

    it('deduplicates excluded job ids', async () => {
      vi.mocked(tx.recommendationFeedback.findMany).mockResolvedValue([
        { jobId: 'job-1' },
        { jobId: 'job-1' },
        { jobId: 'job-2' },
      ]);
      await uowRepos(async ({ feedback }) => {
        await expect(feedback.listExcludedJobIds('user-1')).resolves.toEqual(['job-1', 'job-2']);
      });
    });
  });

  describe('execute', () => {
    it('runs the operation inside a transaction with all repositories', async () => {
      const uow = new PrismaRecommendationUnitOfWork(jobs);
      const result = await uow.execute(async (repositories) => {
        expect(repositories.runs).toBeDefined();
        expect(repositories.recommendations).toBeDefined();
        expect(repositories.feedback).toBeDefined();
        return 'ok';
      });
      expect(result).toBe('ok');
    });
  });

  describe('Prisma helper references', () => {
    it('touches Prisma namespace', () => {
      expect(Prisma.empty).toBeDefined();
    });
  });
});
