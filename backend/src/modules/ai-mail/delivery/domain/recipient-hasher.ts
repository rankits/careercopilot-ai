import { createHmac } from 'node:crypto';

import { aiMailServerConfig } from '@/modules/ai-mail/config/ai-mail.config.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export const normalizeRecipientEmail = (email: string): string => email.trim().toLocaleLowerCase();

/**
 * Privacy-safe recipient fingerprint for indexing/logs.
 * Never log the plaintext email alongside this hash in telemetry.
 */
export const hashRecipientEmail = (
  email: string,
  secret = aiMailServerConfig.recipientHmacSecret,
): string => {
  if (!secret) {
    throw new AppError(
      'Recipient HMAC secret is not configured',
      500,
      'AI_MAIL_RECIPIENT_HMAC_NOT_CONFIGURED',
    );
  }
  const key = Buffer.from(secret, 'base64');
  return createHmac('sha256', key).update(normalizeRecipientEmail(email), 'utf8').digest('hex');
};
