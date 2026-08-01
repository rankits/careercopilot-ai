import { describe, expect, it, vi } from 'vitest';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import { CandidateRetrievalRegistry } from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
import { PgVectorCandidateRetrievalProvider } from '@/modules/recommendations/providers/pgvector-candidate-retrieval.provider.js';
import { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import type { RecommendationContext } from '@/modules/recommendations/types/recommendations.types.js';
import { buildRecommendationQueryText } from '@/modules/recommendations/utils/recommendation-query-text.js';

const baseContext = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'PROFILE',
  targetTitles: ['Backend Engineer'],
  relatedTitles: ['Software Engineer'],
  requiredSkills: ['TypeScript', 'PostgreSQL'],
  preferredSkills: ['Redis'],
  yearsOfExperience: 5,
  seniority: 'MID',
  industries: ['SaaS'],
  locations: ['Remote'],
  remotePreference: 'REMOTE',
  employmentTypes: ['FULL_TIME'],
  salaryExpectation: { minimum: 120000, currency: 'USD' },
  education: ['BS Computer Science'],
  certifications: [],
  excludedCompanies: ['Acme Corp'],
  excludedSkills: [],
  sourceText: 'Looking for backend roles',
});

const job = (overrides: Partial<JobListDto> & { id: string }): JobListDto => ({
  id: overrides.id,
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
  skills: overrides.skills ?? ['TypeScript'],
  publishedAt: overrides.publishedAt ?? null,
  });

describe('buildRecommendationQueryText', () => {
  it('formats populated context fields into a retrieval document', () => {
    const text = buildRecommendationQueryText(baseContext());
    expect(text).toContain('Target titles: Backend Engineer');
    expect(text).toContain('Required skills: TypeScript, PostgreSQL');
    expect(text).toContain('Remote preference: REMOTE');
    expect(text).toContain('Salary expectation: min 120000 USD');
    expect(text).toContain('Source text: Looking for backend roles');
  });

  it('falls back to a generic query when context has no usable fields', () => {
    expect(
      buildRecommendationQueryText({
        ...baseContext(),
        targetTitles: [],
        relatedTitles: [],
        requiredSkills: [],
        preferredSkills: [],
        yearsOfExperience: undefined,
        seniority: undefined,
        industries: [],
        locations: [],
        remotePreference: undefined,
        employmentTypes: [],
        salaryExpectation: {},
        education: [],
        certifications: [],
        sourceText: undefined,
      }),
    ).toBe('General job search');
  });
});

describe('PgVectorCandidateRetrievalProvider', () => {
  it('embeds the query, searches nearest, filters, and returns scores', async () => {
    const searchNearest = vi.fn().mockResolvedValue([
      { jobId: 'job-1', similarity: 0.91 },
      { jobId: 'job-2', similarity: 0.88 },
      { jobId: 'job-3', similarity: 0.8 },
    ]);
    const embeddings = {
      searchNearest,
    } as unknown as JobEmbeddingRepository;

    const findByIds = vi.fn().mockResolvedValue([
      job({ id: 'job-1' }),
      job({
        id: 'job-2',
        company: { slug: 'acme-corp', name: 'Acme Corp', logoUrl: null, verified: false },
      }),
      job({ id: 'job-3', employmentType: 'CONTRACT' }),
    ]);
    const jobs = { findByIds } as unknown as IJobSearchRepository;

    const embeddingProvider: EmbeddingProvider = {
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: 768,
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
      generateEmbeddings: vi.fn(),
    };

    const provider = new PgVectorCandidateRetrievalProvider(
      embeddings,
      jobs,
      () => embeddingProvider,
    );

    const result = await provider.retrieve({
      userId: 'user-1',
      context: baseContext(),
      backend: 'PGVECTOR',
      limit: 10,
      excludeJobIds: ['job-x'],
    });

    expect(embeddingProvider.generateEmbedding).toHaveBeenCalledWith(
      expect.stringContaining('Target titles: Backend Engineer'),
      'QUERY',
    );
    expect(searchNearest).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        model: 'text-embedding-004',
        embedding: [0.1, 0.2],
        limit: 40,
        filters: {
          excludeJobIds: ['job-x'],
          remoteTypes: ['REMOTE'],
          minSalary: 120000,
          maxSalary: undefined,
          currency: 'USD',
        },
      }),
    );
    expect(result.jobs.map((item) => item.id)).toEqual(['job-1']);
    expect(result.backend).toBe('PGVECTOR');
    expect(result.totalCandidates).toBe(3);
    expect(result.retrievalScores).toEqual({ 'job-1': 0.91 });
  });

  it('maps embedding failures to EMBEDDING_PROVIDER_UNAVAILABLE', async () => {
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest: vi.fn() } as unknown as JobEmbeddingRepository,
      { findByIds: vi.fn() } as unknown as IJobSearchRepository,
      () => ({
        provider: 'groq',
        model: 'nomic',
        dimensions: 768,
        generateEmbedding: vi.fn().mockRejectedValue(new Error('upstream down')),
        generateEmbeddings: vi.fn(),
      }),
    );

    await expect(
      provider.retrieve({
        userId: 'user-1',
        context: baseContext(),
        backend: 'PGVECTOR',
        limit: 5,
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMBEDDING_PROVIDER_UNAVAILABLE',
    });
  });
});

describe('RecommendationRetrievalService with PGVECTOR registry', () => {
  it('registers PGVECTOR and attaches retrievalScore on candidates', async () => {
    const pgProvider: PgVectorCandidateRetrievalProvider = {
      supportedBackends: ['PGVECTOR'],
      retrieve: vi.fn().mockResolvedValue({
        jobs: [job({ id: 'job-1' })],
        backend: 'PGVECTOR',
        totalCandidates: 1,
        retrievalScores: { 'job-1': 0.77 },
      }),
    } as unknown as PgVectorCandidateRetrievalProvider;

    const service = new RecommendationRetrievalService(
      new CandidateRetrievalRegistry([pgProvider]),
    );

    const candidates = await service.retrieve({
      context: baseContext(),
      backend: 'PGVECTOR',
      limit: 5,
    });

    expect(candidates).toEqual([
      {
        job: expect.objectContaining({ id: 'job-1' }),
        retrievalScore: 0.77,
      },
    ]);
  });
});
