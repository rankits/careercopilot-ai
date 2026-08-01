import express from 'express';
import {
  jobsHealthController,
  triggerJobsController,
} from '@/modules/jobs/controllers/jobs.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { JOBS_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import { triggerJobsSchema } from '@/modules/jobs/validations/jobs.schema.js';

const router = express.Router();

router.get(
  '/health',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(JOBS_PERMISSIONS.READ),
  jobsHealthController,
);
router.post(
  '/trigger',
  authMiddleware,
  requirePrincipalType('ADMIN'),
  requirePermission(JOBS_PERMISSIONS.CREATE),
  validateResource(triggerJobsSchema),
  triggerJobsController,
);

export default router;
