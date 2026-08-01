import { useQuery } from '@tanstack/react-query';

import { JobNotFoundError, jobsService } from '@/features/jobs/services/jobs.service';

export const jobDetailQueryKey = (jobId: string) => ['jobs', 'detail', jobId] as const;

export function useJobDetail(jobId: string | undefined) {
  return useQuery({
    queryKey: jobDetailQueryKey(jobId ?? ''),
    queryFn: ({ signal }) => jobsService.getJob(jobId as string, { signal }),
    enabled: Boolean(jobId),
    retry: (failureCount, error) => {
      if (error instanceof JobNotFoundError) return false;
      return failureCount < 2;
    },
  });
}
