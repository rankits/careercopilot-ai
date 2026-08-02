import { describe, expect, it, vi } from 'vitest';
import { createResumeRecommendationSourceLoader } from '@/modules/recommendations/adapters/resume-recommendation-source.loader.js';
import { resumeRepository } from '@/modules/resumes/repositories/resume.repository.js';

const repository = (overrides: Partial<typeof resumeRepository>) =>
  ({
    findCandidateProfileByUserId: vi.fn(),
    findResumeById: vi.fn(),
    findLatestParseRun: vi.fn(),
    ...overrides,
  }) as unknown as typeof resumeRepository;

describe('createResumeRecommendationSourceLoader', () => {
  it('maps canonical resume parse data into recommendation source input', async () => {
    const loader = createResumeRecommendationSourceLoader(
      repository({
        findResumeById: vi.fn().mockResolvedValue({ id: 'resume-1', userId: 'user-1' }),
        findLatestParseRun: vi.fn().mockResolvedValue({
          status: 'COMPLETED',
          parsedData: {
            personalInformation: {
              location: { city: 'Berlin', state: null, country: 'Germany' },
            },
            professionalSummary: 'Builds platform APIs.',
            currentPosition: { title: 'Platform Engineer' },
            professionalProfile: {
              primaryRole: 'Backend Engineer',
              seniorityLevel: 'SENIOR',
            },
            professionalLabels: [{ category: 'DOMAIN', label: 'Fintech' }],
            employmentHistory: [{ title: 'Software Engineer' }],
            education: [{ qualification: 'BS', fieldOfStudy: 'CS' }],
            skills: {
              technical: ['TypeScript'],
              tools: ['Docker'],
              frameworks: ['NestJS'],
              softSkills: [],
              domains: ['Payments'],
            },
            certifications: [{ name: 'AWS Developer' }],
            languages: [{ name: 'English' }],
            totalExperienceYears: 6,
          },
          extraction: null,
        }),
      }),
    );

    const result = await loader.lookupOwnedResumeProfileSource!('user-1', 'resume-1');

    expect(result).toMatchObject({
      status: 'FOUND',
      payload: {
        skills: ['TypeScript', 'Docker', 'NestJS', 'Payments'],
        totalExperienceYears: 6,
      },
    });
    expect(result?.status === 'FOUND' ? result.payload.personalDetails : {}).toMatchObject({
      currentTitle: 'Platform Engineer',
      location: 'Berlin, Germany',
      primaryRole: 'Backend Engineer',
      seniorityLevel: 'SENIOR',
      summary: 'Builds platform APIs.',
    });
  });

  it('returns incomplete for owned resumes without completed parse data', async () => {
    const loader = createResumeRecommendationSourceLoader(
      repository({
        findResumeById: vi.fn().mockResolvedValue({ id: 'resume-1', userId: 'user-1' }),
        findLatestParseRun: vi.fn().mockResolvedValue({
          status: 'PROCESSING',
          parsedData: null,
          extraction: null,
        }),
      }),
    );

    await expect(loader.lookupOwnedResumeProfileSource!('user-1', 'resume-1')).resolves.toEqual({
      status: 'INCOMPLETE',
      reason: 'PARSE_NOT_READY',
    });
  });

  it('returns not found for missing or unowned resumes', async () => {
    const loader = createResumeRecommendationSourceLoader(
      repository({
        findResumeById: vi.fn().mockResolvedValue({ id: 'resume-1', userId: 'other-user' }),
      }),
    );

    await expect(loader.lookupOwnedResumeProfileSource!('user-1', 'resume-1')).resolves.toEqual({
      status: 'NOT_FOUND',
    });
  });
});
