import { NextFunction, Request, Response } from 'express';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';
import { resumeService } from '@/modules/resumes/services/resume.service.js';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export const downloadResumeBlobController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);

    // Get the user's active resume
    const activeResume = await prisma.approvedResumeVersion.findFirst({
      where: { userId, isActive: true },
    });

    if (!activeResume?.resumeId) {
      throw new AppError('No active resume found', 404, 'NOT_FOUND');
    }

    const downloaded = await resumeService.downloadResume(activeResume.resumeId, userId);

    res.setHeader('Content-Type', downloaded.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloaded.originalName}"`);
    return res.status(200).send(downloaded.buffer);
  } catch (error) {
    return next(error);
  }
};
