import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  listJobApplicationsController,
  getJobApplicationController,
  initiateJobApplicationController,
  evaluateJobApplicationEligibilityController,
  transitionJobApplicationStatusController,
  withdrawJobApplicationController,
  deleteJobApplicationController,
  reopenJobApplicationController,
} from '@/modules/auto-apply/controllers/job-application.controller.js';
import {
  approveSubmissionController,
  queueSubmissionController,
  confirmSubmissionController,
  retrySubmissionController,
} from '@/modules/auto-apply/controllers/submission-orchestration.controller.js';
import {
  getAssistedApplyWorkspaceController,
  updateWorkspaceProgressStepController,
} from '@/modules/auto-apply/controllers/assisted-apply-workspace.controller.js';
import {
  updateResumeSelectionController,
  analyzeResumeForApplicationController,
  handoffApplicationController,
} from '@/modules/auto-apply/controllers/assisted-apply-resume-handoff.controller.js';
import { operationIdMiddleware } from '@/modules/auto-apply/middlewares/operation-id.middleware.js';
import {
  InitiateJobApplicationSchema,
  JobApplicationStatusTransitionSchema,
} from '@/modules/auto-apply/validations/job-application.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

const ProgressStepBodySchema = z.object({
  body: z.object({
    progressStep: z.enum(['analysis', 'fit', 'resume', 'open', 'done']),
  }),
});

const ResumeSelectionBodySchema = z.object({
  body: z.object({
    resumeVersionId: z.string().uuid(),
  }),
});

const ResumeAnalysisBodySchema = z.object({
  body: z
    .object({
      forceRefresh: z.boolean().optional(),
    })
    .optional()
    .default({}),
});

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_READ_OWN),
  listJobApplicationsController,
);

router.post(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_CREATE_OWN),
  validateResource(z.object({ body: InitiateJobApplicationSchema })),
  initiateJobApplicationController,
);

router.get(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_READ_OWN),
  getJobApplicationController,
);

router.get(
  '/:id/workspace',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_READ_OWN),
  getAssistedApplyWorkspaceController,
);

router.patch(
  '/:id/progress-step',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  validateResource(ProgressStepBodySchema),
  updateWorkspaceProgressStepController,
);

router.patch(
  '/:id/resume-selection',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  validateResource(ResumeSelectionBodySchema),
  updateResumeSelectionController,
);

router.post(
  '/:id/resume-analysis',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_READ_OWN),
  validateResource(ResumeAnalysisBodySchema),
  analyzeResumeForApplicationController,
);

router.post(
  '/:id/handoff',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  operationIdMiddleware,
  handoffApplicationController,
);

router.post(
  '/:id/evaluate-eligibility',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  evaluateJobApplicationEligibilityController,
);

router.post(
  '/:id/status-transitions',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  validateResource(z.object({ body: JobApplicationStatusTransitionSchema })),
  transitionJobApplicationStatusController,
);

router.post(
  '/:id/withdraw',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_DELETE_OWN),
  withdrawJobApplicationController,
);

router.post(
  '/:id/reopen',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_CREATE_OWN),
  reopenJobApplicationController,
);

router.delete(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_DELETE_OWN),
  deleteJobApplicationController,
);

router.post(
  '/:id/approve',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  approveSubmissionController,
);

router.post(
  '/:id/queue',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  queueSubmissionController,
);

router.post(
  '/:id/confirm',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  confirmSubmissionController,
);

router.post(
  '/:id/retry',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.SUBMISSIONS_UPDATE_OWN),
  retrySubmissionController,
);

export default router;
