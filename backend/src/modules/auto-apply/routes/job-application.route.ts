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
} from '@/modules/auto-apply/controllers/job-application.controller.js';
import {
  InitiateJobApplicationSchema,
  JobApplicationStatusTransitionSchema,
} from '@/modules/auto-apply/validations/job-application.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

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

export default router;
