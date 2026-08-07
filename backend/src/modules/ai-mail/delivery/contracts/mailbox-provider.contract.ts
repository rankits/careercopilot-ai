export interface MailboxSendRequest {
  rawMime: string;
  accessToken: string;
  fromEmail: string;
  toEmail: string;
}

export interface MailboxSendResult {
  providerMessageId: string;
  providerThreadId?: string;
}

export type MailboxSendOutcome =
  | { kind: 'success'; result: MailboxSendResult }
  | { kind: 'failed'; code: string; retryable: false }
  | { kind: 'unknown'; code: string };

export interface MailboxProvider {
  readonly name: 'google' | 'none';
  send(request: MailboxSendRequest): Promise<MailboxSendOutcome>;
}
