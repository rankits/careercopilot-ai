import express from 'express';

import { ExtensionAnswersController } from '@/modules/extension/controllers/answers.controller.js';
import { ExtensionDraftAnswerController } from '@/modules/extension/controllers/draft-answer.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { requirePrincipalType } from '@/shared/middlewares/rbac.middleware.js';

const router = express.Router();

const requireUser = [authMiddleware, requirePrincipalType('USER')] as const;

router.get('/answers', ...requireUser, ExtensionAnswersController.getAnswers);

router.post('/draft-answer', ...requireUser, ExtensionDraftAnswerController.generateDraft);

export const extensionAnswersRouter = router;
