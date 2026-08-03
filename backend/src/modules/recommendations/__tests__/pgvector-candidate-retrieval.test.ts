import { describe, expect, it, vi } from 'vitest';
import type { EmbeddingProvider } from '@/modules/ai-embeddings/contracts/embedding-provider.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import type { CandidateEmbeddingRepository } from '@/modules/recommendations/contracts/candidate-embedding.repository.js';
import { CandidateRetrievalRegistry } from '@/modules/recommendations/providers/candidate-retrieval.registry.js';
import { PgVectorCandidateRetrievalProvider } from '@/modules/recommendations/providers/pgvector-candidate-retrieval.provider.js';
import { CandidateEmbeddingService } from '@/modules/recommendations/services/candidate-embedding.service.js';
import { RecommendationRetrievalService } from '@/modules/recommendations/services/recommendation-retrieval.service.js';
import {
  RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
  type RecommendationContext,
} from '@/modules/recommendations/types/recommendations.types.js';
import { buildRecommendationQueryText } from '@/modules/recommendations/utils/recommendation-query-text.js';
import type {
  CandidateEmbeddingRecord,
  UpsertCandidateEmbeddingInput,
} from '@/modules/recommendations/types/candidate-embedding.types.js';

const baseContext = (): RecommendationContext => ({
  userId: 'user-1',
  sourceType: 'PROFILE',
  contextSchemaVersion: RECOMMENDATION_CONTEXT_SCHEMA_VERSION,
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
  applyUrl: null,
});

class MemoryCandidateEmbeddingRepository implements CandidateEmbeddingRepository {
  private record: CandidateEmbeddingRecord | null = null;

  async findFresh(input: Parameters<CandidateEmbeddingRepository['findFresh']>[0]) {
    return this.record &&
      this.record.userId === input.userId &&
      this.record.sourceType === input.sourceType &&
      this.record.sourceId === (input.sourceId ?? null) &&
      this.record.provider === input.provider &&
      this.record.model === input.model &&
      this.record.contentHash === input.contentHash
      ? this.record
      : null;
  }

  async findReusable(input: Parameters<CandidateEmbeddingRepository['findReusable']>[0]) {
    return this.record &&
      this.record.userId === input.userId &&
      this.record.provider === input.provider &&
      this.record.model === input.model &&
      this.record.contentHash === input.contentHash
      ? this.record
      : null;
  }

