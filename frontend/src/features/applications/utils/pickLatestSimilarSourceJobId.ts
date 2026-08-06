import type { ApplicationDto } from '@/features/applications/types/application.types';

function getActivityTimestamp(app: ApplicationDto): number {
  const iso = app.appliedAt ?? app.updatedAt ?? app.createdAt;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Picks the catalog job id from the most recently saved/applied application. */
export function pickLatestSimilarSourceJobId(
  applications: readonly ApplicationDto[],
): string | undefined {
  const latestByJobId = new Map<string, ApplicationDto>();

  for (const application of applications) {
    const jobId = application.jobId?.trim();
    if (!jobId) continue;

    const existing = latestByJobId.get(jobId);
    if (!existing || getActivityTimestamp(application) > getActivityTimestamp(existing)) {
      latestByJobId.set(jobId, application);
    }
  }

  const candidates = [...latestByJobId.values()].sort(
    (left, right) => getActivityTimestamp(right) - getActivityTimestamp(left),
  );

  return candidates[0]?.jobId ?? undefined;
}
