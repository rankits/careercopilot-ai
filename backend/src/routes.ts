import { applicationRoutes } from '@/modules/application-management/index.js';
import { connectedAccountsRoutes } from '@/modules/connected-accounts/index.js';
import { aiMailRoutes } from '@/modules/ai-mail/index.js';
import { autoApplyRoutes } from '@/modules/auto-apply/index.js';
import express from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { authRoutes } from '@/modules/auth/index.js';
import { userRoutes } from '@/modules/user/index.js';
import { adminRoutes } from '@/modules/admin/index.js';
import { resumeRoutes } from '@/modules/resumes/index.js';
import { resumeAnalysisRoutes } from '@/modules/resume-analysis/index.js';
import jobsRoutes from '@/modules/jobs/routes/jobs.route.js';
import { jobListingRoutes } from '@/modules/job-listing/index.js';
import { recommendationsRoutes } from '@/modules/recommendations/index.js';
import { copilotRoutes } from '@/modules/copilot/index.js';
import extensionRoutes from '@/modules/extension/index.js';

const router = express.Router();

router.get('/status', (_req, res) => {
  res.status(200).json(successResponse('API v1 is operational'));
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/resumes', resumeRoutes);
router.use('/resume-analysis', resumeAnalysisRoutes);
router.use('/jobs', jobListingRoutes); // Public job discovery
router.use('/jobs-ingestion', jobsRoutes); // Administrative ingestion endpoints
router.use('/applications', applicationRoutes);
router.use('/ai-mail', aiMailRoutes);
router.use('/auto-apply', autoApplyRoutes);
router.use('/job-recommendations', recommendationsRoutes);
router.use('/copilot', copilotRoutes);
router.use('/extension', extensionRoutes);
router.use('/connected-accounts', connectedAccountsRoutes);

export default router;
