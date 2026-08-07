import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@/shared/config/db.conf.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';

export const ExtensionAnswersController = {
  getAnswers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = requireUserPrincipalId(req);

      const [answers, contentConsent] = await Promise.all([
        prisma.applicationAnswerProfile.findMany({
          where: {
            userId,
            sensitive: false,
          },
          select: {
            questionKey: true,
            answer: true,
          },
        }),
        prisma.applicationConsent.findFirst({
          where: {
            userId,
            consentType: 'CONTENT_GENERATION',
            revokedAt: null,
          }
        })
      ]);

      // Transform into a simple key-value object
      const answersMap = answers.reduce((acc, curr) => {
        acc[curr.questionKey] = curr.answer;
        return acc;
      }, {} as Record<string, string>);

      res.status(200).json({
        data: {
          answers: answersMap,
          contentGenerationAllowed: !!contentConsent
        }
      });
    } catch (error) {
      next(error);
    }
  },
};
