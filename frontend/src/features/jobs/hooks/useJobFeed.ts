import { useInfiniteQuery } from '@tanstack/react-query';

import { jobsService } from '@/features/jobs/services/jobs.service';
import type { ListJobsParams } from '@/features/jobs/types/job.types';
import { mapJobListDtoToCard } from '@/features/jobs/utils/mapJobToCard';

export type JobFeedQueryParams = Omit<ListJobsParams, 'page'>;

export const jobFeedQueryKey = (params: JobFeedQueryParams) => ['jobs', 'feed', params] as const;

export function useJobFeed(params: JobFeedQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: jobFeedQueryKey(params),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      jobsService.listJobs({ ...params, page: pageParam }, { signal }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    select: (result) => {
      const items = result.pages.flatMap((page) => page.items);
      const firstPage = result.pages[0];
      const lastPage = result.pages[result.pages.length - 1];

      return {
        cards: items.map((job, index) => mapJobListDtoToCard(job, index)),
        totalItems: firstPage?.pagination.totalItems ?? items.length,
        pagination: lastPage?.pagination,
      };
    },
  });
}
