import { AppError } from '@/shared/utils/errors/AppError.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import type { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';

export class ResumeSelectionService {
  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly resumeVersions: IApprovedResumeVersionRepository,
    private readonly consents: IApplicationConsentRepository,
  ) {}

  async selectResume(
    userId: string,
    jobApplicationId: string,
    resumeVersionId: string,
  ): Promise<{ resumeVersionId: string; isDefault: boolean }> {
    const consent = await this.consents.findActiveByType(userId, 'RESUME_USAGE');
    if (!consent) {
      throw new AppError(
        'Grant resume usage consent before selecting a resume.',
        403,
        'CONSENT_REQUIRED',
      );
    }

    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }

    const version = await this.resumeVersions.findById(userId, resumeVersionId);
    if (!version) {
      throw new AppError('Approved resume version not found', 404, 'RESUME_VERSION_NOT_FOUND');
    }

    await this.applications.updateResumeSelection(userId, jobApplicationId, resumeVersionId);

    return { resumeVersionId, isDefault: version.isActive };
  }

  async ensureDefaultSelection(
    userId: string,
    jobApplicationId: string,
  ): Promise<{ resumeVersionId: string | null; isDefault: boolean }> {
    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    if (application.resumeVersionId) {
      const existing = await this.resumeVersions.findById(userId, application.resumeVersionId);
      return {
        resumeVersionId: application.resumeVersionId,
        isDefault: existing?.isActive === true,
      };
    }

    const consent = await this.consents.findActiveByType(userId, 'RESUME_USAGE');
    if (!consent) {
      return { resumeVersionId: null, isDefault: false };
    }

    const versions = await this.resumeVersions.findManyByUserId(userId);
    const defaultVersion = versions.find((v) => v.isActive) ?? versions[0] ?? null;
    if (!defaultVersion) {
      return { resumeVersionId: null, isDefault: false };
    }

    await this.applications.updateResumeSelection(userId, jobApplicationId, defaultVersion.id);
    return { resumeVersionId: defaultVersion.id, isDefault: defaultVersion.isActive };
  }
}
