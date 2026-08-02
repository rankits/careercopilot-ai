import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';

export interface DeduplicatedRetrievedJobs {
  jobs: JobListDto[];
  retrievalScores: Record<string, number>;
  removed: number;
}

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');

export const canonicalRetrievedJobKey = (job: JobListDto): string =>
  [
    normalize(job.company.slug || job.company.name),
    normalize(job.title),
    normalize(job.location.remoteType ?? job.location.formatted),
    normalize(job.employmentType),
    normalize(job.salary.currency),
    job.salary.minimum ?? '',
    job.salary.maximum ?? '',
    [...job.skills].map(normalize).sort().join(','),
  ].join('|');

export const deduplicateRetrievedJobs = (
  jobs: readonly JobListDto[],
  retrievalScores: Readonly<Record<string, number>> = {},
): DeduplicatedRetrievedJobs => {
  const byKey = new Map<string, { job: JobListDto; score: number }>();

  for (const job of jobs) {
    const key = canonicalRetrievedJobKey(job);
    const score = retrievalScores[job.id] ?? 0;
    const existing = byKey.get(key);
    if (!existing || score > existing.score || (score === existing.score && job.id < existing.job.id)) {
      byKey.set(key, { job, score });
    }
  }

  const winners = [...byKey.values()].sort(
    (left, right) => right.score - left.score || left.job.id.localeCompare(right.job.id),
  );
  return {
    jobs: winners.map((winner) => winner.job),
    retrievalScores: Object.fromEntries(winners.map((winner) => [winner.job.id, winner.score])),
    removed: jobs.length - winners.length,
  };
};
