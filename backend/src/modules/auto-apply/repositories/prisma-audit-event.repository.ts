import { AutoApplyEventType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import {
  IAutoApplyEventRepository,
  RecordAuditEventData,
} from '@/modules/auto-apply/contracts/audit-event.contract.js';
import { AutoApplyAuditEventDto } from '@/modules/auto-apply/types/audit-event.types.js';

function toDto(record: {
  id: string;
  userId: string;
  jobApplicationId: string | null;
  eventType: AutoApplyEventType;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): AutoApplyAuditEventDto {
  return {
    ...record,
    eventType: record.eventType as AutoApplyAuditEventDto['eventType'],
    metadata: (record.metadata ?? {}) as Record<string, unknown>,
  };
}

export class PrismaAutoApplyEventRepository implements IAutoApplyEventRepository {
  async record(data: RecordAuditEventData): Promise<AutoApplyAuditEventDto> {
    const record = await prisma.autoApplyAuditEvent.create({
      data: {
        userId: data.userId,
        jobApplicationId: data.jobApplicationId,
        eventType: data.eventType as AutoApplyEventType,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    return toDto(record);
  }

  async findManyByUserId(userId: string, limit: number): Promise<AutoApplyAuditEventDto[]> {
    const records = await prisma.autoApplyAuditEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records.map(toDto);
  }
}
