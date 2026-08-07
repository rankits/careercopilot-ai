import { AppError } from '@/shared/utils/errors/AppError.js';

import type { MailboxProvider } from '@/modules/ai-mail/delivery/contracts/mailbox-provider.contract.js';
import { GoogleGmailMailboxAdapter } from '@/modules/ai-mail/delivery/providers/google-gmail-mailbox.adapter.js';

export type MailboxProviderName = 'google' | 'none';

export const createMailboxProvider = (name: MailboxProviderName): MailboxProvider => {
  if (name === 'google') {
    return new GoogleGmailMailboxAdapter();
  }
  throw new AppError('Mailbox provider is disabled', 403, 'MAIL_PROVIDER_DISABLED');
};
