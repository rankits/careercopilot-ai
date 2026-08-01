import { ApplicationStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  getTodayDateInputValue,
  parseAppliedAtDate,
  resolveAppliedAt,
} from '@/modules/application-management/utils/applied-at.util.js';

describe('applied-at util', () => {
  it('parses a valid applied date', () => {
    const parsed = parseAppliedAtDate('2025-05-08');

    expect(parsed.toISOString()).toBe('2025-05-08T00:00:00.000Z');
  });

  it('rejects a future applied date', () => {
    expect(() => parseAppliedAtDate('2999-01-01')).toThrowError(
      new AppError('Applied date cannot be in the future', 400, 'INVALID_APPLIED_AT'),
    );
  });

  it('uses the provided applied date when creating an application', () => {
    const resolved = resolveAppliedAt('2025-05-08', ApplicationStatus.SAVED);

    expect(resolved?.toISOString()).toBe('2025-05-08T00:00:00.000Z');
  });

  it('falls back to now when status is APPLIED and no date is provided', () => {
    const before = Date.now();
    const resolved = resolveAppliedAt(undefined, ApplicationStatus.APPLIED);
    const after = Date.now();

    expect(resolved).toBeInstanceOf(Date);
    expect(resolved!.getTime()).toBeGreaterThanOrEqual(before);
    expect(resolved!.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns null when no applied date and status is not APPLIED', () => {
    expect(resolveAppliedAt(undefined, ApplicationStatus.SAVED)).toBeNull();
  });

  it('returns today in YYYY-MM-DD format', () => {
    expect(getTodayDateInputValue(new Date('2026-07-31T12:00:00.000Z'))).toBe('2026-07-31');
  });
});
