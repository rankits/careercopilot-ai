import express from 'express';
import { z } from 'zod';

import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { validateResource } from '@/shared/middlewares/validateResource.js';
import {
  getConnectedAccounts,
  authorizeGoogle,
  googleCallback,
  disconnectAccount,
} from '@/modules/connected-accounts/controllers/connected-accounts.controller.js';

const router = express.Router();

const withEnvelope = (body: z.ZodTypeAny) =>
  z.object({
    body,
    query: z.object({}).optional(),
    params: z.object({}).optional(),
  });

router.use(authMiddleware);

router.get('/', getConnectedAccounts);

router.post(
  '/google/authorize',
  validateResource(
    withEnvelope(
      z.object({
        returnPath: z.string().trim().max(512).optional(),
      }),
    ),
  ),
  authorizeGoogle,
);

router.post(
  '/google/callback',
  validateResource(
    withEnvelope(
      z.object({
        state: z.string().min(1),
        code: z.string().min(1),
      }),
    ),
  ),
  googleCallback,
);

router.delete('/:accountId', disconnectAccount);

export default router;
