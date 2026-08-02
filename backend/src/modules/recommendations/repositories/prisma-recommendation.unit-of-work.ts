import type {
  JobRecommendation,
  RecommendationFeedback,
  RecommendationRun,
  RecommendationScoreComponent,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import type { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import { DEFAULT_RECOMMENDATION_WEIGHTS } from '@/modules/recommendations/constants/recommendation.constants.js';
import { RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS } from '@/modules/recommendations/constants/recommendation-feedback.constants.js';
import type {
  JobRecommendationRepository,
  RecommendationFeedbackRepository,
  RecommendationRunRepository,
  RecommendationUnitOfWork,
} from '@/modules/recommendations/contracts/recommendation.repository.js';
import {
  RECOMMENDATION_ERROR_CODES,
  RecommendationError,
} from '@/modules/recommendations/errors/recommendation.error.js';
import { recordJobRecommendationHidden } from '@/modules/recommendations/observability/recommendation.metrics.js';
import { sortRecommendationsForRanking } from '@/modules/recommendations/utils/recommendation-ranking.js';
import type {
  JobRecommendationRecord,
  RecommendationFeedbackRecord,
  RecommendationPage,
  RecommendationReason,
  RecommendationRunRecord,
  RecommendationScoreComponentName,
  RecommendationScoreComponents,
  RecommendationScoreResult,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

type Tx = Prisma.TransactionClient;
type RecommendationRowWithComponents = JobRecommendation & {
  scoreComponents: RecommendationScoreComponent[];
};

const toRunRecord = (run: RecommendationRun): RecommendationRunRecord => ({
  id: run.id,
  userId: run.userId,
  sourceType: run.sourceType,
  sourceId: run.sourceId,
  status: run.status,
  candidateCount: run.candidateCount,
  failureCode: run.failureCode,
  createdAt: run.createdAt,
  completedAt: run.completedAt,
});

const toReasons = (value: Prisma.JsonValue): RecommendationReason[] => {
  if (!Array.isArray(value)) return [];
  const reasons: RecommendationReason[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (
      typeof record.component !== 'string' ||
      typeof record.message !== 'string' ||
      !Array.isArray(record.evidence)
    ) {
      continue;
    }
    reasons.push({
      component: record.component as RecommendationReason['component'],
      message: record.message,
      evidence: record.evidence.filter((entry): entry is string => typeof entry === 'string'),
    });
  }
  return reasons;
};

const toScoreResult = (
  recommendation: RecommendationRowWithComponents,
): RecommendationScoreResult => {
  const components = {
    requiredSkills: 0,
    title: 0,
    experience: 0,
    responsibilities: 0,
    preferredSkills: 0,
    location: 0,
    industry: 0,
    salary: 0,
    qualifications: 0,
  } satisfies RecommendationScoreComponents;
  for (const row of recommendation.scoreComponents) {
    components[row.component] = row.score;
  }
  return {
    overallScore: recommendation.overallScore,
    components,
    matchedSkills: recommendation.matchedSkills,
    aliasSkills: recommendation.aliasSkills,
    relatedSkills: recommendation.relatedSkills,
    transferableSkills: recommendation.transferableSkills,
    missingSkills: recommendation.missingSkills,
    reasons: toReasons(recommendation.reasons),
  };
};

const placeholderJob = (jobId: string): JobListDto => ({
  id: jobId,
  title: 'Unavailable job',
  company: { slug: 'unknown', name: 'Unknown', logoUrl: null, verified: false },
  location: { formatted: 'Unknown', remoteType: null },
  employmentType: null,
  salary: { minimum: null, maximum: null, currency: null },
  skills: [],
  publishedAt: null,
  applyUrl: null,
});

const filterRowsWithEligibleJobs = async (
  tx: Tx,
  rows: RecommendationRowWithComponents[],
): Promise<RecommendationRowWithComponents[]> => {
  if (rows.length === 0) return rows;
  const jobIds = [...new Set(rows.map((row) => row.jobId))];
  const eligible = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT j."id"
    FROM "jobs" j
    INNER JOIN "job_embeddings" je ON je."job_id" = j."id" AND je."job_version" = j."version"
    WHERE j."id" IN (${Prisma.join(jobIds)})
      AND j."status" = 'ACTIVE'::"JobStatus"
  `);
  const eligibleIds = new Set(eligible.map((row) => row.id));
  return rows.filter((row) => eligibleIds.has(row.jobId));
};

const eligibleRecommendationPredicate = (userId: string, runId?: string) => Prisma.sql`
  jr."user_id" = ${userId}
  ${runId ? Prisma.sql`AND jr."run_id" = ${runId}` : Prisma.empty}
  AND j."status" = 'ACTIVE'::"JobStatus"
  AND EXISTS (
    SELECT 1
    FROM "job_embeddings" je
    WHERE je."job_id" = j."id"
      AND je."job_version" = j."version"
  )
`;

const toCount = (value: unknown): number => {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
};

const listEligibleRecommendationIds = async (
  tx: Tx,
  input: {
    userId: string;
    runId?: string;
    pagination: { page: number; limit: number };
    orderBy: Prisma.Sql;
  },
): Promise<{ ids: string[]; total: number }> => {
  const predicate = eligibleRecommendationPredicate(input.userId, input.runId);
  const offset = (input.pagination.page - 1) * input.pagination.limit;
  const [rawCountRows, countRows, idRows] = await Promise.all([
    tx.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
      SELECT COUNT(*) AS "count"
      FROM "job_recommendations" jr
      WHERE jr."user_id" = ${input.userId}
      ${input.runId ? Prisma.sql`AND jr."run_id" = ${input.runId}` : Prisma.empty}
    `),
    tx.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
      SELECT COUNT(*) AS "count"
      FROM "job_recommendations" jr
      INNER JOIN "jobs" j ON j."id" = jr."job_id"
      WHERE ${predicate}
    `),
    tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT jr."id"
      FROM "job_recommendations" jr
      INNER JOIN "jobs" j ON j."id" = jr."job_id"
      WHERE ${predicate}
      ORDER BY ${input.orderBy}
      OFFSET ${offset}
      LIMIT ${input.pagination.limit}
    `),
  ]);
  const rawTotal = toCount(rawCountRows[0]?.count);
  const total = toCount(countRows[0]?.count);
  recordJobRecommendationHidden(rawTotal - total);
  return {
    ids: idRows.map((row) => row.id).filter((id): id is string => typeof id === 'string'),
    total,
  };
};

