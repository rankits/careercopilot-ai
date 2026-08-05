import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  IApprovedResumeVersionRepository,
  IResumeOwnershipLookup,
} from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';
import {
  CreateApprovedResumeVersionInput,
  UpdateApprovedResumeVersionInput,
} from '@/modules/auto-apply/validations/resume-version.validation.js';

export class ApprovedResumeVersionService {
  constructor(
    private readonly repository: IApprovedResumeVersionRepository,
    private readonly resumeOwnership: IResumeOwnershipLookup,
  ) {}

  async listVersions(userId: string): Promise<ApprovedResumeVersionDto[]> {
    return this.repository.findManyByUserId(userId);
  }

  async createVersion(
    userId: string,
    input: CreateApprovedResumeVersionInput,
  ): Promise<ApprovedResumeVersionDto> {
    const ownsResume = await this.resumeOwnership.belongsToUser(input.resumeId, userId);
    if (!ownsResume) {
      throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
    }
    return this.repository.create({
      userId,
      resumeId: input.resumeId,
      label: input.label,
      category: input.category,
      tags: input.tags ?? [],
      isActive: input.isActive,
    });
  }

  async updateVersion(
    userId: string,
    id: string,
    input: UpdateApprovedResumeVersionInput,
  ): Promise<ApprovedResumeVersionDto> {
    return this.repository.update(userId, id, input);
  }

  async deleteVersion(userId: string, id: string): Promise<boolean> {
    return this.repository.delete(userId, id);
  }
}
