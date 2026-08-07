import { Prisma, SubmissionAttemptOutcome } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import {
  CreateSubmissionAttemptData,
  ISubmissionAttemptRepository,
} from '@/modules/auto-apply/contracts/submission-attempt.contract.js';
import {
  ApplicationSubmissionAttemptDto,
  SubmissionAttemptOutcomeValue,
} from '@/modules/auto-apply/types/submission-attempt.types.js';

function toDto(record: {
  id: string;
  jobApplicationId: string;
  attemptNumber: number;
  outcome: SubmissionAttemptOutcome | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}): ApplicationSubmissionAttemptDto {
  return { ...record, outcome: record.outcome as SubmissionAttemptOutcomeValue | null };
}

export class PrismaSubmissionAttemptRepository implements ISubmissionAttemptRepository {
  async countByJobApplicationId(jobApplicationId: string): Promise<number> {
    return prisma.applicationSubmissionAttempt.count({ where: { jobApplicationId } });
  }

  async create(data: CreateSubmissionAttemptData): Promise<ApplicationSubmissionAttemptDto> {
    const record = await prisma.applicationSubmissionAttempt.create({
      data: {
        jobApplicationId: data.jobApplicationId,
        attemptNumber: data.attemptNumber,
        outcome: data.outcome as SubmissionAttemptOutcome,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        rawResponseSanitized: (data.rawResponseSanitized ?? {}) as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    return toDto(record);
  }

  async findLatest(jobApplicationId: string): Promise<ApplicationSubmissionAttemptDto | null> {
    const record = await prisma.applicationSubmissionAttempt.findFirst({
      where: { jobApplicationId },
      orderBy: { attemptNumber: 'desc' },
    });
    return record ? toDto(record) : null;
  }
}
