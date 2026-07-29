import { PrismaJobSearchRepository } from "@/modules/job-listing/repositories/prisma-job-search.repository.js";
import { JobListingService } from "@/modules/job-listing/services/job-listing.service.js";
import jobListingRoutes from "@/modules/job-listing/routes/job-listing.route.js";
import { JOB_SEARCH_REPOSITORY } from "@/modules/job-listing/contracts/IJobSearchRepository.js";

// Initialize Dependency Injection
const prismaJobSearchRepository = new PrismaJobSearchRepository();

const jobListingService = new JobListingService(prismaJobSearchRepository);

export {
  jobListingRoutes,
  jobListingService,
  prismaJobSearchRepository,
  JOB_SEARCH_REPOSITORY,
};
