import { IJobSearchRepository } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import type { IApplicationRepository } from '@/modules/application-management/contracts/application.repository.js';
import {
  JobSearchOptions,
  PaginatedJobResult,
  JobListDto,
  JobDetailDto,
} from '@/modules/job-listing/types/job-listing.types.js';
import { jobAgePolicy } from '@/modules/jobs/policies/job-age-policy.js';

export class JobListingService {
  constructor(
    private readonly searchRepository: IJobSearchRepository,
    private readonly applicationRepository?: Pick<IApplicationRepository, 'findSavedJobIds'>,
  ) {}

  async searchJobs(
    options: JobSearchOptions,
    userId?: string,
  ): Promise<PaginatedJobResult<JobListDto>> {
    const storageCutoff = jobAgePolicy.getStorageCutoffDate();
    const result = storageCutoff
      ? await this.searchRepository.search({
          ...options,
          filters: {
            ...options.filters,
            postedSince:
              !options.filters.postedSince || options.filters.postedSince < storageCutoff
                ? storageCutoff
                : options.filters.postedSince,
          },
        })
      : await this.searchRepository.search(options);

    if (!userId || result.items.length === 0 || !this.applicationRepository) {
      return result;
    }

    const savedJobIds = new Set(
      await this.applicationRepository.findSavedJobIds(
        userId,
        result.items.map((item) => item.id),
      ),
    );

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        isSaved: savedJobIds.has(item.id),
      })),
    };
  }

  async getJobDetails(id: string, userId?: string): Promise<JobDetailDto | null> {
    const job = await this.searchRepository.findById(id);
    if (!job || !userId || !this.applicationRepository) {
      return job;
    }

    const savedJobIds = await this.applicationRepository.findSavedJobIds(userId, [id]);
    return {
      ...job,
      isSaved: savedJobIds.includes(id),
    };
  }
}
