import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import type { IApplicationPageAnalysisRepository } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import type {
  ApplicationPageAnalysisDto,
  AnalysisFreshness,
  ExtractedApplicationField,
  ExtractedRequirement,
  ApplicationPageSnapshotSummary,
  ApplicationProvider,
  FormInspectionStatus,
  JobPageStatus,
  SubmissionCapability,
  AnalysisOutcomeStatus,
} from '@/modules/auto-apply/types/application-page-analysis.types.js';

export type CreateApplicationPageAnalysisInput = Omit<
  ApplicationPageAnalysisDto,
  'createdAt' | 'updatedAt'
> & { sanitizedText?: string | null };

type AnalysisRow = {
  id: string;
  jobId: string;
  jobApplicationId: string | null;
  schemaVersion: number;
  extractorVersion: string;
  extractionPolicyVersion: string;
  provider: string;
  jobPageUrl: string;
  applicationUrl: string | null;
  jobPageStatus: string;
  formStatus: string;
  submissionCapability: string;
  outcomeStatus: string;
  requirements: unknown;
  fields: unknown;
  snapshot: unknown;
  freshness: unknown;
  contentHash: string;
  idempotencyKey: string;
  analyzedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(row: AnalysisRow): ApplicationPageAnalysisDto {
  return {
    id: row.id,
    jobId: row.jobId,
    jobApplicationId: row.jobApplicationId,
    schemaVersion: row.schemaVersion,
    extractorVersion: row.extractorVersion,
    extractionPolicyVersion: row.extractionPolicyVersion,
    provider: row.provider as ApplicationProvider,
    jobPageUrl: row.jobPageUrl,
    applicationUrl: row.applicationUrl,
    jobPageStatus: row.jobPageStatus as JobPageStatus,
    formStatus: row.formStatus as FormInspectionStatus,
    submissionCapability: row.submissionCapability as SubmissionCapability,
    outcomeStatus: row.outcomeStatus as AnalysisOutcomeStatus,
    requirements: (row.requirements as ExtractedRequirement[]) ?? [],
    fields: (row.fields as ExtractedApplicationField[]) ?? [],
    snapshot: row.snapshot as ApplicationPageSnapshotSummary,
    freshness: row.freshness as AnalysisFreshness,
    idempotencyKey: row.idempotencyKey,
    analyzedAt: row.analyzedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildAnalysisIdempotencyKey(input: {
  jobId: string;
  normalizedUrl: string;
  contentHash: string;
  extractorVersion: string;
}): string {
  return createHash('sha256')
    .update([input.jobId, input.normalizedUrl, input.contentHash, input.extractorVersion].join('|'))
    .digest('hex');
}

export class PrismaApplicationPageAnalysisRepository implements IApplicationPageAnalysisRepository {
  async findLatestByJobId(jobId: string): Promise<ApplicationPageAnalysisDto | null> {
    const row = await prisma.applicationPageAnalysis.findFirst({
      where: { jobId },
      orderBy: { analyzedAt: 'desc' },
    });
    return row ? toDto(row) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<ApplicationPageAnalysisDto | null> {
    const row = await prisma.applicationPageAnalysis.findUnique({ where: { idempotencyKey } });
    return row ? toDto(row) : null;
  }

  async create(data: CreateApplicationPageAnalysisInput): Promise<ApplicationPageAnalysisDto> {
    const row = await prisma.applicationPageAnalysis.create({
      data: {
        id: data.id || randomUUID(),
        jobId: data.jobId,
        jobApplicationId: data.jobApplicationId ?? null,
        schemaVersion: data.schemaVersion,
        extractorVersion: data.extractorVersion,
        extractionPolicyVersion: data.extractionPolicyVersion,
        provider: data.provider,
        jobPageUrl: data.jobPageUrl,
        applicationUrl: data.applicationUrl ?? null,
        jobPageStatus: data.jobPageStatus,
        formStatus: data.formStatus,
        submissionCapability: data.submissionCapability,
        outcomeStatus: data.outcomeStatus,
        requirements: data.requirements as unknown as Prisma.InputJsonValue,
        fields: data.fields as unknown as Prisma.InputJsonValue,
        snapshot: data.snapshot as unknown as Prisma.InputJsonValue,
        freshness: data.freshness as unknown as Prisma.InputJsonValue,
        sanitizedText: data.sanitizedText ?? null,
        contentHash: data.snapshot.contentHash,
        idempotencyKey: data.idempotencyKey,
        analyzedAt: new Date(data.analyzedAt),
        expiresAt: new Date(data.expiresAt),
      },
    });
    return toDto(row);
  }
}
