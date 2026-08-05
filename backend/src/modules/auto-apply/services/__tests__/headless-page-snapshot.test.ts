import { describe, expect, it } from 'vitest';

import {
  HEADLESS_THIN_TEXT_THRESHOLD,
  NoopHeadlessPageSnapshot,
  shouldAttemptHeadlessSnapshot,
} from '@/modules/auto-apply/services/headless-page-snapshot.service.js';

describe('headless page snapshot policy', () => {
  it('skips when disabled or missing apply URL', () => {
    expect(
      shouldAttemptHeadlessSnapshot({
        enabled: false,
        applyUrl: 'https://jobs.ashbyhq.com/linear/x',
        provider: 'ASHBY',
        httpSanitizedLength: 10,
      }),
    ).toBe(false);
    expect(
      shouldAttemptHeadlessSnapshot({
        enabled: true,
        applyUrl: null,
        provider: 'ASHBY',
        httpSanitizedLength: 10,
      }),
    ).toBe(false);
  });

  it('always attempts for Ashby and other JS-heavy providers', () => {
    expect(
      shouldAttemptHeadlessSnapshot({
        enabled: true,
        applyUrl: 'https://jobs.ashbyhq.com/linear/x',
        provider: 'ASHBY',
        httpSanitizedLength: 5_000,
      }),
    ).toBe(true);
  });

  it('attempts for thin unknown-provider HTTP shells', () => {
    expect(
      shouldAttemptHeadlessSnapshot({
        enabled: true,
        applyUrl: 'https://example.com/jobs/1',
        provider: 'UNKNOWN',
        httpSanitizedLength: HEADLESS_THIN_TEXT_THRESHOLD - 1,
      }),
    ).toBe(true);
    expect(
      shouldAttemptHeadlessSnapshot({
        enabled: true,
        applyUrl: 'https://example.com/jobs/1',
        provider: 'UNKNOWN',
        httpSanitizedLength: HEADLESS_THIN_TEXT_THRESHOLD + 50,
      }),
    ).toBe(false);
  });

  it('noop snapshot returns null', async () => {
    const noop = new NoopHeadlessPageSnapshot();
    expect(noop.enabled).toBe(false);
    await expect(noop.snapshot('https://jobs.ashbyhq.com/linear/x')).resolves.toBeNull();
  });
});
