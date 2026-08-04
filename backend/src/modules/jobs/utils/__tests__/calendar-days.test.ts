import { describe, expect, it } from 'vitest';
import { subtractDays } from '@/modules/jobs/utils/calendar-days.js';

describe('subtractDays', () => {
  it('subtracts whole UTC days and preserves time-of-day', () => {
    expect(subtractDays(new Date('2026-08-03T12:00:00.000Z'), 90)).toEqual(
      new Date('2026-05-05T12:00:00.000Z'),
    );
    expect(subtractDays(new Date('2026-08-03T00:00:00.000Z'), 5)).toEqual(
      new Date('2026-07-29T00:00:00.000Z'),
    );
  });

  it('crosses month and year boundaries', () => {
    expect(subtractDays(new Date('2026-03-01T08:30:00.000Z'), 1)).toEqual(
      new Date('2026-02-28T08:30:00.000Z'),
    );
    expect(subtractDays(new Date('2026-01-02T00:00:00.000Z'), 3)).toEqual(
      new Date('2025-12-30T00:00:00.000Z'),
    );
  });
});
