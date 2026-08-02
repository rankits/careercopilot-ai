import { describe, expect, it, vi } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { RecommendationFeedbackService } from '@/modules/recommendations/services/recommendation-feedback.service.js';
import { RecommendationSourceAuthorizationService } from '@/modules/recommendations/services/recommendation-source-authorization.service.js';
import { RecommendationsService } from '@/modules/recommendations/services/recommendations.service.js';
import { RecommendationContextService } from '@/modules/recommendations/services/recommendation-context.service.js';
import { RecommendationStrategyResolver } from '@/modules/recommendations/strategies/recommendation-strategy.resolver.js';
import { ProfileSourceStrategy } from '@/modules/recommendations/strategies/recommendation-source.strategy.js';
import { InMemoryRecommendationUnitOfWork } from '@/modules/recommendations/repositories/in-memory-recommendation.unit-of-work.js';
import type { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import { createChildLogger } from '@/shared/logger/logger.js';

const jobList = (id: string, title = 'Backend Engineer'): JobListDto => ({
  id,
  title,
  company: { slug: 'acme', name: 'Acme Corp', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 130000, maximum: 160000, currency: 'USD' },
  skills: ['TypeScript', 'PostgreSQL', 'Node.js'],
  publishedAt: null,
  applyUrl: null,
});

describe('JRE-QA-003 End-to-End Recommendation Workflow (Generate -> Feedback -> Refresh -> Rank)', () => {
  it('executes full cycle: generates recommendations, records feedback, and refreshes with exclusions', async () => {
    const jobA = jobList('job-a', 'Senior TypeScript Engineer');
    const jobB = jobList('job-b', 'Staff Backend Engineer');
    const jobC = jobList('job-c', 'Platform Engineer');

    const allJobs = [jobA, jobB, jobC];

    const retrievalService = {
      retrieve: vi.fn().mockImplementation(async ({ excludeJobIds }: { excludeJobIds?: string[] }) => {
        const excluded = new Set(excludeJobIds ?? []);
        return allJobs
          .filter((job) => !excluded.has(job.id))
          .map((job, idx) => ({
            job,
            retrievalScore: 0.9 - idx * 0.1,
          }));
      }),
    } as unknown as RecommendationRetrievalService;

    const unitOfWork = new InMemoryRecommendationUnitOfWork();
    const scoringService = new RecommendationScoringService(
      new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
    );
    const sourceAuthorization = new RecommendationSourceAuthorizationService(
      { findById: vi.fn() } as unknown as IJobSearchRepository,
      {
        findCandidateProfileByUserId: vi.fn().mockResolvedValue({
          personalDetails: { currentTitle: 'Backend Engineer', summary: 'TypeScript dev' },
          skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
          experience: [{ title: 'Backend Engineer' }],
          education: [],
          certifications: [],
        }),
        findOwnedResumeProfileSource: vi.fn(),
      },
    );

    const recsService = new RecommendationsService(createChildLogger({ scope: 'test-e2e-workflow' }), {
      contextService: new RecommendationContextService(
        new RecommendationStrategyResolver([new ProfileSourceStrategy()]),
      ),
      retrievalService,
      scoringService,
      unitOfWork,
      sourceAuthorization,
    });

    const feedbackRepo = await unitOfWork.execute(async ({ feedback }) => feedback);
    const feedbackService = new RecommendationFeedbackService(feedbackRepo);

    // 1. Initial generation from profile
    const initialRecords = await recsService.createForSource('user-1', {
      sourceType: 'PROFILE',
    });

    expect(initialRecords.length).toBe(3);
    const run1Id = initialRecords[0]!.runId;
    expect(initialRecords.map((r) => r.job.id)).toContain('job-a');
    expect(initialRecords.map((r) => r.job.id)).toContain('job-b');
    expect(initialRecords.map((r) => r.job.id)).toContain('job-c');

    // 2. Submit feedback: DISMISSED on job-a, SAVED on job-b
    const recA = initialRecords.find((r) => r.job.id === 'job-a')!;
    const recB = initialRecords.find((r) => r.job.id === 'job-b')!;

    await feedbackService.store({
      userId: 'user-1',
      recommendationId: recA.id,
      jobId: recA.job.id,
      action: 'DISMISSED',
    });
    await feedbackService.store({
      userId: 'user-1',
      recommendationId: recB.id,
      jobId: recB.job.id,
      action: 'SAVED',
    });

    // 3. Verify database feedback state
    const excludedJobIds = await unitOfWork.execute(({ feedback }) =>
      feedback.listExcludedJobIds('user-1'),
    );
    expect(excludedJobIds).toContain('job-a');
    expect(excludedJobIds).not.toContain('job-b');

    const savedFeedback = await unitOfWork.execute(({ feedback }) =>
      feedback.findByRecommendation('user-1', recB.id),
    );
    expect(savedFeedback?.action).toBe('SAVED');

    // 4. Refresh recommendations
    const refreshPage = await recsService.refreshForSource('user-1', {
      sourceType: 'PROFILE',
    });

    expect(refreshPage.items.length).toBe(2);
    const run2Id = refreshPage.run.id;
    expect(run2Id).not.toBe(run1Id);

    // Assert dismissed job is excluded in refresh run
    expect(refreshPage.items.map((r) => r.job.id)).not.toContain('job-a');
    expect(refreshPage.items.map((r) => r.job.id)).toContain('job-b');
    expect(refreshPage.items.map((r) => r.job.id)).toContain('job-c');

    // Verify latest run in repository is the new refresh run
    const latestRun = await unitOfWork.execute(({ runs }) =>
      runs.findLatestByUser('user-1'),
    );
    expect(latestRun?.id).toBe(run2Id);

    // Verify user recommendations total across runs
    const allRecs = await recsService.listForUser('user-1', { page: 1, limit: 10 });
    expect(allRecs.total).toBe(5); // 3 from initial run + 2 from refresh
  });
});