const createRunRepository = (tx: Tx): RecommendationRunRepository => ({
  async create(input) {
    const run = await tx.recommendationRun.create({
      data: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });
    return toRunRecord(run);
  },

  async updateStatus(userId, runId, status) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { status },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async updateCandidateCount(userId, runId, candidateCount) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { candidateCount },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async markCompleted(userId, runId) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { status: 'COMPLETED', completedAt: new Date(), failureCode: null },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async markFailed(userId, runId, failureCode) {
    const result = await tx.recommendationRun.updateMany({
      where: { id: runId, userId },
      data: { status: 'FAILED', failureCode, completedAt: new Date() },
    });
    if (result.count === 0) {
      throw new RecommendationError(
        'Recommendation run was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
      );
    }
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return toRunRecord(run!);
  },

  async findById(userId, runId) {
    const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
    return run ? toRunRecord(run) : null;
  },

  async findLatestByUser(userId) {
    const run = await tx.recommendationRun.findFirst({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return run ? toRunRecord(run) : null;
  },
});

const createRecommendationRepository = (
  tx: Tx,
  jobs: IJobSearchRepository,
): JobRecommendationRepository => {
  const hydrate = async (
    rows: RecommendationRowWithComponents[],
  ): Promise<JobRecommendationRecord[]> => {
    const eligibleRows = await filterRowsWithEligibleJobs(tx, rows);
    const jobDtos = await jobs.findByIds(eligibleRows.map((row) => row.jobId));
    const byId = new Map(jobDtos.map((job) => [job.id, job]));
    return eligibleRows
      .map((row) => {
        const job = byId.get(row.jobId);
        if (!job) return null;
        return {
          id: row.id,
          runId: row.runId,
          userId: row.userId,
          rank: row.rank,
          createdAt: row.createdAt,
          job,
          category: row.category,
          matchType: row.matchType,
          scoreResult: toScoreResult(row),
        };
      })
      .filter((record): record is JobRecommendationRecord => record !== null);
  };

  return {
    async createMany(userId, runId, recommendations, options) {
      const run = await tx.recommendationRun.findFirst({ where: { id: runId, userId } });
      if (!run) {
        throw new RecommendationError(
          'Recommendation run was not found',
          404,
          RECOMMENDATION_ERROR_CODES.RUN_NOT_FOUND,
        );
      }

      const ranked = options?.preserveOrder
        ? [...recommendations]
        : sortRecommendationsForRanking(recommendations);

      const created: RecommendationRowWithComponents[] = [];
      for (const [index, item] of ranked.entries()) {
        const row = await tx.jobRecommendation.create({
          data: {
            runId,
            userId,
            jobId: item.job.id,
            overallScore: item.scoreResult.overallScore,
            category: item.category,
            matchType: item.matchType,
            rank: index + 1,
            matchedSkills: item.scoreResult.matchedSkills,
            aliasSkills: item.scoreResult.aliasSkills,
            relatedSkills: item.scoreResult.relatedSkills,
            transferableSkills: item.scoreResult.transferableSkills,
            missingSkills: item.scoreResult.missingSkills,
            reasons: item.scoreResult.reasons as unknown as Prisma.InputJsonValue,
            scoreComponents: {
              create: (
                Object.keys(DEFAULT_RECOMMENDATION_WEIGHTS) as RecommendationScoreComponentName[]
              ).map((component) => ({
                component,
                weight: DEFAULT_RECOMMENDATION_WEIGHTS[component],
                score: item.scoreResult.components[component],
                explanationMetadata: {
                  reasons: item.scoreResult.reasons.filter(
                    (reason) => reason.component === component,
                  ),
                } as unknown as Prisma.InputJsonValue,
              })),
            },
          },
          include: { scoreComponents: true },
        });
        created.push(row);
      }
      return created.map((row, index) => ({
        id: row.id,
        runId: row.runId,
        userId: row.userId,
        rank: row.rank,
        createdAt: row.createdAt,
        job: ranked[index]!.job,
        category: row.category,
        matchType: row.matchType,
        scoreResult: toScoreResult(row),
      }));
    },

    async findById(userId, recommendationId) {
      const row = await tx.jobRecommendation.findFirst({
        where: { id: recommendationId, userId },
        include: { scoreComponents: true },
      });
      if (!row) return null;
      const [record] = await hydrate([row]);
      return record ?? null;
    },

    async listByRun(userId, runId, pagination) {
      const { ids, total } = await listEligibleRecommendationIds(tx, {
        userId,
        runId,
        pagination,
        orderBy: Prisma.sql`jr."rank" ASC, jr."id" ASC`,
      });
      const rows =
        ids.length > 0
          ? await tx.jobRecommendation.findMany({
              where: { id: { in: ids }, userId, runId },
              include: { scoreComponents: true },
            })
          : [];
      const byId = new Map(rows.map((row) => [row.id, row]));
      const orderedRows = ids
        .map((id) => byId.get(id))
        .filter((row): row is RecommendationRowWithComponents => Boolean(row));
      return {
        items: await hydrate(orderedRows),
        page: pagination.page,
        limit: pagination.limit,
        total,
      };
    },

    async listByUser(userId, pagination) {
      const { ids, total } = await listEligibleRecommendationIds(tx, {
        userId,
        pagination,
        orderBy: Prisma.sql`jr."created_at" DESC, jr."rank" ASC, jr."id" ASC`,
      });
      const rows =
        ids.length > 0
          ? await tx.jobRecommendation.findMany({
              where: { id: { in: ids }, userId },
              include: { scoreComponents: true },
            })
          : [];
      const byId = new Map(rows.map((row) => [row.id, row]));
      const orderedRows = ids
        .map((id) => byId.get(id))
        .filter((row): row is RecommendationRowWithComponents => Boolean(row));
      return {
        items: await hydrate(orderedRows),
        page: pagination.page,
        limit: pagination.limit,
        total,
      };
    },

    async existsByRunAndJob(userId, runId, jobId) {
      const count = await tx.jobRecommendation.count({ where: { userId, runId, jobId } });
      return count > 0;
    },
  };
};

const toFeedbackRecord = (row: RecommendationFeedback): RecommendationFeedbackRecord => ({
  id: row.id,
  recommendationId: row.recommendationId,
  jobId: row.jobId,
  userId: row.userId,
  action: row.action,
  note: row.note,
  createdAt: row.createdAt,
});

const createFeedbackRepository = (tx: Tx): RecommendationFeedbackRepository => ({
  async upsert(input) {
    const owned = await tx.jobRecommendation.findFirst({
      where: { id: input.recommendationId, userId: input.userId },
      select: { id: true, jobId: true },
    });
    if (!owned || owned.jobId !== input.jobId) {
      throw new RecommendationError(
        'Recommendation was not found',
        404,
        RECOMMENDATION_ERROR_CODES.RECOMMENDATION_NOT_FOUND,
      );
    }

    const row = await tx.recommendationFeedback.upsert({
      where: {
        userId_recommendationId: {
          userId: input.userId,
          recommendationId: input.recommendationId,
        },
      },
      create: {
        userId: input.userId,
        recommendationId: input.recommendationId,
        jobId: input.jobId,
        action: input.action,
        note: input.note,
      },
      update: {
        action: input.action,
        note: input.note ?? null,
        jobId: input.jobId,
      },
    });
    return toFeedbackRecord(row);
  },

  async findByRecommendation(userId, recommendationId) {
    const row = await tx.recommendationFeedback.findFirst({
      where: { userId, recommendationId },
    });
    return row ? toFeedbackRecord(row) : null;
  },

  async listByJob(userId, jobId) {
    const rows = await tx.recommendationFeedback.findMany({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toFeedbackRecord);
  },

  async listByAction(userId, action, options) {
    const rows = await tx.recommendationFeedback.findMany({
      where: { userId, action },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    });
    return rows.map(toFeedbackRecord);
  },

  async listExcludedJobIds(userId) {
    const rows = await tx.recommendationFeedback.findMany({
      where: {
        userId,
        action: { in: [...RETRIEVAL_EXCLUSION_FEEDBACK_ACTIONS] },
      },
      select: { jobId: true },
    });
    return [...new Set(rows.map((row) => row.jobId))];
  },
});

export class PrismaRecommendationUnitOfWork implements RecommendationUnitOfWork {
  constructor(private readonly jobs: IJobSearchRepository) {}

  execute<T>(
    operation: (repositories: {
      runs: RecommendationRunRepository;
      recommendations: JobRecommendationRepository;
      feedback: RecommendationFeedbackRepository;
    }) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction((tx) =>
      operation({
        runs: createRunRepository(tx),
        recommendations: createRecommendationRepository(tx, this.jobs),
        feedback: createFeedbackRepository(tx),
      }),
    );
  }
}
