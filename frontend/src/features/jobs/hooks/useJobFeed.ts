import { useQuery } from '@tanstack/react-query';

import { jobsService } from '@/features/jobs/services/jobs.service';
import type { ListJobsParams } from '@/features/jobs/types/job.types';
import { mapJobToCard } from '@/features/jobs/utils/mapJobToCard';

export const jobFeedQueryKey = (params: ListJobsParams) =>
  ['jobs', 'feed', params.page ?? 1, params.limit ?? 50, params.sortBy ?? 'newest', params.query ?? ''] as const;

export function useJobFeed(params: ListJobsParams = {}) {
  return useQuery({
    queryKey: jobFeedQueryKey(params),
    queryFn: () => jobsService.listJobs(params),
    select: (result) => ({
      ...result,
      cards: result.items.map((job, index) => mapJobToCard(job, index)),
    }),
  });
}
