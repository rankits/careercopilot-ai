import express from 'express';
import { z } from 'zod';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { generateAutofillAnswersController } from '@/modules/extension/controllers/autofill.controller.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

const AutofillRequestSchema = z.object({
  body: z.object({
    url: z.string().url(),
    fields: z.array(
      z.object({
        identifier: z.string(),
        tagName: z.string(),
        type: z.string(),
        name: z.string().optional(),
        label: z.string(),
      }),
    ),
  }),
});

router.post(
  '/autofill',
  ...requireUser,
  validateResource(AutofillRequestSchema),
  generateAutofillAnswersController,
);

export default router;
