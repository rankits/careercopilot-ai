import { describe, expect, it, vi } from 'vitest';
import { createResumeRecommendationSourceLoader } from '@/modules/recommendations/adapters/resume-recommendation-source.loader.js';
import type { CareerTargetRepository } from '@/modules/recommendations/repositories/prisma-career-target.repository.js';
import type { SavedSearchRepository } from '@/modules/recommendations/repositories/prisma-saved-search.repository.js';
import { resumeRepository } from '@/modules/resumes/repositories/resume.repository.js';

const repository = (overrides: Partial<typeof resumeRepository>) =>
  ({
    findCandidateProfileByUserId: vi.fn(),
    findResumeById: vi.fn(),
    findLatestParseRun: vi.fn(),
    ...overrides,
  }) as unknown as typeof resumeRepository;

const savedSearchRepository = (
  overrides: Partial<SavedSearchRepository>,
): SavedSearchRepository => ({
  findById: vi.fn(),
  findOwned: vi.fn(),
  listByUser: vi.fn(),
  create: vi.fn(),
  updateOwned: vi.fn(),
  softDeleteOwned: vi.fn(),
  ...overrides,
});

const careerTargetRepository = (
  overrides: Partial<CareerTargetRepository>,
): CareerTargetRepository => ({
  findById: vi.fn(),
  findOwned: vi.fn(),
  listByUser: vi.fn(),
  create: vi.fn(),
  archiveOwned: vi.fn(),
  ...overrides,
});

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

  it('loads only owned active career targets', async () => {
    const careerTargets = careerTargetRepository({
      findById: vi.fn().mockResolvedValue({
        id: 'target-1',
        userId: 'user-1',
        goalText: 'Move into engineering management',
        structured: { targetRole: 'Engineering Manager' },
        createdAt: new Date('2026-08-02T00:00:00.000Z'),
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
        archivedAt: null,
      }),
    });
    const loader = createResumeRecommendationSourceLoader(repository({}), careerTargets);

    await expect(loader.findOwnedCareerTargetSource!('user-1', 'target-1')).resolves.toMatchObject({
      id: 'target-1',
      userId: 'user-1',
      goalText: 'Move into engineering management',
      structured: { targetRole: 'Engineering Manager' },
    });
    expect(careerTargets.findById).toHaveBeenCalledWith('target-1');
  });

  it('hides unowned and archived career targets', async () => {
    const careerTargets = careerTargetRepository({
      findById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'target-1',
          userId: 'other-user',
          goalText: 'Move into management',
          structured: {},
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-08-02T00:00:00.000Z'),
          archivedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'target-2',
          userId: 'user-1',
          goalText: 'Move into management',
          structured: {},
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-08-02T00:00:00.000Z'),
          archivedAt: new Date(),
        }),
    });
    const loader = createResumeRecommendationSourceLoader(repository({}), careerTargets);

    await expect(loader.findOwnedCareerTargetSource!('user-1', 'target-1')).resolves.toBeNull();
    await expect(loader.findOwnedCareerTargetSource!('user-1', 'target-2')).resolves.toBeNull();
  });

  it('loads only owned active saved searches', async () => {
    const savedSearches = savedSearchRepository({
      findById: vi.fn().mockResolvedValue({
        id: 'search-1',
        userId: 'user-1',
        name: 'Remote backend',
        query: 'backend typescript',
        filters: { locations: ['Remote'] },
        context: { targetTitles: ['Backend Engineer'] },
        createdAt: new Date('2026-08-02T00:00:00.000Z'),
        updatedAt: new Date('2026-08-02T00:00:00.000Z'),
        deletedAt: null,
      }),
    });
    const loader = createResumeRecommendationSourceLoader(
      repository({}),
      careerTargetRepository({}),
      savedSearches,
    );

    await expect(loader.findOwnedSavedSearchSource!('user-1', 'search-1')).resolves.toMatchObject({
      id: 'search-1',
      userId: 'user-1',
      name: 'Remote backend',
      query: 'backend typescript',
      filters: { locations: ['Remote'] },
    });
    expect(savedSearches.findById).toHaveBeenCalledWith('search-1');
  });

  it('hides unowned and deleted saved searches', async () => {
    const savedSearches = savedSearchRepository({
      findById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'search-1',
          userId: 'other-user',
          name: 'Backend',
          query: null,
          filters: {},
          context: {},
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-08-02T00:00:00.000Z'),
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'search-2',
          userId: 'user-1',
          name: 'Backend',
          query: null,
          filters: {},
          context: {},
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
          updatedAt: new Date('2026-08-02T00:00:00.000Z'),
          deletedAt: new Date(),
        }),
    });
    const loader = createResumeRecommendationSourceLoader(
      repository({}),
      careerTargetRepository({}),
      savedSearches,
    );

    await expect(loader.findOwnedSavedSearchSource!('user-1', 'search-1')).resolves.toBeNull();
    await expect(loader.findOwnedSavedSearchSource!('user-1', 'search-2')).resolves.toBeNull();
  });
});
