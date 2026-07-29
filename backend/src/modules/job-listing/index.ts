import { PrismaJobSearchRepository } from "./repositories/prisma-job-search.repository.js";
import { JobListingService } from "./services/job-listing.service.js";
import jobListingRoutes from "./routes/job-listing.route.js";
import { JOB_SEARCH_REPOSITORY } from "./contracts/IJobSearchRepository.js";

// Initialize Dependency Injection
const prismaJobSearchRepository = new PrismaJobSearchRepository();

const jobListingService = new JobListingService(prismaJobSearchRepository);

export {
  jobListingRoutes,
  jobListingService,
  prismaJobSearchRepository,
  JOB_SEARCH_REPOSITORY,
};
