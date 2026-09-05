import { JOB_SEARCH_REPOSITORY } from '@/modules/job-listing/contracts/IJobSearchRepository.js';
import { PrismaJobSearchRepository } from '@/modules/job-listing/repositories/prisma-job-search.repository.js';
import jobListingRoutes from '@/modules/job-listing/routes/job-listing.route.js';
import { JobListingService } from '@/modules/job-listing/services/job-listing.service.js';
import { PrismaApplicationRepository } from '@/modules/application-management/index.js';

// Initialize Dependency Injection
const prismaJobSearchRepository = new PrismaJobSearchRepository();
const prismaApplicationRepository = new PrismaApplicationRepository();

const jobListingService = new JobListingService(
  prismaJobSearchRepository,
  prismaApplicationRepository,
);

export { jobListingRoutes, jobListingService, prismaJobSearchRepository, JOB_SEARCH_REPOSITORY };
