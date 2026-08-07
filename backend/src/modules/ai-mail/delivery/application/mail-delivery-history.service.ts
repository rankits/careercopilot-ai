import { prisma } from '@/shared/config/db.conf.js';
import { ConnectedAccountStatus } from '@prisma/client';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { logger } from '@/shared/logger/logger.js';
import type { AiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';

import type {
  MailDeliveryRecord,
  MailDeliveryRepository,
  MailDeliveryStatus,
  MailDeliveryUserResolution,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { assertMailSendingEnabled } from '@/modules/ai-mail/delivery/policy/send-policy.js';

export interface MailDeliveryListItemDto {
  deliveryId: string;
  draftId: string;
  draftVersion: number;
  status: MailDeliveryStatus;
  userResolution?: MailDeliveryUserResolution;
  userResolvedAt?: string;
  provider: string;
  recipientEmail: string;
  fromEmail: string;
  subject?: string;
  companyName?: string;
  roleTitle?: string;
  resumeId: string;
  connectedAccountId: number;
  connectedAccountEmail?: string;
  connectedAccountDisconnected: boolean;
  providerMessageId?: string;
  providerThreadId?: string;
  normalizedErrorCode?: string;
  attemptedAt: string;
  sentAt?: string;
  createdAt: string;
}

export interface MailDeliveryPageDto {
  items: MailDeliveryListItemDto[];
  page: number;
  limit: number;
  total: number;
}

export interface SendLimitsDto {
  hourly: { used: number; limit: number };
  daily: { used: number; limit: number };
}

const toDto = (
  row: MailDeliveryRecord,
  account?: { emailAddress: string; status: ConnectedAccountStatus } | null,
): MailDeliveryListItemDto => ({
  deliveryId: row.id,
  draftId: row.draftId,
  draftVersion: row.draftVersion,
  status: row.status,
  userResolution: row.userResolution,
  userResolvedAt: row.userResolvedAt?.toISOString(),
  provider: row.provider,
  recipientEmail: row.recipientEmail,
  fromEmail: row.fromEmail,
  subject: row.subjectSnapshot,
  companyName: row.companyNameSnapshot,
  roleTitle: row.roleTitleSnapshot,
  resumeId: row.resumeId,
  connectedAccountId: row.connectedAccountId,
  connectedAccountEmail: account?.emailAddress ?? row.fromEmail,
  connectedAccountDisconnected:
    !account ||
    account.status === ConnectedAccountStatus.REVOKED ||
    account.status === ConnectedAccountStatus.ERROR,
  providerMessageId: row.providerMessageId,
  providerThreadId: row.providerThreadId,
  normalizedErrorCode: row.normalizedErrorCode,
  attemptedAt: row.attemptedAt.toISOString(),
  sentAt: row.sentAt?.toISOString(),
  createdAt: row.createdAt.toISOString(),
});

export class MailDeliveryHistoryService {
  constructor(
    private readonly deliveries: MailDeliveryRepository,
    private readonly config: Pick<AiMailConfig, 'phase2' | 'limits'>,
  ) {}

  async list(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      status?: MailDeliveryStatus;
      draftId?: string;
      company?: string;
      role?: string;
      connectedAccountId?: number;
      from?: string;
      to?: string;
    },
  ): Promise<MailDeliveryPageDto> {
    assertMailSendingEnabled(this.config);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const result = await this.deliveries.listForUser({
      userId,
      page,
      limit,
      status: query.status,
      draftId: query.draftId,
      company: query.company,
      role: query.role,
      connectedAccountId: query.connectedAccountId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    const accountMap = await this.loadAccounts(result.items.map((i) => i.connectedAccountId));
    return {
      items: result.items.map((row) => toDto(row, accountMap.get(row.connectedAccountId))),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }

  async get(userId: string, deliveryId: string): Promise<MailDeliveryListItemDto> {
    assertMailSendingEnabled(this.config);
    const row = await this.deliveries.findByIdForUser(deliveryId, userId);
    if (!row) {
      throw new AppError('Mail delivery not found', 404, 'MAIL_DELIVERY_NOT_FOUND');
    }
    const accountMap = await this.loadAccounts([row.connectedAccountId]);
    return toDto(row, accountMap.get(row.connectedAccountId));
  }

  async listForDraft(userId: string, draftId: string): Promise<MailDeliveryListItemDto[]> {
    assertMailSendingEnabled(this.config);
    const rows = await this.deliveries.listForDraft(draftId, userId);
    const accountMap = await this.loadAccounts(rows.map((r) => r.connectedAccountId));
    return rows.map((row) => toDto(row, accountMap.get(row.connectedAccountId)));
  }

  async resolveStatus(
    userId: string,
    deliveryId: string,
    resolution: MailDeliveryUserResolution,
  ): Promise<MailDeliveryListItemDto> {
    assertMailSendingEnabled(this.config);
    const row = await this.deliveries.findByIdForUser(deliveryId, userId);
    if (!row) {
      throw new AppError('Mail delivery not found', 404, 'MAIL_DELIVERY_NOT_FOUND');
    }
    if (row.status !== 'unknown') {
      throw new AppError(
        'Only deliveries with unknown provider status can be resolved',
        422,
        'MAIL_DELIVERY_NOT_UNKNOWN',
      );
    }

    const updated = await this.deliveries.update(row.id, {
      userResolution: resolution,
      userResolvedAt: new Date(),
    });

    logger.info(
      {
        action:
          resolution === 'confirmed_sent'
            ? 'MAIL_DELIVERY_USER_CONFIRMED_SENT'
            : 'MAIL_DELIVERY_USER_CONFIRMED_NOT_SENT',
        deliveryId: updated.id,
        provider: updated.provider,
      },
      'User resolved unknown mail delivery status',
    );

    const accountMap = await this.loadAccounts([updated.connectedAccountId]);
    return toDto(updated, accountMap.get(updated.connectedAccountId));
  }

  async getSendLimits(userId: string): Promise<SendLimitsDto> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [hourlyUsed, dailyUsed] = await Promise.all([
      this.deliveries.countAttemptsInWindow({ userId, since: hourAgo }),
      this.deliveries.countAttemptsInWindow({ userId, since: dayAgo }),
    ]);
    return {
      hourly: { used: hourlyUsed, limit: this.config.limits.sendsPerUserPerHour },
      daily: { used: dailyUsed, limit: this.config.limits.sendsPerUserPerDay },
    };
  }

  private async loadAccounts(
    ids: number[],
  ): Promise<Map<number, { emailAddress: string; status: ConnectedAccountStatus }>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const accounts = await prisma.connectedAccount.findMany({
      where: { id: { in: unique } },
      select: { id: true, emailAddress: true, status: true },
    });
    return new Map(accounts.map((a) => [a.id, { emailAddress: a.emailAddress, status: a.status }]));
  }
}
