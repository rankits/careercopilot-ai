import type { AiMailDraft } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { hashAiMailContent } from '@/modules/ai-mail/domain/content-hasher.js';
import { hasUnresolvedPlaceholders } from '@/modules/ai-mail/domain/placeholder-detector.js';
import type { AiMailConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

import type { SendableGoogleAccountMeta } from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';
import { GMAIL_SEND_SCOPE } from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';

export interface SendPolicyInput {
  config: Pick<AiMailConfig, 'phase2'>;
  draft: AiMailDraft;
  expectedVersion: number;
  expectedContentHash: string;
  account: SendableGoogleAccountMeta;
}

export const assertMailSendingEnabled = (config: Pick<AiMailConfig, 'phase2'>): void => {
  if (!config.phase2.mailSendingEnabled || !config.phase2.gmailIntegrationEnabled) {
    throw new AppError('Mail sending is disabled', 403, 'MAIL_SENDING_DISABLED');
  }
};

export const assertDraftReadyToSend = (input: SendPolicyInput): void => {
  assertMailSendingEnabled(input.config);

  if (input.draft.status !== 'ready_to_send') {
    throw new AppError(
      'Draft must be marked ready_to_send before sending',
      422,
      'MAIL_DRAFT_NOT_READY',
    );
  }

  if (input.draft.version !== input.expectedVersion) {
    throw new AppError(
      'Draft version conflict — reload and try again',
      409,
      'AI_MAIL_VERSION_CONFLICT',
    );
  }

  if (!input.draft.subject?.trim() || !input.draft.bodyText?.trim()) {
    throw new AppError('Draft subject and body are required to send', 422, 'MAIL_DRAFT_INCOMPLETE');
  }

  if (!input.draft.contentHash) {
    throw new AppError(
      'Draft content hash is missing — re-mark ready',
      422,
      'MAIL_CONTENT_HASH_MISSING',
    );
  }

  if (input.draft.contentHash !== input.expectedContentHash) {
    throw new AppError(
      'Draft content hash mismatch — reload and try again',
      409,
      'MAIL_CONTENT_HASH_MISMATCH',
    );
  }

  const recomputed = hashAiMailContent({
    recruiterEmail: input.draft.recruiterEmail,
    subject: input.draft.subject,
    bodyText: input.draft.bodyText,
    bodyHtml: input.draft.bodyHtml,
    resumeId: input.draft.resumeId,
    version: input.draft.version,
  });

  if (recomputed !== input.draft.contentHash) {
    throw new AppError(
      'Draft content changed since mark-ready — re-mark ready before sending',
      409,
      'MAIL_CONTENT_HASH_STALE',
    );
  }

  if (hasUnresolvedPlaceholders(input.draft.subject, input.draft.bodyText, input.draft.bodyHtml)) {
    throw new AppError(
      'Draft still contains unresolved placeholders',
      422,
      'AI_MAIL_UNRESOLVED_PLACEHOLDERS',
    );
  }

  if (input.account.status !== 'ACTIVE') {
    throw new AppError('Connected account is not active', 403, 'CONNECTED_ACCOUNT_INACTIVE');
  }

  const hasScope = input.account.grantedScopes.some(
    (scope) => scope === GMAIL_SEND_SCOPE || scope.endsWith('/gmail.send'),
  );
  if (!hasScope) {
    throw new AppError(
      'Connected account is missing the gmail.send scope',
      403,
      'CONNECTED_ACCOUNT_MISSING_GMAIL_SEND_SCOPE',
    );
  }
};
