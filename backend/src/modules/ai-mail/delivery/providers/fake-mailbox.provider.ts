import type {
  MailboxProvider,
  MailboxSendOutcome,
  MailboxSendRequest,
} from '@/modules/ai-mail/delivery/contracts/mailbox-provider.contract.js';

export type FakeMailboxMode = 'success' | 'failed' | 'unknown' | 'timeout';

/**
 * Test / local mailbox that never calls Gmail.
 */
export class FakeMailboxProvider implements MailboxProvider {
  readonly name = 'google' as const;
  readonly calls: MailboxSendRequest[] = [];

  constructor(private readonly mode: FakeMailboxMode = 'success') {}

  async send(request: MailboxSendRequest): Promise<MailboxSendOutcome> {
    this.calls.push(request);

    if (this.mode === 'failed') {
      return { kind: 'failed', code: 'FAKE_MAILBOX_FAILED', retryable: false };
    }
    if (this.mode === 'unknown' || this.mode === 'timeout') {
      return { kind: 'unknown', code: 'FAKE_MAILBOX_UNKNOWN' };
    }

    return {
      kind: 'success',
      result: {
        providerMessageId: `fake-msg-${this.calls.length}`,
        providerThreadId: `fake-thread-${this.calls.length}`,
      },
    };
  }
}
