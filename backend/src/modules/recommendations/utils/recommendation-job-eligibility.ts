import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';

type RecommendationEligibilityJob = JobListDto & {
  status?: string | null;
  expiresAt?: Date | string | null;
  deletedAt?: Date | string | null;
};

const isPast = (value: Date | string | null | undefined, now: Date): boolean => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) && date <= now;
};

export const isRecommendationJobEligible = (
  job: RecommendationEligibilityJob,
  now: Date = new Date(),
): boolean => {
  if (job.deletedAt) return false;
  if (job.status && job.status !== 'ACTIVE') return false;
  if (isPast(job.expiresAt, now)) return false;
  return true;
};
