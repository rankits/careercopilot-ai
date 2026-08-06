import { AutoApplyChannel, ApprovalMode, JobApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import {
  IAdminDiagnosticsRepository,
  StuckSubmissionsQuery,
} from '@/modules/auto-apply/contracts/admin-diagnostics.contract.js';
import {
  StuckSubmissionDto,
  StuckSubmittingCandidate,
} from '@/modules/auto-apply/types/admin-diagnostics.types.js';

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
  progressStep: string | null;
  reopenedAt: Date | null;
  handoffOpenedAt: Date | null;
  appliedNotes: string | null;
  abandonReason: string | null;
  abandonNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toStuckDto(
  record: JobApplicationRecord,
  stuckReason: StuckSubmissionDto['stuckReason'],
): StuckSubmissionDto {
  return {
    ...record,
    eligibilityResult: record.eligibilityResult as StuckSubmissionDto['eligibilityResult'],
    stuckReason,
    stuckSinceMinutes: Math.round((Date.now() - record.updatedAt.getTime()) / 60_000),
  };
}

function toCandidate(record: {
  id: string;
  userId: string;
  updatedAt: Date;
}): StuckSubmittingCandidate {
  return { id: record.id, userId: record.userId, updatedAt: record.updatedAt };
}

export class PrismaAdminDiagnosticsRepository implements IAdminDiagnosticsRepository {
  async findStuckSubmissions(query: StuckSubmissionsQuery): Promise<StuckSubmissionDto[]> {
    const now = Date.now();
    const queueStalledCutoff = new Date(now - query.queueStalledAfterMinutes * 60_000);
    const awaitingConfirmationCutoff = new Date(
      now - query.awaitingConfirmationAfterDays * 24 * 60 * 60_000,
    );

    const [stalledQueue, awaitingConfirmation] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { status: { in: ['QUEUED', 'SUBMITTING'] }, updatedAt: { lt: queueStalledCutoff } },
        orderBy: { updatedAt: 'asc' },
      }),
      prisma.jobApplication.findMany({
        where: { status: 'ACTION_REQUIRED', updatedAt: { lt: awaitingConfirmationCutoff } },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    return [
      ...stalledQueue.map((record) => toStuckDto(record, 'QUEUE_STALLED')),
      ...awaitingConfirmation.map((record) => toStuckDto(record, 'AWAITING_USER_CONFIRMATION')),
    ];
  }

  async findSubmittingOlderThan(cutoff: Date): Promise<StuckSubmittingCandidate[]> {
    const rows = await prisma.jobApplication.findMany({
      where: { status: 'SUBMITTING', updatedAt: { lt: cutoff } },
      select: { id: true, userId: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map(toCandidate);
  }

  async reclaimSubmittingIfStuck(
    id: string,
    cutoff: Date,
    failureCode: string,
    failureMessage: string,
  ): Promise<StuckSubmittingCandidate | null> {
    const claimed = await prisma.jobApplication.updateMany({
      where: { id, status: 'SUBMITTING', updatedAt: { lt: cutoff } },
      data: {
        status: 'SUBMISSION_FAILED',
        failureCode,
        failureMessage,
      },
    });
    if (claimed.count === 0) return null;

    const record = await prisma.jobApplication.findUnique({
      where: { id },
      select: { id: true, userId: true, updatedAt: true },
    });
    return record ? toCandidate(record) : null;
  }
}
