import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { ExportResult } from '@/modules/resume-analysis/types/resume-analysis.types.js';
import {
  assertOwnedResume,
  getResumeText,
  ownedAnalysisWhere,
} from '@/modules/resume-analysis/services/resume-analysis.shared.js';

const buildExportContent = (input: {
  baseName: string;
  targetRole?: string;
  atsScore?: number;
  content: string;
}) =>
  [
    `=== ${input.baseName} ===`,
    `Optimized for: ${input.targetRole ?? 'N/A'}`,
    `ATS Score: ${input.atsScore ?? 0}/100`,
    '',
    input.content,
  ].join('\n');

export const exportService = {
  async exportResume(
    resumeId: string,
    userId: string,
    format: 'pdf' | 'docx' | 'txt',
  ): Promise<ExportResult> {
    const resume = await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
      include: { keywords: true },
    });

    const resumeText = await getResumeText(resumeId, userId);
    const baseName = resume.originalName.replace(/\.[^.]+$/, '');
    const content = buildExportContent({
      baseName,
      targetRole: analysis?.targetRole,
      atsScore: analysis?.atsScore,
      content: analysis?.editedContent ?? resumeText,
    });

    if (format === 'txt') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'text/plain',
        fileName: `${baseName}_optimized.txt`,
      };
    }

    if (format === 'pdf') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'application/pdf',
        fileName: `${baseName}_optimized.pdf`,
      };
    }

    if (format === 'docx') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${baseName}_optimized.docx`,
      };
    }

    throw new AppError('Unsupported export format', 400);
  },
};
