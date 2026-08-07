import type { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/shared/config/db.conf.js';
import type {
  ProfileJobMatchRecord,
  ProfileJobMatchResult,
} from '@/modules/auto-apply/types/profile-job-match.types.js';

export interface IProfileJobMatchRepository {
  findByJobApplicationId(
    userId: string,
    jobApplicationId: string,
  ): Promise<ProfileJobMatchRecord | null>;
  upsert(input: {
    userId: string;
    jobApplicationId: string;
    jobId: string;
    analysisId: string | null;
    contentHash: string;
    result: ProfileJobMatchResult;
  }): Promise<ProfileJobMatchRecord>;
}

function toRecord(row: {
  id: string;
  userId: string;
  jobApplicationId: string;
  jobId: string;
  analysisId: string | null;
  contentHash: string;
  result: unknown;
  matchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ProfileJobMatchRecord {
  return {
    id: row.id,
    userId: row.userId,
    jobApplicationId: row.jobApplicationId,
    jobId: row.jobId,
    analysisId: row.analysisId,
    contentHash: row.contentHash,
    result: row.result as ProfileJobMatchResult,
    matchedAt: row.matchedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type ProfileMatchDelegate = NonNullable<PrismaClient['jobApplicationProfileMatch']>;

function profileMatchDelegate(): ProfileMatchDelegate | null {
  const delegate = (prisma as PrismaClient).jobApplicationProfileMatch;
  return delegate ?? null;
}

export class PrismaProfileJobMatchRepository implements IProfileJobMatchRepository {
  async findByJobApplicationId(
    userId: string,
    jobApplicationId: string,
  ): Promise<ProfileJobMatchRecord | null> {
    const delegate = profileMatchDelegate();
    if (!delegate) {
      // Stale Prisma client (e.g. Docker volume built before model existed).
      return null;
    }
    const row = await delegate.findFirst({
      where: { userId, jobApplicationId },
    });
    return row ? toRecord(row) : null;
  }

  async upsert(input: {
    userId: string;
    jobApplicationId: string;
    jobId: string;
    analysisId: string | null;
    contentHash: string;
    result: ProfileJobMatchResult;
  }): Promise<ProfileJobMatchRecord> {
    const delegate = profileMatchDelegate();
    if (!delegate) {
      throw new Error(
        'Prisma client is missing jobApplicationProfileMatch. Run `npx prisma generate` and restart the backend.',
      );
    }
    const matchedAt = new Date(input.result.matchedAt);
    const resultJson = input.result as unknown as Prisma.InputJsonValue;
    const row = await delegate.upsert({
      where: { jobApplicationId: input.jobApplicationId },
      create: {
        id: randomUUID(),
        userId: input.userId,
        jobApplicationId: input.jobApplicationId,
        jobId: input.jobId,
        analysisId: input.analysisId,
        contentHash: input.contentHash,
        result: resultJson,
        matchedAt,
      },
      update: {
        jobId: input.jobId,
        analysisId: input.analysisId,
        contentHash: input.contentHash,
        result: resultJson,
        matchedAt,
      },
    });
    return toRecord(row);
  }
}
