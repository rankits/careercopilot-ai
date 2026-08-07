import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';

import type {
  MailDeliveryRecord,
  MailDeliveryRepository,
} from '@/modules/ai-mail/delivery/contracts/mail-delivery.repository.js';
import { hashRecipientEmail } from '@/modules/ai-mail/delivery/domain/recipient-hasher.js';

export type DuplicateSendLevel = 'none' | 'info' | 'warning' | 'hard_block';

export interface DuplicateSendAssessment {
  level: DuplicateSendLevel;
  reason?: string;
  previousDelivery?: {
    deliveryId: string;
    sentAt: string;
    draftId: string;
  };
}

const toPrevious = (row: MailDeliveryRecord) => ({
  deliveryId: row.id,
  sentAt: (row.sentAt ?? row.createdAt).toISOString(),
  draftId: row.draftId,
});

export class DuplicateSendAssessor {
  constructor(
    private readonly deliveries: MailDeliveryRepository,
    private readonly minFollowUpIntervalHours: number,
  ) {}

  async assess(input: {
    userId: string;
    draft: AiMailDraft;
    contentHash: string;
    version: number;
  }): Promise<DuplicateSendAssessment> {
    const exact = await this.deliveries.findSuccessfulByDraftHash({
      draftId: input.draft.id,
      contentHash: input.contentHash,
      draftVersion: input.version,
    });
    if (exact) {
      return {
        level: 'hard_block',
        reason: 'This exact draft version was already sent successfully.',
        previousDelivery: toPrevious(exact),
      };
    }

    let recipientHash: string | undefined;
    try {
      recipientHash = hashRecipientEmail(input.draft.recruiterEmail);
    } catch {
      return { level: 'none' };
    }

    const since = new Date(
      Date.now() - Math.max(1, this.minFollowUpIntervalHours) * 60 * 60 * 1000,
    );
    const recent = await this.deliveries.findRecentByRecipientHash({
      userId: input.userId,
      recipientHash,
      since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    });

    const sameDraftDifferentContent = recent.find(
      (row) =>
        row.draftId === input.draft.id &&
        row.status === 'sent' &&
        row.contentHash !== input.contentHash,
    );
    if (sameDraftDifferentContent) {
      return {
        level: 'warning',
        reason: 'You already sent a different version of this draft to the same recipient.',
        previousDelivery: toPrevious(sameDraftDifferentContent),
      };
    }

    const company = (input.draft.companyName ?? '').trim().toLocaleLowerCase();
    const role = (input.draft.roleTitle ?? '').trim().toLocaleLowerCase();
    const sameJobRecent = recent.find((row) => {
      if (
        row.status !== 'sent' &&
        !(row.status === 'unknown' && row.userResolution === 'confirmed_sent')
      ) {
        return false;
      }
      if (row.createdAt < since) return false;
      const rowCompany = (row.companyNameSnapshot ?? '').trim().toLocaleLowerCase();
      const rowRole = (row.roleTitleSnapshot ?? '').trim().toLocaleLowerCase();
      return Boolean(company && role && rowCompany === company && rowRole === role);
    });
    if (sameJobRecent) {
      return {
        level: 'warning',
        reason:
          'You emailed this recruiter about this role recently. Consider waiting before following up.',
        previousDelivery: toPrevious(sameJobRecent),
      };
    }

    const unrelated = recent.find(
      (row) =>
        row.status === 'sent' &&
        row.draftId !== input.draft.id &&
        (row.companyNameSnapshot ?? '').trim().toLocaleLowerCase() !== company,
    );
    if (unrelated) {
      return {
        level: 'info',
        reason: 'You have previously emailed this recruiter about another opportunity.',
        previousDelivery: toPrevious(unrelated),
      };
    }

    return { level: 'none' };
  }
}
