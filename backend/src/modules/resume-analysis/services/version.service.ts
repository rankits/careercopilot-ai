import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  assertOwnedResume,
  ownedAnalysisWhere,
} from '@/modules/resume-analysis/services/resume-analysis.shared.js';

export const versionService = {
  async saveVersion(resumeId: string, userId: string, label: string, contentOverride?: string) {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
      include: { resume: { select: { originalName: true } } },
    });
    if (!analysis) throw new AppError('Analysis not found', 404);

    const content =
      contentOverride?.trim() ||
      analysis.editedContent ||
      `Resume optimized for: ${analysis.targetRole}\nATS Score: ${analysis.atsScore}`;

    return prisma.resumeVersion.create({
      data: {
        analysisId: analysis.id,
        label,
        content,
        atsScore: analysis.atsScore,
        targetRole: analysis.targetRole,
        jobDescription: analysis.jobDescription,
        resumeFileName: analysis.resume.originalName,
      },
    });
  },

  async getVersions(resumeId: string, userId: string) {
    await assertOwnedResume(resumeId, userId);
    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
    });
    if (!analysis) return [];

    const versions = await prisma.resumeVersion.findMany({
      where: { analysisId: analysis.id },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((version) => ({
      ...version,
      targetRole: version.targetRole ?? analysis.targetRole,
      jobDescription: version.jobDescription ?? analysis.jobDescription,
      resumeId,
    }));
  },

  async listSavedVersions(userId: string) {
    const versions = await prisma.resumeVersion.findMany({
      where: { analysis: { resume: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        analysis: {
          select: {
            resumeId: true,
            targetRole: true,
            jobDescription: true,
            resume: { select: { originalName: true } },
          },
        },
      },
    });

    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      content: version.content,
      atsScore: version.atsScore,
      createdAt: version.createdAt,
      targetRole: version.targetRole ?? version.analysis.targetRole,
      jobDescription: version.jobDescription ?? version.analysis.jobDescription,
      resumeFileName: version.resumeFileName ?? version.analysis.resume.originalName,
      resumeId: version.analysis.resumeId,
    }));
  },

  async getSavedVersion(versionId: number, userId: string) {
    const version = await prisma.resumeVersion.findFirst({
      where: { id: versionId, analysis: { resume: { userId } } },
      include: {
        analysis: {
          select: {
            resumeId: true,
            targetRole: true,
            jobDescription: true,
            resume: { select: { originalName: true } },
          },
        },
      },
    });
    if (!version) throw new AppError('Saved resume version not found', 404);

    return {
      id: version.id,
      label: version.label,
      content: version.content,
      atsScore: version.atsScore,
      createdAt: version.createdAt,
      targetRole: version.targetRole ?? version.analysis.targetRole,
      jobDescription: version.jobDescription ?? version.analysis.jobDescription,
      resumeFileName: version.resumeFileName ?? version.analysis.resume.originalName,
      resumeId: version.analysis.resumeId,
    };
  },

  async deleteSavedVersion(versionId: number, userId: string) {
    const version = await prisma.resumeVersion.findFirst({
      where: { id: versionId, analysis: { resume: { userId } } },
    });
    if (!version) throw new AppError('Saved resume version not found', 404);
    await prisma.resumeVersion.delete({ where: { id: versionId } });
    return { id: versionId };
  },
};
