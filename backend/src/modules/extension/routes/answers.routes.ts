import express from 'express';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';
import { ExtensionAnswersController } from '../controllers/answers.controller.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get(
  '/answers',
  ...requireUser,
  ExtensionAnswersController.getAnswers
);

import { ExtensionDraftAnswerController } from '../controllers/draft-answer.controller.js';

router.post(
  '/draft-answer',
  ...requireUser,
  ExtensionDraftAnswerController.generateDraft
);

export const extensionAnswersRouter = router;
