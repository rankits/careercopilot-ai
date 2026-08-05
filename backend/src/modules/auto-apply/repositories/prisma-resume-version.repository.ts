import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  DeleteApprovedResumeVersionResult,
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
    return prisma.$transaction(async (tx) => {
      const existing = await tx.approvedResumeVersion.findMany({
        where: { userId: data.userId },
        orderBy: { createdAt: 'desc' },
      });

      const hasDefault = existing.some((row) => row.isActive);
      const shouldBeDefault = existing.length === 0 || !hasDefault;

      if (shouldBeDefault) {
        await tx.approvedResumeVersion.updateMany({
          where: { userId: data.userId, isActive: true },
          data: { isActive: false },
        });
      }

      const record = await tx.approvedResumeVersion.create({
        data: {
          ...data,
          isActive: shouldBeDefault ? true : false,
        },
      });
      return toDto(record);
    });
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

    if (data.isActive === true) {
      return prisma.$transaction(async (tx) => {
        await tx.approvedResumeVersion.updateMany({
          where: { userId, isActive: true, NOT: { id: existing.id } },
          data: { isActive: false },
        });
        const record = await tx.approvedResumeVersion.update({
          where: { id: existing.id },
          data: { ...data, isActive: true },
        });
        return toDto(record);
      });
    }

    const record = await prisma.approvedResumeVersion.update({
      where: { id: existing.id },
      data,
    });
    return toDto(record);
  }

  async delete(userId: string, id: string): Promise<DeleteApprovedResumeVersionResult> {
    const existing = await prisma.approvedResumeVersion.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Approved resume version not found', 404, 'RESUME_VERSION_NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      const wasDefault = existing.isActive;
      await tx.approvedResumeVersion.delete({ where: { id: existing.id } });

      if (!wasDefault) {
        return { deleted: true, newDefaultResumeVersionId: null, newDefaultLabel: null };
      }

      const nextDefault = await tx.approvedResumeVersion.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!nextDefault) {
        return { deleted: true, newDefaultResumeVersionId: null, newDefaultLabel: null };
      }

      await tx.approvedResumeVersion.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      const promoted = await tx.approvedResumeVersion.update({
        where: { id: nextDefault.id },
        data: { isActive: true },
      });

      return {
        deleted: true,
        newDefaultResumeVersionId: promoted.id,
        newDefaultLabel: promoted.label,
      };
    });
  }
}

export class PrismaResumeOwnershipLookup implements IResumeOwnershipLookup {
  async belongsToUser(resumeId: string, userId: string): Promise<boolean> {
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    return resume !== null && resume.userId === userId;
  }
}
