import type { RecommendationUnitOfWork } from '@/modules/recommendations/contracts/recommendation.repository.js';
import { RECOMMENDATION_ERROR_CODES } from '@/modules/recommendations/errors/recommendation.error.js';
import type {
  RecommendationLifecycleState,
  RecommendationRunRecord,
} from '@/modules/recommendations/types/recommendations.types.js';
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

export const findLatestRecommendationRun = async (
  unitOfWork: RecommendationUnitOfWork,
  userId: string,
): Promise<RecommendationRunRecord | null> =>
  unitOfWork.execute(({ runs }) => runs.findLatestByUser(userId));

export const DEFAULT_RECOMMENDATION_FRESHNESS_TTL_MS =
  Number(process.env['RECOMMENDATION_FRESHNESS_TTL_MS']) || 72 * 60 * 60 * 1000; // 72 hours

export const isRecommendationSetStale = async (
  deps: RecommendationReadinessDependencies,
  userId: string,
  lastGeneratedAt: Date | null,
  now: Date = new Date(),
  ttlMs: number = DEFAULT_RECOMMENDATION_FRESHNESS_TTL_MS,
): Promise<boolean> => {
  if (!lastGeneratedAt) return false;
  if (now.getTime() - lastGeneratedAt.getTime() > ttlMs) {
    return true;
  }
  if (deps.profileUpdatedAfter) {
    return deps.profileUpdatedAfter(userId, lastGeneratedAt);
  }
  return false;
};

export const mapRecommendationLifecycleState = (input: {
  latestRun: RecommendationRunRecord | null;
  stale: boolean;
}): RecommendationLifecycleState => {
  if (!input.latestRun) return 'NOT_STARTED';
  if (input.latestRun.status === 'PENDING') return 'QUEUED';
  if (input.latestRun.status === 'RETRIEVING' || input.latestRun.status === 'SCORING') {
    return 'PROCESSING';
  }
  if (input.latestRun.status === 'FAILED') {
    switch (input.latestRun.failureCode) {
      case 'RECOMMENDATION_GENERATION_TIMEOUT':
        return 'FAILED_TIMEOUT';
      case RECOMMENDATION_ERROR_CODES.EMBEDDING_PROVIDER_UNAVAILABLE:
        return 'FAILED_PROVIDER';
      case RECOMMENDATION_ERROR_CODES.NO_ELIGIBLE_JOBS_FOUND:
        return 'FAILED_EMPTY';
      default:
        return 'FAILED';
    }
  }
  if (input.stale) return 'STALE';
  return 'READY';
};
