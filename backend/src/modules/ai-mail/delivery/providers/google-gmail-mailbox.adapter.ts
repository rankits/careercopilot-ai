import { env } from '@/shared/config/env.conf.js';
import { logger } from '@/shared/logger/logger.js';

import type {
  MailboxProvider,
  MailboxSendOutcome,
  MailboxSendRequest,
} from '@/modules/ai-mail/delivery/contracts/mailbox-provider.contract.js';

const toBase64Url = (rawMime: string): string =>
  Buffer.from(rawMime, 'utf8')
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');

interface GmailSendResponse {
  id?: string;
  threadId?: string;
  error?: { code?: number; message?: string; status?: string };
}

/**
 * Google Gmail API mailbox adapter. Receives a plaintext access token from the
 * credential service — never persists or logs it.
 */
export class GoogleGmailMailboxAdapter implements MailboxProvider {
  readonly name = 'google' as const;

  async send(request: MailboxSendRequest): Promise<MailboxSendOutcome> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.GOOGLE_API_REQUEST_TIMEOUT_MS);

    const started = Date.now();
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${request.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: toBase64Url(request.rawMime) }),
        signal: controller.signal,
      });

      const durationMs = Date.now() - started;
      const body = (await response.json().catch(() => ({}))) as GmailSendResponse;

      if (response.ok && body.id) {
        logger.info(
          {
            action: 'GMAIL_MESSAGE_SENT',
            provider: 'google',
            statusCode: response.status,
            durationMs,
            hasThreadId: Boolean(body.threadId),
          },
          'Gmail message sent',
        );
        return {
          kind: 'success',
          result: {
            providerMessageId: body.id,
            providerThreadId: body.threadId,
          },
        };
      }

      const code = mapGmailHttpError(response.status, body);
      logger.warn(
        {
          action: 'GMAIL_MESSAGE_SEND_FAILED',
          provider: 'google',
          statusCode: response.status,
          durationMs,
          code,
        },
        'Gmail send failed',
      );

      if (response.status >= 500 || response.status === 429) {
        // Unknown whether the message was accepted — do not blind-retry.
        return { kind: 'unknown', code };
      }

      return { kind: 'failed', code, retryable: false };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      const code = aborted ? 'GMAIL_SEND_TIMEOUT' : 'GMAIL_SEND_NETWORK_ERROR';
      logger.warn(
        {
          action: 'GMAIL_MESSAGE_SEND_UNKNOWN',
          provider: 'google',
          durationMs: Date.now() - started,
          code,
        },
        'Gmail send outcome unknown',
      );
      return { kind: 'unknown', code };
    } finally {
      clearTimeout(timeout);
    }
  }
}

const mapGmailHttpError = (status: number, body: GmailSendResponse): string => {
  if (status === 401) return 'GMAIL_UNAUTHORIZED';
  if (status === 403) return 'GMAIL_FORBIDDEN';
  if (status === 400) return 'GMAIL_BAD_REQUEST';
  if (status === 429) return 'GMAIL_RATE_LIMITED';
  if (status >= 500) return 'GMAIL_SERVER_ERROR';
  return body.error?.status ? `GMAIL_${body.error.status}` : `GMAIL_HTTP_${status}`;
};
