import express from 'express';
import candidateProfileRoutes from '@/modules/auto-apply/routes/candidate-profile.route.js';
import applicationAnswerRoutes from '@/modules/auto-apply/routes/application-answer.route.js';
import resumeVersionRoutes from '@/modules/auto-apply/routes/resume-version.route.js';
import applicationRuleRoutes from '@/modules/auto-apply/routes/application-rule.route.js';
import eligibilityRoutes from '@/modules/auto-apply/routes/eligibility.route.js';
import channelDetectionRoutes from '@/modules/auto-apply/routes/channel-detection.route.js';
import plannerRoutes from '@/modules/auto-apply/routes/planner.route.js';
import applicationConsentRoutes from '@/modules/auto-apply/routes/application-consent.route.js';
import jobApplicationRoutes from '@/modules/auto-apply/routes/job-application.route.js';
import vacancyEmailRoutes from '@/modules/auto-apply/routes/vacancy-email.route.js';
import auditEventRoutes from '@/modules/auto-apply/routes/audit-event.route.js';
import adminDiagnosticsRoutes from '@/modules/auto-apply/routes/admin-diagnostics.route.js';
import applicationReadinessRoutes from '@/modules/auto-apply/routes/application-readiness.route.js';
import applicationAnalysisRoutes from '@/modules/auto-apply/routes/application-analysis.route.js';
import setupStatusRoutes from '@/modules/auto-apply/routes/setup-status.route.js';
import privacyAcknowledgementRoutes from '@/modules/auto-apply/routes/privacy-acknowledgement.route.js';

const router = express.Router();

router.use('/profile', candidateProfileRoutes);
router.use('/answers', applicationAnswerRoutes);
router.use('/resume-versions', resumeVersionRoutes);
router.use('/rules', applicationRuleRoutes);
router.use('/eligibility', eligibilityRoutes);
router.use('/readiness', applicationReadinessRoutes);
router.use('/jobs/:jobId', applicationAnalysisRoutes);
router.use('/channel', channelDetectionRoutes);
router.use('/plan', plannerRoutes);
router.use('/consents', applicationConsentRoutes);
router.use('/submissions', jobApplicationRoutes);
router.use('/vacancy-email', vacancyEmailRoutes);
router.use('/events', auditEventRoutes);
router.use('/admin', adminDiagnosticsRoutes);
router.use('/setup-status', setupStatusRoutes);
router.use('/privacy-acknowledgement', privacyAcknowledgementRoutes);

export default router;
