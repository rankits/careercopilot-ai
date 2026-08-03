import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CandidateEmbeddingRepository } from '@/modules/recommendations/contracts/candidate-embedding.repository.js';
import { CandidateEmbeddingService, createCandidateEmbeddingContentHash, resetCandidateEmbeddingMetricsForTests, candidateEmbeddingMetricsSnapshot } from '@/modules/recommendations/services/candidate-embedding.service.js';
import type { CandidateEmbeddingRecord, UpsertCandidateEmbeddingInput } from '@/modules/recommendations/types/candidate-embedding.types.js';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';

const vector = (seed = 1): number[] =>
  Array.from({ length: JOB_EMBEDDING_DIMENSIONS }, (_, index) => (index + seed) / 10_000);

class MemoryCandidateEmbeddingRepository implements CandidateEmbeddingRepository {
  readonly upserts: UpsertCandidateEmbeddingInput[] = [];
  private record: CandidateEmbeddingRecord | null = null;

  async findFresh(input: Parameters<CandidateEmbeddingRepository['findFresh']>[0]) {
    if (
      this.record &&
      this.record.userId === input.userId &&
      this.record.sourceType === input.sourceType &&
      this.record.sourceId === (input.sourceId ?? null) &&
      this.record.provider === input.provider &&
      this.record.model === input.model &&
      this.record.contentHash === input.contentHash
    ) {
      return this.record;
    }
    return null;
  }

  async findReusable(input: Parameters<CandidateEmbeddingRepository['findReusable']>[0]) {
    if (
      this.record &&
      this.record.userId === input.userId &&
      this.record.provider === input.provider &&
      this.record.model === input.model &&
      this.record.contentHash === input.contentHash
    ) {
      return this.record;
    }
    return null;
  }

  async upsert(input: UpsertCandidateEmbeddingInput) {
    this.upserts.push(input);
    this.record = {
      id: 'candidate-embedding-id',
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      sourceKey: input.sourceId ?? input.sourceType,
      provider: input.provider,
      model: input.model,
      dimensions: JOB_EMBEDDING_DIMENSIONS,
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

describe('CandidateEmbeddingService', () => {
  beforeEach(() => resetCandidateEmbeddingMetricsForTests());

  it('reuses a fresh candidate embedding for unchanged source content', async () => {
    const repository = new MemoryCandidateEmbeddingRepository();
    const service = new CandidateEmbeddingService(repository);
    const generate = vi.fn().mockResolvedValue(vector());
    const input = {
      userId: 'user-1',
      sourceType: 'PROFILE' as const,
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      content: 'Target titles: Backend Engineer',
      generate,
    };

    const first = await service.resolve(input);
    const second = await service.resolve(input);

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.embedding).toEqual(vector());
    expect(generate).toHaveBeenCalledTimes(1);
    expect(repository.upserts).toHaveLength(1);
    expect(candidateEmbeddingMetricsSnapshot()).toEqual({
      candidateEmbeddingCacheHit: 1,
      candidateEmbeddingCacheMiss: 1,
      contextEmbeddingReuseTotal: 0,
    });
  });

  it('misses and upserts when the source content hash changes', async () => {
    const repository = new MemoryCandidateEmbeddingRepository();
    const service = new CandidateEmbeddingService(repository);
    const generate = vi.fn().mockResolvedValueOnce(vector(1)).mockResolvedValueOnce(vector(2));

    await service.resolve({
      userId: 'user-1',
      sourceType: 'RESUME',
      sourceId: 'resume-1',
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      content: 'old resume text',
      generate,
    });
    await service.resolve({
      userId: 'user-1',
      sourceType: 'RESUME',
      sourceId: 'resume-1',
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      content: 'new resume text',
      generate,
    });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(repository.upserts.map((input) => input.contentHash)).toEqual([
      createCandidateEmbeddingContentHash('old resume text'),
      createCandidateEmbeddingContentHash('new resume text'),
    ]);
  });

  it('reuses an equivalent context embedding across source rows for the same user', async () => {
    const repository = new MemoryCandidateEmbeddingRepository();
    const service = new CandidateEmbeddingService(repository);
    const generate = vi.fn().mockResolvedValue(vector());

    await service.resolve({
      userId: 'user-1',
      sourceType: 'PROFILE',
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      content: 'same normalized context',
      generate,
    });
    const targetText = await service.resolve({
      userId: 'user-1',
      sourceType: 'TARGET_TEXT',
      provider: 'google',
      model: 'text-embedding-004',
      dimensions: JOB_EMBEDDING_DIMENSIONS,
      content: 'same normalized context',
      generate,
    });

    expect(targetText.cacheHit).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(repository.upserts.map((input) => input.sourceType)).toEqual(['PROFILE', 'TARGET_TEXT']);
    expect(candidateEmbeddingMetricsSnapshot()).toMatchObject({
      candidateEmbeddingCacheHit: 1,
      candidateEmbeddingCacheMiss: 1,
      contextEmbeddingReuseTotal: 1,
    });
  });
});
