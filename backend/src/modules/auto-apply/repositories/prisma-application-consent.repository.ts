import { ConsentType } from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import {
  ApplicationConsentDto,
  ConsentTypeValue,
} from '@/modules/auto-apply/types/application-consent.types.js';

function toDto(record: {
  id: string;
  userId: string;
  consentType: ConsentType;
  version: number;
  grantedAt: Date;
  revokedAt: Date | null;
}): ApplicationConsentDto {
  return { ...record, consentType: record.consentType as ConsentTypeValue };
}

export class PrismaApplicationConsentRepository implements IApplicationConsentRepository {
  async findManyByUserId(userId: string): Promise<ApplicationConsentDto[]> {
    const records = await prisma.applicationConsent.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
    return records.map(toDto);
  }

  async findActiveByType(
    userId: string,
    consentType: ConsentTypeValue,
  ): Promise<ApplicationConsentDto | null> {
    const record = await prisma.applicationConsent.findFirst({
      where: { userId, consentType: consentType as ConsentType, revokedAt: null },
      orderBy: { grantedAt: 'desc' },
    });
    return record ? toDto(record) : null;
  }

  async findById(userId: string, id: string): Promise<ApplicationConsentDto | null> {
    const record = await prisma.applicationConsent.findFirst({ where: { id, userId } });
    return record ? toDto(record) : null;
  }

  async grant(userId: string, consentType: ConsentTypeValue): Promise<ApplicationConsentDto> {
    const record = await prisma.applicationConsent.create({
      data: { userId, consentType: consentType as ConsentType },
    });
    return toDto(record);
  }

  async revoke(userId: string, id: string): Promise<ApplicationConsentDto> {
    const existing = await prisma.applicationConsent.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Consent grant not found', 404, 'CONSENT_NOT_FOUND');
    }
    if (existing.revokedAt) {
      return toDto(existing);
    }
    const record = await prisma.applicationConsent.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    return toDto(record);
  }
}
