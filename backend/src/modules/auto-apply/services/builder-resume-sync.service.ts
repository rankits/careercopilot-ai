import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';

export type SyncBuilderResumeResult = {
  approvedResumeVersionId: string;
  resumeVersionId: string;
  builderResumeVersionId: number;
  resumeId: string;
};

/**
 * After Resume Builder saveVersion, pin the Builder content onto an ApprovedResumeVersion
 * and select it for the Assisted Apply application.
 */
export class BuilderResumeSyncService {
  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly consents: IApplicationConsentRepository,
  ) {}

  async syncFromBuilderVersion(input: {
    userId: string;
    jobApplicationId: string;
    resumeId: string;
    builderVersionId: number;
    label?: string;
  }): Promise<SyncBuilderResumeResult> {
    const consent = await this.consents.findActiveByType(input.userId, 'RESUME_USAGE');
    if (!consent) {
      throw new AppError(
        'Grant resume usage consent before selecting a resume.',
        403,
        'CONSENT_REQUIRED',
      );
    }

    const application = await this.applications.findById(input.userId, input.jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const resume = await prisma.resume.findFirst({
      where: { id: input.resumeId, userId: input.userId },
      select: { id: true, originalName: true },
    });
    if (!resume) {
      throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
    }

    const builderVersion = await prisma.resumeVersion.findFirst({
      where: {
        id: input.builderVersionId,
        analysis: { resumeId: input.resumeId, resume: { userId: input.userId } },
      },
      select: { id: true, label: true, content: true },
    });
    if (!builderVersion?.content?.trim()) {
      throw new AppError(
        'Builder resume version not found or has no content.',
        404,
        'BUILDER_VERSION_NOT_FOUND',
      );
    }

    const label =
      input.label?.trim() ||
      builderVersion.label?.trim() ||
      resume.originalName ||
      'Improved resume';

    const approved = await prisma.$transaction(async (tx) => {
      const existing = await tx.approvedResumeVersion.findFirst({
        where: { userId: input.userId, resumeId: input.resumeId },
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      });

      if (existing) {
        return tx.approvedResumeVersion.update({
          where: { id: existing.id },
          data: {
            builderResumeVersionId: builderVersion.id,
            label: label.slice(0, 120),
          },
        });
      }

      const hasAny = await tx.approvedResumeVersion.count({ where: { userId: input.userId } });
      if (hasAny === 0) {
        // first approved becomes default
      } else {
        // keep existing defaults; new row is non-active unless none exist
      }

      return tx.approvedResumeVersion.create({
        data: {
          userId: input.userId,
          resumeId: input.resumeId,
          label: label.slice(0, 120),
          category: 'general',
          tags: [],
          builderResumeVersionId: builderVersion.id,
          isActive: hasAny === 0,
        },
      });
    });

    await this.applications.updateResumeSelection(
      input.userId,
      input.jobApplicationId,
      approved.id,
    );

    return {
      approvedResumeVersionId: approved.id,
      resumeVersionId: approved.id,
      builderResumeVersionId: builderVersion.id,
      resumeId: input.resumeId,
    };
  }
}
