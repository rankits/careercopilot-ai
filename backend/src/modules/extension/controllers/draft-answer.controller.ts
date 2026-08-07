import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/shared/config/db.conf.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  OpenRouterDraftAnswerGenerator,
  TemplateDraftAnswerGenerator,
} from '@/modules/auto-apply/services/draft-answer-generation.service.js';
import { PrismaResumeTextLookup } from '@/modules/auto-apply/repositories/prisma-resume-text.lookup.js';
import { getOperationLogger } from '@/modules/auto-apply/middlewares/operation-id.middleware.js';

const resumeTextLookup = new PrismaResumeTextLookup();
const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
const draftAnswerGenerator = hasOpenRouter
  ? new OpenRouterDraftAnswerGenerator()
  : new TemplateDraftAnswerGenerator();

export class ExtensionDraftAnswerController {
  static async generateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireUserPrincipalId(req);
      const { question } = req.body;

      if (!question || typeof question !== 'string') {
        throw new AppError('Question is required and must be a string', 400, 'BAD_REQUEST');
      }

      // Check consent
      const consent = await prisma.applicationConsent.findFirst({
        where: {
          userId,
          consentType: 'CONTENT_GENERATION',
          revokedAt: null,
        },
      });

      if (!consent) {
        throw new AppError(
          'CONTENT_GENERATION consent is required to draft answers with AI.',
          403,
          'CONSENT_REQUIRED',
        );
      }

      // Find active resume version
      const activeVersion = await prisma.approvedResumeVersion.findFirst({
        where: {
          userId,
          isActive: true,
        },
      });

      if (!activeVersion) {
        throw new AppError('No active resume found for drafting.', 400, 'NO_ACTIVE_RESUME');
      }

      const resumeText = await resumeTextLookup.findResumeTextForUser(userId, activeVersion.resumeId);
      if (!resumeText) {
        throw new AppError('Active resume has no extracted text.', 400, 'RESUME_TEXT_MISSING');
      }

      const candidateName = null;

      const draft = await draftAnswerGenerator.generate({
        question,
        resumeText,
        candidateName,
      });

      res.status(200).json({
        data: {
          draft,
          requiresApproval: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
