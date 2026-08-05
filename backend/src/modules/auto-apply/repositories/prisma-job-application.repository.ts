import { AutoApplyChannel, ApprovalMode, JobApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import {
  CreateJobApplicationData,
  FinalizeSubmissionData,
  IJobApplicationRepository,
  STATUS_CONFLICT_MESSAGE,
  UpdatePlanData,
  UpdateJobApplicationStatusData,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import {
  JobApplicationDto,
  JobApplicationStatusValue,
} from '@/modules/auto-apply/types/job-application.types.js';

type JobApplicationRecord = {
  id: string;
  userId: string;
  jobId: string | null;
  normalisedJobUrl: string | null;
  canonicalJobId: string | null;
  companySlug: string | null;
  jobTitle: string | null;
  channel: AutoApplyChannel;
  status: JobApplicationStatus;
  approvalMode: ApprovalMode;
  matchScore: number | null;
  eligibilityResult: Prisma.JsonValue | null;
  resumeVersionId: string | null;
  coverLetterContent: string | null;
  consentId: string | null;
  approvedAt: Date | null;
  queuedAt: Date | null;
  submittedAt: Date | null;
  externalApplicationId: string | null;
  externalConfirmationUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  planInputsHash: string | null;
  planVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(record: JobApplicationRecord): JobApplicationDto {
  return {
    ...record,
    eligibilityResult: record.eligibilityResult as JobApplicationDto['eligibilityResult'],
  };
}

export class PrismaJobApplicationRepository implements IJobApplicationRepository {
  async findManyByUserId(userId: string): Promise<JobApplicationDto[]> {
    const records = await prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(toDto);
  }

  async findById(userId: string, id: string): Promise<JobApplicationDto | null> {
    const record = await prisma.jobApplication.findFirst({ where: { id, userId } });
    return record ? toDto(record) : null;
  }

  async findByUserIdAndJobId(userId: string, jobId: string): Promise<JobApplicationDto | null> {
    const record = await prisma.jobApplication.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    return record ? toDto(record) : null;
  }

  async findByUserIdAndCanonicalJobId(
    userId: string,
    canonicalJobId: string,
  ): Promise<JobApplicationDto | null> {
    const record = await prisma.jobApplication.findFirst({
      where: { userId, canonicalJobId, status: { not: 'WITHDRAWN' } },
      orderBy: { createdAt: 'desc' },
    });
    return record ? toDto(record) : null;
  }

  async create(data: CreateJobApplicationData): Promise<JobApplicationDto> {
    try {
      const record = await prisma.jobApplication.create({
        data: {
          userId: data.userId,
          jobId: data.jobId,
          canonicalJobId: data.canonicalJobId,
          companySlug: data.companySlug,
          jobTitle: data.jobTitle,
        },
      });
      return toDto(record);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const existing = await prisma.jobApplication.findUnique({
          where: { userId_jobId: { userId: data.userId, jobId: data.jobId } },
        });
        throw new AppError(
          'An auto-apply submission already exists for this job.',
          409,
          'APPLICATION_EXISTS',
          existing ? { existingApplicationId: existing.id } : undefined,
        );
      }
      throw error;
    }
  }

  async updateStatus(
    userId: string,
    id: string,
    data: UpdateJobApplicationStatusData,
    expectedStatus: JobApplicationStatusValue,
  ): Promise<JobApplicationDto> {
    const updated = await prisma.jobApplication.updateMany({
      where: { id, userId, status: expectedStatus as JobApplicationStatus },
      data: {
        status: data.status as JobApplicationStatus,
        ...(data.eligibilityResult !== undefined && {
          eligibilityResult: data.eligibilityResult as unknown as Prisma.InputJsonValue,
        }),
      },
    });

    if (updated.count === 0) {
      const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
      }
      logger.warn(
        {
          jobApplicationId: id,
          expectedStatus,
          actualStatus: existing.status,
          attemptedStatus: data.status,
        },
        'Job application status update lost optimistic lock',
      );
      throw new AppError(STATUS_CONFLICT_MESSAGE, 409, 'INVALID_STATUS_TRANSITION');
    }

    const record = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!record) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return toDto(record);
  }

  async updatePlan(userId: string, id: string, data: UpdatePlanData): Promise<JobApplicationDto> {
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const hashChanged = existing.planInputsHash !== data.planInputsHash;
    const record = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: {
        channel: data.channel as AutoApplyChannel,
        resumeVersionId: data.resumeVersionId,
        planInputsHash: data.planInputsHash,
        ...(data.coverLetterContent !== undefined && {
          coverLetterContent: data.coverLetterContent,
        }),
        ...(hashChanged && { planVersion: { increment: 1 } }),
      },
    });
    return toDto(record);
  }

  async claimForSubmission(userId: string, id: string): Promise<JobApplicationDto | null> {
    const claimed = await prisma.jobApplication.updateMany({
      where: { id, userId, status: 'QUEUED' },
      data: { status: 'SUBMITTING' },
    });
    if (claimed.count === 0) return null;
    const record = await prisma.jobApplication.findFirst({ where: { id, userId } });
    return record ? toDto(record) : null;
  }

  async finalizeSubmission(
    userId: string,
    id: string,
    data: FinalizeSubmissionData,
    expectedStatus: JobApplicationStatusValue,
  ): Promise<JobApplicationDto> {
    const updated = await prisma.jobApplication.updateMany({
      where: { id, userId, status: expectedStatus as JobApplicationStatus },
      data: {
        status: data.status as JobApplicationStatus,
        ...(data.externalApplicationId !== undefined && {
          externalApplicationId: data.externalApplicationId,
        }),
        ...(data.externalConfirmationUrl !== undefined && {
          externalConfirmationUrl: data.externalConfirmationUrl,
        }),
        ...(data.failureCode !== undefined && { failureCode: data.failureCode }),
        ...(data.failureMessage !== undefined && { failureMessage: data.failureMessage }),
        ...(data.markSubmittedNow && { submittedAt: new Date() }),
      },
    });

    if (updated.count === 0) {
      const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
      }
      logger.warn(
        {
          jobApplicationId: id,
          expectedStatus,
          actualStatus: existing.status,
          attemptedStatus: data.status,
        },
        'Job application finalize lost optimistic lock',
      );
      throw new AppError(STATUS_CONFLICT_MESSAGE, 409, 'INVALID_STATUS_TRANSITION');
    }

    const record = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!record) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    return toDto(record);
  }

  async countConsumedSince(userId: string, since: Date): Promise<number> {
    return prisma.jobApplication.count({
      where: {
        userId,
        status: {
          in: ['QUEUED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMATION_RECEIVED', 'ACTION_REQUIRED'],
        },
        OR: [{ queuedAt: { gte: since } }, { queuedAt: null, createdAt: { gte: since } }],
      },
    });
  }

  async updateMatchScore(
    userId: string,
    id: string,
    matchScore: number,
  ): Promise<JobApplicationDto> {
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const record = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: { matchScore },
    });
    return toDto(record);
  }

  async queueAtomically(
    userId: string,
    id: string,
    limits: { dailyLimit: number; weeklyLimit: number | null },
  ): Promise<JobApplicationDto> {
    return prisma.$transaction(async (tx) => {
      await tx.applicationRule.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      await tx.$queryRaw`SELECT id FROM application_rules WHERE user_id = ${userId} FOR UPDATE`;

      const now = new Date();
      const startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

      const existing = await tx.jobApplication.findFirst({ where: { id, userId } });
      if (!existing) {
        throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
      }
      if (existing.status !== 'APPROVED' && existing.status !== 'SUBMISSION_FAILED') {
        throw new AppError(
          `Cannot queue submission from status ${existing.status}`,
          409,
          'INVALID_STATUS_TRANSITION',
        );
      }

      const dailyUsed = await tx.jobApplication.count({
        where: {
          userId,
          id: { not: id },
          status: {
            in: ['QUEUED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMATION_RECEIVED', 'ACTION_REQUIRED'],
          },
          OR: [
            { queuedAt: { gte: startOfDay } },
            { queuedAt: null, createdAt: { gte: startOfDay } },
          ],
        },
      });
      if (dailyUsed >= limits.dailyLimit) {
        throw new AppError(
          `Daily application limit of ${limits.dailyLimit} has been reached.`,
          409,
          'READINESS_LIMIT_REACHED',
          { code: 'DAILY_LIMIT_REACHED', used: dailyUsed, limit: limits.dailyLimit },
        );
      }

      if (limits.weeklyLimit != null) {
        const weeklyUsed = await tx.jobApplication.count({
          where: {
            userId,
            id: { not: id },
            status: {
              in: ['QUEUED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMATION_RECEIVED', 'ACTION_REQUIRED'],
            },
            OR: [
              { queuedAt: { gte: startOfWeek } },
              { queuedAt: null, createdAt: { gte: startOfWeek } },
            ],
          },
        });
        if (weeklyUsed >= limits.weeklyLimit) {
          throw new AppError(
            `Weekly application limit of ${limits.weeklyLimit} has been reached.`,
            409,
            'READINESS_LIMIT_REACHED',
            { code: 'WEEKLY_LIMIT_REACHED', used: weeklyUsed, limit: limits.weeklyLimit },
          );
        }
      }

      const record = await tx.jobApplication.update({
        where: { id: existing.id },
        data: { status: 'QUEUED', queuedAt: now, failureCode: null, failureMessage: null },
      });
      return toDto(record);
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    if (existing.status === 'QUEUED' || existing.status === 'SUBMITTING') {
      throw new AppError(
        'Cannot delete a submission that is currently being processed. Withdraw it first if needed.',
        409,
        'SUBMISSION_IN_PROGRESS',
      );
    }
    await prisma.jobApplication.delete({ where: { id: existing.id } });
    return true;
  }

  async reopenFromWithdrawn(userId: string, id: string): Promise<JobApplicationDto> {
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    if (existing.status !== 'WITHDRAWN') {
      throw new AppError(
        'Only withdrawn submissions can be reopened for another apply attempt.',
        409,
        'INVALID_STATUS_TRANSITION',
      );
    }
    const record = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: {
        status: 'DISCOVERED',
        approvalMode: 'PER_APPLICATION',
        approvedAt: null,
        queuedAt: null,
        submittedAt: null,
        externalApplicationId: null,
        externalConfirmationUrl: null,
        failureCode: null,
        failureMessage: null,
        consentId: null,
        planInputsHash: null,
        coverLetterContent: null,
        matchScore: null,
        eligibilityResult: Prisma.DbNull,
        resumeVersionId: null,
        channel: 'UNSUPPORTED',
        planVersion: { increment: 1 },
      },
    });
    return toDto(record);
  }
}
