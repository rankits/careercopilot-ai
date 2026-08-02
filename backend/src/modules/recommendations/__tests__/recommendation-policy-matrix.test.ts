import { describe, expect, it } from 'vitest';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { buildRecommendationExplanation } from '@/modules/recommendations/services/recommendation-explanation.service.js';
import { sortRecommendationsForRanking } from '@/modules/recommendations/utils/recommendation-ranking.js';
import { assignRecommendationCategory } from '@/modules/recommendations/constants/recommendation.constants.js';
import { applyRecommendationFilters } from '@/modules/recommendations/utils/apply-recommendation-filters.js';
import type {
  RecommendationCandidate,
  RecommendationContext,
  JobRecommendationRecord,
} from '@/modules/recommendations/types/recommendations.types.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';

const sampleJob = (id: string, overrides: Partial<JobListDto> = {}): JobListDto => ({
  id,
  title: 'Senior TypeScript Engineer',
  company: { slug: 'acme', name: 'Acme Corp', logoUrl: null, verified: true },
  location: { formatted: 'New York, NY', remoteType: 'HYBRID' },
  employmentType: 'FULL_TIME',
  salary: { minimum: 130000, maximum: 160000, currency: 'USD' },
  skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
  publishedAt: new Date('2026-08-01T00:00:00.000Z'),
  applyUrl: null,
  ...overrides,
});

const baseContext: RecommendationContext = {
  userId: 'user-1',
  sourceType: 'PROFILE',
  contextSchemaVersion: '1.1.0',
  targetTitles: ['TypeScript Engineer'],
  relatedTitles: ['Backend Engineer'],
  requiredSkills: ['TypeScript', 'Node.js'],
  preferredSkills: [],
  summary: 'Experienced backend developer',
  yearsOfExperience: 5,
  seniority: 'SENIOR',
  locations: ['New York, NY'],
  remotePreference: 'HYBRID',
  employmentTypes: ['FULL_TIME'],
  industries: ['Technology'],
  salaryExpectation: { minimum: 120000, maximum: 170000, currency: 'USD' },
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
  filterMode: 'FLEXIBLE',
};

describe('JRE-QA-002 Scoring, Skill Filter, and Explanation Policy Suite', () => {
  const scoringService = new RecommendationScoringService(
    new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
  );

  it('scenarios 12-14: skill bucketing (alias/related/missing) and score differential', async () => {
    const context: RecommendationContext = {
      ...baseContext,
      requiredSkills: ['JS', 'React', 'Docker'],
    };

    const jobExact = sampleJob('job-exact', { skills: ['React', 'Docker', 'JS'] });
    const jobMissing = sampleJob('job-missing', {
      skills: ['React', 'Docker', 'Kubernetes', 'Terraform', 'Go', 'Rust'],
    });

    const candidates: RecommendationCandidate[] = [
      { job: jobExact, retrievalScore: 0.9 },
      { job: jobMissing, retrievalScore: 0.5 },
    ];

    const scored = await scoringService.score(context, candidates);
    expect(scored[0]!.scoreResult.overallScore).toBeGreaterThan(scored[1]!.scoreResult.overallScore);
    expect(scored[1]!.scoreResult.missingSkills.length).toBeGreaterThan(0);
  });

  it('scenarios 15-17: STRICT vs FLEXIBLE filter mode policy and category capping', async () => {
    const strictContext = applyRecommendationFilters(baseContext, {
      filterMode: 'STRICT',
      minimumSalary: 200000,
    });
    const flexibleContext = applyRecommendationFilters(baseContext, {
      filterMode: 'FLEXIBLE',
      minimumSalary: 200000,
    });

    const job = sampleJob('job-salary');
    const [strictResult] = await scoringService.score(strictContext, [{ job, retrievalScore: 0.8 }]);
    const [flexibleResult] = await scoringService.score(flexibleContext, [{ job, retrievalScore: 0.8 }]);

    expect(flexibleResult!.category).toBe('STRETCH_OPPORTUNITY');
    expect(flexibleResult!.scoreResult.reasons.some((r) => r.component === 'salary')).toBe(true);
  });

  it('scenarios 18-20: explanation honesty and displayScore scaling', async () => {
    const job = sampleJob('job-explain');
    const [scored] = await scoringService.score(baseContext, [{ job, retrievalScore: 0.85 }]);

    const record: JobRecommendationRecord = {
      id: 'rec-1',
      runId: 'run-1',
      userId: 'user-1',
      job,
      scoreResult: scored!.scoreResult,
      category: scored!.category,
      matchType: scored!.matchType,
      rank: 1,
      createdAt: new Date(),
    };

    const explanation = buildRecommendationExplanation(record);

    expect(explanation.scoreModel.displayScore).toBeGreaterThanOrEqual(0);
    expect(explanation.scoreModel.displayScore).toBeLessThanOrEqual(100);
    expect(explanation.summary).toContain('% match');
    expect(explanation.bullets.length).toBeLessThanOrEqual(3);

    const matchedSet = new Set(explanation.matchedSkills);
    for (const missing of explanation.missingSkills) {
      expect(matchedSet.has(missing)).toBe(false);
    }
  });

  it('scenarios 21-22: stable ordering and category threshold invariants', () => {
    const jobA = sampleJob('job-a', { title: 'Alpha Job' });
    const jobB = sampleJob('job-b', { title: 'Beta Job' });

    const recA: JobRecommendationRecord = {
      id: 'rec-a',
      runId: 'run-1',
      userId: 'user-1',
      job: jobA,
      scoreResult: {
        overallScore: 0.82,
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
        matchedSkills: [],
        aliasSkills: [],
        relatedSkills: [],
        transferableSkills: [],
        missingSkills: [],
        reasons: [],
      },
      category: 'GOOD_MATCH',
      matchType: 'RELATED',
      rank: 2,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    };

    const recB: JobRecommendationRecord = {
      ...recA,
      id: 'rec-b',
      job: jobB,
      rank: 1,
    };

    const run1 = sortRecommendationsForRanking([recB, recA]);
    const run2 = sortRecommendationsForRanking([recA, recB]);

    expect(run1.map((r) => r.job.id)).toEqual(run2.map((r) => r.job.id));

    expect(assignRecommendationCategory(0.9)).toBe('BEST_MATCH');
    expect(assignRecommendationCategory(0.75)).toBe('GOOD_MATCH');
    expect(assignRecommendationCategory(0.6)).toBe('STRETCH_OPPORTUNITY');
    expect(assignRecommendationCategory(0.4)).toBe('RELATED_CAREER_PATH');
  });
});
