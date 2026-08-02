import { invalidateUserQueryEmbeddings } from '@/modules/recommendations/cache/recommendation-query-embedding.cache.js';
import { PrismaCandidateEmbeddingRepository } from '@/modules/recommendations/repositories/prisma-candidate-embedding.repository.js';
import { CandidateEmbeddingService } from '@/modules/recommendations/services/candidate-embedding.service.js';

const candidateEmbeddings = new CandidateEmbeddingService(new PrismaCandidateEmbeddingRepository());

/** Clears cached query embeddings when profile/resume material changes (JR-LIFE-001). */
export const invalidateUserRecommendationState = async (userId: string): Promise<void> => {
  await Promise.all([
    invalidateUserQueryEmbeddings(userId),
    candidateEmbeddings.invalidateUserSource({ userId }),
  ]);
};

export const profileUpdatedAfter = async (
  userId: string,
  timestamp: Date,
): Promise<boolean> => {
  const { prisma } = await import('@/shared/config/db.conf.js');
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) return false;
  return profile.updatedAt > timestamp;
};
