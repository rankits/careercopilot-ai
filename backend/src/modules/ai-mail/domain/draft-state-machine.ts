import type { MailDraftStatus } from '@/modules/ai-mail/domain/ai-mail.types.js';

const ALLOWED_TRANSITIONS: Readonly<Record<MailDraftStatus, readonly MailDraftStatus[]>> = {
  input: ['generating', 'ready_to_send', 'archived'],
  generating: ['generated', 'generation_failed'],
  generated: ['generating', 'edited', 'ready_to_send', 'archived'],
  edited: ['generating', 'ready_to_send', 'archived'],
  generation_failed: ['generating', 'ready_to_send', 'archived'],
  ready_to_send: ['edited', 'archived'],
  archived: [],
};

export class InvalidMailDraftTransitionError extends Error {
  readonly code = 'AI_MAIL_INVALID_STATUS_TRANSITION';

  constructor(
    readonly from: MailDraftStatus,
    readonly to: MailDraftStatus,
  ) {
    super(`AI Mail draft cannot transition from "${from}" to "${to}"`);
    this.name = 'InvalidMailDraftTransitionError';
  }
}

export const canTransitionMailDraft = (from: MailDraftStatus, to: MailDraftStatus): boolean =>
  ALLOWED_TRANSITIONS[from].includes(to);

export const assertMailDraftTransition = (from: MailDraftStatus, to: MailDraftStatus): void => {
  if (!canTransitionMailDraft(from, to)) {
    throw new InvalidMailDraftTransitionError(from, to);
  }
};
