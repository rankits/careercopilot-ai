import { createHash } from 'node:crypto';
import { cacheService, CacheTTL } from '@/infrastructure/cache/index.js';

const QUERY_EMBEDDING_PREFIX = 'careercopilot:recommendations:query-embedding:';

export const recommendationQueryEmbeddingCacheKey = (
  userId: string,
  provider: string,
  model: string,
  queryText: string,
): string => {
  const contentHash = createHash('sha256').update(queryText.trim()).digest('hex');
  return `${QUERY_EMBEDDING_PREFIX}${userId}:${provider}:${model}:${contentHash}`;
};

export const recommendationQueryEmbeddingCachePrefix = (userId: string): string =>
  `${QUERY_EMBEDDING_PREFIX}${userId}:`;

export const getCachedQueryEmbedding = async (
  key: string,
): Promise<number[] | null> => cacheService.get<number[]>(key);

export const setCachedQueryEmbedding = async (key: string, embedding: number[]): Promise<void> =>
  cacheService.set(key, embedding, CacheTTL.FIVE_MINUTES);

export const invalidateUserQueryEmbeddings = async (userId: string): Promise<number> =>
  cacheService.deleteByPrefix(recommendationQueryEmbeddingCachePrefix(userId));

export const resolveQueryEmbedding = async (input: {
  userId: string;
  provider: string;
  model: string;
  queryText: string;
  generate: () => Promise<number[]>;
}): Promise<{ embedding: number[]; cacheHit: boolean }> => {
  const key = recommendationQueryEmbeddingCacheKey(
    input.userId,
    input.provider,
    input.model,
    input.queryText,
  );
  const cached = await getCachedQueryEmbedding(key);
  if (cached) {
    return { embedding: cached, cacheHit: true };
  }
  const embedding = await input.generate();
  await setCachedQueryEmbedding(key, embedding);
  return { embedding, cacheHit: false };
};
