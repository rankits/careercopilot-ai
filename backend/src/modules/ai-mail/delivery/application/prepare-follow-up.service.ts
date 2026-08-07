import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import type { AiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import {
  DEFAULT_MAIL_GENERATION_CONSTRAINTS,
  type AiMailDraft,
  type MailGenerationConstraints,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

import type { MailDeliveryRepository } from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { hashRecipientEmail } from '@/modules/ai-mail/delivery/domain/recipient-hasher.js';
import { assertMailSendingEnabled } from '@/modules/ai-mail/delivery/policy/send-policy.js';

export type FollowUpStyle = 'concise' | 'polite' | 'value_add' | 'check_in';

export interface PrepareFollowUpInput {
  style?: FollowUpStyle;
  additionalInstruction?: string;
}

export interface PrepareFollowUpResult {
  draft: AiMailDraft;
  warnings: string[];
  suggestedFollowUpWindow: string;
}

export class PrepareFollowUpService {
  constructor(
    private readonly drafts: AiMailDraftRepository,
    private readonly deliveries: MailDeliveryRepository,
    private readonly config: Pick<AiMailConfig, 'phase2' | 'limits'>,
  ) {}

  async prepare(
    userId: string,
    deliveryId: string,
    input: PrepareFollowUpInput,
  ): Promise<PrepareFollowUpResult> {
    assertMailSendingEnabled(this.config);

    const delivery = await this.deliveries.findByIdForUser(deliveryId, userId);
    if (!delivery) {
      throw new AppError('Mail delivery not found', 404, 'MAIL_DELIVERY_NOT_FOUND');
    }

    const canFollowUp =
      delivery.status === 'sent' ||
      (delivery.status === 'unknown' && delivery.userResolution === 'confirmed_sent');
    if (!canFollowUp) {
      throw new AppError(
        'Follow-up can only be prepared from a successful or user-confirmed delivery',
        422,
        'MAIL_FOLLOW_UP_SOURCE_INVALID',
      );
    }

    const parent = await this.drafts.findByIdForUser(delivery.draftId, userId);
    if (!parent) {
      throw new AppError('Source draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');
    }

    const warnings: string[] = [];
    const minHours = this.config.limits.minFollowUpIntervalHours;
    const since = new Date(Date.now() - minHours * 60 * 60 * 1000);
    const sentAt = delivery.sentAt ?? delivery.createdAt;
    if (sentAt > since) {
      warnings.push(
        `You emailed this recruiter recently. Consider waiting about ${minHours} hours before following up.`,
      );
    }

    try {
      const recipientHash = hashRecipientEmail(delivery.recipientEmail);
      const recent = await this.deliveries.findRecentByRecipientHash({
        userId,
        recipientHash,
        since,
      });
      if (recent.some((r) => r.id !== delivery.id && r.status === 'sent')) {
        warnings.push('You emailed this recruiter recently. Consider waiting before following up.');
      }
    } catch {
      // HMAC may be unset in non-send tests; skip soft warning
    }

    const style = input.style ?? 'concise';
    const constraints: MailGenerationConstraints = {
      ...DEFAULT_MAIL_GENERATION_CONSTRAINTS,
      ...parent.constraints,
      tone: 'professional',
      maximumWords: 160,
      followUpStyle: style,
      customInstructions: [
        parent.constraints.customInstructions,
        input.additionalInstruction,
        `Follow-up style: ${style}. Prior outreach was sent on ${sentAt.toISOString().slice(0, 10)} with subject "${delivery.subjectSnapshot ?? parent.subject ?? ''}". Do not claim read/open/reply status.`,
      ]
        .filter(Boolean)
        .join('\n'),
    };

    const draft = await this.drafts.create({
      userId,
      recruiterEmail: parent.recruiterEmail,
      recruiterName: parent.recruiterName,
      companyName: parent.companyName ?? delivery.companyNameSnapshot,
      roleTitle: parent.roleTitle ?? delivery.roleTitleSnapshot,
      jobUrl: parent.jobUrl,
      jobDescription: parent.jobDescription,
      additionalContext: parent.additionalContext,
      resumeId: parent.resumeId,
      profileSnapshotId: parent.profileSnapshotId,
      constraints,
      status: 'input',
      userEdited: false,
      followUpToDeliveryId: delivery.id,
    });

    logger.info(
      {
        action: 'MAIL_FOLLOW_UP_DRAFT_CREATED',
        deliveryId: delivery.id,
        draftId: draft.id,
        provider: delivery.provider,
      },
      'Follow-up draft prepared',
    );

    return {
      draft,
      warnings: [...new Set(warnings)],
      suggestedFollowUpWindow: '5–7 business days after initial outreach',
    };
  }
}
