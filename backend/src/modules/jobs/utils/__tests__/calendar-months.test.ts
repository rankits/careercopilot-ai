import { describe, expect, it } from 'vitest';
import { subtractCalendarMonths } from '@/modules/jobs/utils/calendar-months.js';

describe('subtractCalendarMonths', () => {
  it('subtracts whole months in UTC', () => {
    expect(subtractCalendarMonths(new Date('2026-08-03T12:00:00.000Z'), 3)).toEqual(
      new Date('2026-05-03T12:00:00.000Z'),
    );
  });

  it('clamps month-end overflow (Mar 31 minus 1 month -> Feb last day)', () => {
    expect(subtractCalendarMonths(new Date('2026-03-31T00:00:00.000Z'), 1)).toEqual(
      new Date('2026-02-28T00:00:00.000Z'),
    );
  });

  it('handles leap-year February', () => {
    expect(subtractCalendarMonths(new Date('2024-03-31T00:00:00.000Z'), 1)).toEqual(
      new Date('2024-02-29T00:00:00.000Z'),
    );
  });

  it('crosses year boundaries', () => {
    expect(subtractCalendarMonths(new Date('2026-01-15T08:30:00.000Z'), 2)).toEqual(
      new Date('2025-11-15T08:30:00.000Z'),
    );
  });
});
