import { ApplicationStatus } from '@prisma/client';
import { AppError } from '@/shared/utils/errors/AppError.js';

export function getTodayDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Latest YYYY-MM-DD accepted for appliedAt.
 * Uses UTC today + 1 day so clients ahead of the server timezone (e.g. IST vs UTC)
 * are not rejected for selecting their local "today".
 */
export function getMaxAllowedAppliedAtDate(date = new Date()): string {
  const max = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  const year = max.getUTCFullYear();
  const month = String(max.getUTCMonth() + 1).padStart(2, '0');
  const day = String(max.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseAppliedAtDate(appliedAt: string): Date {
  const normalized = appliedAt.trim();

  if (!normalized) {
    throw new AppError('Applied date is invalid', 400, 'INVALID_APPLIED_AT');
  }

  if (normalized > getMaxAllowedAppliedAtDate()) {
    throw new AppError('Applied date cannot be in the future', 400, 'INVALID_APPLIED_AT');
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('Applied date is invalid', 400, 'INVALID_APPLIED_AT');
  }

  return parsed;
}

export function resolveAppliedAt(
  appliedAt: unknown,
  currentStatus: ApplicationStatus | undefined,
): Date | null {
  const normalized = typeof appliedAt === 'string' ? appliedAt.trim() : '';
  if (normalized) {
    return parseAppliedAtDate(normalized);
  }

  if (currentStatus === ApplicationStatus.APPLIED) {
    return new Date();
  }

  return null;
}
