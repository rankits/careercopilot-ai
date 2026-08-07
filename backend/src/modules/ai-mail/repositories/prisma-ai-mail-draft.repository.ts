import {
  type AiMailDraft as AiMailDraftRecord,
  type AiMailDraftRevision as AiMailDraftRevisionRecord,
  type AiMailGenerationAttempt as AiMailGenerationAttemptRecord,
  Prisma,
} from '@prisma/client';

import type {
  AiMailDraftPage,
  AiMailDraftRepository,
  CreateAiMailDraftInput,
  CreateAiMailDraftRevisionInput,
  CreateAiMailGenerationAttemptInput,
  UpdateAiMailDraftInput,
  UpdateAiMailGenerationAttemptInput,
} from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type {
  AiMailDraft,
  AiMailDraftRevision,
  AiMailGenerationAttempt,
  MailGenerationConstraints,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { prisma } from '@/shared/config/db.conf.js';

const toDraft = (record: AiMailDraftRecord): AiMailDraft => ({
  id: record.id,
  userId: record.userId,
  recruiterEmail: record.recruiterEmail,
  recruiterName: record.recruiterName ?? undefined,
  companyName: record.companyName ?? undefined,
  roleTitle: record.roleTitle ?? undefined,
  jobUrl: record.jobUrl ?? undefined,
  jobDescription: record.jobDescription,
  additionalContext: record.additionalContext ?? undefined,
  resumeId: record.resumeId,
  profileSnapshotId: record.profileSnapshotId ?? undefined,
  constraints: record.constraints as unknown as MailGenerationConstraints,
  subject: record.subject ?? undefined,
  bodyText: record.bodyText ?? undefined,
  bodyHtml: record.bodyHtml ?? undefined,
  status: record.status,
  version: record.version,
  generatedBy:
    record.provider && record.providerModel && record.generatedAt
      ? {
          provider: record.provider,
          model: record.providerModel,
          requestId: record.providerRequestId ?? undefined,
          generatedAt: record.generatedAt.toISOString(),
        }
      : undefined,
  userEdited: record.userEdited,
  contentHash: record.contentHash ?? undefined,
  lastContextHash: record.lastContextHash ?? undefined,
  followUpToDeliveryId: record.followUpToDeliveryId ?? undefined,
  archivedAt: record.archivedAt?.toISOString(),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const toAttempt = (record: AiMailGenerationAttemptRecord): AiMailGenerationAttempt => ({
  id: record.id,
  draftId: record.draftId,
  userId: record.userId,
  operation: record.operation,
  status: record.status,
  providerName: record.providerName,
  providerModel: record.providerModel ?? undefined,
  providerRequestId: record.providerRequestId ?? undefined,
  durationMs: record.durationMs ?? undefined,
  inputTokenCount: record.inputTokenCount ?? undefined,
  outputTokenCount: record.outputTokenCount ?? undefined,
  normalizedErrorCode: record.normalizedErrorCode ?? undefined,
  retryCount: record.retryCount,
  contextHash: record.contextHash ?? undefined,
  promptVersion: record.promptVersion ?? undefined,
  outputSchemaVersion: record.outputSchemaVersion ?? undefined,
  idempotencyKey: record.idempotencyKey ?? undefined,
  createdAt: record.createdAt.toISOString(),
});

const toRevision = (record: AiMailDraftRevisionRecord): AiMailDraftRevision => ({
  id: record.id,
  draftId: record.draftId,
  draftVersion: record.draftVersion,
  revisionNumber: record.revisionNumber,
  source: record.source,
  operation: (record.operation ?? undefined) as AiMailDraftRevision['operation'],
  subject: record.subject ?? undefined,
  bodyText: record.bodyText ?? undefined,
  contextHash: record.contextHash ?? undefined,
  promptVersion: record.promptVersion ?? undefined,
  providerName: record.providerName ?? undefined,
  providerModel: record.providerModel ?? undefined,
  createdAt: record.createdAt.toISOString(),
});

const json = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const createData = (input: CreateAiMailDraftInput): Prisma.AiMailDraftUncheckedCreateInput => ({
  userId: input.userId,
  recruiterEmail: input.recruiterEmail,
  recruiterName: input.recruiterName,
  companyName: input.companyName,
  roleTitle: input.roleTitle,
  jobUrl: input.jobUrl,
  jobDescription: input.jobDescription,
  additionalContext: input.additionalContext,
  resumeId: input.resumeId,
  profileSnapshotId: input.profileSnapshotId,
  constraints: json(input.constraints),
  subject: input.subject,
  bodyText: input.bodyText,
  bodyHtml: input.bodyHtml,
  status: input.status,
  provider: input.generatedBy?.provider,
  providerModel: input.generatedBy?.model,
  providerRequestId: input.generatedBy?.requestId,
  generatedAt: input.generatedBy ? new Date(input.generatedBy.generatedAt) : undefined,
  userEdited: input.userEdited,
  contentHash: input.contentHash,
  lastContextHash: input.lastContextHash,
  followUpToDeliveryId: input.followUpToDeliveryId,
  archivedAt: input.archivedAt ? new Date(input.archivedAt) : undefined,
});

const updateData = (input: UpdateAiMailDraftInput): Prisma.AiMailDraftUncheckedUpdateManyInput => {
  const changes = input.changes;
  return {
    recruiterEmail: changes.recruiterEmail,
    recruiterName: changes.recruiterName,
    companyName: changes.companyName,
    roleTitle: changes.roleTitle,
    jobUrl: changes.jobUrl,
    jobDescription: changes.jobDescription,
    additionalContext: changes.additionalContext,
    resumeId: changes.resumeId,
    constraints: changes.constraints === undefined ? undefined : json(changes.constraints),
    subject: changes.subject,
    bodyText: changes.bodyText,
    bodyHtml: changes.bodyHtml,
    status: changes.status,
    provider: changes.generatedBy === null ? null : changes.generatedBy?.provider,
    providerModel: changes.generatedBy === null ? null : changes.generatedBy?.model,
    providerRequestId: changes.generatedBy === null ? null : changes.generatedBy?.requestId,
    generatedAt:
      changes.generatedBy === null
        ? null
        : changes.generatedBy
          ? new Date(changes.generatedBy.generatedAt)
          : undefined,
    userEdited: changes.userEdited,
    contentHash: changes.contentHash,
    lastContextHash: changes.lastContextHash,
    followUpToDeliveryId: changes.followUpToDeliveryId,
    version: { increment: 1 },
  };
};

export class PrismaAiMailDraftRepository implements AiMailDraftRepository {
  async create(input: CreateAiMailDraftInput): Promise<AiMailDraft> {
    return toDraft(await prisma.aiMailDraft.create({ data: createData(input) }));
  }

  async findByIdForUser(draftId: string, userId: string): Promise<AiMailDraft | null> {
    const record = await prisma.aiMailDraft.findFirst({ where: { id: draftId, userId } });
    return record ? toDraft(record) : null;
  }

  async listForUser(
    userId: string,
    input: Parameters<AiMailDraftRepository['listForUser']>[1],
  ): Promise<AiMailDraftPage> {
    const where: Prisma.AiMailDraftWhereInput = {
      userId,
      ...(input.status ? { status: input.status } : { archivedAt: null }),
      ...(input.search
        ? {
            OR: [
              { recruiterEmail: { contains: input.search, mode: 'insensitive' } },
              { recruiterName: { contains: input.search, mode: 'insensitive' } },
              { companyName: { contains: input.search, mode: 'insensitive' } },
              { roleTitle: { contains: input.search, mode: 'insensitive' } },
              { subject: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, records] = await Promise.all([
      prisma.aiMailDraft.count({ where }),
      prisma.aiMailDraft.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
    ]);
    return { items: records.map(toDraft), page: input.page, limit: input.limit, total };
  }

  async updateForUser(
    draftId: string,
    userId: string,
    input: UpdateAiMailDraftInput,
  ): Promise<AiMailDraft | null> {
    const [record] = await prisma.aiMailDraft.updateManyAndReturn({
      where: { id: draftId, userId, version: input.expectedVersion },
      data: updateData(input),
    });
    return record ? toDraft(record) : null;
  }

  async archiveForUser(
    draftId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<AiMailDraft | null> {
    const [record] = await prisma.aiMailDraft.updateManyAndReturn({
      where: { id: draftId, userId, version: expectedVersion, status: { not: 'generating' } },
      data: {
        status: 'archived',
        archivedAt: new Date(),
        contentHash: null,
        version: { increment: 1 },
      },
    });
    return record ? toDraft(record) : null;
  }

  async resumeBelongsToUser(resumeId: string, userId: string): Promise<boolean> {
    return (await prisma.resume.count({ where: { id: resumeId, userId } })) > 0;
  }

  async createAttempt(input: CreateAiMailGenerationAttemptInput): Promise<AiMailGenerationAttempt> {
    const record = await prisma.aiMailGenerationAttempt.create({
      data: {
        draftId: input.draftId,
        userId: input.userId,
        operation: input.operation,
        status: input.status,
        providerName: input.providerName,
        providerModel: input.providerModel,
        providerRequestId: input.providerRequestId,
        durationMs: input.durationMs,
        inputTokenCount: input.inputTokenCount,
        outputTokenCount: input.outputTokenCount,
        normalizedErrorCode: input.normalizedErrorCode,
        retryCount: input.retryCount ?? 0,
        contextHash: input.contextHash,
        promptVersion: input.promptVersion,
        outputSchemaVersion: input.outputSchemaVersion,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return toAttempt(record);
  }

  async updateAttempt(
    attemptId: string,
    input: UpdateAiMailGenerationAttemptInput,
  ): Promise<AiMailGenerationAttempt> {
    const record = await prisma.aiMailGenerationAttempt.update({
      where: { id: attemptId },
      data: {
        status: input.status,
        providerModel: input.providerModel,
        providerRequestId: input.providerRequestId,
        durationMs: input.durationMs,
        inputTokenCount: input.inputTokenCount,
        outputTokenCount: input.outputTokenCount,
        normalizedErrorCode: input.normalizedErrorCode,
      },
    });
    return toAttempt(record);
  }

  async listAttemptsForDraft(draftId: string): Promise<AiMailGenerationAttempt[]> {
    const records = await prisma.aiMailGenerationAttempt.findMany({
      where: { draftId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return records.map(toAttempt);
  }

  async countAttemptsForUserSince(userId: string, since: Date): Promise<number> {
    return prisma.aiMailGenerationAttempt.count({
      where: { userId, createdAt: { gte: since } },
    });
  }

  async countRegenerationsForDraft(draftId: string): Promise<number> {
    return prisma.aiMailGenerationAttempt.count({
      where: {
        draftId,
        operation: {
          in: [
            'regenerate_full',
            'generate_subject',
            'rewrite_tone',
            'shorten',
            'expand',
            'fix_grammar',
            'rewrite_selection',
          ],
        },
      },
    });
  }

  async findAttemptByIdempotency(input: {
    userId: string;
    draftId: string;
    operation: string;
    idempotencyKey: string;
  }): Promise<AiMailGenerationAttempt | null> {
    const record = await prisma.aiMailGenerationAttempt.findFirst({
      where: {
        userId: input.userId,
        draftId: input.draftId,
        operation: input.operation,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return record ? toAttempt(record) : null;
  }

  async createRevision(input: CreateAiMailDraftRevisionInput): Promise<AiMailDraftRevision> {
    const latest = await prisma.aiMailDraftRevision.findFirst({
      where: { draftId: input.draftId },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
    const record = await prisma.aiMailDraftRevision.create({
      data: {
        draftId: input.draftId,
        draftVersion: input.draftVersion,
        revisionNumber,
        source: input.source,
        operation: input.operation,
        subject: input.subject,
        bodyText: input.bodyText,
        contextHash: input.contextHash,
        promptVersion: input.promptVersion,
        providerName: input.providerName,
        providerModel: input.providerModel,
      },
    });
    return toRevision(record);
  }

  async listRevisionsForDraft(draftId: string, userId: string): Promise<AiMailDraftRevision[]> {
    const draft = await prisma.aiMailDraft.findFirst({ where: { id: draftId, userId } });
    if (!draft) return [];
    const records = await prisma.aiMailDraftRevision.findMany({
      where: { draftId },
      orderBy: [{ revisionNumber: 'desc' }],
    });
    return records.map(toRevision);
  }

  async findRevisionForUser(
    revisionId: string,
    draftId: string,
    userId: string,
  ): Promise<AiMailDraftRevision | null> {
    const record = await prisma.aiMailDraftRevision.findFirst({
      where: {
        id: revisionId,
        draftId,
        draft: { userId },
      },
    });
    return record ? toRevision(record) : null;
  }

  async countRevisionsForDraft(draftId: string): Promise<number> {
    return prisma.aiMailDraftRevision.count({ where: { draftId } });
  }
}

export const prismaAiMailDraftRepository = new PrismaAiMailDraftRepository();
