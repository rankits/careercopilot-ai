import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { APPLICATIONS_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  createApplicationController,
  getApplicationsController,
  getApplicationByIdController,
  updateApplicationController,
  transitionStatusController,
  archiveApplicationController,
  unarchiveApplicationController,
  deleteApplicationController,
  addNoteController,
  deleteNoteController,
  addTaskController,
  updateTaskController,
  deleteTaskController,
} from '@/modules/application-management/controllers/application.controller.js';
import {
  CreateApplicationSchema,
  UpdateApplicationSchema,
  StatusTransitionSchema,
  CreateNoteSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
} from '@/modules/application-management/validations/application.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

// Application Root CRUD & Listing
router.post(
  '/',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.CREATE_OWN),
  validateResource(
    z.object({
      body: CreateApplicationSchema,
    }),
  ),
  createApplicationController,
);

router.get(
  '/',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.READ_OWN),
  getApplicationsController,
);

router.get(
  '/:id',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.READ_OWN),
  getApplicationByIdController,
);

router.patch(
  '/:id',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  validateResource(
    z.object({
      body: UpdateApplicationSchema,
    }),
  ),
  updateApplicationController,
);

router.delete(
  '/:id',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.DELETE_OWN),
  deleteApplicationController,
);

// Lifecycle Transitions & Archiving
router.post(
  '/:id/status-transitions',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  validateResource(
    z.object({
      body: StatusTransitionSchema,
    }),
  ),
  transitionStatusController,
);

router.post(
  '/:id/archive',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  archiveApplicationController,
);
router.post(
  '/:id/unarchive',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  unarchiveApplicationController,
);

// Notes Sub-resource
router.post(
  '/:id/notes',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  validateResource(
    z.object({
      body: CreateNoteSchema,
    }),
  ),
  addNoteController,
);
router.delete(
  '/:id/notes/:noteId',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  deleteNoteController,
);

// Tasks Sub-resource
router.post(
  '/:id/tasks',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  validateResource(
    z.object({
      body: CreateTaskSchema,
    }),
  ),
  addTaskController,
);

router.patch(
  '/:id/tasks/:taskId',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  validateResource(
    z.object({
      body: UpdateTaskSchema,
    }),
  ),
  updateTaskController,
);

router.delete(
  '/:id/tasks/:taskId',
  ...requireUser,
  requirePermission(APPLICATIONS_PERMISSIONS.UPDATE_OWN),
  deleteTaskController,
);

export default router;
