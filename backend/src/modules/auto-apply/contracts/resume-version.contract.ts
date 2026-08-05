import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';

export interface IApprovedResumeVersionRepository {
  findManyByUserId(userId: string): Promise<ApprovedResumeVersionDto[]>;
  findById(userId: string, id: string): Promise<ApprovedResumeVersionDto | null>;
  create(data: {
    userId: string;
    resumeId: string;
    label: string;
    category: string;
    tags: string[];
    isActive: boolean;
  }): Promise<ApprovedResumeVersionDto>;
  update(
    userId: string,
    id: string,
    data: { label?: string; category?: string; tags?: string[]; isActive?: boolean },
  ): Promise<ApprovedResumeVersionDto>;
  delete(userId: string, id: string): Promise<boolean>;
}

/** Minimal read-only lookup this resource needs from the resumes domain —
 * mirrors application-management's existing convention of reading another
 * module's Prisma model directly (e.g. its `prisma.job.findUnique` lookup)
 * rather than importing that module's internals. */
export interface IResumeOwnershipLookup {
  belongsToUser(resumeId: string, userId: string): Promise<boolean>;
}
