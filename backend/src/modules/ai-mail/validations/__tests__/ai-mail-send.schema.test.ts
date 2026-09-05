import { describe, expect, it } from 'vitest';

import {
  sendAiMailDraftSchema,
  sendPreviewAiMailDraftSchema,
} from '@/modules/ai-mail/validations/ai-mail.schema.js';

const draftId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('AI Mail send schemas', () => {
  it('accepts send-preview query params', () => {
    const parsed = sendPreviewAiMailDraftSchema.parse({
      params: { draftId },
      query: { connectedAccountId: '12' },
    });
    expect(parsed.query.connectedAccountId).toBe(12);
  });

  it('requires send body fields', () => {
    const parsed = sendAiMailDraftSchema.parse({
      params: { draftId },
      body: {
        version: 2,
        contentHash: 'a'.repeat(64),
        connectedAccountId: 3,
        idempotencyKey: 'idem-12345678',
      },
    });
    expect(parsed.body.connectedAccountId).toBe(3);

    expect(() =>
      sendAiMailDraftSchema.parse({
        params: { draftId },
        body: {
          version: 2,
          contentHash: 'short',
          connectedAccountId: 3,
          idempotencyKey: 'idem-12345678',
        },
      }),
    ).toThrow();
  });
});
