import { invalidateUserQueryEmbeddings } from '@/modules/recommendations/cache/recommendation-query-embedding.cache.js';

/** Clears cached query embeddings when profile/resume material changes (JR-LIFE-001). */
export const invalidateUserRecommendationState = async (userId: string): Promise<void> => {
  await invalidateUserQueryEmbeddings(userId);
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
