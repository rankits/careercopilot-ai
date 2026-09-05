import { invalidateUserQueryEmbeddings } from '@/modules/recommendations/cache/recommendation-query-embedding.cache.js';
import { PrismaCandidateEmbeddingRepository } from '@/modules/recommendations/repositories/prisma-candidate-embedding.repository.js';
import { CandidateEmbeddingService } from '@/modules/recommendations/services/candidate-embedding.service.js';
import {
  recordRecommendationInvalidation,
  recordUserRecommendationPurge,
} from '@/modules/recommendations/observability/recommendation.metrics.js';
import type { CandidateEmbeddingIdentity } from '@/modules/recommendations/types/candidate-embedding.types.js';

const candidateEmbeddings = new CandidateEmbeddingService(new PrismaCandidateEmbeddingRepository());

export interface RecommendationInvalidationInput {
  userId: string;
  sourceType?: CandidateEmbeddingIdentity['sourceType'];
  sourceId?: string | null;
}

export interface PurgeUserRecommendationDataResult {
  deletedRuns: number;
  deletedRecommendations: number;
  deletedFeedback: number;
  deletedCandidateEmbeddings: number;
}

export interface RecommendationLifecycleDependencies {
  invalidateUserQueryEmbeddings(userId: string): Promise<unknown>;
  candidateEmbeddings: Pick<CandidateEmbeddingService, 'invalidateUserSource'>;
}

export const createRecommendationLifecycleService = (
  dependencies: RecommendationLifecycleDependencies,
) => ({
  /** Clears cached query and candidate embeddings when profile/resume material changes (JR-LIFE-001). */
  async invalidateUserRecommendationState(
    input: string | RecommendationInvalidationInput,
  ): Promise<void> {
    const normalized = typeof input === 'string' ? { userId: input } : input;
    await Promise.all([
      dependencies.invalidateUserQueryEmbeddings(normalized.userId),
      dependencies.candidateEmbeddings.invalidateUserSource(normalized),
    ]);
    recordRecommendationInvalidation();
  },
});

const recommendationLifecycleService = createRecommendationLifecycleService({
  invalidateUserQueryEmbeddings,
  candidateEmbeddings,
});

/** Clears cached query and candidate embeddings when profile/resume material changes (JR-LIFE-001). */
export const invalidateUserRecommendationState = async (
  input: string | RecommendationInvalidationInput,
): Promise<void> => {
  await recommendationLifecycleService.invalidateUserRecommendationState(input);
};

/** Purges all recommendation runs, recommendations, feedback, and candidate embeddings for an account deletion (JRE-SEC-003). */
export const purgeUserRecommendationData = async (
  userId: string,
): Promise<PurgeUserRecommendationDataResult> => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return {
      deletedRuns: 0,
      deletedRecommendations: 0,
      deletedFeedback: 0,
      deletedCandidateEmbeddings: 0,
    };
  }

  const { prisma } = await import('@/shared/config/db.conf.js');
  await invalidateUserQueryEmbeddings(normalizedUserId);

  const [feedback, recommendations, runs, embeddings] = await prisma.$transaction([
    prisma.recommendationFeedback.deleteMany({ where: { userId: normalizedUserId } }),
    prisma.jobRecommendation.deleteMany({ where: { userId: normalizedUserId } }),
    prisma.recommendationRun.deleteMany({ where: { userId: normalizedUserId } }),
    prisma.candidateEmbedding.deleteMany({ where: { userId: normalizedUserId } }),
  ]);

  recordUserRecommendationPurge();

  return {
    deletedRuns: runs.count,
    deletedRecommendations: recommendations.count,
    deletedFeedback: feedback.count,
    deletedCandidateEmbeddings: embeddings.count,
  };
};

export const profileUpdatedAfter = async (userId: string, timestamp: Date): Promise<boolean> => {
  const { prisma } = await import('@/shared/config/db.conf.js');
  const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (!profile) return false;
  if (profile.updatedAt > timestamp) return true;
  if (!profile.sourceResumeId) return false;

  const resume = await prisma.resume.findFirst({
    where: { id: profile.sourceResumeId, userId },
    select: { updatedAt: true },
  });
  if (resume?.updatedAt && resume.updatedAt > timestamp) return true;

  const parseRun = await prisma.resumeParseRun.findFirst({
    where: { resumeId: profile.sourceResumeId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });
  if (parseRun?.updatedAt && parseRun.updatedAt > timestamp) return true;

  const extraction = await prisma.resumeExtraction.findFirst({
    where: { resumeId: profile.sourceResumeId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return Boolean(extraction?.createdAt && extraction.createdAt > timestamp);
};
