import { describe, expect, it } from 'vitest';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
  type RecommendationScoreResult,
} from '@/modules/recommendations/types/recommendations.types.js';
import { classifyCareerGoalCategory } from '@/modules/recommendations/utils/career-goal-category.js';

const job = (title: string, skills: string[] = ['Playwright', 'TypeScript']): JobListDto => ({
  id: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: null, maximum: null, currency: null },
  skills,
  publishedAt: null,
  applyUrl: null,
});

const context = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'CAREER_GOAL',
  sourceId: 'goal-1',
  contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  targetTitles: ['Automation QA Engineer'],
  relatedTitles: ['QA Analyst', 'Test Automation Specialist'],
  requiredSkills: ['Playwright', 'TypeScript'],
  preferredSkills: ['CI/CD'],
  industries: [],
  locations: [],
  employmentTypes: [],
  salaryExpectation: {},
  education: [],
  certifications: [],
  excludedCompanies: [],
  excludedSkills: [],
  goalIntent: {
    currentRole: 'Manual Tester',
    targetRole: 'Automation QA Engineer',
    targetIndustries: [],
    summary: 'Move from manual testing into automation engineering',
  },
  currentRole: 'Manual Tester',
  targetRole: 'Automation QA Engineer',
});

const scoreResult = (
  overallScore: number,
  overrides: Partial<RecommendationScoreResult> = {},
): RecommendationScoreResult => ({
  overallScore,
  components: {
    requiredSkills: 0.8,
    title: 0.8,
    experience: 0.5,
    responsibilities: 0.5,
    preferredSkills: 0.5,
    location: 0.5,
    industry: 0.5,
    salary: 0.5,
    qualifications: 0.5,
  },
  matchedSkills: ['Playwright'],
  aliasSkills: [],
  relatedSkills: [],
  transferableSkills: [],
  missingSkills: [],
  reasons: [],
  ...overrides,
});

describe('classifyCareerGoalCategory', () => {
  it('maps target-role matches to BEST_MATCH when skills are strong', () => {
    const result = classifyCareerGoalCategory(
      context(),
      job('Automation QA Engineer'),
      scoreResult(0.78),
      'EXACT',
      'GOOD_MATCH',
    );

    expect(result).toMatchObject({
      category: 'BEST_MATCH',
      pathKind: 'TARGET_ROLE',
    });
    expect(result?.reason.evidence).toContain('careerCategory=BEST_MATCH');
  });

  it('maps bridge roles to GOOD_MATCH when they support the transition', () => {
    const result = classifyCareerGoalCategory(
      context(),
      job('QA Analyst'),
      scoreResult(0.6, { relatedSkills: ['Playwright'], matchedSkills: [] }),
      'RELATED',
      'GOOD_MATCH',
    );

    expect(result).toMatchObject({
      category: 'GOOD_MATCH',
      pathKind: 'TRANSITIONAL_BRIDGE',
    });
  });

  it('maps target roles with severe skill gaps to STRETCH_OPPORTUNITY', () => {
    const result = classifyCareerGoalCategory(
      context(),
      job('Automation QA Engineer', ['Manual testing']),
      scoreResult(0.7, {
        components: {
          ...scoreResult(0.7).components,
          requiredSkills: 0.2,
        },
        matchedSkills: [],
        missingSkills: ['Playwright', 'TypeScript'],
      }),
      'MISSING',
      'GOOD_MATCH',
    );

    expect(result).toMatchObject({
      category: 'STRETCH_OPPORTUNITY',
      pathKind: 'STRETCH_TARGET',
    });
  });

  it('maps current-role matches to RELATED_CAREER_PATH', () => {
    const result = classifyCareerGoalCategory(
      context(),
      job('Manual Tester'),
      scoreResult(0.58),
      'EXACT',
      'GOOD_MATCH',
    );

    expect(result).toMatchObject({
      category: 'RELATED_CAREER_PATH',
      pathKind: 'CURRENT_ROLE',
    });
  });
});
