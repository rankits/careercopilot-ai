import { Router } from 'express';

import { downloadResumeBlobController } from '@/modules/extension/controllers/resume.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';

export const extensionResumeRouter = Router();

extensionResumeRouter.get('/resume-blob', authMiddleware, downloadResumeBlobController);
