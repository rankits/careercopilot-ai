import {
  type MailDelivery as MailDeliveryRow,
  type MailDeliveryProvider,
  type MailDeliveryStatus,
  type MailDeliveryUserResolution,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/shared/config/db.conf.js';

import type {
  CreateMailDeliveryInput,
  ListMailDeliveriesFilter,
  MailDeliveryPage,
  MailDeliveryRecord,
  MailDeliveryRepository,
  UpdateMailDeliveryInput,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';

const toRecord = (row: MailDeliveryRow): MailDeliveryRecord => ({
  id: row.id,
  userId: row.userId,
  draftId: row.draftId,
  draftVersion: row.draftVersion,
  contentHash: row.contentHash,
  connectedAccountId: row.connectedAccountId,
  provider: row.provider,
  status: row.status,
  idempotencyKey: row.idempotencyKey,
  providerMessageId: row.providerMessageId ?? undefined,
  providerThreadId: row.providerThreadId ?? undefined,
  recipientEmail: row.recipientEmail,
  recipientHash: row.recipientHash ?? undefined,
  fromEmail: row.fromEmail,
  resumeId: row.resumeId,
  subjectSnapshot: row.subjectSnapshot ?? undefined,
  companyNameSnapshot: row.companyNameSnapshot ?? undefined,
  roleTitleSnapshot: row.roleTitleSnapshot ?? undefined,
  normalizedErrorCode: row.normalizedErrorCode ?? undefined,
  userResolution: row.userResolution ?? undefined,
  userResolvedAt: row.userResolvedAt ?? undefined,
  attemptedAt: row.attemptedAt,
  sentAt: row.sentAt ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PrismaMailDeliveryRepository implements MailDeliveryRepository {
  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<MailDeliveryRecord | null> {
    const row = await prisma.mailDelivery.findUnique({
      where: {
        userId_idempotencyKey: { userId, idempotencyKey },
      },
    });
    return row ? toRecord(row) : null;
  }

  async findSuccessfulByDraftHash(input: {
    draftId: string;
    contentHash: string;
    draftVersion: number;
  }): Promise<MailDeliveryRecord | null> {
    const row = await prisma.mailDelivery.findFirst({
      where: {
        draftId: input.draftId,
        contentHash: input.contentHash,
        draftVersion: input.draftVersion,
        status: 'sent',
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toRecord(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<MailDeliveryRecord | null> {
    const row = await prisma.mailDelivery.findFirst({
      where: { id, userId },
    });
    return row ? toRecord(row) : null;
  }

  async listForUser(filter: ListMailDeliveriesFilter): Promise<MailDeliveryPage> {
    const where: Prisma.MailDeliveryWhereInput = {
      userId: filter.userId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.draftId ? { draftId: filter.draftId } : {}),
      ...(filter.connectedAccountId ? { connectedAccountId: filter.connectedAccountId } : {}),
      ...(filter.company
        ? { companyNameSnapshot: { contains: filter.company, mode: 'insensitive' } }
        : {}),
      ...(filter.role ? { roleTitleSnapshot: { contains: filter.role, mode: 'insensitive' } } : {}),
      ...((filter.from || filter.to) && {
        createdAt: {
          ...(filter.from ? { gte: filter.from } : {}),
          ...(filter.to ? { lte: filter.to } : {}),
        },
      }),
    };

    const [total, rows] = await Promise.all([
      prisma.mailDelivery.count({ where }),
      prisma.mailDelivery.findMany({
        where,
        orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
    ]);

    return {
      items: rows.map(toRecord),
      page: filter.page,
      limit: filter.limit,
      total,
    };
  }

  async listForDraft(draftId: string, userId: string): Promise<MailDeliveryRecord[]> {
    const rows = await prisma.mailDelivery.findMany({
      where: { draftId, userId },
      orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toRecord);
  }

  async findRecentByRecipientHash(input: {
    userId: string;
    recipientHash: string;
    since: Date;
  }): Promise<MailDeliveryRecord[]> {
    const rows = await prisma.mailDelivery.findMany({
      where: {
        userId: input.userId,
        recipientHash: input.recipientHash,
        createdAt: { gte: input.since },
        status: { in: ['sent', 'unknown', 'sending', 'failed'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map(toRecord);
  }

  async countAttemptsInWindow(input: { userId: string; since: Date }): Promise<number> {
    return prisma.mailDelivery.count({
      where: {
        userId: input.userId,
        createdAt: { gte: input.since },
        status: { in: ['sending', 'sent', 'failed', 'unknown'] },
      },
    });
  }

  async create(input: CreateMailDeliveryInput): Promise<MailDeliveryRecord> {
    try {
      const row = await prisma.mailDelivery.create({
        data: {
          userId: input.userId,
          draftId: input.draftId,
          draftVersion: input.draftVersion,
          contentHash: input.contentHash,
          connectedAccountId: input.connectedAccountId,
          provider: input.provider as MailDeliveryProvider,
          status: input.status as MailDeliveryStatus,
          idempotencyKey: input.idempotencyKey,
          recipientEmail: input.recipientEmail,
          recipientHash: input.recipientHash,
          fromEmail: input.fromEmail,
          resumeId: input.resumeId,
          subjectSnapshot: input.subjectSnapshot,
          companyNameSnapshot: input.companyNameSnapshot,
          roleTitleSnapshot: input.roleTitleSnapshot,
        },
      });
      return toRecord(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.findByIdempotencyKey(input.userId, input.idempotencyKey);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async update(id: string, input: UpdateMailDeliveryInput): Promise<MailDeliveryRecord> {
    const row = await prisma.mailDelivery.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status as MailDeliveryStatus } : {}),
        ...(input.providerMessageId !== undefined
          ? { providerMessageId: input.providerMessageId }
          : {}),
        ...(input.providerThreadId !== undefined
          ? { providerThreadId: input.providerThreadId }
          : {}),
        ...(input.normalizedErrorCode !== undefined
          ? { normalizedErrorCode: input.normalizedErrorCode }
          : {}),
        ...(input.sentAt !== undefined ? { sentAt: input.sentAt } : {}),
        ...(input.userResolution !== undefined
          ? { userResolution: input.userResolution as MailDeliveryUserResolution }
          : {}),
        ...(input.userResolvedAt !== undefined ? { userResolvedAt: input.userResolvedAt } : {}),
      },
    });
    return toRecord(row);
  }
}

export const prismaMailDeliveryRepository = new PrismaMailDeliveryRepository();
