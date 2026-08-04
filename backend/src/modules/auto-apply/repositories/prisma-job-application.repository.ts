import { AutoApplyChannel, ApprovalMode, JobApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  CreateJobApplicationData,
  FinalizeSubmissionData,
  IJobApplicationRepository,
  UpdatePlanData,
  UpdateJobApplicationStatusData,
} from '@/modules/auto-apply/contracts/job-application.contract.js';
import { JobApplicationDto } from '@/modules/auto-apply/types/job-application.types.js';

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
  ): Promise<JobApplicationDto> {
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const record = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: {
        status: data.status as JobApplicationStatus,
        ...(data.eligibilityResult !== undefined && {
          eligibilityResult: data.eligibilityResult as unknown as Prisma.InputJsonValue,
        }),
      },
    });
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
  ): Promise<JobApplicationDto> {
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    const record = await prisma.jobApplication.update({
      where: { id: existing.id },
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
    return toDto(record);
  }
}
