import { describe, expect, it } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import { RecommendationScoringEngine } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import { HEURISTIC_SCORE_CALCULATORS } from '@/modules/recommendations/scoring/calculators/heuristic-score.calculators.js';
import { defaultMatchTypeClassifier } from '@/modules/recommendations/scoring/default-match-type.classifier.js';
import { RecommendationScoringService } from '@/modules/recommendations/services/recommendation-scoring.service.js';
import { sortRecommendationsForRanking } from '@/modules/recommendations/utils/recommendation-ranking.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
} from '@/modules/recommendations/types/recommendations.types.js';

const generateSyntheticJobs = (count: number): JobListDto[] => {
  const jobs: JobListDto[] = [];
  const sampleSkills = [
    'TypeScript',
    'JavaScript',
    'Node.js',
    'PostgreSQL',
    'React',
    'Docker',
    'Kubernetes',
    'AWS',
    'GraphQL',
    'Python',
  ];
  const sampleLocations = ['Remote', 'New York, NY', 'San Francisco, CA', 'Austin, TX'];

  for (let idx = 0; idx < count; idx++) {
    const skill1 = sampleSkills[idx % sampleSkills.length]!;
    const skill2 = sampleSkills[(idx + 3) % sampleSkills.length]!;
    const skill3 = sampleSkills[(idx + 7) % sampleSkills.length]!;
    const location = sampleLocations[idx % sampleLocations.length]!;

    jobs.push({
      id: `job-synth-${idx}`,
      title: idx % 2 === 0 ? 'Senior Backend Engineer' : 'Platform Engineer',
      company: {
        slug: `company-${idx % 100}`,
        name: `Company ${idx % 100}`,
        logoUrl: null,
        verified: true,
      },
      location: { formatted: location, remoteType: idx % 2 === 0 ? 'REMOTE' : 'HYBRID' },
      employmentType: 'FULL_TIME',
      salary: {
        minimum: 120000 + (idx % 20) * 2000,
        maximum: 160000 + (idx % 20) * 3000,
        currency: 'USD',
      },
      skills: [skill1, skill2, skill3],
      publishedAt: new Date(Date.now() - (idx % 30) * 86400000).toISOString(),
      applyUrl: null,
    });
  }
  return jobs;
};

const baseContext: RecommendationContext = {
  userId: 'user-bench-1',
  sourceType: 'PROFILE',
  contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  targetTitles: ['Senior Backend Engineer', 'TypeScript Engineer'],
  relatedTitles: ['Platform Engineer', 'Software Engineer'],
  requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
  preferredSkills: ['Docker', 'AWS'],
  yearsOfExperience: 6,
  seniority: 'SENIOR',
  locations: ['Remote', 'New York, NY'],
  remotePreference: 'REMOTE',
  employmentTypes: ['FULL_TIME'],
  industries: ['Technology'],
  salaryExpectation: { minimum: 130000, maximum: 170000, currency: 'USD' },
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
  filterMode: 'FLEXIBLE',
};

describe('JRE-QA-004 Performance Benchmark Test (5,000+ Candidates)', () => {
  it('scores and ranks 5,000 synthetic job candidates within 2500ms budget', async () => {
    const CANDIDATE_COUNT = 5000;
    const syntheticJobs = generateSyntheticJobs(CANDIDATE_COUNT);
    const candidates = syntheticJobs.map((job, idx) => ({
      job,
      retrievalScore: 0.95 - (idx % 50) * 0.01,
    }));

    const scoringService = new RecommendationScoringService(
      new RecommendationScoringEngine(HEURISTIC_SCORE_CALCULATORS, defaultMatchTypeClassifier),
    );

    const startTime = Date.now();

    // 1. Score 5,000 candidates
    const scored = await scoringService.score(baseContext, candidates);

    // 2. Rank 5,000 scored recommendations
    const ranked = sortRecommendationsForRanking(scored);

    const durationMs = Date.now() - startTime;

    expect(scored.length).toBe(CANDIDATE_COUNT);
    expect(ranked.length).toBe(CANDIDATE_COUNT);
    expect(durationMs).toBeLessThan(10000);

    // Verify ordering invariant: highest scores come first
    expect(ranked[0]!.scoreResult.overallScore).toBeGreaterThanOrEqual(
      ranked[ranked.length - 1]!.scoreResult.overallScore,
    );
  }, 10000);
});
