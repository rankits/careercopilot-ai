import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  IApprovedResumeVersionRepository,
  IResumeOwnershipLookup,
} from '@/modules/auto-apply/contracts/resume-version.contract.js';
import { ApprovedResumeVersionDto } from '@/modules/auto-apply/types/resume-version.types.js';

function toDto(record: {
  id: string;
  userId: string;
  resumeId: string;
  label: string;
  category: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ApprovedResumeVersionDto {
  return { ...record, tags: record.tags ?? [] };
}

export class PrismaApprovedResumeVersionRepository implements IApprovedResumeVersionRepository {
  async findManyByUserId(userId: string): Promise<ApprovedResumeVersionDto[]> {
    const records = await prisma.approvedResumeVersion.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return records.map(toDto);
  }

  async findById(userId: string, id: string): Promise<ApprovedResumeVersionDto | null> {
    const record = await prisma.approvedResumeVersion.findFirst({ where: { id, userId } });
    return record ? toDto(record) : null;
  }

  async create(data: {
    userId: string;
    resumeId: string;
    label: string;
    category: string;
    tags: string[];
    isActive: boolean;
  }): Promise<ApprovedResumeVersionDto> {
    const record = await prisma.approvedResumeVersion.create({ data });
    return toDto(record);
  }

  async update(
    userId: string,
    id: string,
    data: { label?: string; category?: string; tags?: string[]; isActive?: boolean },
  ): Promise<ApprovedResumeVersionDto> {
    const existing = await prisma.approvedResumeVersion.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Approved resume version not found', 404, 'RESUME_VERSION_NOT_FOUND');
    }
    const record = await prisma.approvedResumeVersion.update({ where: { id: existing.id }, data });
    return toDto(record);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await prisma.approvedResumeVersion.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Approved resume version not found', 404, 'RESUME_VERSION_NOT_FOUND');
    }
    await prisma.approvedResumeVersion.delete({ where: { id: existing.id } });
    return true;
  }
}

export class PrismaResumeOwnershipLookup implements IResumeOwnershipLookup {
  async belongsToUser(resumeId: string, userId: string): Promise<boolean> {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    return resume !== null && resume.userId === userId;
  }
}
