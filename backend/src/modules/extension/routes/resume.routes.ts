import { Router } from 'express';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { downloadResumeBlobController } from '../controllers/resume.controller.js';

export const extensionResumeRouter = Router();

extensionResumeRouter.get('/resume-blob', authMiddleware, downloadResumeBlobController);
