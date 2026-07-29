import {
  JobSearchOptions,
  PaginatedJobResult,
  JobListDto,
  JobDetailDto,
} from '@/modules/job-listing/types/job-listing.types.js';

export const JOB_SEARCH_REPOSITORY = Symbol('JOB_SEARCH_REPOSITORY');

export interface IJobSearchRepository {
  search(options: JobSearchOptions): Promise<PaginatedJobResult<JobListDto>>;
  findById(id: string): Promise<JobDetailDto | null>;
}
