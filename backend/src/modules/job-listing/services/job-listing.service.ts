import { IJobSearchRepository } from "../contracts/IJobSearchRepository.js";
import {
  JobSearchOptions,
  PaginatedJobResult,
  JobListDto,
  JobDetailDto,
} from "../types/job-listing.types.js";

export class JobListingService {
  constructor(private readonly searchRepository: IJobSearchRepository) {}

  async searchJobs(options: JobSearchOptions): Promise<PaginatedJobResult<JobListDto>> {
    return this.searchRepository.search(options);
  }

  async getJobDetails(id: string): Promise<JobDetailDto | null> {
    return this.searchRepository.findById(id);
  }
}
