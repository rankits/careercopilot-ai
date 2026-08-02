import { describe, expect, it } from 'vitest';
import {
  buildRecommendationExplanation,
  buildRecommendationSkillGap,
} from '@/modules/recommendations/services/recommendation-explanation.service.js';
import type { JobRecommendationRecord } from '@/modules/recommendations/types/recommendations.types.js';

const recommendation = (overrides: Partial<JobRecommendationRecord> = {}): JobRecommendationRecord => ({
  id: 'rec-1',
  runId: 'run-1',
  userId: 'user-1',
  rank: 1,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  job: {
    id: 'job-1',
    title: 'Backend Engineer',
    company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
    location: { formatted: 'Remote', remoteType: 'REMOTE' },
    employmentType: 'FULL_TIME',
    salary: { minimum: null, maximum: null, currency: null },
    skills: ['TypeScript', 'PostgreSQL'],
    publishedAt: null,
    applyUrl: null,
  },
  scoreResult: {
    overallScore: 0.82,
    components: {
      requiredSkills: 1,
      title: 0.7,
      experience: 0.5,
      responsibilities: 0.5,
      preferredSkills: 0.5,
      location: 0.5,
      industry: 0.5,
      salary: 0.5,
      qualifications: 0.5,
    },
    matchedSkills: ['TypeScript', 'PostgreSQL'],
    relatedSkills: [],
    transferableSkills: [],
    missingSkills: ['Redis'],
    reasons: [
      {
        component: 'requiredSkills',
        message: 'Matched 2 of 3 required skills',
        evidence: ['TypeScript', 'PostgreSQL'],
      },
      {
        component: 'salary',
        message: 'Job salary is undisclosed; used neutral score',
        evidence: [],
      },
      {
        component: 'title',
        message: 'Hybrid match combines semantic retrieval with heuristic scoring',
        evidence: [
          'retrievalWeight=0.4',
          'heuristicWeight=0.6',
          'retrievalScore=0.9000',
          'heuristicScore=0.7667',
        ],
      },
    ],
  },
  category: 'GOOD_MATCH',
  matchType: 'EXACT',
  ...overrides,
});

describe('buildRecommendationExplanation', () => {
  it('builds deterministic bullets from scored components without inventing unused signals', () => {
    const explanation = buildRecommendationExplanation(recommendation());

    expect(explanation.summary).toBe('82% match with 2 matched skills');
    expect(explanation.bullets[0]).toMatchObject({
      component: 'requiredSkills',
      label: 'Required skills',
      score: 1,
      weight: 0.3,
      message: 'Matched 2 of 3 required skills',
      evidence: ['TypeScript', 'PostgreSQL'],
    });
    expect(explanation.bullets.map((bullet) => bullet.component)).toEqual([
      'requiredSkills',
      'salary',
    ]);
    expect(explanation.bullets.some((bullet) => bullet.component === 'location')).toBe(false);
  });

  it('keeps hybrid factors in scoreModel instead of pretending they are component bullets', () => {
    const explanation = buildRecommendationExplanation(recommendation());

    expect(explanation.scoreModel).toMatchObject({
      overallScore: 0.82,
      displayScore: 82,
      heuristicWeight: 0.6,
      retrievalWeight: 0.4,
      heuristicScore: 0.7667,
      retrievalScore: 0.9,
    });
    expect(explanation.bullets.every((bullet) => !bullet.message.includes('Hybrid match'))).toBe(
      true,
    );
  });

  it('copies skill arrays for downstream skill-gap UI without LLM prose', () => {
    const explanation = buildRecommendationExplanation(recommendation());

    expect(explanation.matchedSkills).toEqual(['TypeScript', 'PostgreSQL']);
    expect(explanation.relatedSkills).toEqual([]);
    expect(explanation.transferableSkills).toEqual([]);
    expect(explanation.missingSkills).toEqual(['Redis']);
  });

  it('builds structured skill gaps without duplicating missing skills across known buckets', () => {
    const skillGap = buildRecommendationSkillGap({
      ...recommendation().scoreResult,
      matchedSkills: ['TypeScript', 'typescript'],
      relatedSkills: ['PostgreSQL'],
      transferableSkills: ['JavaScript'],
      missingSkills: ['Redis', 'TypeScript', 'PostgreSQL', 'JavaScript'],
    });

    expect(skillGap).toEqual({
      exact: ['TypeScript'],
      alias: [],
      related: ['PostgreSQL'],
      transferable: ['JavaScript'],
      missing: ['Redis'],
    });
  });
});
