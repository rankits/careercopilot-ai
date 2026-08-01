import type { RecommendationUnitOfWork } from '@/modules/recommendations/contracts/recommendation.repository.js';
import { computeEmbeddingCoverageRatio } from '@/modules/job-embeddings/observability/job-embedding-coverage.js';
import type { JobEmbeddingRepository } from '@/modules/job-embeddings/contracts/job-embedding.repository.js';
import { prisma } from '@/shared/config/db.conf.js';

export interface RecommendationReadinessDependencies {
  unitOfWork: RecommendationUnitOfWork;
  jobEmbeddings: JobEmbeddingRepository;
  profileUpdatedAfter?: (userId: string, timestamp: Date) => Promise<boolean>;
}

export const countEmbeddingCoverage = async (): Promise<{
  activeJobs: number;
  embeddedJobs: number;
  coverageRatio: number;
}> => {
  const [activeJobs, embeddedJobs] = await Promise.all([
    prisma.job.count({ where: { status: 'ACTIVE' } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT j."id") AS count
      FROM "jobs" j
      INNER JOIN "job_embeddings" je ON je."job_id" = j."id" AND je."job_version" = j."version"
      WHERE j."status" = 'ACTIVE'::"JobStatus"
    `.then((rows) => Number(rows[0]?.count ?? 0)),
  ]);
  return {
    activeJobs,
    embeddedJobs,
    coverageRatio: computeEmbeddingCoverageRatio(activeJobs, embeddedJobs),
  };
};

export const findLatestRecommendationGeneratedAt = async (
  unitOfWork: RecommendationUnitOfWork,
  userId: string,
): Promise<Date | null> => {
  const page = await unitOfWork.execute(({ recommendations }) =>
    recommendations.listByUser(userId, { page: 1, limit: 1 }),
  );
  return page.items[0]?.createdAt ?? null;
};

export const isRecommendationSetStale = async (
  deps: RecommendationReadinessDependencies,
  userId: string,
  lastGeneratedAt: Date | null,
): Promise<boolean> => {
  if (!lastGeneratedAt) return false;
  if (deps.profileUpdatedAfter) {
    return deps.profileUpdatedAfter(userId, lastGeneratedAt);
  }
  return false;
};
