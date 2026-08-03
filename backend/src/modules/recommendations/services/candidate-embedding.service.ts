import { createHash } from 'node:crypto';
import { JOB_EMBEDDING_DIMENSIONS } from '@/modules/job-embeddings/constants/job-embedding.constants.js';
import type { CandidateEmbeddingRepository } from '@/modules/recommendations/contracts/candidate-embedding.repository.js';
import type { CandidateEmbeddingIdentity } from '@/modules/recommendations/types/candidate-embedding.types.js';
import { RecommendationError, RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';

export interface ResolveCandidateEmbeddingInput extends CandidateEmbeddingIdentity {
  content: string;
  dimensions: number;
  generate: () => Promise<number[]>;
}

export interface ResolveCandidateEmbeddingResult {
  embedding: number[];
  cacheHit: boolean;
  contentHash: string;
}

let candidateEmbeddingCacheHit = 0;
let candidateEmbeddingCacheMiss = 0;
let contextEmbeddingReuseTotal = 0;

export const createCandidateEmbeddingContentHash = (content: string): string =>
  createHash('sha256').update(content.trim()).digest('hex');

export const candidateEmbeddingMetricsSnapshot = () => ({
  candidateEmbeddingCacheHit,
  candidateEmbeddingCacheMiss,
  contextEmbeddingReuseTotal,
});

export const resetCandidateEmbeddingMetricsForTests = (): void => {
  candidateEmbeddingCacheHit = 0;
  candidateEmbeddingCacheMiss = 0;
  contextEmbeddingReuseTotal = 0;
};

export class CandidateEmbeddingService {
  constructor(private readonly repository: CandidateEmbeddingRepository) {}

  async resolve(input: ResolveCandidateEmbeddingInput): Promise<ResolveCandidateEmbeddingResult> {
    if (input.dimensions !== JOB_EMBEDDING_DIMENSIONS) {
      throw new RecommendationError(
        `Embedding provider dimensions ${input.dimensions} do not match job embedding index dimensions ${JOB_EMBEDDING_DIMENSIONS}`,
        503,
        RECOMMENDATION_ERROR_CODES.EMBEDDING_DIMENSION_MISMATCH,
      );
    }
    const contentHash = createCandidateEmbeddingContentHash(input.content);
    const existing = await this.repository.findFresh({
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      provider: input.provider,
      model: input.model,
      contentHash,
    });
    if (existing) {
      candidateEmbeddingCacheHit += 1;
      return { embedding: existing.embedding, cacheHit: true, contentHash };
    }

    const reusable = await this.repository.findReusable({
      userId: input.userId,
      provider: input.provider,
      model: input.model,
      contentHash,
    });
    if (reusable) {
      candidateEmbeddingCacheHit += 1;
      contextEmbeddingReuseTotal += 1;
      await this.repository.upsert({
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        provider: input.provider,
        model: input.model,
        contentHash,
        embedding: reusable.embedding,
      });
      return { embedding: reusable.embedding, cacheHit: true, contentHash };
    }

    candidateEmbeddingCacheMiss += 1;
    const embedding = await input.generate();
    await this.repository.upsert({
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      provider: input.provider,
      model: input.model,
      contentHash,
      embedding,
    });
    return { embedding, cacheHit: false, contentHash };
  }

  async invalidateUserSource(input: {
    userId: string;
    sourceType?: CandidateEmbeddingIdentity['sourceType'];
    sourceId?: string | null;
  }): Promise<number> {
    return this.repository.deleteForUserSource(input);
  }
}
