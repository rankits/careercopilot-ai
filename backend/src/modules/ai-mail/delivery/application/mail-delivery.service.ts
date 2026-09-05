import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { AiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { ConnectedAccountCredentialService } from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

import type { ResumeAttachmentResolver } from '@/modules/ai-mail/delivery/attachments/resume-attachment.resolver.js';
import type { MailboxProvider } from '@/modules/ai-mail/delivery/contracts/mailbox-provider.contract.js';
import type {
  MailDeliveryRecord,
  MailDeliveryRepository,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { hashRecipientEmail } from '@/modules/ai-mail/delivery/domain/recipient-hasher.js';
import { composeMimeMessage } from '@/modules/ai-mail/delivery/mime/mime-composer.js';
import {
  DuplicateSendAssessor,
  type DuplicateSendAssessment,
} from '@/modules/ai-mail/delivery/policy/duplicate-send-assessor.js';
import {
  assertDraftReadyToSend,
  assertMailSendingEnabled,
} from '@/modules/ai-mail/delivery/policy/send-policy.js';
import type { SendLimitsDto } from '@/modules/ai-mail/delivery/application/mail-delivery-history.service.js';

export interface SendApprovedDraftInput {
  userId: string;
  draftId: string;
  version: number;
  contentHash: string;
  connectedAccountId: number;
  idempotencyKey: string;
}

export interface MailSendPreview {
  draftId: string;
  version: number;
  contentHash: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  fromEmail: string;
  connectedAccountId: number;
  accountStatus: string;
  resumeId: string;
  resumeFileName?: string;
  resumeSizeBytes?: number;
  mailSendingEnabled: boolean;
  gmailIntegrationEnabled: boolean;
  canSend: boolean;
  blockers: string[];
  duplicateAssessment: DuplicateSendAssessment;
  limits: SendLimitsDto;
}

export interface MailDeliveryResultDto {
  deliveryId: string;
  draftId: string;
  status: MailDeliveryRecord['status'];
  providerMessageId?: string;
  providerThreadId?: string;
  fromEmail: string;
  recipientEmail: string;
  sentAt?: string;
  normalizedErrorCode?: string;
  idempotentReplay: boolean;
}

const toDto = (record: MailDeliveryRecord, idempotentReplay: boolean): MailDeliveryResultDto => ({
  deliveryId: record.id,
  draftId: record.draftId,
  status: record.status,
  providerMessageId: record.providerMessageId,
  providerThreadId: record.providerThreadId,
  fromEmail: record.fromEmail,
  recipientEmail: record.recipientEmail,
  sentAt: record.sentAt?.toISOString(),
  normalizedErrorCode: record.normalizedErrorCode,
  idempotentReplay,
});

const parseNumericUserId = (userId: string): number => {
  const n = Number(userId);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError('Invalid user principal', 401, 'UNAUTHORIZED');
  }
  return n;
};

export class MailDeliveryService {
  private readonly duplicateAssessor: DuplicateSendAssessor;

  constructor(
    private readonly drafts: AiMailDraftRepository,
    private readonly deliveries: MailDeliveryRepository,
    private readonly mailbox: MailboxProvider,
    private readonly attachments: ResumeAttachmentResolver,
    private readonly config: Pick<AiMailConfig, 'phase2' | 'limits'>,
  ) {
    this.duplicateAssessor = new DuplicateSendAssessor(
      deliveries,
      config.limits.minFollowUpIntervalHours,
    );
  }

  async previewSend(
    userId: string,
    draftId: string,
    connectedAccountId: number,
  ): Promise<MailSendPreview> {
    assertMailSendingEnabled(this.config);

    const draft = await this.drafts.findByIdForUser(draftId, userId);
    if (!draft) {
      throw new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');
    }

    const numericUserId = parseNumericUserId(userId);
    const account = await ConnectedAccountCredentialService.getSendableGoogleAccountMeta({
      userId: numericUserId,
      accountId: connectedAccountId,
    });

    const blockers: string[] = [];
    if (draft.status !== 'ready_to_send') blockers.push('DRAFT_NOT_READY');
    if (!draft.contentHash) blockers.push('CONTENT_HASH_MISSING');
    if (!draft.subject?.trim() || !draft.bodyText?.trim()) blockers.push('DRAFT_INCOMPLETE');
    if (account.status !== 'ACTIVE') blockers.push('ACCOUNT_NOT_ACTIVE');
    if (
      !account.grantedScopes.some(
        (s) => s === 'https://www.googleapis.com/auth/gmail.send' || s.endsWith('/gmail.send'),
      )
    ) {
      blockers.push('MISSING_GMAIL_SEND_SCOPE');
    }

    let resumeFileName: string | undefined;
    let resumeSizeBytes: number | undefined;
    try {
      const attachment = await this.attachments.resolve({
        userId,
        resumeId: draft.resumeId,
      });
      resumeFileName = attachment.filename;
      resumeSizeBytes = attachment.content.byteLength;
    } catch {
      blockers.push('RESUME_ATTACHMENT_UNAVAILABLE');
    }

    const duplicateAssessment = draft.contentHash
      ? await this.duplicateAssessor.assess({
          userId,
          draft,
          contentHash: draft.contentHash,
          version: draft.version,
        })
      : { level: 'none' as const };

    if (duplicateAssessment.level === 'hard_block') {
      blockers.push('DUPLICATE_HARD_BLOCK');
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [hourlyUsed, dailyUsed] = await Promise.all([
      this.deliveries.countAttemptsInWindow({ userId, since: hourAgo }),
      this.deliveries.countAttemptsInWindow({ userId, since: dayAgo }),
    ]);

    return {
      draftId: draft.id,
      version: draft.version,
      contentHash: draft.contentHash ?? '',
      recipientEmail: draft.recruiterEmail,
      subject: draft.subject ?? '',
      bodyPreview: (draft.bodyText ?? '').slice(0, 280),
      fromEmail: account.emailAddress,
      connectedAccountId: account.id,
      accountStatus: account.status,
      resumeId: draft.resumeId,
      resumeFileName,
      resumeSizeBytes,
      mailSendingEnabled: this.config.phase2.mailSendingEnabled,
      gmailIntegrationEnabled: this.config.phase2.gmailIntegrationEnabled,
      canSend: blockers.length === 0,
      blockers,
      duplicateAssessment,
      limits: {
        hourly: { used: hourlyUsed, limit: this.config.limits.sendsPerUserPerHour },
        daily: { used: dailyUsed, limit: this.config.limits.sendsPerUserPerDay },
      },
    };
  }

  async sendApprovedDraft(input: SendApprovedDraftInput): Promise<MailDeliveryResultDto> {
    assertMailSendingEnabled(this.config);

    const existingByKey = await this.deliveries.findByIdempotencyKey(
      input.userId,
      input.idempotencyKey,
    );
    if (existingByKey) {
      if (existingByKey.status === 'sent') {
        return toDto(existingByKey, true);
      }
      if (existingByKey.status === 'sending') {
        throw new AppError(
          'A send for this idempotency key is already in progress',
          409,
          'MAIL_DELIVERY_IN_FLIGHT',
        );
      }
      if (existingByKey.status === 'unknown') {
        throw new AppError(
          'A previous send for this key has an unknown outcome — do not retry blindly',
          409,
          'MAIL_DELIVERY_UNKNOWN',
        );
      }
      throw new AppError(
        'Previous send failed — use a new idempotency key to retry',
        409,
        'MAIL_DELIVERY_PREVIOUSLY_FAILED',
      );
    }

    const draft = await this.drafts.findByIdForUser(input.draftId, input.userId);
    if (!draft) {
      throw new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');
    }

    const priorSuccess = await this.deliveries.findSuccessfulByDraftHash({
      draftId: draft.id,
      contentHash: input.contentHash,
      draftVersion: input.version,
    });
    if (priorSuccess) {
      return toDto(priorSuccess, true);
    }

    const numericUserId = parseNumericUserId(input.userId);
    const resolved = await ConnectedAccountCredentialService.resolveSendableGoogleAccount({
      userId: numericUserId,
      accountId: input.connectedAccountId,
    });

    assertDraftReadyToSend({
      config: this.config,
      draft,
      expectedVersion: input.version,
      expectedContentHash: input.contentHash,
      account: resolved.account,
    });

    const attachment = await this.attachments.resolve({
      userId: input.userId,
      resumeId: draft.resumeId,
    });

    const rawMime = composeMimeMessage({
      fromEmail: resolved.account.emailAddress,
      toEmail: draft.recruiterEmail,
      subject: draft.subject!,
      bodyText: draft.bodyText!,
      bodyHtml: draft.bodyHtml,
      attachment,
    });

    const recipientHash = hashRecipientEmail(draft.recruiterEmail);

    let delivery = await this.deliveries.create({
      userId: input.userId,
      draftId: draft.id,
      draftVersion: draft.version,
      contentHash: draft.contentHash!,
      connectedAccountId: resolved.account.id,
      provider: 'google',
      status: 'sending',
      idempotencyKey: input.idempotencyKey,
      recipientEmail: draft.recruiterEmail,
      recipientHash,
      fromEmail: resolved.account.emailAddress,
      resumeId: draft.resumeId,
      subjectSnapshot: draft.subject,
      companyNameSnapshot: draft.companyName,
      roleTitleSnapshot: draft.roleTitle,
    });

    if (delivery.status === 'sent') {
      return toDto(delivery, true);
    }
    if (delivery.status === 'unknown') {
      throw new AppError(
        'A previous send for this key has an unknown outcome — do not retry blindly',
        409,
        'MAIL_DELIVERY_UNKNOWN',
      );
    }

    const started = Date.now();
    const outcome = await this.mailbox.send({
      rawMime,
      accessToken: resolved.accessToken,
      fromEmail: resolved.account.emailAddress,
      toEmail: draft.recruiterEmail,
    });

    if (outcome.kind === 'success') {
      delivery = await this.deliveries.update(delivery.id, {
        status: 'sent',
        providerMessageId: outcome.result.providerMessageId,
        providerThreadId: outcome.result.providerThreadId,
        sentAt: new Date(),
      });

      logger.info(
        {
          action: 'MAIL_SEND_CONFIRMED',
          deliveryId: delivery.id,
          draftId: draft.id,
          provider: 'google',
          durationMs: Date.now() - started,
        },
        'Mail delivery succeeded',
      );
      return toDto(delivery, false);
    }

    if (outcome.kind === 'unknown') {
      delivery = await this.deliveries.update(delivery.id, {
        status: 'unknown',
        normalizedErrorCode: outcome.code,
      });
      logger.warn(
        {
          action: 'MAIL_SEND_STATUS_UNKNOWN',
          deliveryId: delivery.id,
          draftId: draft.id,
          code: outcome.code,
          durationMs: Date.now() - started,
        },
        'Mail delivery outcome unknown',
      );
      throw new AppError(
        'We could not confirm whether this message was sent. Check Gmail Sent before retrying.',
        502,
        'MAIL_DELIVERY_UNKNOWN',
      );
    }

    delivery = await this.deliveries.update(delivery.id, {
      status: 'failed',
      normalizedErrorCode: outcome.code,
    });
    logger.warn(
      {
        action: 'MAIL_SEND_FAILED',
        deliveryId: delivery.id,
        draftId: draft.id,
        code: outcome.code,
        durationMs: Date.now() - started,
      },
      'Mail delivery failed',
    );
    throw new AppError('Failed to send email via Gmail', 502, outcome.code);
  }
}
