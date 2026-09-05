import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePermission, requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { AUTO_APPLY_PERMISSIONS } from '@/shared/rbac/permission.catalog.js';
import {
  listApplicationAnswersController,
  createApplicationAnswerController,
  updateApplicationAnswerController,
  deleteApplicationAnswerController,
} from '@/modules/auto-apply/controllers/application-answer.controller.js';
import {
  CreateApplicationAnswerSchema,
  UpdateApplicationAnswerSchema,
} from '@/modules/auto-apply/validations/application-answer.validation.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.ANSWERS_READ_OWN),
  listApplicationAnswersController,
);

router.post(
  '/',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.ANSWERS_CREATE_OWN),
  validateResource(z.object({ body: CreateApplicationAnswerSchema })),
  createApplicationAnswerController,
);

router.patch(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.ANSWERS_UPDATE_OWN),
  validateResource(z.object({ body: UpdateApplicationAnswerSchema })),
  updateApplicationAnswerController,
);

router.delete(
  '/:id',
  ...requireUser,
  requirePermission(AUTO_APPLY_PERMISSIONS.ANSWERS_DELETE_OWN),
  deleteApplicationAnswerController,
);

export default router;
