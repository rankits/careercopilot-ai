import express from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { authRoutes } from '@/modules/auth/index.js';
import jobsRoutes from '@/modules/jobs/routes/jobs.route.js';
import { jobListingRoutes } from '@/modules/job-listing/index.js';
import { resumeRoutes } from '@/modules/resumes/index.js';
import { applicationRoutes } from '@/modules/application-management/index.js';

const router = express.Router();

router.get('/status', (_req, res) => {
  res.status(200).json(successResponse('API v1 is operational'));
});

router.use('/auth', authRoutes);
router.use('/jobs', jobListingRoutes); // Public job discovery
router.use('/jobs-ingestion', jobsRoutes); // Administrative ingestion endpoints
router.use('/resumes', resumeRoutes);
router.use('/applications', applicationRoutes);

export default router;
