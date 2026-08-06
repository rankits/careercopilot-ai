import { createHash } from 'node:crypto';

import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { ResolvedResumeContent } from '@/modules/auto-apply/types/resolved-resume-content.types.js';

export interface IResumeContentResolver {
  resolve(input: {
    userId: string;
    approvedResumeVersionId: string;
  }): Promise<ResolvedResumeContent>;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Canonical body text for an approved resume used by Assisted Apply.
 * Never uses label/category/tags as content.
 */
export class ResumeContentResolver implements IResumeContentResolver {
  async resolve(input: {
    userId: string;
    approvedResumeVersionId: string;
  }): Promise<ResolvedResumeContent> {
    const approved = await prisma.approvedResumeVersion.findFirst({
      where: { id: input.approvedResumeVersionId, userId: input.userId },
      select: {
        id: true,
        resumeId: true,
        builderResumeVersionId: true,
        updatedAt: true,
      },
    });
    if (!approved) {
      throw new AppError('Approved resume version not found', 404, 'RESUME_VERSION_NOT_FOUND');
    }

    const resume = await prisma.resume.findFirst({
      where: { id: approved.resumeId, userId: input.userId },
      select: { id: true },
    });
    if (!resume) {
      throw new AppError(
        'Resume content is unavailable for this approved version.',
        404,
        'RESUME_CONTENT_UNAVAILABLE',
      );
    }

    if (approved.builderResumeVersionId != null) {
      const builderVersion = await prisma.resumeVersion.findFirst({
        where: {
          id: approved.builderResumeVersionId,
          analysis: { resumeId: approved.resumeId, resume: { userId: input.userId } },
        },
        select: { id: true, content: true, createdAt: true },
      });
      const text = builderVersion?.content?.trim() ?? '';
      if (text) {
        return {
          approvedResumeVersionId: approved.id,
          resumeId: approved.resumeId,
          source: 'BUILDER_VERSION',
          builderVersionId: builderVersion!.id,
          text,
          contentHash: hashText(text),
          updatedAt: builderVersion!.createdAt,
        };
      }
    }

    const extraction = await prisma.resumeExtraction.findFirst({
      where: { resumeId: approved.resumeId },
      orderBy: { createdAt: 'desc' },
      select: { extractedText: true, createdAt: true },
    });
    const extractionText = extraction?.extractedText?.trim() ?? '';
    if (extractionText) {
      return {
        approvedResumeVersionId: approved.id,
        resumeId: approved.resumeId,
        source: 'UPLOADED_EXTRACTION',
        text: extractionText,
        contentHash: hashText(extractionText),
        updatedAt: extraction!.createdAt,
      };
    }

    // Last resort: latest builder edited content (still real body text — not metadata).
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId: approved.resumeId, resume: { userId: input.userId } },
      orderBy: { createdAt: 'desc' },
      select: { editedContent: true, updatedAt: true },
    });
    const edited = analysis?.editedContent?.trim() ?? '';
    if (edited) {
      return {
        approvedResumeVersionId: approved.id,
        resumeId: approved.resumeId,
        source: 'BUILDER_VERSION',
        text: edited,
        contentHash: hashText(edited),
        updatedAt: analysis!.updatedAt,
      };
    }

    throw new AppError(
      'No resume body text is available for this approved resume. Re-upload or save a Builder version first.',
      422,
      'RESUME_CONTENT_UNAVAILABLE',
    );
  }
}
