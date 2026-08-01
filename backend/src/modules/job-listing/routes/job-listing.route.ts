import express from 'express';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { jobListingRateLimiter } from '@/shared/middlewares/rateLimiter.js';
import {
  searchJobsController,
  getJobByIdController,
} from '@/modules/job-listing/controllers/job-listing.controller.js';
import {
  jobSearchQuerySchema,
  jobIdParamsSchema,
} from '@/modules/job-listing/validations/job-listing.schema.js';

const router = express.Router();

router.get(
  '/',
  jobListingRateLimiter,
  validateResource(jobSearchQuerySchema),
  searchJobsController,
);
router.get(
  '/:jobId',
  jobListingRateLimiter,
  validateResource(jobIdParamsSchema),
  getJobByIdController,
);

export default router;
