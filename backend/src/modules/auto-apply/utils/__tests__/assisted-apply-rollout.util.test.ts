import { describe, expect, it } from 'vitest';

import {
  clampPercent,
  isUserInRollout,
  parseAllowlist,
  rolloutBucket,
} from '@/modules/auto-apply/utils/assisted-apply-rollout.util.js';

describe('assisted-apply-rollout.util (AA-092)', () => {
  it('buckets the same user id deterministically', () => {
    const a = rolloutBucket('user-abc');
    const b = rolloutBucket('user-abc');
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(100);
  });

  it('allowlist always wins', () => {
    expect(
      isUserInRollout('vip', { percent: 0, allowlist: ['vip'] }),
    ).toBe(true);
    expect(
      isUserInRollout('other', { percent: 0, allowlist: ['vip'] }),
    ).toBe(false);
  });

  it('percent 100 includes everyone', () => {
    expect(isUserInRollout('anyone', { percent: 100, allowlist: [] })).toBe(true);
  });

  it('percent 0 excludes non-allowlisted', () => {
    expect(isUserInRollout('anyone', { percent: 0, allowlist: [] })).toBe(false);
  });

  it('parses allowlist CSV', () => {
    expect(parseAllowlist(' a, b ,c ')).toEqual(['a', 'b', 'c']);
    expect(parseAllowlist('')).toEqual([]);
  });

  it('clamps percent', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-3)).toBe(0);
  });
});
