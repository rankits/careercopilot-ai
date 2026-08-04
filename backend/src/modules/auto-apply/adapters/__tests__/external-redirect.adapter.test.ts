import { describe, expect, it } from 'vitest';
import { ExternalRedirectAdapter } from '@/modules/auto-apply/adapters/external-redirect.adapter.js';

describe('ExternalRedirectAdapter', () => {
  const adapter = new ExternalRedirectAdapter();
  const base = { jobApplicationId: 'jobapp-1', userId: 'user-1', jobId: 'job-1' };

  it('is invalid without an external apply URL', async () => {
    const result = await adapter.validate(base);
    expect(result.valid).toBe(false);
  });

  it('is valid with an external apply URL', async () => {
    const result = await adapter.validate({ ...base, externalApplyUrl: 'https://acme.com/apply' });
    expect(result.valid).toBe(true);
  });

  it("never claims to submit on the user's behalf — always requiresUserAction", async () => {
    const result = await adapter.submit({ ...base, externalApplyUrl: 'https://acme.com/apply' });
    expect(result.outcome).toBe('SUCCEEDED');
    expect(result.requiresUserAction).toBe(true);
    expect(result.externalConfirmationUrl).toBe('https://acme.com/apply');
  });

  it('fails without fabricating a hand-off when there is no apply URL', async () => {
    const result = await adapter.submit(base);
    expect(result.outcome).toBe('FAILED_DO_NOT_RETRY');
  });
});
