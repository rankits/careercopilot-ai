import { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import {
  JobSearchOptions,
  PaginatedJobResult,
  JobListDto,
  JobDetailDto,
} from '@/modules/job-listing/types/job-listing.types.js';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';

export class JobListingService {
  constructor(private readonly searchRepository: IJobSearchRepository) {}

  async searchJobs(options: JobSearchOptions): Promise<PaginatedJobResult<JobListDto>> {
    const storageCutoff = jobAgePolicy.getStorageCutoffDate();
    if (!storageCutoff) {
      return this.searchRepository.search(options);
    }

    const postedSince =
      !options.filters.postedSince || options.filters.postedSince < storageCutoff
        ? storageCutoff
        : options.filters.postedSince;

    return this.searchRepository.search({
      ...options,
      filters: { ...options.filters, postedSince },
    });
  }

  async getJobDetails(id: string): Promise<JobDetailDto | null> {
    return this.searchRepository.findById(id);
  }
}
