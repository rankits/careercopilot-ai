import { useQuery } from '@tanstack/react-query';

import { jobsService } from '@/features/jobs/services/jobs.service';
import type { ListJobsParams } from '@/features/jobs/types/job.types';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';

export const jobFeedQueryKey = (params: ListJobsParams) => ['jobs', 'feed', params] as const;

export function useJobFeed(params: ListJobsParams = {}) {
  return useQuery({
    queryKey: jobFeedQueryKey(params),
    queryFn: () => jobsService.listJobs(params),
    select: (result) => ({
      ...result,
      cards: result.items.map((job, index) => mapJobListDtoToCard(job, index)),
    }),
  });
}