  async upsert(input: UpsertCandidateEmbeddingInput) {
    this.record = {
      id: 'candidate-embedding-id',
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      sourceKey: input.sourceId ?? input.sourceType,
      provider: input.provider,
      model: input.model,
      dimensions: input.embedding.length,
      contentHash: input.contentHash,
      embedding: [...input.embedding],
      createdAt: new Date('2026-08-02T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
    };
    return this.record;
  }

  async deleteForUserSource() {
    this.record = null;
    return 1;
  }
}

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
    expect(result.metadata).toMatchObject({
      retrievalCandidateCount: 3,
      embeddingCacheHit: false,
      retrievalDedupRemoved: 0,
    });
    expect(result.metadata?.retrievalLatencyMs).toEqual(expect.any(Number));
  });

  it('omits negotiable vector constraints and keeps near-misses in flexible mode', async () => {
    const searchNearest = vi.fn().mockResolvedValue([
      { jobId: 'job-stretch', similarity: 0.89 },
      { jobId: 'job-blocked', similarity: 0.88 },
    ]);
    const findByIds = vi.fn().mockResolvedValue([
      job({
        id: 'job-stretch',
        location: { formatted: 'Paris, France', remoteType: 'ONSITE' },
        salary: { minimum: 70000, maximum: 90000, currency: 'USD' },
      }),
      job({
        id: 'job-blocked',
        company: { slug: 'acme-corp', name: 'Acme Corp', logoUrl: null, verified: false },
      }),
    ]);
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest } as unknown as JobEmbeddingRepository,
      { findByIds } as unknown as IJobSearchRepository,
      () => ({
        provider: 'google',
        model: 'text-embedding-004',
        dimensions: 768,
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
        generateEmbeddings: vi.fn(),
      }),
    );

    const result = await provider.retrieve({
      userId: 'user-1',
      context: { ...baseContext(), filterMode: 'FLEXIBLE' },
      backend: 'PGVECTOR',
      limit: 10,
      excludeJobIds: ['job-x'],
    });

    expect(searchNearest).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          excludeJobIds: ['job-x'],
          remoteTypes: undefined,
          minSalary: undefined,
          maxSalary: undefined,
          currency: undefined,
        },
      }),
    );
    expect(result.jobs.map((item) => item.id)).toEqual(['job-stretch']);
    expect(result.retrievalScores).toEqual({ 'job-stretch': 0.89 });
  });

  it('omits vector hits that are not hydrated by the active job repository', async () => {
    const searchNearest = vi.fn().mockResolvedValue([
      { jobId: 'active-job', similarity: 0.91 },
      { jobId: 'expired-job', similarity: 0.9 },
    ]);
    const findByIds = vi.fn().mockResolvedValue([job({ id: 'active-job' })]);
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest } as unknown as JobEmbeddingRepository,
      { findByIds } as unknown as IJobSearchRepository,
      () => ({
        provider: 'google',
        model: 'text-embedding-004',
        dimensions: 768,
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
        generateEmbeddings: vi.fn(),
      }),
    );

    const result = await provider.retrieve({
      userId: 'user-1',
      context: baseContext(),
      backend: 'PGVECTOR',
      limit: 10,
    });

    expect(findByIds).toHaveBeenCalledWith(['active-job', 'expired-job']);
    expect(result.jobs.map((item) => item.id)).toEqual(['active-job']);
    expect(result.retrievalScores).toEqual({ 'active-job': 0.91 });
  });

  it('fails closed when query embedding dimensions do not match the job index', async () => {
    const searchNearest = vi.fn();
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest } as unknown as JobEmbeddingRepository,
      { findByIds: vi.fn() } as unknown as IJobSearchRepository,
      () => ({
        provider: 'google',
        model: 'text-embedding-004',
        dimensions: 384,
        generateEmbedding: vi.fn(),
        generateEmbeddings: vi.fn(),
      }),
    );

    await expect(
      provider.retrieve({
        userId: 'user-1',
        context: baseContext(),
        backend: 'PGVECTOR',
        limit: 10,
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMBEDDING_DIMENSION_MISMATCH',
    });
    expect(searchNearest).not.toHaveBeenCalled();
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

  it('reuses durable candidate embeddings for unchanged source content', async () => {
    const searchNearest = vi.fn().mockResolvedValue([{ jobId: 'job-1', similarity: 0.91 }]);
    const findByIds = vi.fn().mockResolvedValue([job({ id: 'job-1' })]);
    const embeddingProvider: EmbeddingProvider = {
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: 768,
      generateEmbedding: vi.fn().mockResolvedValue(Array.from({ length: 768 }, () => 0.01)),
      generateEmbeddings: vi.fn(),
    };
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest } as unknown as JobEmbeddingRepository,
      { findByIds } as unknown as IJobSearchRepository,
      () => embeddingProvider,
      new CandidateEmbeddingService(new MemoryCandidateEmbeddingRepository()),
    );
    const request = {
      userId: 'user-1',
      context: baseContext(),
      backend: 'PGVECTOR' as const,
      limit: 10,
    };

    const first = await provider.retrieve(request);
    const second = await provider.retrieve(request);

    expect(embeddingProvider.generateEmbedding).toHaveBeenCalledTimes(1);
    expect(first.metadata?.candidateEmbeddingCacheHit).toBe(false);
    expect(second.metadata?.candidateEmbeddingCacheHit).toBe(true);
    expect(searchNearest).toHaveBeenCalledTimes(2);
  });

  it('reuses TARGET_TEXT candidate embeddings on repeated identical content', async () => {
    const searchNearest = vi.fn().mockResolvedValue([{ jobId: 'job-1', similarity: 0.91 }]);
    const findByIds = vi.fn().mockResolvedValue([job({ id: 'job-1' })]);
    const embeddingProvider: EmbeddingProvider = {
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: 768,
      generateEmbedding: vi.fn().mockResolvedValue(Array.from({ length: 768 }, () => 0.02)),
      generateEmbeddings: vi.fn(),
    };
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest } as unknown as JobEmbeddingRepository,
      { findByIds } as unknown as IJobSearchRepository,
      () => embeddingProvider,
      new CandidateEmbeddingService(new MemoryCandidateEmbeddingRepository()),
    );
    const context = {
      ...baseContext(),
      sourceType: 'TARGET_TEXT' as const,
      sourceText: 'same text',
    };

    await provider.retrieve({ userId: 'user-1', context, backend: 'PGVECTOR', limit: 10 });
    await provider.retrieve({ userId: 'user-1', context, backend: 'PGVECTOR', limit: 10 });

    expect(embeddingProvider.generateEmbedding).toHaveBeenCalledTimes(1);
  });

  it('collapses duplicate retrieved jobs and keeps the best vector-scored instance', async () => {
    const searchNearest = vi.fn().mockResolvedValue([
      { jobId: 'job-low', similarity: 0.7 },
      { jobId: 'job-high', similarity: 0.95 },
      { jobId: 'job-distinct', similarity: 0.8 },
    ]);
    const findByIds = vi
      .fn()
      .mockResolvedValue([
        job({ id: 'job-low' }),
        job({ id: 'job-high' }),
        job({ id: 'job-distinct', title: 'Frontend Engineer', skills: ['React'] }),
      ]);
    const provider = new PgVectorCandidateRetrievalProvider(
      { searchNearest } as unknown as JobEmbeddingRepository,
      { findByIds } as unknown as IJobSearchRepository,
      () => ({
        provider: 'google',
        model: 'text-embedding-004',
        dimensions: 768,
        generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
        generateEmbeddings: vi.fn(),
      }),
    );

    const result = await provider.retrieve({
      userId: 'user-1',
      context: baseContext(),
      backend: 'PGVECTOR',
      limit: 10,
    });

    expect(result.jobs.map((item) => item.id)).toEqual(['job-high', 'job-distinct']);
    expect(result.retrievalScores).toEqual({ 'job-high': 0.95, 'job-distinct': 0.8 });
    expect(result.metadata?.retrievalDedupRemoved).toBe(1);
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
