import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatPostedAt } from './formatPostedAt';

describe('formatPostedAt', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles missing and invalid dates', () => {
    expect(formatPostedAt(null)).toBe('Posted recently');
    expect(formatPostedAt(undefined)).toBe('Posted recently');
    expect(formatPostedAt('not-a-date')).toBe('Posted recently');
  });

  it('formats today, days, months, and years', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));

    expect(formatPostedAt('2026-08-05T08:00:00.000Z')).toBe('Posted today');
    expect(formatPostedAt('2026-08-04T12:00:00.000Z')).toBe('Posted 1 day ago');
    expect(formatPostedAt('2026-08-02T12:00:00.000Z')).toBe('Posted 3 days ago');
    expect(formatPostedAt('2026-05-05T12:00:00.000Z')).toBe('Posted 3 months ago');
    expect(formatPostedAt('2024-08-05T12:00:00.000Z')).toBe('Posted 2 years ago');
  });
});
